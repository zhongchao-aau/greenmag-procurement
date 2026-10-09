import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { AddVariantForm } from './add-variant-form'
import { BomManager } from './bom-manager'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (!product) notFound()

  const { data: variants } = await supabase
    .from('product_variants')
    .select(`
      id, code, name, description, status,
      bill_of_materials(
        id, quantity, unit, notes,
        component:components(id, code, name, unit)
      )
    `)
    .eq('product_id', id)
    .order('created_at', { ascending: true })

  const { data: components } = await supabase
    .from('components')
    .select('id, code, name, unit')
    .order('name', { ascending: true })

  const isAdmin = profile?.role === 'admin'

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    prototype: 'bg-blue-100 text-blue-800',
    obsolete: 'bg-yellow-100 text-yellow-800',
    discontinued: 'bg-red-100 text-red-800',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/products" className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{product.name}</h1>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[product.status] ?? 'bg-gray-100 text-gray-800'}`}>
                {product.status}
              </span>
            </div>
            <p className="font-mono text-sm text-[var(--muted-foreground)]">{product.code}</p>
            {product.category && (
              <p className="text-sm text-[var(--muted-foreground)] mt-1">{product.category}</p>
            )}
            {product.description && (
              <p className="text-sm mt-2 text-[var(--foreground)]">{product.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Variants Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Variants</h2>
          <span className="text-sm text-[var(--muted-foreground)]">{variants?.length ?? 0} variant(s)</span>
        </div>

        {isAdmin && (
          <AddVariantForm productId={id} />
        )}

        {(!variants || variants.length === 0) ? (
          <div className="text-center py-8 border border-dashed border-[var(--border)] rounded-lg mt-4">
            <p className="text-[var(--muted-foreground)] text-sm">No variants yet. Add a variant above.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {variants.map(variant => (
              <div key={variant.id} className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--card)]">
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--secondary)] border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium text-[var(--primary)]">{variant.code}</span>
                    <span className="font-medium text-sm">{variant.name}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[variant.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      {variant.status}
                    </span>
                  </div>
                </div>

                {/* BOM for this variant */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Bill of Materials</h3>
                    <span className="text-xs text-[var(--muted-foreground)]">{variant.bill_of_materials?.length ?? 0} component(s)</span>
                  </div>

                  {variant.bill_of_materials && variant.bill_of_materials.length > 0 ? (
                    <table className="w-full text-sm mb-3">
                      <thead>
                        <tr className="text-left text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
                          <th className="pb-2 font-medium">Component</th>
                          <th className="pb-2 font-medium">Code</th>
                          <th className="pb-2 font-medium">Qty</th>
                          <th className="pb-2 font-medium">Unit</th>
                          <th className="pb-2 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variant.bill_of_materials.map((bom: {
                          id: string
                          quantity: number
                          unit: string | null
                          notes: string | null
                          component: { id: string; code: string; name: string; unit: string | null } | null
                        }) => (
                          <tr key={bom.id} className="border-b border-[var(--border)] last:border-0">
                            <td className="py-2 font-medium">{bom.component?.name ?? '—'}</td>
                            <td className="py-2 font-mono text-xs text-[var(--muted-foreground)]">{bom.component?.code ?? '—'}</td>
                            <td className="py-2">{bom.quantity}</td>
                            <td className="py-2 text-[var(--muted-foreground)]">{bom.unit ?? bom.component?.unit ?? '—'}</td>
                            <td className="py-2 text-[var(--muted-foreground)]">{bom.notes ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-[var(--muted-foreground)] mb-3">No components in BOM yet.</p>
                  )}

                  {isAdmin && components && (
                    <BomManager variantId={variant.id} components={components} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
