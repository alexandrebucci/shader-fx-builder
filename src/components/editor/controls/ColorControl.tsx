import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import type { ParamDef } from '@/shaders/types'

interface Props {
  param: ParamDef
  value: string
  onChange: (value: string) => void
}

export function ColorControl({ param, value, onChange }: Props) {
  const isModified = value !== param.default
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setHexInput(value) }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleHexInput = (raw: string) => {
    setHexInput(raw)
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) onChange(raw)
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5 relative">
      <span className={`text-xs ${isModified ? 'text-foreground' : 'text-muted-foreground'}`}>{param.label}</span>
      <div className="flex items-center gap-2">
        <button
          className="w-8 h-6 rounded border border-border flex-shrink-0"
          style={{ background: value }}
          onClick={() => setOpen((o) => !o)}
          aria-label={`Pick color for ${param.label}`}
        />
        <input
          className="flex-1 text-xs font-mono bg-muted border border-border rounded px-2 py-1 uppercase"
          value={hexInput}
          onChange={(e) => handleHexInput(e.target.value)}
          maxLength={7}
        />
      </div>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 p-2 bg-popover border border-border rounded shadow-lg">
          <HexColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  )
}
