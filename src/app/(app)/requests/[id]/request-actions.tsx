'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { CheckCircle, XCircle, Send, Edit, RotateCcw, ShoppingCart } from 'lucide-react'

interface Props {
  requestId: string
  status: string
  canEdit: boolean
  canSubmit: boolean
  canWithdraw: boolean
  canAdminReview: boolean
  isAdmin: boolean
}

export function RequestActions({ requestId, status, canEdit, canSubmit, canWithdraw, canAdminReview, isAdmin }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [error, setError] = useState('')

  async function performAction(action: string) {
    setLoading(action)
    setError('')
    const supabase = createClient()

    let update: Record<string, unknown> = {}

    if (action === 'submit') {
      update = { status: 'submitted' }
    } else if (action === 'withdraw') {
      update = { status: 'draft' }
    } else if (action === 'start_review') {
      update = { status: 'under_review' }
    } else if (action === 'approve') {
      update = { status: 'approved' }
    } else if (action === 'reject') {
      if (!rejectionReason.trim()) {
        setError('Please provide a reason for rejection.')
        setLoading(null)
        return
      }
      update = { status: 'rejected', rejection_reason: rejectionReason }
    }

    const { error: err } = await supabase
      .from('purchase_requests')
      .update(update)
      .eq('id', requestId)

    if (err) {
      setError(err.message)
    } else {
      router.refresh()
      setShowRejectForm(false)
    }
    setLoading(null)
  }

  if (!canEdit && !canSubmit && !canWithdraw && !canAdminReview && status !== 'approved') {
    return null
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {canEdit && (
          <Link href={`/requests/${requestId}/edit`} className="block">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Edit className="w-4 h-4 mr-2" />Edit Request
            </Button>
          </Link>
        )}
        {canSubmit && (
          <Button
            size="sm"
            className="w-full justify-start"
            loading={loading === 'submit'}
            onClick={() => performAction('submit')}
          >
            <Send className="w-4 h-4 mr-2" />Submit for Review
          </Button>
        )}
        {canWithdraw && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            loading={loading === 'withdraw'}
            onClick={() => performAction('withdraw')}
          >
            <RotateCcw className="w-4 h-4 mr-2" />Withdraw to Draft
          </Button>
        )}

        {canAdminReview && status === 'submitted' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            loading={loading === 'start_review'}
            onClick={() => performAction('start_review')}
          >
            Start Review
          </Button>
        )}

        {canAdminReview && (
          <>
            <Button
              size="sm"
              className="w-full justify-start bg-green-600 hover:bg-green-700"
              loading={loading === 'approve'}
              onClick={() => performAction('approve')}
            >
              <CheckCircle className="w-4 h-4 mr-2" />Approve
            </Button>
            {!showRejectForm ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowRejectForm(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />Reject
              </Button>
            ) : (
              <div className="space-y-2 border border-red-200 rounded-md p-3 bg-red-50">
                <label className="text-xs font-medium text-red-700">Reason for rejection</label>
                <textarea
                  className="w-full rounded border border-red-300 bg-white px-2 py-1.5 text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-red-400"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 flex-1"
                    loading={loading === 'reject'}
                    onClick={() => performAction('reject')}
                  >
                    Confirm Reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowRejectForm(false); setRejectionReason('') }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {isAdmin && status === 'approved' && (
          <Link href={`/orders/new?request=${requestId}`} className="block">
            <Button size="sm" className="w-full justify-start bg-indigo-600 hover:bg-indigo-700">
              <ShoppingCart className="w-4 h-4 mr-2" />Create Purchase Order
            </Button>
          </Link>
        )}

        {error && <p className="text-xs text-[var(--destructive)] bg-red-50 px-2 py-1.5 rounded">{error}</p>}
      </CardContent>
    </Card>
  )
}
