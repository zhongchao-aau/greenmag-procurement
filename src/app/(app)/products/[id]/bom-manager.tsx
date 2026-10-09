'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus } from 'lucide-react'

interface Component {
  id: string
  code: string
  name: string
  unit: string | null
}

interface BomManagerProps {
  variantId: string
  components: Component[]
}

export function BomManager({ variantId, components }: BomManagerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    component_id: '',
    quantity: '',
    unit: '',
    notes: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.component_id || !form.quantity) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: insertError } = await supabase
      .from('bill_of_materials')
      .insert({
        variant_id: variantId,
        component_id: form.component_id,
        quantity: parseFloat(form.quantity),
        unit: form.unit || null,
        notes: form.notes || null,
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setForm({ component_id: '', quantity: '', unit: '', notes: '' })
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline"
      >
        <Plus className="w-3 h-3" />
        Add Component to BOM
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--border)] rounded-md p-3 bg-[var(--secondary)] space-y-3 mt-2">
      <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Add to BOM</h4>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1">Component <span className="text-red-500">*</span></label>
          <select
            name="component_id"
            value={form.component_id}
            onChange={handleChange}
            required
            className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-xs bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            <option value="">Select component...</option>
            {components.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Quantity <span className="text-red-500">*</span></label>
          <input
            name="quantity"
            type="number"
            step="any"
            min="0.0001"
            value={form.quantity}
            onChange={handleChange}
            required
            placeholder="e.g. 4"
            className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-xs bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Unit (override)</label>
          <input
            name="unit"
            value={form.unit}
            onChange={handleChange}
            placeholder="Leave blank for default"
            className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-xs bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1">Notes</label>
          <input
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Optional notes..."
            className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-xs bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--primary)] text-white px-3 py-1 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Adding...' : 'Add to BOM'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1 border border-[var(--border)] rounded text-xs hover:bg-[var(--card)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
