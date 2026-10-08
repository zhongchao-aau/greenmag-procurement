import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState } from '@/components/ui/table'
import { Plus, ShoppingCart } from 'lucide-react'
import { orderStatusClass, ORDER_STATUS_LABELS, formatDate, formatRelative } from '@/lib/utils'
export const dynamic = 'force-dynamic'

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'received', label: 'Received' },
  { value: 'closed', label: 'Closed' },
]

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const isAdmin = profile.role === 'admin'

  let query = supabase
    .from('purchase_orders')
    .select(`
      id, code, status, notes, expected_delivery, created_at, updated_at,
      supplier:suppliers(name),
      request:purchase_requests(code, purpose)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: orders } = await query.limit(50)
  const activeStatus = status ?? ''

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Purchase Orders</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{(orders ?? []).length} orders</p>
        </div>
        {isAdmin && (
          <Link href="/orders/new">
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />New Order</Button>
          </Link>
        )}
      </div>

      <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
        {STATUS_TABS.map(tab => (
          <Link
            key={tab.value}
            href={tab.value ? `/orders?status=${tab.value}` : '/orders'}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
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
              <TableHead>PO Code</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Request</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expected Delivery</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(orders ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={<ShoppingCart className="w-8 h-8 text-[var(--muted-foreground)]" />}
                    title="No purchase orders"
                    description={isAdmin ? 'Create a purchase order from an approved request.' : 'No purchase orders yet.'}
                    action={isAdmin ? <Link href="/orders/new"><Button size="sm"><Plus className="w-4 h-4 mr-1.5" />New Order</Button></Link> : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              (orders ?? []).map((o: {
                id: string; code: string; status: string; notes: string | null;
                expected_delivery: string | null; created_at: string; updated_at: string;
                supplier: { name: string } | null; request: { code: string; purpose: string | null } | null
              }) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs text-[var(--muted-foreground)]">{o.code}</TableCell>
                  <TableCell className="font-medium">
                    {o.supplier?.name ?? <span className="text-[var(--muted-foreground)]">—</span>}
                  </TableCell>
                  <TableCell>
                    {o.request ? (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {o.request.code}{o.request.purpose ? ` · ${o.request.purpose}` : ''}
                      </span>
                    ) : <span className="text-[var(--muted-foreground)]">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={orderStatusClass(o.status as never)}>{ORDER_STATUS_LABELS[o.status as never]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(o.expected_delivery)}</TableCell>
                  <TableCell className="text-sm text-[var(--muted-foreground)]">{formatRelative(o.updated_at)}</TableCell>
                  <TableCell>
                    <Link href={`/orders/${o.id}`} className="text-xs text-[var(--primary)] hover:underline">View</Link>
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
