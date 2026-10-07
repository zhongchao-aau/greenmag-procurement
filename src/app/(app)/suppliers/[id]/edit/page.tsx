'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function EditSupplierPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', country: '', contact_name: '', contact_email: '',
    contact_phone: '', website: '', lead_time_days: '', notes: '', is_active: true
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase.from('suppliers').select('*').eq('id', id).single()
      if (data) {
        setForm({
          name: data.name ?? '',
          country: data.country ?? '',
          contact_name: data.contact_name ?? '',
          contact_email: data.contact_email ?? '',
          contact_phone: data.contact_phone ?? '',
          website: data.website ?? '',
          lead_time_days: data.lead_time_days?.toString() ?? '',
          notes: data.notes ?? '',
          is_active: data.is_active ?? true,
        })
      }
      setLoading(false)
    }
    load()
  }, [id])

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('suppliers').update({
      name: form.name,
      country: form.country || null,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      website: form.website || null,
      lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null,
      notes: form.notes || null,
      is_active: form.is_active,
    }).eq('id', id)
    if (error) { setError(error.message); setSaving(false); return }
    router.push(`/suppliers/${id}`)
    router.refresh()
  }

  if (loading) return <div className="p-6 text-sm text-[var(--muted-foreground)]">Loading...</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href={`/suppliers/${id}`} className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Supplier
      </Link>
      <Card>
        <CardHeader><CardTitle>Edit Supplier</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Supplier Name" value={form.name} onChange={e => set('name', e.target.value)} required />
            <Input label="Country" value={form.country} onChange={e => set('country', e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Contact Name" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
              <Input label="Contact Email" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Contact Phone" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
              <Input label="Website" value={form.website} onChange={e => set('website', e.target.value)} />
            </div>
            <Input label="Typical Lead Time (days)" type="number" min="0" value={form.lead_time_days} onChange={e => set('lead_time_days', e.target.value)} />
            <div>
              <label className="block text-sm font-medium mb-1.5">Notes</label>
              <textarea
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={e => set('is_active', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm">Active supplier</label>
            </div>
            {error && <p className="text-sm text-[var(--destructive)] bg-red-50 px-3 py-2 rounded-md">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={saving}>Save Changes</Button>
              <Link href={`/suppliers/${id}`}><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
