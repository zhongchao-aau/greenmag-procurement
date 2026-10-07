import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Edit, Package, AlertTriangle } from 'lucide-react'
import { formatDate, formatRelative, formatQuantity } from '@/lib/utils'
export const dynamic = 'force-dynamic'

export default async function ComponentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const isAdmin = profile.role === 'admin'

  const { data: component } = await supabase
    .from('components')
    .select('*, supplier:suppliers(id, name)')
    .eq('id', params.id)
    .single()

  if (!component) notFound()

  const [
    { data: balance },
    { data: transactions },
  ] = await Promise.all([
    supabase.from('inventory_balances').select('quantity, updated_at').eq('component_id', params.id).single(),
    supabase.from('inventory_transactions')
      .select('id, transaction_type, quantity, notes, created_at, performed_by:profiles!performed_by(full_name)')
      .eq('component_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const qty = balance?.quantity ?? 0
  const isLow = component.low_stock_threshold != null && qty < component.low_stock_threshold

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/components" className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft className="w-4 h-4" />Back to Components
        </Link>
        {isAdmin && (
          <Link href={`/components/${params.id}/edit`}>
            <Button size="sm" variant="outline"><Edit className="w-3.5 h-3.5 mr-1.5" />Edit</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs text-[var(--muted-foreground)] mb-1">{component.code}</p>
                  <CardTitle>{component.name}</CardTitle>
                  {component.description && (
                    <p className="text-sm text-[var(--muted-foreground)] mt-2">{component.description}</p>
                  )}
                </div>
                <Badge className={component.is_active ? 'badge-approved' : 'badge-cancelled'}>
                  {component.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Unit</p>
                  <p className="text-sm font-medium">{component.unit}</p>
                </div>
                {component.manufacturer_part_number && (
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)] mb-0.5">MPN</p>
                    <p className="text-sm font-mono">{component.manufacturer_part_number}</p>
                  </div>
                )}
              </div>
              {component.supplier && (
                <div>
                  <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Supplier</p>
                  <Link href={`/suppliers/${(component.supplier as { id: string; name: string }).id}`} className="text-sm text-[var(--primary)] hover:underline">
                    {(component.supplier as { id: string; name: string }).name}
                  </Link>
                </div>
              )}
              {component.notes && (
                <div className="pt-3 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Notes</p>
                  <p className="text-sm">{component.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction history */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory History</CardTitle>
            </CardHeader>
            <CardContent>
              {(transactions ?? []).length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">No transactions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(transactions ?? []).map((t: {
                      id: string; transaction_type: string; quantity: number;
                      notes: string | null; created_at: string; performed_by: { full_name: string } | null
                    }) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs text-[var(--muted-foreground)]">{formatRelative(t.created_at)}</TableCell>
                        <TableCell>
                          <Badge className={
                            t.transaction_type === 'receipt' ? 'badge-approved' :
                            t.transaction_type === 'usage' ? 'badge-submitted' :
                            t.transaction_type === 'adjustment' ? 'badge-under-review' : 'badge-draft'
                          }>
                            {t.transaction_type}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-sm font-medium ${t.quantity >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {t.quantity >= 0 ? '+' : ''}{formatQuantity(t.quantity)} {component.unit}
                        </TableCell>
                        <TableCell className="text-sm text-[var(--muted-foreground)]">{t.notes ?? '—'}</TableCell>
                        <TableCell className="text-xs">{(t.performed_by as { full_name: string } | null)?.full_name ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Stock card */}
          <Card className={isLow ? 'border-amber-300' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4" />Current Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-2">
                <p className={`text-3xl font-bold ${isLow ? 'text-amber-600' : ''}`}>{formatQuantity(qty)}</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{component.unit}</p>
                {isLow && (
                  <div className="mt-3 flex items-center gap-1.5 text-amber-600 text-xs bg-amber-50 px-3 py-2 rounded-md">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Below threshold ({component.low_stock_threshold} {component.unit})
                  </div>
                )}
              </div>
              {balance?.updated_at && (
                <p className="text-xs text-center text-[var(--muted-foreground)] mt-2">
                  Updated {formatRelative(balance.updated_at)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Code</span>
                <span className="font-mono text-xs">{component.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Added</span>
                <span>{formatDate(component.created_at)}</span>
              </div>
              {component.low_stock_threshold != null && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Min Stock</span>
                  <span>{component.low_stock_threshold} {component.unit}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
