'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

interface RequestItem {
  id?: string
  component_id: string
  quantity: string
  unit: string
  notes: string
}

export default function EditRequestPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [components, setComponents] = useState<{ id: string; code: string; name: string; unit: string }[]>([])
  const [error, setError] = useState('')
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<RequestItem[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: req }, { data: reqItems }, { data: comps }] = await Promise.all([
        supabase.from('purchase_requests').select('*').eq('id', id).single(),
        supabase.from('request_items').select('id, component_id, quantity_requested, notes, component:components(unit)').eq('request_id', id),
        supabase.from('components').select('id, code, name, unit').eq('is_active', true).order('code'),
      ])
      if (req) {
        setPurpose(req.purpose ?? '')
        setNotes(req.notes ?? '')
      }
      setComponents(comps ?? [])
      setItems((reqItems ?? []).map((i: { id: string; component_id: string; quantity_requested: number; notes: string | null; component: { unit: string } | null }) => ({
        id: i.id,
        component_id: i.component_id,
        quantity: i.quantity_requested.toString(),
        unit: i.component?.unit ?? '',
        notes: i.notes ?? '',
      })))
      if ((reqItems ?? []).length === 0) {
        setItems([{ component_id: '', quantity: '', unit: '', notes: '' }])
      }
      setLoadingData(false)
    }
    load()
  }, [id])

  function setItem(index: number, field: keyof RequestItem, value: string) {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'component_id') {
        const comp = components.find(c => c.id === value)
        if (comp) updated[index].unit = comp.unit
      }
      return updated
    })
  }

  function addItem() { setItems(prev => [...prev, { component_id: '', quantity: '', unit: '', notes: '' }]) }
  function removeItem(index: number) { setItems(prev => prev.filter((_, i) => i !== index)) }

  async function handleSubmit(e: React.FormEvent, asDraft: boolean) {
    e.preventDefault()
    setError('')
    const validItems = items.filter(i => i.component_id && i.quantity)
    if (validItems.length === 0) { setError('Add at least one component.'); return }
    setSaving(true)
    const supabase = createClient()

    // Update request header
    const { error: reqErr } = await supabase.from('purchase_requests').update({
      purpose: purpose || null,
      notes: notes || null,
      status: asDraft ? 'draft' : 'submitted',
    }).eq('id', id)

    if (reqErr) { setError(reqErr.message); setSaving(false); return }

    // Delete old items and reinsert
    await supabase.from('request_items').delete().eq('request_id', id)
    const { error: itemsErr } = await supabase.from('request_items').insert(
      validItems.map(item => ({
        request_id: id,
        component_id: item.component_id,
        quantity_requested: parseFloat(item.quantity),
        notes: item.notes || null,
      }))
    )
    if (itemsErr) { setError(itemsErr.message); setSaving(false); return }
    router.push(`/requests/${id}`)
    router.refresh()
  }

  if (loadingData) return <div className="p-6 text-sm text-[var(--muted-foreground)]">Loading...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href={`/requests/${id}`} className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Request
      </Link>
      <h1 className="text-xl font-semibold mb-6">Edit Request</h1>
      <form onSubmit={e => handleSubmit(e, false)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Purpose / Project" value={purpose} onChange={e => setPurpose(e.target.value)} />
            <div>
              <label className="block text-sm font-medium mb-1.5">Notes</label>
              <textarea
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={notes} onChange={e => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Components</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1.5" />Add</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5">
                  <select
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    value={item.component_id}
                    onChange={e => setItem(index, 'component_id', e.target.value)}
                    required
                  >
                    <option value="">— Select —</option>
                    {components.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number" min="0.01" step="0.01"
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    value={item.quantity} onChange={e => setItem(index, 'quantity', e.target.value)} required
                  />
                </div>
                <div className="col-span-1">
                  <p className="text-sm text-[var(--muted-foreground)]">{item.unit || '—'}</p>
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    value={item.notes} onChange={e => setItem(index, 'notes', e.target.value)} placeholder="Note"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="p-2 text-[var(--muted-foreground)] hover:text-[var(--destructive)]">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        {error && <p className="text-sm text-[var(--destructive)] bg-red-50 px-3 py-2 rounded-md">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" loading={saving}>Submit Request</Button>
          <Button type="button" variant="outline" loading={saving} onClick={e => handleSubmit(e, true)}>Save as Draft</Button>
          <Link href={`/requests/${id}`}><Button type="button" variant="ghost">Cancel</Button></Link>
        </div>
      </form>
    </div>
  )
}
