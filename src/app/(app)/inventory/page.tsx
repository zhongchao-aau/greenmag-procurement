import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState } from '@/components/ui/table'
import { AlertTriangle } from 'lucide-react'
import { formatQuantity } from '@/lib/utils'
export const dynamic = 'force-dynamic'

const FILTER_TABS = [
  { value: '', label: 'All Items' },
  { value: 'low', label: '⚠️ Low Stock' },
  { value: 'zero', label: '🔴 Out of Stock' },
]

export default async function InventoryPage({ searchParams }: { searchParams: { filter?: string } }) {
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

  const filter = searchParams.filter ?? ''

  const filtered = (balances ?? []).filter((b: {
    quantity: number
    component: { low_stock_threshold: number | null } | null
  }) => {
    if (filter === 'low') return b.quantity > 0 && b.component?.low_stock_threshold != null && b.quantity < b.component.low_stock_threshold
    if (filter === 'zero') return b.quantity <= 0
    return true
  })

  const activeFilter = filter

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Inventory</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{filtered.length} components</p>
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
              <TableHead className="text-right">Threshold</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
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
                const isZero = b.quantity <= 0
                const isLow = !isZero && b.component?.low_stock_threshold != null && b.quantity < b.component.low_stock_threshold
                return (
                  <TableRow key={b.component_id} className={isZero ? 'bg-red-50' : isLow ? 'bg-amber-50' : ''}>
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
                    <TableCell className="text-right text-sm text-[var(--muted-foreground)]">
                      {b.component?.low_stock_threshold != null ? formatQuantity(b.component.low_stock_threshold) : '—'}
                    </TableCell>
                    <TableCell>
                      {isZero ? (
                        <Badge className="badge-cancelled text-xs">Out of Stock</Badge>
                      ) : isLow ? (
                        <span className="flex items-center gap-1 text-amber-700 text-xs">
                          <AlertTriangle className="w-3 h-3" />Low
                        </span>
                      ) : (
                        <Badge className="badge-approved text-xs">OK</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/components/${b.component?.id}`} className="text-xs text-[var(--primary)] hover:underline">
                        History
                      </Link>
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
