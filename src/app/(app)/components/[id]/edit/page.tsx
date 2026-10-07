'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const UNITS = ['pcs', 'kg', 'g', 'mg', 'L', 'mL', 'm', 'cm', 'mm', 'set', 'roll', 'sheet', 'box', 'pair']

export default function EditComponentPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', description: '', unit: 'pcs', supplier_id: '',
    manufacturer_part_number: '', low_stock_threshold: '', notes: '', is_active: true
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from('components').select('*').eq('id', id).single(),
        supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
      ])
      if (c) {
        setForm({
          name: c.name ?? '', description: c.description ?? '', unit: c.unit ?? 'pcs',
          supplier_id: c.supplier_id ?? '', manufacturer_part_number: c.manufacturer_part_number ?? '',
          low_stock_threshold: c.low_stock_threshold?.toString() ?? '', notes: c.notes ?? '',
          is_active: c.is_active ?? true,
        })
      }
      setSuppliers(s ?? [])
      setLoadingData(false)
    }
    load()
  }, [id])

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('components').update({
      name: form.name,
      description: form.description || null,
      unit: form.unit,
      supplier_id: form.supplier_id || null,
      manufacturer_part_number: form.manufacturer_part_number || null,
      low_stock_threshold: form.low_stock_threshold ? parseFloat(form.low_stock_threshold) : null,
      notes: form.notes || null,
      is_active: form.is_active,
    }).eq('id', id)
    if (error) { setError(error.message); setSaving(false); return }
    router.push(`/components/${id}`)
    router.refresh()
  }

  if (loadingData) return <div className="p-6 text-sm text-[var(--muted-foreground)]">Loading...</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href={`/components/${id}`} className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Component
      </Link>
      <Card>
        <CardHeader><CardTitle>Edit Component</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Component Name" value={form.name} onChange={e => set('name', e.target.value)} required />
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={form.description}
                onChange={e => set('description', e.target.value)}
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Supplier</label>
              <select
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={form.supplier_id}
                onChange={e => set('supplier_id', e.target.value)}
              >
                <option value="">— No supplier —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Input
              label="Low Stock Threshold"
              type="number"
              min="0"
              step="0.01"
              value={form.low_stock_threshold}
              onChange={e => set('low_stock_threshold', e.target.value)}
              hint="Alert when inventory falls below this quantity."
            />
            <div>
              <label className="block text-sm font-medium mb-1.5">Notes</label>
              <textarea
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={e => set('is_active', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm">Active component</label>
            </div>
            {error && <p className="text-sm text-[var(--destructive)] bg-red-50 px-3 py-2 rounded-md">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={saving}>Save Changes</Button>
              <Link href={`/components/${id}`}><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
