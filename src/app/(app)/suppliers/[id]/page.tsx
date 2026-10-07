import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Edit, Globe, Mail, Phone, MapPin, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Supplier } from '@/types/database'

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single() as any
  const profile = profileData as { role: string } | null
  if (!profile) redirect('/login')
  const isAdmin = profile.role === 'admin'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: supplierData } = await supabase.from('suppliers').select('*').eq('id', params.id).single() as any
  const supplier = supplierData as Supplier | null

  if (!supplier) notFound()

  // Components from this supplier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: componentsData } = await supabase.from('components').select('id, code, name, unit, is_active').eq('supplier_id', params.id).order('code').limit(20) as any
  const components = componentsData as { id: string; code: string; name: string; unit: string; is_active: boolean }[] | null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/suppliers" className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft className="w-4 h-4" />Back to Suppliers
        </Link>
        {isAdmin && (
          <Link href={`/suppliers/${params.id}/edit`}>
            <Button size="sm" variant="outline"><Edit className="w-3.5 h-3.5 mr-1.5" />Edit</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{supplier.name}</CardTitle>
                  {supplier.country && (
                    <p className="text-sm text-[var(--muted-foreground)] flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" />{supplier.country}
                    </p>
                  )}
                </div>
                <Badge className={supplier.is_active ? 'badge-approved' : 'badge-cancelled'}>
                  {supplier.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {supplier.contact_name && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[var(--muted-foreground)] w-28 shrink-0">Contact</span>
                  <span>{supplier.contact_name}</span>
                </div>
              )}
              {supplier.contact_email && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[var(--muted-foreground)] w-28 shrink-0">Email</span>
                  <a href={`mailto:${supplier.contact_email}`} className="flex items-center gap-1 text-[var(--primary)] hover:underline">
                    <Mail className="w-3.5 h-3.5" />{supplier.contact_email}
                  </a>
                </div>
              )}
              {supplier.contact_phone && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[var(--muted-foreground)] w-28 shrink-0">Phone</span>
                  <a href={`tel:${supplier.contact_phone}`} className="flex items-center gap-1 text-[var(--primary)] hover:underline">
                    <Phone className="w-3.5 h-3.5" />{supplier.contact_phone}
                  </a>
                </div>
              )}
              {supplier.website && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[var(--muted-foreground)] w-28 shrink-0">Website</span>
                  <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[var(--primary)] hover:underline">
                    <Globe className="w-3.5 h-3.5" />{supplier.website}
                  </a>
                </div>
              )}
              {supplier.lead_time_days && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[var(--muted-foreground)] w-28 shrink-0">Lead Time</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />{supplier.lead_time_days} days typical</span>
                </div>
              )}
              {supplier.notes && (
                <div className="pt-3 border-t border-[var(--border)]">
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">Notes</p>
                  <p className="text-sm">{supplier.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Components from this supplier */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Components</CardTitle>
                <Link href={`/components?supplier=${params.id}`} className="text-xs text-[var(--primary)] hover:underline">View all →</Link>
              </div>
            </CardHeader>
            <CardContent>
              {(components ?? []).length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">No components from this supplier yet.</p>
              ) : (
                <div className="space-y-2">
                  {(components ?? []).map((c) => (
                    <Link
                      key={c.id}
                      href={`/components/${c.id}`}
                      className="flex items-center justify-between p-2.5 rounded-md hover:bg-[var(--secondary)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-[var(--muted-foreground)] w-24 shrink-0">{c.code}</span>
                        <span className="text-sm">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--muted-foreground)]">{c.unit}</span>
                        {!c.is_active && <Badge className="badge-cancelled text-xs">Inactive</Badge>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Added</span>
                <span>{formatDate(supplier.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Components</span>
                <span>{(components ?? []).length ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
