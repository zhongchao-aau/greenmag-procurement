'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

interface RequestItem {
  component_id: string
  quantity: string
  unit: string
  notes: string
}

export default function NewRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [components, setComponents] = useState<{ id: string; code: string; name: string; unit: string }[]>([])
  const [error, setError] = useState('')
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<RequestItem[]>([
    { component_id: '', quantity: '', unit: '', notes: '' }
  ])

  useEffect(() => {
    async function loadComponents() {
      const supabase = createClient()
      const { data } = await supabase
        .from('components')
        .select('id, code, name, unit')
        .eq('is_active', true)
        .order('code')
      setComponents(data ?? [])
    }
    loadComponents()
  }, [])

  function setItem(index: number, field: keyof RequestItem, value: string) {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      // Auto-fill unit when component is selected
      if (field === 'component_id') {
        const comp = components.find(c => c.id === value)
        if (comp) updated[index].unit = comp.unit
      }
      return updated
    })
  }

  function addItem() {
    setItems(prev => [...prev, { component_id: '', quantity: '', unit: '', notes: '' }])
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent, asDraft: boolean) {
    e.preventDefault()
    setError('')

    const validItems = items.filter(i => i.component_id && i.quantity)
    if (validItems.length === 0) {
      setError('Add at least one component to the request.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Create the request
    const { data: req, error: reqErr } = await supabase
      .from('purchase_requests')
      .insert({
        purpose: purpose || null,
        notes: notes || null,
        status: asDraft ? 'draft' : 'submitted',
      })
      .select('id')
      .single()

    if (reqErr || !req) {
      setError(reqErr?.message ?? 'Failed to create request')
      setLoading(false)
      return
    }

    // Insert items
    const { error: itemsErr } = await supabase
      .from('request_items')
      .insert(validItems.map(item => ({
        request_id: req.id,
        component_id: item.component_id,
        quantity_requested: parseFloat(item.quantity),
        notes: item.notes || null,
      })))

    if (itemsErr) {
      setError(itemsErr.message)
      setLoading(false)
      return
    }

    router.push(`/requests/${req.id}`)
    router.refresh()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/requests" className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Requests
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold">New Purchase Request</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Request components for procurement. An admin will review and approve.</p>
      </div>

      <form onSubmit={e => handleSubmit(e, false)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Purpose / Project"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="e.g. Q4 magnet assembly batch, Lab prototype build..."
              hint="Brief description of why these components are needed."
            />
            <div>
              <label className="block text-sm font-medium mb-1.5">Additional Notes</label>
              <textarea
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Urgency, special requirements, preferred delivery date..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Components to Request</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1.5" />Add Component
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-5">
                  {index === 0 && <label className="block text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">Component <span className="text-[var(--destructive)]">*</span></label>}
                  <select
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    value={item.component_id}
                    onChange={e => setItem(index, 'component_id', e.target.value)}
                    required
                  >
                    <option value="">— Select component —</option>
                    {components.map(c => (
                      <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  {index === 0 && <label className="block text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">Quantity <span className="text-[var(--destructive)]">*</span></label>}
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    value={item.quantity}
                    onChange={e => setItem(index, 'quantity', e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="col-span-1">
                  {index === 0 && <label className="block text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">Unit</label>}
                  <p className="py-2 text-sm text-[var(--muted-foreground)]">{item.unit || '—'}</p>
                </div>
                <div className="col-span-3">
                  {index === 0 && <label className="block text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">Note</label>}
                  <input
                    type="text"
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    value={item.notes}
                    onChange={e => setItem(index, 'notes', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  {index === 0 && <div className="h-[22px] mb-1.5" />}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-[var(--destructive)] bg-red-50 px-3 py-2 rounded-md">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={loading}>Submit Request</Button>
          <Button type="button" variant="outline" loading={loading} onClick={e => handleSubmit(e, true)}>
            Save as Draft
          </Button>
          <Link href="/requests"><Button type="button" variant="ghost">Cancel</Button></Link>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Submitting sends the request to admin for review. Saving as draft lets you continue editing later.
        </p>
      </form>
    </div>
  )
}
