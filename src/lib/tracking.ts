/**
 * Carrier tracking utilities for GreenMag Procurement
 *
 * Supports: UPS, FedEx, DHL
 * Uses Aftership API (AFTERSHIP_API_KEY env var) as the primary aggregator.
 * Falls back to direct carrier public APIs when no key is set.
 */

export type CarrierSlug = 'ups' | 'fedex' | 'dhl' | 'ups-mi' | 'unknown'

export interface TrackingResult {
  carrier: string
  trackingNumber: string
  status: string          // normalised: in_transit | customs | out_for_delivery | delivered | exception
  statusDetail: string    // human-readable description
  location: string
  estimatedDelivery?: string
  events: TrackingEvent[]
  updatedAt: string
}

export interface TrackingEvent {
  date: string
  location: string
  description: string
}

/** Detect carrier from tracking number format */
export function detectCarrier(trackingNumber: string): CarrierSlug {
  const tn = trackingNumber.trim().toUpperCase()
  if (/^1Z[A-Z0-9]{16}$/.test(tn)) return 'ups'
  if (/^\d{12}$/.test(tn) || /^\d{15}$/.test(tn) || /^\d{20}$/.test(tn)) return 'fedex'
  if (/^[0-9]{10}$/.test(tn) || /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(tn) || /^CP\d{9}DE$/i.test(tn)) return 'dhl'
  return 'unknown'
}

/** Normalise carrier-specific status strings to our shipment_status enum */
export function normaliseStatus(rawStatus: string): string {
  const s = rawStatus.toLowerCase()
  if (s.includes('delivered')) return 'delivered'
  if (s.includes('out for delivery') || s.includes('out_for_delivery')) return 'out_for_delivery'
  if (s.includes('customs') || s.includes('held') || s.includes('clearance')) return 'customs'
  if (s.includes('exception') || s.includes('failed') || s.includes('returned')) return 'exception'
  if (s.includes('in transit') || s.includes('in_transit') || s.includes('transit')) return 'in_transit'
  if (s.includes('dispatched') || s.includes('picked up') || s.includes('accepted')) return 'dispatched'
  return 'in_transit'
}

// ─── Aftership (aggregator, preferred) ───────────────────────────────────────

async function trackViaAftership(
  trackingNumber: string,
  carrier: CarrierSlug,
  apiKey: string
): Promise<TrackingResult> {
  const slug = carrier === 'ups' ? 'ups' : carrier === 'fedex' ? 'fedex' : 'dhl'
  const url = `https://api.aftership.com/v4/trackings/${slug}/${trackingNumber}`
  const res = await fetch(url, {
    headers: {
      'aftership-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Aftership ${res.status}: ${await res.text()}`)
  const json = await res.json()
  const t = json.data?.tracking
  if (!t) throw new Error('No tracking data in Aftership response')

  const events: TrackingEvent[] = (t.checkpoints || []).map((c: {checkpoint_time?: string, city?: string, message?: string}) => ({
    date: c.checkpoint_time || '',
    location: c.city || '',
    description: c.message || '',
  }))

  return {
    carrier: slug,
    trackingNumber,
    status: normaliseStatus(t.tag || ''),
    statusDetail: t.subtag_message || t.tag || '',
    location: t.destination_city || '',
    estimatedDelivery: t.expected_delivery || undefined,
    events,
    updatedAt: new Date().toISOString(),
  }
}

// ─── UPS public (unofficial) ─────────────────────────────────────────────────

async function trackUPS(trackingNumber: string): Promise<TrackingResult> {
  // UPS tracking page uses a JSON API endpoint
  const url = `https://www.ups.com/track/api/Track/GetStatus?loc=en_US`
  const body = JSON.stringify({
    Locale: 'en_US',
    TrackingNumber: [trackingNumber],
    TrackingOption: '01',
    SystemName: 'NESS',
    AccountNumber: '',
    Requester: 'st/trackdetails',
  })
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
      'X-XSRF-TOKEN': 'csrf',
    },
    body,
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`UPS API ${res.status}`)
  const json = await res.json()
  const pkg = json?.trackDetails?.[0]
  if (!pkg) throw new Error('No UPS tracking data')

  const rawStatus = pkg.packageStatus || 'Unknown'
  const events: TrackingEvent[] = (pkg.activities || []).map((a: {date?: string, location?: {city?: string}, description?: string}) => ({
    date: a.date || '',
    location: a.location?.city || '',
    description: a.description || '',
  }))

  return {
    carrier: 'ups',
    trackingNumber,
    status: normaliseStatus(rawStatus),
    statusDetail: pkg.statusDescription || rawStatus,
    location: pkg.deliveryDestination?.city || '',
    estimatedDelivery: pkg.scheduledDelivery,
    events,
    updatedAt: new Date().toISOString(),
  }
}

// ─── FedEx public (unofficial) ───────────────────────────────────────────────

async function trackFedEx(trackingNumber: string): Promise<TrackingResult> {
  const url = `https://www.fedex.com/trackingCal/track`
  const body = new URLSearchParams({
    data: JSON.stringify({
      TrackPackagesRequest: {
        appType: 'WTRK',
        uniqueKey: '',
        processingParameters: { anonymousTransaction: true, clientId: 'WTRK', returnDetailedErrors: true, returnLocalizedDateTime: false },
        trackingInfoList: [{ trackNumberInfo: { trackingNumber, trackingQualifier: '', trackingCarrier: '' } }],
      },
    }),
    action: 'trackpackages',
    locale: 'en_US',
    version: '1',
    format: 'json',
  })
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
    },
    body,
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`FedEx API ${res.status}`)
  const json = await res.json()
  const pkg = json?.TrackPackagesResponse?.packageList?.[0]
  if (!pkg) throw new Error('No FedEx data')

  const events: TrackingEvent[] = (pkg.scanEventList || []).map((e: {date?: string, scanLocation?: string, eventDescription?: string}) => ({
    date: e.date || '',
    location: e.scanLocation || '',
    description: e.eventDescription || '',
  }))

  return {
    carrier: 'fedex',
    trackingNumber,
    status: normaliseStatus(pkg.keyStatus || ''),
    statusDetail: pkg.statusDescription || pkg.keyStatus || '',
    location: pkg.destinationCity || '',
    estimatedDelivery: pkg.displayEstimatedDeliveryDate,
    events,
    updatedAt: new Date().toISOString(),
  }
}

