import { useEffect } from 'react'
import { useShaderStore } from '@/store/shaderStore'
import { useUIStore } from '@/store/uiStore'
import { PreviewCanvas } from '@/components/preview/PreviewCanvas'
import { ParamsPanel } from '@/components/editor/ParamsPanel'
import { PresetsPanel } from '@/components/editor/PresetsPanel'
import { Gallery } from '@/components/gallery/Gallery'
import { SHADER_LIBRARY } from '@/shaders/library'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'

export function BuilderPage() {
  const setShader = useShaderStore((s) => s.setShader)
  const { theme, toggleTheme } = useUIStore()

  useEffect(() => {
    if (SHADER_LIBRARY.length > 0) setShader(SHADER_LIBRARY[0])
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <h1 className="text-sm font-semibold tracking-wide">Shader FX Builder</h1>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </header>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Gallery column */}
        <div className="w-[180px] border-r border-border overflow-y-auto shrink-0">
          <Gallery />
        </div>

        {/* Canvas column */}
        <div className="flex-1 overflow-hidden">
          <PreviewCanvas />
        </div>

        {/* Params column */}
        <div className="w-[280px] border-l border-border overflow-y-auto shrink-0">
          <Tabs defaultValue="params" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="params" className="flex-1">Params</TabsTrigger>
              <TabsTrigger value="presets" className="flex-1">Presets</TabsTrigger>
            </TabsList>
            <TabsContent value="params" className="p-3">
              <ParamsPanel />
            </TabsContent>
            <TabsContent value="presets" className="p-3">
              <PresetsPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
