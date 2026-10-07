import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState } from '@/components/ui/table'
import { Plus, ExternalLink, MapPin } from 'lucide-react'
export const dynamic = 'force-dynamic'

export default async function SuppliersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single() as any
  const profile = profileData as { role: string } | null
  if (!profile) redirect('/login')
  const isAdmin = profile.role === 'admin'

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Suppliers</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{(suppliers ?? []).length} suppliers registered</p>
        </div>
        {isAdmin && (
          <Link href="/suppliers/new">
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Supplier</Button>
          </Link>
        )}
      </div>

      <div className="card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(suppliers ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    title="No suppliers yet"
                    description={isAdmin ? 'Add your first supplier to get started.' : 'No suppliers have been added yet.'}
                    action={isAdmin ? <Link href="/suppliers/new"><Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Supplier</Button></Link> : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              (suppliers ?? []).map((s: {
                id: string; name: string; country: string | null; contact_name: string | null;
                contact_email: string | null; website: string | null; lead_time_days: number | null; is_active: boolean
              }) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <Link href={`/suppliers/${s.id}`} className="hover:text-[var(--primary)]">{s.name}</Link>
                  </TableCell>
                  <TableCell>
                    {s.country ? (
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-[var(--muted-foreground)]" />{s.country}
                      </span>
                    ) : <span className="text-[var(--muted-foreground)]">—</span>}
                  </TableCell>
                  <TableCell>
                    {s.contact_name ? (
                      <div>
                        <p className="text-sm">{s.contact_name}</p>
                        {s.contact_email && <p className="text-xs text-[var(--muted-foreground)]">{s.contact_email}</p>}
                      </div>
                    ) : <span className="text-[var(--muted-foreground)]">—</span>}
                  </TableCell>
                  <TableCell>{s.lead_time_days ? `${s.lead_time_days} days` : '—'}</TableCell>
                  <TableCell>
                    <Badge className={s.is_active ? 'badge-approved' : 'badge-cancelled'}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {s.website && (
                        <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--primary)]">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <Link href={`/suppliers/${s.id}`} className="text-xs text-[var(--primary)] hover:underline">View</Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
