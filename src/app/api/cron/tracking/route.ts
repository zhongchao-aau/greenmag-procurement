/**
 * GET /api/cron/tracking
 * Vercel cron endpoint — refreshes tracking for all active shipments.
 * Protected by CRON_SECRET env var (set in Vercel project settings).
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Call the existing refresh endpoint internally
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  try {
    const res = await fetch(`${baseUrl}/api/tracking/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward auth if present (cron runs without user session — use service key instead)
        ...(process.env.SUPABASE_SERVICE_ROLE_KEY
          ? { 'x-cron-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY }
          : {}),
      },
      body: JSON.stringify({}),
    })

    const data = await res.json()
    return NextResponse.json({ ok: true, ...data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