// ─── DHL public ──────────────────────────────────────────────────────────────

async function trackDHL(trackingNumber: string): Promise<TrackingResult> {
  // DHL has a public REST API (no key for basic tracking)
  const url = `https://api-eu.dhl.com/track/shipments?trackingNumber=${encodeURIComponent(trackingNumber)}&service=express`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 0 },
  })
  // DHL also has a parcel API
  if (!res.ok) {
    const url2 = `https://api-eu.dhl.com/track/shipments?trackingNumber=${encodeURIComponent(trackingNumber)}`
    const res2 = await fetch(url2, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 0 } })
    if (!res2.ok) throw new Error(`DHL API ${res2.status}`)
  }
  const json = await res.json()
  const shp = json?.shipments?.[0]
  if (!shp) throw new Error('No DHL data')

  const events: TrackingEvent[] = (shp.events || []).map((e: {timestamp?: string, location?: {address?: {addressLocality?: string}}, description?: string}) => ({
    date: e.timestamp || '',
    location: e.location?.address?.addressLocality || '',
    description: e.description || '',
  }))

  const rawStatus = shp.status?.statusCode || shp.status?.description || 'transit'
  return {
    carrier: 'dhl',
    trackingNumber,
    status: normaliseStatus(rawStatus),
    statusDetail: shp.status?.description || rawStatus,
    location: shp.status?.location?.address?.addressLocality || '',
    estimatedDelivery: shp.estimatedTimeOfDelivery,
    events,
    updatedAt: new Date().toISOString(),
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Fetch tracking info for a single shipment.
 * Uses Aftership if AFTERSHIP_API_KEY is set, otherwise tries direct carrier APIs.
 */
export async function fetchTracking(
  trackingNumber: string,
  carrierHint?: string
): Promise<TrackingResult> {
  const tn = trackingNumber.trim()
  const carrier = (carrierHint?.toLowerCase() as CarrierSlug) || detectCarrier(tn)

  const aftershipKey = process.env.AFTERSHIP_API_KEY
  if (aftershipKey) {
    return trackViaAftership(tn, carrier, aftershipKey)
  }

  // Direct carrier fallback
  switch (carrier) {
    case 'ups': return trackUPS(tn)
    case 'fedex': return trackFedEx(tn)
    case 'dhl': return trackDHL(tn)
    default:
      throw new Error(`Unsupported carrier for tracking number ${tn}`)
  }
}
