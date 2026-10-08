import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ExternalLink, Truck, Package } from 'lucide-react'
import { shipmentStatusClass, SHIPMENT_STATUS_LABELS, formatDate, formatRelative, formatQuantity } from '@/lib/utils'
import { ShipmentActions } from './shipment-actions'
export const dynamic = 'force-dynamic'

export default async function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single() as any
  const profile = profileData as { role: string } | null
  if (!profile) redirect('/login')
  const isAdmin = profile.role === 'admin'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: shipmentData } = await (supabase
    .from('shipments')
    .select(`
      *,
      order:purchase_orders(id, code, supplier:suppliers(name))
    `)
    .eq('id', params.id)
    .single() as any)
  const shipment = shipmentData as {
    id: string; code: string; description: string | null; status: string;
    expected_delivery: string | null; actual_delivery: string | null; notes: string | null;
    china_carrier: string | null; china_tracking_number: string | null; china_tracking_url: string | null; china_status: string | null;
    eu_carrier: string | null; eu_tracking_number: string | null; eu_tracking_url: string | null; eu_status: string | null;
    order: { id: string; code: string; supplier: { name: string } | null } | null;
  } | null

  if (!shipment) notFound()

  const [{ data: items }, { data: events }] = await Promise.all([
    supabase.from('shipment_items')
      .select('id, quantity_shipped, component:components(id, code, name, unit)')
      .eq('shipment_id', params.id),
    supabase.from('shipment_events')
      .select('id, event_date, location, description, tracking_leg, created_at')
      .eq('shipment_id', params.id)
      .order('event_date', { ascending: false }),
  ])

  const isDelivered = shipment.status === 'delivered'
  const { data: existingReceipt } = await supabase
    .from('receipts')
    .select('id')
    .eq('shipment_id', params.id)
    .maybeSingle()
  const hasReceipt = !!existingReceipt

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/shipments" className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Shipments
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Truck className="w-5 h-5 text-indigo-500" />
                    <span className="font-mono text-sm text-[var(--muted-foreground)]">{shipment.code}</span>
                    <Badge className={shipmentStatusClass(shipment.status as never)}>{SHIPMENT_STATUS_LABELS[shipment.status as never]}</Badge>
                  </div>
                  <CardTitle>{shipment.description ?? shipment.code}</CardTitle>
                  {shipment.order && (
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                      Order{' '}
                      <Link href={`/orders/${(shipment.order as { id: string; code: string }).id}`} className="text-[var(--primary)] hover:underline">
                        {(shipment.order as { id: string; code: string }).code}
                      </Link>
                      {' · '}{(shipment.order as { supplier: { name: string } | null }).supplier?.name}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Dual-leg tracking */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* China leg */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  🇨🇳 China Leg
                  {shipment.china_status && (
                    <Badge className="badge-under-review text-xs">{shipment.china_status}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {shipment.china_carrier ? (
                  <>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Carrier</p>
                      <p className="font-medium">{shipment.china_carrier}</p>
                    </div>
                    {shipment.china_tracking_number && (
                      <div>
                        <p className="text-xs text-[var(--muted-foreground)]">Tracking #</p>
                        <p className="font-mono text-xs">{shipment.china_tracking_number}</p>
                      </div>
                    )}
                    {shipment.china_tracking_url && (
                      <a href={shipment.china_tracking_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[var(--primary)] hover:underline text-xs mt-1">
                        <ExternalLink className="w-3 h-3" />Track on carrier website
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-[var(--muted-foreground)] text-sm">No China leg info yet.</p>
                )}
              </CardContent>
            </Card>

            {/* EU leg */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  🇪🇺 EU Leg
                  {shipment.eu_status && (
                    <Badge className="badge-approved text-xs">{shipment.eu_status}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {shipment.eu_carrier ? (
                  <>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Carrier</p>
                      <p className="font-medium">{shipment.eu_carrier}</p>
                    </div>
                    {shipment.eu_tracking_number && (
                      <div>
                        <p className="text-xs text-[var(--muted-foreground)]">Tracking #</p>
                        <p className="font-mono text-xs">{shipment.eu_tracking_number}</p>
                      </div>
                    )}
                    {shipment.eu_tracking_url && (
                      <a href={shipment.eu_tracking_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[var(--primary)] hover:underline text-xs mt-1">
                        <ExternalLink className="w-3 h-3" />Track on carrier website
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-[var(--muted-foreground)] text-sm">EU carrier not yet assigned.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contents */}
          {(items ?? []).length > 0 && (
            <Card>
              <CardHeader><CardTitle>Contents</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(items ?? []).map((item: { id: string; quantity_shipped: number; component: { id: string; code: string; name: string; unit: string } | null }) => (
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
                        ) : '—'}
                      </div>
                      <span className="text-sm font-medium">{formatQuantity(item.quantity_shipped)} {item.component?.unit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Events timeline */}
          {(events ?? []).length > 0 && (
            <Card>
              <CardHeader><CardTitle>Tracking Events</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(events ?? []).map((e: { id: string; event_date: string; location: string | null; description: string; tracking_leg: string }) => (
                    <div key={e.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                        <div className="w-0.5 flex-1 bg-[var(--border)] mt-1" />
                      </div>
                      <div className="pb-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{e.description}</p>
                          <Badge className={e.tracking_leg === 'china' ? 'badge-draft' : 'badge-approved'}>
                            {e.tracking_leg}
                          </Badge>
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          {e.location && `${e.location} · `}{formatDate(e.event_date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {isAdmin && (
            <ShipmentActions shipmentId={params.id} status={shipment.status} isDelivered={isDelivered} />
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Expected</span>
                <span>{formatDate(shipment.expected_delivery)}</span>
              </div>
              {shipment.actual_delivery && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Delivered</span>
                  <span className="text-green-700 font-medium">{formatDate(shipment.actual_delivery)}</span>
                </div>
              )}
              {shipment.notes && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Notes</p>
                  <p className="text-sm">{shipment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {isDelivered && isAdmin && !hasReceipt && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <p className="text-sm text-green-800 mb-3">Shipment delivered — record receipt and inspection.</p>
                <Link href={`/receiving/new?shipment=${params.id}`}>
                  <button className="w-full text-sm bg-green-700 text-white rounded-md px-3 py-2 hover:bg-green-800 transition-colors">
                    Record Receipt & Inspection →
                  </button>
                </Link>
              </CardContent>
            </Card>
          )}
          {isDelivered && existingReceipt && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <p className="text-sm text-blue-800 mb-3">✅ Receipt recorded and inventory updated.</p>
                <Link href={`/receiving/${existingReceipt.id}`}>
                  <button className="w-full text-sm bg-blue-700 text-white rounded-md px-3 py-2 hover:bg-blue-800 transition-colors">
                    View Receipt & Inspection →
                  </button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
