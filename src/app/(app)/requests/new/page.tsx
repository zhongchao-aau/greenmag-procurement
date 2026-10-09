'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, RefreshCw, AlertCircle } from 'lucide-react'

type RequestType = 'procure' | 'build' | 'component_update'

interface RequestItem {
  component_id: string
  quantity: string
  unit: string
  notes: string
}

interface Component {
  id: string
  code: string
  name: string
  unit: string
}

interface Product {
  id: string
  code: string
  name: string
}

interface Variant {
  id: string
  code: string
  name: string
  product_id: string
}

interface BomLine {
  id: string
  quantity: number
  unit: string | null
  notes: string | null
  component: { id: string; code: string; name: string; unit: string | null } | null
}

export default function NewRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [requestType, setRequestType] = useState<RequestType>('procure')

  const [components, setComponents] = useState<Component[]>([])
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const [items, setItems] = useState<RequestItem[]>([
    { component_id: '', quantity: '', unit: '', notes: '' }
  ])

  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [bomLines, setBomLines] = useState<BomLine[]>([])
  const [inventory, setInventory] = useState<Record<string, number>>({})
  const [bomLoading, setBomLoading] = useState(false)
  const [buildItems, setBuildItems] = useState<RequestItem[]>([])

  const [updateComponentId, setUpdateComponentId] = useState('')
  const [updateDescription, setUpdateDescription] = useState('')

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const [compsRes, prodsRes] = await Promise.all([
        supabase.from('components').select('id, code, name, unit').eq('is_active', true).order('code'),
        supabase.from('products').select('id, code, name').order('code'),
      ])
      setComponents(compsRes.data ?? [])
      setProducts(prodsRes.data ?? [])
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!selectedProductId) { setVariants([]); setSelectedVariantId(''); return }
    const supabase = createClient()
    supabase.from('product_variants').select('id, code, name, product_id').eq('product_id', selectedProductId).order('code')
      .then(({ data }) => { setVariants(data ?? []); setSelectedVariantId('') })
  }, [selectedProductId])

  const loadBom = useCallback(async (variantId: string) => {
    if (!variantId) { setBomLines([]); setInventory({}); setBuildItems([]); return }
    setBomLoading(true)
    const supabase = createClient()
    const { data: bomData } = await supabase
      .from('bill_of_materials')
      .select('id, quantity, unit, notes, component:components(id, code, name, unit)')
      .eq('variant_id', variantId)
    const lines: BomLine[] = (bomData ?? []) as BomLine[]
    setBomLines(lines)
    const componentIds = lines.map(l => l.component?.id).filter(Boolean) as string[]
    if (componentIds.length > 0) {
      const { data: balances } = await supabase.from('inventory_balances').select('component_id, quantity').in('component_id', componentIds)
      const invMap: Record<string, number> = {}
      for (const b of balances ?? []) invMap[b.component_id] = (invMap[b.component_id] ?? 0) + (b.quantity as number)
      setInventory(invMap)
      const shortfallItems: RequestItem[] = lines.map(line => {
        const comp = line.component
        if (!comp) return null
        const available = invMap[comp.id] ?? 0
        const shortfall = line.quantity - available
        if (shortfall <= 0) return null
        return { component_id: comp.id, quantity: String(shortfall), unit: line.unit ?? comp.unit ?? '', notes: `BOM needs ${line.quantity}; in stock: ${available}` }
      }).filter(Boolean) as RequestItem[]
      setBuildItems(shortfallItems)
    } else {
      setInventory({})
      setBuildItems([])
    }
    setBomLoading(false)
  }, [])

  useEffect(() => { loadBom(selectedVariantId) }, [selectedVariantId, loadBom])

  function setItem(index: number, field: keyof RequestItem, value: string) {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'component_id') { const comp = components.find(c => c.id === value); if (comp) updated[index].unit = comp.unit }
      return updated
    })
  }

  function setBuildItem(index: number, field: keyof RequestItem, value: string) {
    setBuildItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'component_id') { const comp = components.find(c => c.id === value); if (comp) updated[index].unit = comp.unit }
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent, asDraft: boolean) {
    e.preventDefault()
    setError('')
    let validItems: RequestItem[] = []
    if (requestType === 'procure') {
      validItems = items.filter(i => i.component_id && i.quantity)
      if (validItems.length === 0) { setError('Add at least one component to the request.'); return }
    } else if (requestType === 'build') {
      if (!selectedVariantId) { setError('Select a product variant.'); return }
      validItems = buildItems.filter(i => i.component_id && i.quantity)
    } else if (requestType === 'component_update') {
      if (!updateComponentId) { setError('Select a component to update.'); return }
      if (!updateDescription.trim()) { setError('Describe the change needed.'); return }
    }
    setLoading(true)
    const supabase = createClient()
    const { data: req, error: reqErr } = await supabase
      .from('purchase_requests')
      .insert({ purpose: purpose || null, notes: notes || null, status: asDraft ? 'draft' : 'submitted', request_type: requestType, variant_id: requestType === 'build' ? selectedVariantId : null })
      .select('id').single()
    if (reqErr || !req) { setError(reqErr?.message ?? 'Failed to create request'); setLoading(false); return }
    if (requestType === 'component_update') {
      await supabase.from('request_items').insert({ request_id: req.id, component_id: updateComponentId, quantity_requested: 0, notes: updateDescription })
    } else if (validItems.length > 0) {
      await supabase.from('request_items').insert(validItems.map(item => ({ request_id: req.id, component_id: item.component_id, quantity_requested: parseFloat(item.quantity), notes: item.notes || null })))
    }
    router.push(`/requests/${req.id}`)
    router.refresh()
  }

  const TAB_LABELS: Record<RequestType, string> = { procure: 'Procure', build: 'Build Product', component_update: 'Component Update' }
  const PAGE_TITLES: Record<RequestType, string> = {
    procure: 'New Purchase Request',
    build: 'New Build Request',
    component_update: 'New Component Update',
  }
  const PAGE_SUBTITLES: Record<RequestType, string> = {
    procure: 'Request components for procurement. An admin will review and approve.',
    build: 'Select a product variant — the form auto-calculates BOM shortfall and fills in what needs ordering.',
    component_update: 'Request a change to an existing component\'s details.',
  }
  const sel = 'w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/requests" className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Requests
      </Link>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{PAGE_TITLES[requestType]}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{PAGE_SUBTITLES[requestType]}</p>
      </div>
      <div className="flex gap-1 mb-6 bg-[var(--secondary)] p-1 rounded-lg">
        {(['procure', 'build', 'component_update'] as RequestType[]).map(type => (
          <button key={type} type="button" onClick={() => { setRequestType(type); setError('') }}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${requestType === type ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}>
            {TAB_LABELS[type]}
          </button>
        ))}
      </div>
      <form onSubmit={e => handleSubmit(e, false)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Purpose / Project" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Q4 magnet assembly batch, Lab prototype build..." hint="Brief description of why this request is needed." />
            <div>
              <label className="block text-sm font-medium mb-1.5">Additional Notes</label>
              <textarea className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Urgency, special requirements, preferred delivery date..." />
            </div>
          </CardContent>
        </Card>

        {requestType === 'procure' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Components to Request</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => setItems(prev => [...prev, { component_id: '', quantity: '', unit: '', notes: '' }])}>
                  <Plus className="w-4 h-4 mr-1.5" />Add Component
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-5">
                    {index === 0 && <label className="block text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">Component <span className="text-[var(--destructive)]">*</span></label>}
                    <select className={sel} value={item.component_id} onChange={e => setItem(index, 'component_id', e.target.value)}>
                      <option value="">— Select —</option>
                      {components.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <label className="block text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">Quantity <span className="text-[var(--destructive)]">*</span></label>}
                    <input type="number" min="0.01" step="0.01" className={sel} value={item.quantity} onChange={e => setItem(index, 'quantity', e.target.value)} placeholder="0" />
                  </div>
                  <div className="col-span-1">
                    {index === 0 && <label className="block text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">Unit</label>}
                    <p className="py-2 text-sm text-[var(--muted-foreground)]">{item.unit || '—'}</p>
                  </div>
                  <div className="col-span-3">
                    {index === 0 && <label className="block text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">Note</label>}
                    <input type="text" className={sel} value={item.notes} onChange={e => setItem(index, 'notes', e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {index === 0 && <div className="h-[22px] mb-1.5" />}
                    {items.length > 1 && <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== index))} className="p-2 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {requestType === 'build' && (
          <>
            <Card>
              <CardHeader><CardTitle>Product Variant</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Product <span className="text-[var(--destructive)]">*</span></label>
                  <select className={sel} value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                    <option value="">— Select product —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                  </select>
                </div>
                {selectedProductId && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Variant <span className="text-[var(--destructive)]">*</span></label>
                    <select className={sel} value={selectedVariantId} onChange={e => setSelectedVariantId(e.target.value)}>
                      <option value="">— Select variant —</option>
                      {variants.map(v => <option key={v.id} value={v.id}>{v.code} · {v.name}</option>)}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedVariantId && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>BOM &amp; Inventory Check</CardTitle>
                    <button type="button" onClick={() => loadBom(selectedVariantId)} className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                      <RefreshCw className="w-3 h-3" />Refresh
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {bomLoading ? <p className="text-sm text-[var(--muted-foreground)]">Loading BOM...</p> : bomLines.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">No BOM defined for this variant.</p> : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
                          <th className="pb-2 font-medium">Component</th>
                          <th className="pb-2 font-medium text-right">BOM Qty</th>
                          <th className="pb-2 font-medium text-right">In Stock</th>
                          <th className="pb-2 font-medium text-right">Shortfall</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomLines.map(line => {
                          const compId = line.component?.id ?? ''
                          const available = inventory[compId] ?? 0
                          const shortfall = line.quantity - available
                          return (
                            <tr key={line.id} className="border-b border-[var(--border)] last:border-0">
                              <td className="py-2"><span className="font-medium">{line.component?.name ?? '—'}</span><span className="ml-2 font-mono text-xs text-[var(--muted-foreground)]">{line.component?.code}</span></td>
                              <td className="py-2 text-right">{line.quantity} {line.unit ?? line.component?.unit ?? ''}</td>
                              <td className="py-2 text-right">{available}</td>
                              <td className={`py-2 text-right font-semibold ${shortfall > 0 ? 'text-red-600' : 'text-green-600'}`}>{shortfall > 0 ? `+${shortfall}` : shortfall}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedVariantId && !bomLoading && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Components to Procure</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={() => setBuildItems(prev => [...prev, { component_id: '', quantity: '', unit: '', notes: '' }])}>
                      <Plus className="w-4 h-4 mr-1.5" />Add Line
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {buildItems.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 px-3 py-2.5 rounded-md">
                      <AlertCircle className="w-4 h-4 shrink-0" />All BOM components are sufficiently stocked. Add lines manually if needed.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {buildItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 items-start">
                          <div className="col-span-5">
                            {index === 0 && <label className="block text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">Component</label>}
                            <select className={sel} value={item.component_id} onChange={e => setBuildItem(index, 'component_id', e.target.value)}>
                              <option value="">— Select —</option>
                              {components.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2">
                            {index === 0 && <label className="block text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">Qty</label>}
                            <input type="number" min="0.01" step="0.01" className={sel} value={item.quantity} onChange={e => setBuildItem(index, 'quantity', e.target.value)} />
                          </div>
                          <div className="col-span-1">
                            {index === 0 && <label className="block text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">Unit</label>}
                            <p className="py-2 text-sm text-[var(--muted-foreground)]">{item.unit || '—'}</p>
                          </div>
                          <div className="col-span-3">
                            {index === 0 && <label className="block text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">Note</label>}
                            <input type="text" className={sel} value={item.notes} onChange={e => setBuildItem(index, 'notes', e.target.value)} placeholder="Optional" />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            {index === 0 && <div className="h-[22px] mb-1.5" />}
                            <button type="button" onClick={() => setBuildItems(prev => prev.filter((_, i) => i !== index))} className="p-2 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {requestType === 'component_update' && (
          <Card>
            <CardHeader><CardTitle>Component Update Request</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Component <span className="text-[var(--destructive)]">*</span></label>
                <select className={sel} value={updateComponentId} onChange={e => setUpdateComponentId(e.target.value)}>
                  <option value="">— Select component to update —</option>
                  {components.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Change Description <span className="text-[var(--destructive)]">*</span></label>
                <textarea className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent" value={updateDescription} onChange={e => setUpdateDescription(e.target.value)} placeholder="Describe the change needed: new supplier, spec update, price change, unit correction, etc." />
              </div>
            </CardContent>
          </Card>
        )}

        {error && <p className="text-sm text-[var(--destructive)] bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={loading}>Submit Request</Button>
          <Button type="button" variant="outline" loading={loading} onClick={e => handleSubmit(e, true)}>Save as Draft</Button>
          <Link href="/requests"><Button type="button" variant="ghost">Cancel</Button></Link>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">Submitting sends the request to admin for review. Saving as draft lets you continue editing later.</p>
      </form>
    </div>
  )
}
