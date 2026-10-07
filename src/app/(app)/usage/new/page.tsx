'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

interface UsageItem {
  component_id: string
  quantity: string
  notes: string
}

interface ComponentOption {
  id: string
  code: string
  name: string
  unit: string
  quantity: number
}

export default function NewUsagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [components, setComponents] = useState<ComponentOption[]>([])
  const [form, setForm] = useState({ used_at: new Date().toISOString().split('T')[0], notes: '' })
  const [items, setItems] = useState<UsageItem[]>([{ component_id: '', quantity: '', notes: '' }])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: balances } = await supabase
        .from('inventory_balances')
        .select('component_id, quantity, component:components(id, code, name, unit)')
        .gt('quantity', 0)
        .order('quantity', { ascending: false })

      setComponents((balances ?? []).map((b: {
        component_id: string
        quantity: number
        component: { id: string; code: string; name: string; unit: string } | null
      }) => ({
        id: b.component?.id ?? b.component_id,
        code: b.component?.code ?? '',
        name: b.component?.name ?? '',
        unit: b.component?.unit ?? '',
        quantity: b.quantity,
      })))
    }
    load()
  }, [])

  function addItem() {
    setItems(prev => [...prev, { component_id: '', quantity: '', notes: '' }])
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function setItem(index: number, field: keyof UsageItem, value: string) {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validate
    for (const item of items) {
      if (!item.component_id) { setError('Please select a component for all rows.'); return }
      if (!item.quantity || parseFloat(item.quantity) <= 0) { setError('All quantities must be greater than 0.'); return }
      const comp = components.find(c => c.id === item.component_id)
      if (comp && parseFloat(item.quantity) > comp.quantity) {
        setError(`Quantity for "${comp.name}" exceeds available stock (${comp.quantity} ${comp.unit}).`)
        return
      }
    }

    setLoading(true)
    const supabase = createClient()

    // Create inventory_transactions for each item (type = 'usage', quantity is negative)
    const txRows = items.map(item => ({
      component_id: item.component_id,
      tx_type: 'usage' as const,
      quantity: parseFloat(item.quantity),
      direction: -1 as const,
      reason: [form.notes, item.notes].filter(Boolean).join(' | ') || null,
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: txErr } = await supabase.from('inventory_transactions').insert(txRows as any)

    if (txErr) { setError(txErr.message); setLoading(false); return }

    router.push('/inventory')
    router.refresh()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/inventory" className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Inventory
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold">Record Usage</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Deduct components used in production or testing from inventory.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Usage Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Date Used</label>
              <input
                type="date"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={form.used_at}
                onChange={e => setForm(f => ({ ...f, used_at: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">General Notes <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></label>
              <input
                type="text"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Prototype build, Testing batch #4..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Components Used</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">Select components and quantities consumed.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => {
              const selected = components.find(c => c.id === item.component_id)
              return (
                <div key={index} className="border border-[var(--border)] rounded-lg p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Component</label>
                      <select
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        value={item.component_id}
                        onChange={e => setItem(index, 'component_id', e.target.value)}
                        required
                      >
                        <option value="">— Select component —</option>
                        {components.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code}) — {c.quantity} {c.unit} in stock
                          </option>
                        ))}
                      </select>
                    </div>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)}
                        className="mt-5 p-1.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">
                        Quantity {selected ? `(${selected.unit}, max ${selected.quantity})` : ''}
                      </label>
                      <input
                        type="number" min="0.01" step="0.01"
                        max={selected ? selected.quantity : undefined}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        value={item.quantity}
                        onChange={e => setItem(index, 'quantity', e.target.value)}
                        required
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Item Notes (optional)</label>
                      <input
                        type="text"
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        value={item.notes}
                        onChange={e => setItem(index, 'notes', e.target.value)}
                        placeholder="e.g. Failed test, scrap..."
                      />
                    </div>
                  </div>
                </div>
              )
            })}

            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors px-2 py-1"
            >
              <Plus className="w-4 h-4" />Add another component
            </button>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-[var(--destructive)] bg-red-50 px-3 py-2 rounded-md">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Post Usage to Inventory</Button>
          <Link href="/inventory"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </div>
  )
}
