import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, FileText } from 'lucide-react'
import { requestStatusClass, REQUEST_STATUS_LABELS, formatDate, formatRelative, formatQuantity } from '@/lib/utils'
import { RequestActions } from './request-actions'
export const dynamic = 'force-dynamic'

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const isAdmin = profile.role === 'admin'

  const { data: request } = await supabase
    .from('purchase_requests')
    .select(`
      *,
      requester:profiles!requester_id(id, full_name, email),
      reviewer:profiles!reviewer_id(full_name)
    `)
    .eq('id', params.id)
    .single()

  if (!request) notFound()

  // Access control: non-admins can only see their own requests
  if (!isAdmin && request.requester_id !== user.id) redirect('/requests')

  const { data: items } = await supabase
    .from('request_items')
    .select(`
      id, quantity_requested, notes,
      component:components(id, code, name, unit)
    `)
    .eq('request_id', params.id)
    .order('created_at')

  const { data: activity } = await supabase
    .from('activity_log')
    .select('id, action, description, created_at, performer:profiles!performed_by(full_name)')
    .eq('entity_id', params.id)
    .order('created_at', { ascending: true })

  const isOwner = request.requester_id === user.id
  const canEdit = isOwner && request.status === 'draft'
  const canSubmit = isOwner && request.status === 'draft'
  const canWithdraw = isOwner && ['submitted', 'under_review'].includes(request.status)
  const canAdminReview = isAdmin && ['submitted', 'under_review'].includes(request.status)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/requests" className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft className="w-4 h-4" />Back to Requests
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span className="font-mono text-sm text-[var(--muted-foreground)]">{request.code}</span>
                    <Badge className={requestStatusClass(request.status as never)}>
                      {REQUEST_STATUS_LABELS[request.status as never]}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{request.purpose ?? 'No description'}</CardTitle>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    Requested by <span className="font-medium">{(request.requester as { full_name: string } | null)?.full_name}</span> · {formatRelative(request.created_at)}
                  </p>
                </div>
              </div>
              {request.notes && (
                <p className="text-sm text-[var(--muted-foreground)] mt-3 p-3 bg-[var(--secondary)] rounded-md">{request.notes}</p>
              )}
            </CardHeader>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader><CardTitle>Requested Items</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(items ?? []).map((item: {
                    id: string; quantity_requested: number; notes: string | null;
                    component: { id: string; code: string; name: string; unit: string } | null
                  }) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.component ? (
                          <div>
                            <Link href={`/components/${item.component.id}`} className="text-sm font-medium hover:text-[var(--primary)]">
                              {item.component.name}
                            </Link>
                            <p className="text-xs text-[var(--muted-foreground)] font-mono">{item.component.code}</p>
                          </div>
                        ) : <span className="text-[var(--muted-foreground)]">—</span>}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatQuantity(item.quantity_requested)} {item.component?.unit}
                      </TableCell>
                      <TableCell className="text-sm text-[var(--muted-foreground)]">{item.notes ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Activity timeline */}
          {(activity ?? []).length > 0 && (
            <Card>
              <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(activity ?? []).map((event: { id: string; action: string; description: string; created_at: string; performer: { full_name: string } | null }) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm">{event.description}</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          {(event.performer as { full_name: string } | null)?.full_name} · {formatRelative(event.created_at)}
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
          {/* Actions */}
          <RequestActions
            requestId={params.id}
            status={request.status}
            canEdit={canEdit}
            canSubmit={canSubmit}
            canWithdraw={canWithdraw}
            canAdminReview={canAdminReview}
            isAdmin={isAdmin}
          />

          {/* Meta */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Created</span>
                <span>{formatDate(request.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Updated</span>
                <span>{formatDate(request.updated_at)}</span>
              </div>
              {request.reviewer_id && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Reviewer</span>
                  <span>{(request.reviewer as { full_name: string } | null)?.full_name}</span>
                </div>
              )}
              {request.reviewed_at && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Reviewed</span>
                  <span>{formatDate(request.reviewed_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {request.rejection_reason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-sm text-red-700">Rejection Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-800">{request.rejection_reason}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
