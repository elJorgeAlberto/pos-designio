import { useRef } from 'react'
import { Star, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type GalleryImage = {
  id: string | null
  url: string
  file: File | null
  isPrimary: boolean
}

export function ProductImageGallery({
  images,
  onChange,
}: {
  images: GalleryImage[]
  onChange: (images: GalleryImage[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const added: GalleryImage[] = Array.from(files).map((file) => ({
      id: null,
      url: URL.createObjectURL(file),
      file,
      isPrimary: images.length === 0,
    }))
    onChange([...images, ...added])
  }

  function remove(index: number) {
    const removed = images[index]
    const next = images.filter((_, i) => i !== index)
    if (removed.isPrimary && next.length > 0) next[0] = { ...next[0], isPrimary: true }
    onChange(next)
  }

  function setPrimary(index: number) {
    onChange(images.map((img, i) => ({ ...img, isPrimary: i === index })))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        {images.map((img, i) => (
          <div key={img.id ?? img.url} className="relative">
            <img
              src={img.url}
              alt=""
              className={`size-20 rounded-lg border object-cover ${img.isPrimary ? 'border-primary' : 'border-border'}`}
            />
            <button
              type="button"
              aria-label="Foto principal"
              onClick={() => setPrimary(i)}
              className={`absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full ${img.isPrimary ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
            >
              <Star className="size-3" fill={img.isPrimary ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              aria-label="Quitar foto"
              onClick={() => remove(i)}
              className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex size-20 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
        >
          <Plus />
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {images.length > 0 && (
        <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Plus /> Agregar foto
        </Button>
      )}
    </div>
  )
}
