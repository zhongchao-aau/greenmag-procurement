'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  created: [{ label: 'Mark China Dispatched', next: 'china_dispatched' }],
  china_dispatched: [{ label: 'Mark In Transit (Int\'l)', next: 'in_transit' }],
  in_transit: [
    { label: 'At Customs', next: 'customs' },
    { label: 'EU Transit', next: 'eu_transit' },
  ],
  customs: [{ label: 'Cleared Customs', next: 'eu_transit' }],
  eu_transit: [{ label: 'Mark Delivered', next: 'delivered' }],
}

export function ShipmentActions({ shipmentId, status, isDelivered }: { shipmentId: string; status: string; isDelivered: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [event, setEvent] = useState({ description: '', location: '', tracking_leg: 'eu' as 'china' | 'eu', event_date: new Date().toISOString().split('T')[0] })
  const [error, setError] = useState('')

  const transitions = TRANSITIONS[status] ?? []

  async function performTransition(next: string) {
    setLoading(next)
    setError('')
    const supabase = createClient()
    const update: Record<string, unknown> = { status: next }
    if (next === 'delivered') update.actual_delivery = new Date().toISOString()
    const { error: err } = await supabase.from('shipments').update(update).eq('id', shipmentId)
    if (err) setError(err.message)
    else router.refresh()
    setLoading(null)
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault()
    setLoading('event')
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('shipment_events').insert({
      shipment_id: shipmentId,
      description: event.description,
      location: event.location || null,
      tracking_leg: event.tracking_leg,
      event_date: event.event_date,
    })
    if (err) setError(err.message)
    else {
      router.refresh()
      setShowEventForm(false)
      setEvent({ description: '', location: '', tracking_leg: 'eu', event_date: new Date().toISOString().split('T')[0] })
    }
    setLoading(null)
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {transitions.map(t => (
          <Button key={t.next} size="sm" variant="outline" className="w-full justify-start"
            loading={loading === t.next} onClick={() => performTransition(t.next)}>
            {t.label}
          </Button>
        ))}

        {!showEventForm ? (
          <Button size="sm" variant="ghost" className="w-full justify-start text-[var(--muted-foreground)]"
            onClick={() => setShowEventForm(true)}>
            + Add Tracking Event
          </Button>
        ) : (
          <form onSubmit={addEvent} className="border border-[var(--border)] rounded-md p-3 space-y-2 bg-[var(--secondary)]">
            <p className="text-xs font-medium">Add Tracking Event</p>
            <input
              type="text"
              className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              placeholder="e.g. Departed Shenzhen hub"
              value={event.description}
              onChange={e => setEvent(ev => ({ ...ev, description: e.target.value }))}
              required
            />
            <input
              type="text"
              className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              placeholder="Location (optional)"
              value={event.location}
              onChange={e => setEvent(ev => ({ ...ev, location: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                value={event.tracking_leg}
                onChange={e => setEvent(ev => ({ ...ev, tracking_leg: e.target.value as 'china' | 'eu' }))}
              >
                <option value="china">🇨🇳 China</option>
                <option value="eu">🇪🇺 EU</option>
              </select>
              <input
                type="date"
                className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                value={event.event_date}
                onChange={e => setEvent(ev => ({ ...ev, event_date: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" type="submit" loading={loading === 'event'} className="flex-1">Add</Button>
              <Button size="sm" type="button" variant="outline" onClick={() => setShowEventForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      </CardContent>
    </Card>
  )
}
