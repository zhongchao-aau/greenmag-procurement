'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

interface OrderItem {
  component_id: string
  component_name: string
  quantity_ordered: string
  unit: string
  unit_price: string
  currency: string
  notes: string
}

export default function NewOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = searchParams.get('request')
  const [loading, setLoading] = useState(false)
  const [loadingRequest, setLoadingRequest] = useState(!!requestId)
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [components, setComponents] = useState<{ id: string; code: string; name: string; unit: string }[]>([])
  const [error, setError] = useState('')
  const [linkedRequest, setLinkedRequest] = useState<{ id: string; code: string; purpose: string | null } | null>(null)
  const [form, setForm] = useState({
    supplier_id: '', expected_delivery: '', notes: ''
  })
  const [items, setItems] = useState<OrderItem[]>([
    { component_id: '', component_name: '', quantity_ordered: '', unit: '', unit_price: '', currency: 'EUR', notes: '' }
  ])

  const CURRENCIES = ['EUR', 'USD', 'CNY', 'GBP', 'DKK']

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
        supabase.from('components').select('id, code, name, unit').eq('is_active', true).order('code'),
      ])
      setSuppliers(s ?? [])
      setComponents(c ?? [])

      if (requestId) {
        const { data: req } = await supabase
          .from('purchase_requests')
          .select('id, code, purpose, supplier_id, request_items(component_id, quantity_requested, notes, component:components(code, name, unit))')
          .eq('id', requestId)
          .single()
        if (req) {
          setLinkedRequest({ id: req.id, code: req.code, purpose: req.purpose })
          if (req.supplier_id) setForm(f => ({ ...f, supplier_id: req.supplier_id }))
          const reqItems = (req as { request_items?: { component_id: string; quantity_requested: number; notes: string | null; component: { code: string; name: string; unit: string } | null }[] }).request_items ?? []
          if (reqItems.length > 0) {
            setItems(reqItems.map(i => ({
              component_id: i.component_id,
              component_name: i.component?.name ?? '',
              quantity_ordered: i.quantity_requested.toString(),
              unit: i.component?.unit ?? '',
              unit_price: '',
              currency: 'EUR',
              notes: i.notes ?? '',
            })))
          }
        }
        setLoadingRequest(false)
      }
    }
    load()
  }, [requestId])

  function setField(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  function setItem(index: number, field: keyof OrderItem, value: string) {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'component_id') {
        const comp = components.find(c => c.id === value)
        if (comp) { updated[index].unit = comp.unit; updated[index].component_name = comp.name }
      }
      return updated
    })
  }

  function addItem() { setItems(prev => [...prev, { component_id: '', component_name: '', quantity_ordered: '', unit: '', unit_price: '', currency: 'EUR', notes: '' }]) }
  function removeItem(index: number) { setItems(prev => prev.filter((_, i) => i !== index)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const validItems = items.filter(i => i.component_id && i.quantity_ordered)
    if (validItems.length === 0) { setError('Add at least one item.'); return }
    setLoading(true)
    const supabase = createClient()

    const { data: order, error: orderErr } = await supabase
      .from('purchase_orders')
      .insert({
        supplier_id: form.supplier_id || null,
        expected_delivery: form.expected_delivery || null,
        notes: form.notes || null,
        status: 'approved',
      })
      .select('id')
      .single()

    if (orderErr || !order) { setError(orderErr?.message ?? 'Failed to create order'); setLoading(false); return }

    const { error: itemsErr } = await supabase.from('order_items').insert(
      validItems.map(item => ({
        order_id: order.id,
        component_id: item.component_id,
        quantity: parseFloat(item.quantity_ordered),
        item_name: item.component_name || item.component_id,
        unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
        currency: item.currency || 'EUR',
        notes: item.notes || null,
      }))
    )
    if (itemsErr) { setError(itemsErr.message); setLoading(false); return }
    router.push(`/orders/${order.id}`)
    router.refresh()
  }

  if (loadingRequest) return <div className="p-6 text-sm text-[var(--muted-foreground)]">Loading request...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/orders" className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Orders
      </Link>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">New Purchase Order</h1>
        {linkedRequest && (
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            From request <Link href={`/requests/${linkedRequest.id}`} className="text-[var(--primary)] hover:underline">{linkedRequest.code}</Link>
            {linkedRequest.purpose && ` · ${linkedRequest.purpose}`}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Supplier</label>
              <select
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={form.supplier_id}
                onChange={e => setField('supplier_id', e.target.value)}
              >
                <option value="">— Select supplier —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Input label="Expected Delivery Date" type="date" value={form.expected_delivery} onChange={e => setField('expected_delivery', e.target.value)} />
            <div>
              <label className="block text-sm font-medium mb-1.5">Notes / Instructions to Supplier</label>
              <textarea
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={form.notes} onChange={e => setField('notes', e.target.value)}
                placeholder="Special shipping instructions, packaging requirements..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Order Items</CardTitle>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Unit prices are confidential — not visible to regular users.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1.5" />Add Item</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-[var(--muted-foreground)] px-1">
                <div className="col-span-4">Component</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2">Currency</div>
                <div className="col-span-1">Unit</div>
                <div className="col-span-1"></div>
              </div>
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <select
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      value={item.component_id} onChange={e => setItem(index, 'component_id', e.target.value)} required
                    >
                      <option value="">— Select —</option>
                      {components.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min="0.01" step="0.01"
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      value={item.quantity_ordered} onChange={e => setItem(index, 'quantity_ordered', e.target.value)} required placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min="0" step="0.0001"
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      value={item.unit_price} onChange={e => setItem(index, 'unit_price', e.target.value)} placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      value={item.currency} onChange={e => setItem(index, 'currency', e.target.value)}
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs text-[var(--muted-foreground)] text-center">{item.unit || '—'}</p>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)]">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-[var(--destructive)] bg-red-50 px-3 py-2 rounded-md">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Create Purchase Order</Button>
          <Link href="/orders"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </div>
  )
}
