import { useState } from 'react'
import { useShaderStore } from '@/store/shaderStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function PresetsPanel() {
  const activeShader = useShaderStore((s) => s.activeShader)
  const presets = useShaderStore((s) => s.presets)
  const loadPreset = useShaderStore((s) => s.loadPreset)
  const savePreset = useShaderStore((s) => s.savePreset)

  const [saving, setSaving] = useState(false)
  const [label, setLabel] = useState('')

  if (!activeShader) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-6 text-center">
        Select a shader to get started
      </div>
    )
  }

  const handleSave = () => {
    const trimmed = label.trim()
    if (!trimmed) return
    savePreset(trimmed)
    setLabel('')
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="overflow-y-auto flex-1 px-4">
        {presets.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No presets yet
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {presets.map((preset) => (
              <li key={preset.id} className="flex items-center justify-between py-3 gap-2">
                <span className="text-sm truncate">{preset.label}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-7 text-xs"
                  onClick={() => loadPreset(preset.id)}
                >
                  Load
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border">
        {saving ? (
          <div className="flex gap-2">
            <Input
              className="h-8 text-xs flex-1"
              placeholder="Preset name…"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') { setSaving(false); setLabel('') }
              }}
              autoFocus
            />
            <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={!label.trim()}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => { setSaving(false); setLabel('') }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => setSaving(true)}
          >
            Save current as preset
          </Button>
        )}
      </div>
    </div>
  )
}
