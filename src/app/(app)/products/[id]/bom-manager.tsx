'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'

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

const UNITS = ['pcs', 'kg', 'g', 'mg', 'L', 'mL', 'm', 'cm', 'mm', 'set', 'roll', 'sheet', 'box', 'pair']

export function BomManager({ variantId, components: initialComponents }: BomManagerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localComponents, setLocalComponents] = useState<Component[]>(initialComponents)

  // BOM add form
  const [form, setForm] = useState({
    component_id: '',
    quantity: '',
    unit: '',
    notes: '',
  })

  // Inline create-component sub-form
  const [showCreate, setShowCreate] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    unit: 'pcs',
    manufacturer_part_number: '',
    description: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleCreateChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setCreateForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleCreateComponent(e: React.FormEvent) {
    e.preventDefault()
    if (!createForm.name.trim()) return
    setCreateLoading(true)
    setCreateError(null)

    const supabase = createClient()
    const { data: newComp, error: insertError } = await supabase
      .from('components')
      .insert({
        name: createForm.name.trim(),
        unit: createForm.unit,
        manufacturer_part_number: createForm.manufacturer_part_number.trim() || null,
        description: createForm.description.trim() || null,
        is_active: true,
      })
      .select('id, code, name, unit')
      .single()

    if (insertError || !newComp) {
      setCreateError(insertError?.message ?? 'Failed to create component')
      setCreateLoading(false)
      return
    }

    // Add new component to local list and auto-select it
    setLocalComponents(prev => [
      ...prev,
      { id: newComp.id, code: newComp.code, name: newComp.name, unit: newComp.unit },
    ])
    setForm(prev => ({ ...prev, component_id: newComp.id, unit: '' }))
    setCreateForm({ name: '', unit: 'pcs', manufacturer_part_number: '', description: '' })
    setShowCreate(false)
    setCreateLoading(false)
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
            {localComponents.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>

          {/* Inline create component toggle */}
          <button
            type="button"
            onClick={() => { setShowCreate(s => !s); setCreateError(null) }}
            className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline mt-1.5"
          >
            {showCreate ? <ChevronUp className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showCreate ? 'Hide' : 'Create new component'}
          </button>

          {/* Inline create-component mini-form */}
          {showCreate && (
            <div className="mt-2 p-2.5 border border-dashed border-[var(--border)] rounded-md bg-[var(--background)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">New Component</span>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateError(null) }}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {createError && <p className="text-red-600 text-xs">{createError}</p>}

              <div>
                <label className="block text-xs font-medium mb-0.5">Name <span className="text-red-500">*</span></label>
                <input
                  name="name"
                  value={createForm.name}
                  onChange={handleCreateChange}
                  placeholder="e.g. N52 Magnet 10×5×3 mm"
                  required
                  className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-0.5">Unit <span className="text-red-500">*</span></label>
                  <select
                    name="unit"
                    value={createForm.unit}
                    onChange={handleCreateChange}
                    className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-0.5">Part Number</label>
                  <input
                    name="manufacturer_part_number"
                    value={createForm.manufacturer_part_number}
                    onChange={handleCreateChange}
                    placeholder="Optional"
                    className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-0.5">Description</label>
                <input
                  name="description"
                  value={createForm.description}
                  onChange={handleCreateChange}
                  placeholder="Spec, grade, dimensions… (optional)"
                  className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateComponent}
                disabled={createLoading || !createForm.name.trim()}
                className="bg-[var(--primary)] text-white px-3 py-1 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {createLoading ? 'Creating…' : 'Create & Select'}
              </button>
            </div>
          )}
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
          onClick={() => { setOpen(false); setShowCreate(false) }}
          className="px-3 py-1 border border-[var(--border)] rounded text-xs hover:bg-[var(--card)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
