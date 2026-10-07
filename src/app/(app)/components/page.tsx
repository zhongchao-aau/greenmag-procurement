import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState } from '@/components/ui/table'
import { Plus, Package } from 'lucide-react'

export default async function ComponentsPage({ searchParams }: { searchParams: { supplier?: string; filter?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const isAdmin = profile.role === 'admin'

  let query = supabase
    .from('components')
    .select(`
      id, code, name, description, unit, low_stock_threshold, is_active,
      supplier:suppliers(id, name)
    `)
    .order('code', { ascending: true })

  if (searchParams.supplier) {
    query = query.eq('supplier_id', searchParams.supplier)
  }

  if (searchParams.filter === 'active') {
    query = query.eq('is_active', true)
  }

  const { data: components } = await query

  // Get inventory balances for stock display
  const componentIds = (components ?? []).map((c: { id: string }) => c.id)
  const { data: balances } = componentIds.length > 0
    ? await supabase.from('inventory_balances').select('component_id, quantity').in('component_id', componentIds)
    : { data: [] }

  const balanceMap = new Map((balances ?? []).map((b: { component_id: string; quantity: number }) => [b.component_id, b.quantity]))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Components</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{(components ?? []).length} components</p>
        </div>
        {isAdmin && (
          <Link href="/components/new">
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Component</Button>
          </Link>
        )}
      </div>

      <div className="card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>In Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(components ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={<Package className="w-8 h-8 text-[var(--muted-foreground)]" />}
                    title="No components yet"
                    description={isAdmin ? 'Add your first component to start managing procurement.' : 'No components have been added yet.'}
                    action={isAdmin ? <Link href="/components/new"><Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Component</Button></Link> : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              (components ?? []).map((c: {
                id: string; code: string; name: string; description: string | null; unit: string;
                low_stock_threshold: number | null; is_active: boolean; supplier: { id: string; name: string } | null
              }) => {
                const qty = balanceMap.get(c.id) ?? 0
                const isLow = c.low_stock_threshold != null && qty < c.low_stock_threshold
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs text-[var(--muted-foreground)]">{c.code}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/components/${c.id}`} className="hover:text-[var(--primary)]">{c.name}</Link>
                      {c.description && <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-1">{c.description}</p>}
                    </TableCell>
                    <TableCell>
                      {c.supplier ? (
                        <Link href={`/suppliers/${c.supplier.id}`} className="text-sm hover:text-[var(--primary)]">{c.supplier.name}</Link>
                      ) : <span className="text-[var(--muted-foreground)]">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">{c.unit}</TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${isLow ? 'text-amber-600' : ''}`}>
                        {qty} {isLow && <span className="text-xs font-normal">(low)</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={c.is_active ? 'badge-approved' : 'badge-cancelled'}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/components/${c.id}`} className="text-xs text-[var(--primary)] hover:underline">View</Link>
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
