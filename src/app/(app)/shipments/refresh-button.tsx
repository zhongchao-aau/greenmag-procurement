'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function RefreshAllTrackingButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/tracking/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refresh failed')
      setResult(`Updated ${data.updated} shipment${data.updated !== 1 ? 's' : ''}`)
      router.refresh()
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Error')
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      {result && <span className="text-xs text-[var(--muted-foreground)]">{result}</span>}
      <Button size="sm" variant="outline" loading={loading} onClick={refresh}>
        <RefreshCw className="w-4 h-4 mr-1.5" />Refresh Tracking
      </Button>
    </div>
  )
}
