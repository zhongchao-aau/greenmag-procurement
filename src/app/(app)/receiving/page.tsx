import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState } from '@/components/ui/table'

import { formatDate } from '@/lib/utils'

export default async function ReceivingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const isAdmin = profile.role === 'admin'
  if (!isAdmin) redirect('/dashboard')

  const { data: receipts } = await supabase
    .from('receipts')
    .select(`
      id, received_at, notes, created_at,
      shipment:shipments(id, code),
      inspections(id, overall_result)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  function resultBadge(result: string) {
    if (result === 'pass') return <Badge className="badge-approved text-xs">Pass</Badge>
    if (result === 'fail') return <Badge className="badge-cancelled text-xs">Fail</Badge>
    return <Badge className="badge-under-review text-xs">Partial</Badge>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Receiving & Inspections</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{(receipts ?? []).length} receipts</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Shipment</TableHead>
              <TableHead>Inspection</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(receipts ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    title="No receipts yet"
                    description="Receipts are created when you receive and inspect a shipment."
                  />
                </TableCell>
              </TableRow>
            ) : (
              (receipts ?? []).map((r: {
                id: string
                received_at: string
                notes: string | null
                shipment: { id: string; code: string } | null
                inspections: { id: string; overall_result: string }[]
              }) => {
                const insp = r.inspections?.[0]
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{formatDate(r.received_at)}</TableCell>
                    <TableCell>
                      {r.shipment ? (
                        <Link href={`/shipments/${r.shipment.id}`} className="text-sm font-mono hover:text-[var(--primary)]">
                          {r.shipment.code}
                        </Link>
                      ) : <span className="text-sm text-[var(--muted-foreground)]">—</span>}
                    </TableCell>
                    <TableCell>{insp ? resultBadge(insp.overall_result) : <span className="text-xs text-[var(--muted-foreground)]">—</span>}</TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)] max-w-xs truncate">{r.notes ?? '—'}</TableCell>
                    <TableCell>
                      <Link href={`/receiving/${r.id}`} className="text-xs text-[var(--primary)] hover:underline">View</Link>
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
