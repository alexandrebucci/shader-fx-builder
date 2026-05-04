import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 })
  const swatchRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setHexInput(value) }, [value])

  // Close picker on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        swatchRef.current?.contains(e.target as Node) ||
        pickerRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    if (!open && swatchRef.current) {
      const rect = swatchRef.current.getBoundingClientRect()
      setPickerPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen((o) => !o)
  }

  const handleHexInput = (raw: string) => {
    setHexInput(raw)
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) onChange(raw)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className={`text-xs ${isModified ? 'text-foreground' : 'text-muted-foreground'}`}>{param.label}</span>
      <div className="flex items-center gap-2">
        <button
          ref={swatchRef}
          className="w-8 h-6 rounded border border-border flex-shrink-0"
          style={{ background: value }}
          onClick={handleOpen}
          aria-label={`Pick color for ${param.label}`}
        />
        <input
          className="flex-1 text-xs font-mono bg-muted border border-border rounded px-2 py-1 uppercase"
          value={hexInput}
          onChange={(e) => handleHexInput(e.target.value)}
          maxLength={7}
        />
      </div>
      {open && createPortal(
        <div
          ref={pickerRef}
          className="fixed z-[9999] p-2 bg-popover border border-border rounded shadow-lg"
          style={{ top: pickerPos.top, left: pickerPos.left }}
        >
          <HexColorPicker color={value} onChange={onChange} />
        </div>,
        document.body,
      )}
    </div>
  )
}
