'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const TRANSITIONS: Record<string, { label: string; next: string; style?: string }[]> = {
  draft: [{ label: 'Send to Supplier', next: 'sent', style: 'primary' }],
  sent: [
    { label: 'Mark as Confirmed', next: 'confirmed' },
    { label: 'Back to Draft', next: 'draft' },
  ],
  confirmed: [
    { label: 'Mark as Received', next: 'received' },
  ],
  received: [
    { label: 'Close Order', next: 'closed' },
  ],
}

export function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const transitions = TRANSITIONS[status] ?? []
  if (transitions.length === 0) return null

  async function performTransition(next: string) {
    setLoading(next)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('purchase_orders').update({ status: next }).eq('id', orderId)
    if (err) setError(err.message)
    else router.refresh()
    setLoading(null)
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {transitions.map(t => (
          <Button
            key={t.next}
            size="sm"
            variant={t.style === 'primary' ? 'primary' : 'outline'}
            className="w-full justify-start"
            loading={loading === t.next}
            onClick={() => performTransition(t.next)}
          >
            {t.label}
          </Button>
        ))}
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      </CardContent>
    </Card>
  )
}
