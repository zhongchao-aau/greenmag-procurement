import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, CheckCircle, XCircle, Package, ClipboardCheck } from 'lucide-react'
import { formatDate, formatQuantity } from '@/lib/utils'

export default async function ReceiptDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const isAdmin = profile.role === 'admin'
  if (!isAdmin) redirect('/dashboard')

  const { data: receipt } = await supabase
    .from('receipts')
    .select(`
      *,
      shipment:shipments(id, code, description)
    `)
    .eq('id', params.id)
    .single()

  if (!receipt) notFound()

  const [{ data: receiptItems }, { data: inspections }] = await Promise.all([
    supabase.from('receipt_items')
      .select('id, quantity_received, component:components(id, code, name, unit)')
      .eq('receipt_id', params.id),
    supabase.from('inspections')
      .select(`
        id, overall_result, inspected_at, notes,
        items:inspection_items(
          id, quantity_inspected, quantity_accepted, quantity_rejected, result, notes,
          component:components(id, code, name, unit)
        )
      `)
      .eq('receipt_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  const inspection = inspections?.[0] ?? null

  function resultBadge(result: string) {
    if (result === 'pass') return <Badge className="badge-approved text-xs">✅ Pass</Badge>
    if (result === 'fail') return <Badge className="badge-cancelled text-xs">❌ Fail</Badge>
    return <Badge className="badge-under-review text-xs">⚠️ Partial</Badge>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        href={receipt.shipment ? `/shipments/${(receipt.shipment as { id: string }).id}` : '/shipments'}
        className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />Back to Shipment
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <ClipboardCheck className="w-5 h-5 text-indigo-500" />
          <h1 className="text-xl font-semibold">Receipt & Inspection</h1>
          {inspection && resultBadge(inspection.overall_result)}
        </div>
        {receipt.shipment && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Shipment{' '}
            <Link href={`/shipments/${(receipt.shipment as { id: string; code: string }).id}`} className="text-[var(--primary)] hover:underline">
              {(receipt.shipment as { code: string }).code}
            </Link>
          </p>
        )}
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Received on {formatDate(receipt.received_at)}</p>
      </div>

      <div className="space-y-6">
        {/* Summary cards */}
        {inspection && (
          <div className="grid grid-cols-3 gap-4">
            {(() => {
              const items = (inspection.items as { quantity_accepted: number; quantity_rejected: number; result: string }[]) ?? []
              const totalAccepted = items.reduce((s, i) => s + (i.quantity_accepted ?? 0), 0)
              const totalRejected = items.reduce((s, i) => s + (i.quantity_rejected ?? 0), 0)
              const passCount = items.filter(i => i.result === 'pass').length
              return (
                <>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold text-green-700">{formatQuantity(totalAccepted)}</p>
                      <p className="text-xs text-green-600 mt-0.5">Units Accepted → Inventory</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold text-red-700">{formatQuantity(totalRejected)}</p>
                      <p className="text-xs text-red-600 mt-0.5">Units Rejected</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold">{passCount}/{items.length}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Items Passed</p>
                    </CardContent>
                  </Card>
                </>
              )
            })()}
          </div>
        )}

        {/* Receipt details */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-4 h-4" />Items Received</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(receiptItems ?? []).map((item: {
                id: string
                quantity_received: number
                component: { id: string; code: string; name: string; unit: string } | null
              }) => (
                <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-[var(--muted-foreground)]" />
                    {item.component ? (
                      <div>
                        <Link href={`/components/${item.component.id}`} className="text-sm font-medium hover:text-[var(--primary)]">
                          {item.component.name}
                        </Link>
                        <p className="text-xs font-mono text-[var(--muted-foreground)]">{item.component.code}</p>
                      </div>
                    ) : <span className="text-sm text-[var(--muted-foreground)]">Unknown component</span>}
                  </div>
                  <span className="text-sm font-medium">{formatQuantity(item.quantity_received)} {item.component?.unit}</span>
                </div>
              ))}
            </div>
            {receipt.notes && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Receipt Notes</p>
                <p className="text-sm">{receipt.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inspection results */}
        {inspection && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" />Inspection Results
                </CardTitle>
                {resultBadge(inspection.overall_result)}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">Inspected on {formatDate(inspection.inspected_at)}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {((inspection.items as {
                id: string
                quantity_inspected: number
                quantity_accepted: number
                quantity_rejected: number
                result: string
                notes: string | null
                component: { id: string; code: string; name: string; unit: string } | null
              }[]) ?? []).map(item => (
                <div key={item.id} className="border border-[var(--border)] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      {item.component ? (
                        <>
                          <Link href={`/components/${item.component.id}`} className="font-medium text-sm hover:text-[var(--primary)]">
                            {item.component.name}
                          </Link>
                          <p className="text-xs font-mono text-[var(--muted-foreground)]">{item.component.code}</p>
                        </>
                      ) : <p className="text-sm font-medium text-[var(--muted-foreground)]">Unknown component</p>}
                    </div>
                    {resultBadge(item.result)}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm mb-2">
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Inspected</p>
                      <p className="font-medium">{formatQuantity(item.quantity_inspected)} {item.component?.unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600 mb-0.5">Accepted → Inventory</p>
                      <p className="font-medium text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />{formatQuantity(item.quantity_accepted)} {item.component?.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-red-600 mb-0.5">Rejected</p>
                      <p className="font-medium text-red-700 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />{formatQuantity(item.quantity_rejected)} {item.component?.unit}
                      </p>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-[var(--muted-foreground)] bg-[var(--secondary)] px-2 py-1.5 rounded">
                      {item.notes}
                    </p>
                  )}
                </div>
              ))}

              {inspection.notes && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Inspection Notes</p>
                  <p className="text-sm">{inspection.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Inventory confirmation */}
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-sm text-green-800 font-medium">✅ Inventory Updated</p>
          <p className="text-xs text-green-700 mt-0.5">Accepted quantities have been posted to inventory as receipt transactions.</p>
        </div>
      </div>
    </div>
  )
}
