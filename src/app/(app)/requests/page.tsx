import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState } from '@/components/ui/table'
import { Plus, FileText } from 'lucide-react'
import { requestStatusClass, REQUEST_STATUS_LABELS, formatRelative } from '@/lib/utils'
export const dynamic = 'force-dynamic'

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const isAdmin = profile.role === 'admin'

  let query = supabase
    .from('purchase_requests')
    .select(`
      id, code, status, purpose, created_at, updated_at,
      requester:profiles!requester_id(full_name)
    `)
    .order('updated_at', { ascending: false })

  // Non-admins only see their own requests
  if (!isAdmin) {
    query = query.eq('requester_id', user.id)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data: requests } = await query.limit(50)

  const activeStatus = status ?? ''

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">{isAdmin ? 'Purchase Requests' : 'My Requests'}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{(requests ?? []).length} requests</p>
        </div>
        <Link href="/requests/new">
          <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />New Request</Button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
        {STATUS_TABS.map(tab => (
          <Link
            key={tab.value}
            href={tab.value ? `/requests?status=${tab.value}` : '/requests'}
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
              <TableHead>Code</TableHead>
              {isAdmin && <TableHead>Requester</TableHead>}
              <TableHead>Purpose</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(requests ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5}>
                  <EmptyState
                    icon={<FileText className="w-8 h-8 text-[var(--muted-foreground)]" />}
                    title="No requests found"
                    description="Create a new request to start the procurement process."
                    action={<Link href="/requests/new"><Button size="sm"><Plus className="w-4 h-4 mr-1.5" />New Request</Button></Link>}
                  />
                </TableCell>
              </TableRow>
            ) : (
              (requests ?? []).map((req: {
                id: string; code: string; status: string; purpose: string | null;
                created_at: string; updated_at: string; requester: { full_name: string } | null
              }) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs text-[var(--muted-foreground)]">{req.code}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-sm">{(req.requester as { full_name: string } | null)?.full_name ?? '—'}</TableCell>
                  )}
                  <TableCell className="font-medium">
                    <Link href={`/requests/${req.id}`} className="hover:text-[var(--primary)]">
                      {req.purpose ?? 'No description'}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={requestStatusClass(req.status as never)}>
                      {REQUEST_STATUS_LABELS[req.status as never]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--muted-foreground)]">{formatRelative(req.updated_at)}</TableCell>
                  <TableCell>
                    <Link href={`/requests/${req.id}`} className="text-xs text-[var(--primary)] hover:underline">View</Link>
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
