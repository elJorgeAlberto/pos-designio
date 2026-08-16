import { useEffect, useState } from 'react'
import { sileo } from 'sileo'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type CategoryNode = { id: string; parent_id: string | null; name: string }

const levelLabels = ['Categoría', 'Sección', 'Familia', 'Subfamilia']

export function CategoryPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (categoryId: string | null) => void
}) {
  const [allCategories, setAllCategories] = useState<CategoryNode[]>([])
  // chain[i] = the selected node id at level i (0-indexed)
  const [chain, setChain] = useState<string[]>([])
  const [addingAt, setAddingAt] = useState<number | null>(null)
  const [newName, setNewName] = useState('')

  async function load() {
    const { data } = await supabase.from('product_categories').select('id, parent_id, name').order('name')
    setAllCategories(data ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  // Rebuild the chain of ancestors from the current value whenever the
  // category list or the externally-controlled value changes.
  useEffect(() => {
    if (!value || allCategories.length === 0) {
      if (!value) setChain([])
      return
    }
    const byId = new Map(allCategories.map((c) => [c.id, c]))
    const path: string[] = []
    let current = byId.get(value)
    while (current) {
      path.unshift(current.id)
      current = current.parent_id ? byId.get(current.parent_id) : undefined
    }
    setChain(path)
  }, [value, allCategories])

  function childrenOf(parentId: string | null) {
    return allCategories.filter((c) => c.parent_id === parentId)
  }

  function selectAt(levelIndex: number, categoryId: string) {
    const next = [...chain.slice(0, levelIndex), categoryId]
    setChain(next)
    onChange(categoryId)
  }

  async function createAt(levelIndex: number) {
    if (!newName.trim()) return
    const parentId = levelIndex === 0 ? null : chain[levelIndex - 1]
    const { data, error } = await supabase
      .from('product_categories')
      .insert({ name: newName.trim(), parent_id: parentId })
      .select('id, parent_id, name')
      .single()

    if (error || !data) {
      sileo.error({ title: error?.message ?? 'No se pudo crear la categoría.' })
      return
    }

    setAllCategories((prev) => [...prev, data])
    setNewName('')
    setAddingAt(null)
    selectAt(levelIndex, data.id)
  }

  // Levels to render: level 0 always shows; level i>0 shows only once
  // level i-1 has a selection with at least one child possible.
  const levels: { index: number; options: CategoryNode[]; selected: string | null }[] = []
  for (let i = 0; i < levelLabels.length; i++) {
    const parentId = i === 0 ? null : chain[i - 1]
    if (i > 0 && !parentId) break
    const options = childrenOf(parentId ?? null)
    levels.push({ index: i, options, selected: chain[i] ?? null })
    if (!chain[i]) break
  }

  return (
    <div className="flex flex-col gap-3">
      {levels.map((level) => (
        <div key={level.index} className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{levelLabels[level.index]}</span>
          {addingAt === level.index ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder={`Nueva ${levelLabels[level.index].toLowerCase()}…`}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createAt(level.index))}
              />
              <Button type="button" size="sm" onClick={() => createAt(level.index)}>
                Crear
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAddingAt(null)
                  setNewName('')
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select
                value={level.selected ?? 'none'}
                onValueChange={(v) => {
                  if (v === 'none') {
                    onChange(level.index === 0 ? null : chain[level.index - 1] ?? null)
                    setChain(chain.slice(0, level.index))
                  } else {
                    selectAt(level.index, v!)
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: unknown) =>
                      v === 'none' || !v
                        ? 'Sin especificar'
                        : (allCategories.find((c) => c.id === v)?.name ?? 'Sin especificar')
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {level.options.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="secondary" size="icon" onClick={() => setAddingAt(level.index)}>
                <Plus />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
