import { useRef } from 'react'
import type { ParamDef } from '@/shaders/types'
import { useUIStore } from '@/store/uiStore'

interface Props {
  param: ParamDef
  value: string | null
  onChange: (value: string | null) => void
}

export function TextureControl({ param, value, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadedTextures, addUploadedTexture, removeUploadedTexture } = useUIStore()

  const bundled = param.assets ?? []
  const allAssets = [
    ...bundled,
    ...uploadedTextures.map((t) => ({ ...t, uploaded: true as const })),
  ]

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    addUploadedTexture(file.name, url)
    onChange(url)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{param.label}</span>
      <div className="flex flex-wrap gap-2">
        {allAssets.map((asset) => (
          <div key={asset.id} className="relative group">
            <button
              onClick={() => onChange(asset.url)}
              className={`w-14 h-14 rounded overflow-hidden border-2 transition-colors ${
                value === asset.url ? 'border-primary' : 'border-border hover:border-muted-foreground'
              }`}
              title={asset.label}
            >
              <img src={asset.url} alt={asset.label} className="w-full h-full object-cover" />
            </button>
            {'uploaded' in asset && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (value === asset.url) onChange(null)
                  removeUploadedTexture(asset.id)
                }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-14 h-14 rounded border-2 border-dashed border-border hover:border-muted-foreground flex items-center justify-center text-muted-foreground text-xl transition-colors"
          title="Upload texture"
        >
          +
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>
      {value !== null && (
        <button
          onClick={() => onChange(null)}
          className="text-xs text-muted-foreground hover:text-foreground self-start transition-colors"
        >
          None
        </button>
      )}
    </div>
  )
}
