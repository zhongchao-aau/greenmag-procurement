'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus } from 'lucide-react'

interface AddVariantFormProps {
  productId: string
}

export function AddVariantForm({ productId }: AddVariantFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', status: 'active' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: insertError } = await supabase
      .from('product_variants')
      .insert({
        product_id: productId,
        code: '',
        name: form.name,
        description: form.description || null,
        status: form.status,
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setForm({ name: '', description: '', status: 'active' })
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-dashed border-[var(--border)] rounded-md px-4 py-2 text-sm text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full"
      >
        <Plus className="w-4 h-4" />
        Add Variant
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)] space-y-3">
      <h3 className="text-sm font-semibold">New Variant</h3>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Name <span className="text-red-500">*</span></label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="e.g. Standard"
            className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            {['active', 'prototype', 'obsolete', 'discontinued'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Description</label>
        <input
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Optional..."
          className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--primary)] text-white px-4 py-1.5 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Adding...' : 'Add Variant'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-1.5 border border-[var(--border)] rounded-md text-sm hover:bg-[var(--secondary)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
