'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'

interface ReceiptItem {
  component_id: string
  component_name: string
  component_code: string
  unit: string
  quantity_shipped: number
  quantity_received: string
  inspection_result: 'pass' | 'fail' | 'partial'
  inspection_notes: string
  quantity_accepted: string
  quantity_rejected: string
}

export default function NewReceivingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shipmentId = searchParams.get('shipment')
  const [loading, setLoading] = useState(false)
  const [loadingShipment, setLoadingShipment] = useState(!!shipmentId)
  const [error, setError] = useState('')
  const [shipment, setShipment] = useState<{ id: string; code: string } | null>(null)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [form, setForm] = useState({
    received_at: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    if (!shipmentId) { setLoadingShipment(false); return }
    async function load() {
      const supabase = createClient()
      const { data: s } = await supabase.from('shipments').select('id, code').eq('id', shipmentId).single()
      const { data: sItems } = await supabase
        .from('shipment_items')
        .select('component_id, quantity_shipped, component:components(code, name, unit)')
        .eq('shipment_id', shipmentId)

      setShipment(s)
      setItems((sItems ?? []).map((i: { component_id: string; quantity_shipped: number; component: { code: string; name: string; unit: string } | null }) => ({
        component_id: i.component_id,
        component_name: i.component?.name ?? '',
        component_code: i.component?.code ?? '',
        unit: i.component?.unit ?? '',
        quantity_shipped: i.quantity_shipped,
        quantity_received: i.quantity_shipped.toString(),
        inspection_result: 'pass' as const,
        inspection_notes: '',
        quantity_accepted: i.quantity_shipped.toString(),
        quantity_rejected: '0',
      })))
      setLoadingShipment(false)
    }
    load()
  }, [shipmentId])

  function setItem(index: number, field: keyof ReceiptItem, value: string) {
    setItems(prev => {
      const updated = [...prev]
      const item = { ...updated[index], [field]: value }
      // Auto-calculate accepted/rejected when result changes
      if (field === 'inspection_result') {
        if (value === 'pass') {
          item.quantity_accepted = item.quantity_received
          item.quantity_rejected = '0'
        } else if (value === 'fail') {
          item.quantity_accepted = '0'
          item.quantity_rejected = item.quantity_received
        }
      }
      updated[index] = item
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    // Create receipt
    const { data: receipt, error: rErr } = await supabase
      .from('receipts')
      .insert({
        shipment_id: shipmentId || null,
        received_at: form.received_at,
        notes: form.notes || null,
      })
      .select('id')
      .single()

    if (rErr || !receipt) { setError(rErr?.message ?? 'Failed to create receipt'); setLoading(false); return }

    // Insert receipt items
    const { error: riErr } = await supabase.from('receipt_items').insert(
      items.map(item => ({
        receipt_id: receipt.id,
        component_id: item.component_id,
        quantity_received: parseFloat(item.quantity_received) || 0,
      }))
    )
    if (riErr) { setError(riErr.message); setLoading(false); return }

    // Create inspection
    const { data: inspection, error: iErr } = await supabase
      .from('inspections')
      .insert({
        receipt_id: receipt.id,
        inspected_at: form.received_at,
        overall_result: items.every(i => i.inspection_result === 'pass') ? 'pass' :
                        items.some(i => i.inspection_result === 'pass') ? 'partial' : 'fail',
      })
      .select('id')
      .single()

    if (iErr || !inspection) { setError(iErr?.message ?? 'Failed to create inspection'); setLoading(false); return }

    // Insert inspection items
    const { error: iiErr } = await supabase.from('inspection_items').insert(
      items.map(item => ({
        inspection_id: inspection.id,
        component_id: item.component_id,
        quantity_inspected: parseFloat(item.quantity_received) || 0,
        quantity_accepted: parseFloat(item.quantity_accepted) || 0,
        quantity_rejected: parseFloat(item.quantity_rejected) || 0,
        result: item.inspection_result,
        notes: item.inspection_notes || null,
      }))
    )
    if (iiErr) { setError(iiErr.message); setLoading(false); return }

    // Post accepted quantities to inventory as transactions
    const accepted = items.filter(i => parseFloat(i.quantity_accepted) > 0)
    if (accepted.length > 0) {
      const { error: txErr } = await supabase.from('inventory_transactions').insert(
        accepted.map(item => ({
          component_id: item.component_id,
          transaction_type: 'receipt',
          quantity: parseFloat(item.quantity_accepted),
          reference_id: receipt.id,
          notes: `Receipt from shipment ${shipment?.code ?? ''}`,
        }))
      )
      if (txErr) { setError(txErr.message); setLoading(false); return }
    }

    router.push(`/receiving/${receipt.id}`)
    router.refresh()
  }

  if (loadingShipment) return <div className="p-6 text-sm text-[var(--muted-foreground)]">Loading shipment...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href={shipmentId ? `/shipments/${shipmentId}` : '/shipments'} className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="w-4 h-4" />Back
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold">Record Receipt & Inspection</h1>
        {shipment && (
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            For shipment <span className="font-medium">{shipment.code}</span>
          </p>
        )}
        <p className="text-xs text-[var(--muted-foreground)] mt-1 bg-blue-50 px-3 py-2 rounded-md mt-2">
          Accepted quantities will be automatically posted to inventory after saving.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Receipt Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Date Received" type="date" value={form.received_at} onChange={e => setForm(f => ({ ...f, received_at: e.target.value }))} required />
            <div>
              <label className="block text-sm font-medium mb-1.5">Notes</label>
              <textarea
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Condition of package, any visible damage..."
              />
            </div>
          </CardContent>
        </Card>

        {items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Inspection Results</CardTitle>
              <p className="text-sm text-[var(--muted-foreground)]">Record quantities received and inspection outcome for each item.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border border-[var(--border)] rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.component_name}</p>
                      <p className="text-xs font-mono text-[var(--muted-foreground)]">{item.component_code}</p>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">Shipped: {item.quantity_shipped} {item.unit}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Qty Received</label>
                      <input
                        type="number" min="0" step="0.01"
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        value={item.quantity_received}
                        onChange={e => setItem(index, 'quantity_received', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Inspection Result</label>
                      <select
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        value={item.inspection_result}
                        onChange={e => setItem(index, 'inspection_result', e.target.value)}
                      >
                        <option value="pass">✅ Pass</option>
                        <option value="partial">⚠️ Partial</option>
                        <option value="fail">❌ Fail</option>
                      </select>
                    </div>
                    {item.inspection_result === 'partial' && (
                      <div className="grid grid-cols-2 gap-2 col-span-1">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-green-700">Accepted</label>
                          <input
                            type="number" min="0" step="0.01"
                            className="w-full rounded-md border border-green-300 bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            value={item.quantity_accepted}
                            onChange={e => setItem(index, 'quantity_accepted', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-red-700">Rejected</label>
                          <input
                            type="number" min="0" step="0.01"
                            className="w-full rounded-md border border-red-300 bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                            value={item.quantity_rejected}
                            onChange={e => setItem(index, 'quantity_rejected', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Inspection Notes</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      value={item.inspection_notes}
                      onChange={e => setItem(index, 'inspection_notes', e.target.value)}
                      placeholder="Defects observed, dimension checks, etc."
                    />
                  </div>
                  {/* Summary chips */}
                  <div className="flex items-center gap-2 text-xs">
                    {item.inspection_result !== 'fail' && (
                      <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        {item.inspection_result === 'partial' ? item.quantity_accepted : item.quantity_received} {item.unit} accepted → inventory
                      </span>
                    )}
                    {(item.inspection_result === 'fail' || item.inspection_result === 'partial') && (
                      <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" />
                        {item.inspection_result === 'fail' ? item.quantity_received : item.quantity_rejected} {item.unit} rejected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {error && <p className="text-sm text-[var(--destructive)] bg-red-50 px-3 py-2 rounded-md">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Save Receipt & Post to Inventory</Button>
          <Link href="/shipments"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </div>
  )
}
