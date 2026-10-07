'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewSupplierPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', country: '', contact_name: '', contact_email: '',
    contact_phone: '', website: '', lead_time_days: '', notes: ''
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('suppliers') as any).insert({
      name: form.name,
      country: form.country || null,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      website: form.website || null,
      lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null,
      notes: form.notes || null,
      is_active: true,
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/suppliers')
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/suppliers" className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Suppliers
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Add New Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Supplier Name" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Shenzhen Magnetics Co." />
            <Input label="Country" value={form.country} onChange={e => set('country', e.target.value)} placeholder="e.g. China" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Contact Name" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="e.g. Li Wei" />
              <Input label="Contact Email" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="contact@supplier.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Contact Phone" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+86 ..." />
              <Input label="Website" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
            </div>
            <Input label="Typical Lead Time (days)" type="number" min="0" value={form.lead_time_days} onChange={e => set('lead_time_days', e.target.value)} placeholder="e.g. 30" />
            <div>
              <label className="block text-sm font-medium mb-1.5">Notes</label>
              <textarea
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any additional notes about this supplier..."
              />
            </div>
            {error && <p className="text-sm text-[var(--destructive)] bg-red-50 px-3 py-2 rounded-md">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading}>Add Supplier</Button>
              <Link href="/suppliers"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
