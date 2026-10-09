import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState } from '@/components/ui/table'
import { AlertTriangle, ShoppingCart, Truck } from 'lucide-react'
import { formatQuantity } from '@/lib/utils'
export const dynamic = 'force-dynamic'

const FILTER_TABS = [
  { value: '', label: 'All Items' },
  { value: 'low', label: '⚠️ Low Stock' },
  { value: 'zero', label: '🔴 Out of Stock' },
]

// Orders that are active (placed but not yet fully received)
const ACTIVE_ORDER_STATUSES = ['approved', 'ordered', 'confirmed', 'partially_shipped', 'shipped', 'partially_received']
// Shipments that are in transit (not yet delivered)
const ACTIVE_SHIPMENT_STATUSES = ['dispatched', 'in_transit', 'customs', 'out_for_delivery']

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter: filterParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Load inventory balances joined with components
  const { data: balances } = await supabase
    .from('inventory_balances')
    .select(`
      component_id, quantity,
      component:components(id, code, name, unit, low_stock_threshold, supplier:suppliers(name))
    `)
    .order('quantity', { ascending: true })

  // Load all order items with their order status (to compute on-order quantities)
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('component_id, quantity_ordered, quantity_received, order:purchase_orders(status)')

  // Load all shipment items with their shipment status (to compute in-transit quantities)
  const { data: shipmentItems } = await supabase
    .from('shipment_items')
    .select('component_id, quantity_shipped, shipment:shipments(status)')

  // Aggregate on-order quantities per component (only for active orders)
  const onOrderMap: Record<string, number> = {}
  for (const item of orderItems ?? []) {
    const orderStatus = (item.order as { status: string } | null)?.status ?? ''
    if (item.component_id && ACTIVE_ORDER_STATUSES.includes(orderStatus)) {
      const outstanding = Math.max(0, (item.quantity_ordered ?? 0) - (item.quantity_received ?? 0))
      onOrderMap[item.component_id] = (onOrderMap[item.component_id] ?? 0) + outstanding
    }
  }

  // Aggregate in-transit quantities per component (only for active shipments)
  const inTransitMap: Record<string, number> = {}
  for (const item of shipmentItems ?? []) {
    const shipStatus = (item.shipment as { status: string } | null)?.status ?? ''
    if (item.component_id && ACTIVE_SHIPMENT_STATUSES.includes(shipStatus)) {
      inTransitMap[item.component_id] = (inTransitMap[item.component_id] ?? 0) + (item.quantity_shipped ?? 0)
    }
  }

  const activeFilter = filterParam ?? ''

  const filtered = (balances ?? []).filter((b: {
    quantity: number
    component: { low_stock_threshold: number | null } | null
  }) => {
    if (activeFilter === 'low') return b.quantity > 0 && b.component?.low_stock_threshold != null && b.quantity < b.component.low_stock_threshold
    if (activeFilter === 'zero') return b.quantity <= 0
    return true
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Inventory</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{filtered.length} component{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/usage/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--primary)] text-white rounded-md hover:opacity-90 transition-opacity"
        >
          Record Usage
        </Link>
      </div>

      <div className="flex gap-1 mb-4 border-b border-[var(--border)] overflow-x-auto">
        {FILTER_TABS.map(tab => (
          <Link
            key={tab.value}
            href={tab.value ? `/inventory?filter=${tab.value}` : '/inventory'}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeFilter === tab.value
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
              <TableHead>Component</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">In Stock</TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center justify-end gap-1">
                  <ShoppingCart className="w-3 h-3" />On Order
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center justify-end gap-1">
                  <Truck className="w-3 h-3" />In Transit
                </span>
              </TableHead>
              <TableHead className="text-right">Threshold</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState
                    title="No inventory data"
                    description="Inventory is posted automatically when shipments are received and inspected."
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((b: {
                component_id: string
                quantity: number
                component: {
                  id: string
                  code: string
                  name: string
                  unit: string
                  low_stock_threshold: number | null
                  supplier: { name: string } | null
                } | null
              }) => {
                const compId = b.component_id
                const onOrder = onOrderMap[compId] ?? 0
                const inTransit = inTransitMap[compId] ?? 0
                const isZero = b.quantity <= 0
                const isLow = !isZero && b.component?.low_stock_threshold != null && b.quantity < b.component.low_stock_threshold
                return (
                  <TableRow key={compId} className={isZero ? 'bg-red-50 dark:bg-red-950/20' : isLow ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                    <TableCell>
                      {b.component ? (
                        <div>
                          <Link href={`/components/${b.component.id}`} className="text-sm font-medium hover:text-[var(--primary)]">
                            {b.component.name}
                          </Link>
                          <p className="text-xs font-mono text-[var(--muted-foreground)]">{b.component.code}</p>
                        </div>
                      ) : <span className="text-sm text-[var(--muted-foreground)]">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)]">
                      {b.component?.supplier?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">{b.component?.unit ?? '—'}</TableCell>
                    <TableCell className={`text-right text-sm font-medium ${isZero ? 'text-red-600' : isLow ? 'text-amber-600' : ''}`}>
                      {formatQuantity(b.quantity)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {onOrder > 0
                        ? <span className="text-blue-600 dark:text-blue-400 font-medium">+{formatQuantity(onOrder)}</span>
                        : <span className="text-[var(--muted-foreground)]">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {inTransit > 0
                        ? <span className="text-indigo-600 dark:text-indigo-400 font-medium">+{formatQuantity(inTransit)}</span>
                        : <span className="text-[var(--muted-foreground)]">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm text-[var(--muted-foreground)]">
                      {b.component?.low_stock_threshold != null ? formatQuantity(b.component.low_stock_threshold) : '—'}
                    </TableCell>
                    <TableCell>
                      {isZero ? (
                        <Badge className="badge-cancelled text-xs">Out of Stock</Badge>
                      ) : isLow ? (
                        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 text-xs">
                          <AlertTriangle className="w-3 h-3" />Low
                        </span>
                      ) : (
                        <Badge className="badge-approved text-xs">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
