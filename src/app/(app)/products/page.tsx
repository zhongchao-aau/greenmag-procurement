import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Factory } from 'lucide-react'

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: products } = await supabase
    .from('products')
    .select(`
      id, code, name, category, status, created_at,
      product_variants(count)
    `)
    .order('created_at', { ascending: false })

  const isAdmin = profile?.role === 'admin'

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    prototype: 'bg-blue-100 text-blue-800',
    obsolete: 'bg-yellow-100 text-yellow-800',
    discontinued: 'bg-red-100 text-red-800',
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Products</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            Manage products, variants, and bill of materials
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/products/new"
            className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Product
          </Link>
        )}
      </div>

      {(!products || products.length === 0) ? (
        <div className="text-center py-16 border border-dashed border-[var(--border)] rounded-lg">
          <Factory className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
          <p className="text-[var(--muted-foreground)]">No products yet</p>
          {isAdmin && (
            <Link
              href="/products/new"
              className="mt-4 inline-flex items-center gap-2 text-[var(--primary)] text-sm font-medium hover:underline"
            >
              <Plus className="w-4 h-4" />
              Create your first product
            </Link>
          )}
        </div>
      ) : (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Code</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Name</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Category</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Variants</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Created</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const variantCount = Array.isArray(p.product_variants)
                  ? p.product_variants[0]?.count ?? 0
                  : 0
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--secondary)] transition-colors ${i % 2 === 0 ? '' : 'bg-[var(--secondary)]/30'}`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/products/${p.id}`} className="font-mono text-[var(--primary)] hover:underline font-medium">
                        {p.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/products/${p.id}`} className="hover:text-[var(--primary)] transition-colors">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{p.category || '—'}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{variantCount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status] ?? 'bg-gray-100 text-gray-800'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
