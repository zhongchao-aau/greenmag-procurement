import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState } from '@/components/ui/table'
import { Plus, Truck } from 'lucide-react'
import { shipmentStatusClass, SHIPMENT_STATUS_LABELS, formatDate, formatRelative } from '@/lib/utils'
import { RefreshAllTrackingButton } from './refresh-button'
export const dynamic = 'force-dynamic'

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'created', label: 'Created' },
  { value: 'china_dispatched', label: 'China' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'customs', label: 'Customs' },
  { value: 'eu_transit', label: 'EU Transit' },
  { value: 'delivered', label: 'Delivered' },
]

export default async function ShipmentsPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single() as any
  const profile = profileData as { role: string } | null
  if (!profile) redirect('/login')
  const isAdmin = profile.role === 'admin'

  let query = supabase
    .from('shipments')
    .select(`
      id, code, description, status, expected_delivery, actual_delivery,
      china_carrier, eu_carrier,
      order:purchase_orders(code, supplier:suppliers(name))
    `)
    .order('created_at', { ascending: false })

  if (searchParams.status) query = query.eq('status', searchParams.status)

  const { data: shipments } = await query.limit(50)
  const activeStatus = searchParams.status ?? ''

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Shipments</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{(shipments ?? []).length} shipments</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <RefreshAllTrackingButton />}
          {isAdmin && (
            <Link href="/shipments/new">
              <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />New Shipment</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-[var(--border)] overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <Link
            key={tab.value}
            href={tab.value ? `/shipments?status=${tab.value}` : '/shipments'}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeStatus === tab.value
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Carriers</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(shipments ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    title="No shipments"
                    description={isAdmin ? 'Create a shipment to track your incoming goods.' : 'No shipments yet.'}
                    action={isAdmin ? <Link href="/shipments/new"><Button size="sm"><Plus className="w-4 h-4 mr-1.5" />New Shipment</Button></Link> : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              (shipments ?? []).map((s: {
                id: string; code: string; description: string | null; status: string;
                expected_delivery: string | null; actual_delivery: string | null;
                china_carrier: string | null; eu_carrier: string | null;
                order: { code: string; supplier: { name: string } | null } | null
              }) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs text-[var(--muted-foreground)]">{s.code}</TableCell>
                  <TableCell>
                    <Link href={`/shipments/${s.id}`} className="text-sm font-medium hover:text-[var(--primary)]">
                      {s.description ?? s.code}
                    </Link>
                    {s.order && (
                      <p className="text-xs text-[var(--muted-foreground)]">{s.order.code}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={shipmentStatusClass(s.status as never)}>{SHIPMENT_STATUS_LABELS[s.status as never]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {(s.order as { supplier: { name: string } | null } | null)?.supplier?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(s.expected_delivery)}</TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
                    {[s.china_carrier, s.eu_carrier].filter(Boolean).join(' / ') || '—'}
                  </TableCell>
                  <TableCell>
                    <Link href={`/shipments/${s.id}`} className="text-xs text-[var(--primary)] hover:underline">View</Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
