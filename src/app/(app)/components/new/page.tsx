'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewComponentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', description: '', unit: 'pcs', supplier_id: '',
    manufacturer_part_number: '', low_stock_threshold: '', notes: ''
  })

  useEffect(() => {
    async function loadSuppliers() {
      const supabase = createClient()
      const { data } = await supabase.from('suppliers').select('id, name').eq('is_active', true).order('name')
      setSuppliers(data ?? [])
    }
    loadSuppliers()
  }, [])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('components').insert({
      name: form.name,
      description: form.description || null,
      unit: form.unit,
      supplier_id: form.supplier_id || null,
      manufacturer_part_number: form.manufacturer_part_number || null,
      low_stock_threshold: form.low_stock_threshold ? parseFloat(form.low_stock_threshold) : null,
      notes: form.notes || null,
      is_active: true,
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/components')
    router.refresh()
  }

  const UNITS = ['pcs', 'kg', 'g', 'mg', 'L', 'mL', 'm', 'cm', 'mm', 'set', 'roll', 'sheet', 'box', 'pair']

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/components" className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Components
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Add New Component</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">A GM-CMP code will be assigned automatically.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Component Name"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
              placeholder="e.g. N52 Neodymium Magnet Block 10x5x3mm"
            />
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Detailed specification, dimensions, grade, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Unit <span className="text-[var(--destructive)]">*</span></label>
                <select
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  value={form.unit}
                  onChange={e => set('unit', e.target.value)}
                  required
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <Input
                label="Manufacturer Part Number"
                value={form.manufacturer_part_number}
                onChange={e => set('manufacturer_part_number', e.target.value)}
                placeholder="e.g. BLK-10x5x3-N52"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Supplier</label>
              <select
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={form.supplier_id}
                onChange={e => set('supplier_id', e.target.value)}
              >
                <option value="">— No supplier selected —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Can be set later once supplier is confirmed.</p>
            </div>
            <Input
              label="Low Stock Threshold"
              type="number"
              min="0"
              step="0.01"
              value={form.low_stock_threshold}
              onChange={e => set('low_stock_threshold', e.target.value)}
              placeholder="e.g. 50"
              hint="Alert when inventory falls below this quantity. Leave blank for no alert."
            />
            <div>
              <label className="block text-sm font-medium mb-1.5">Notes</label>
              <textarea
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Storage requirements, handling notes, etc."
              />
            </div>
            {error && <p className="text-sm text-[var(--destructive)] bg-red-50 px-3 py-2 rounded-md">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading}>Add Component</Button>
              <Link href="/components"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
