import noiseGlsl from './noise.glsl?raw'
import colorGlsl from './color.glsl?raw'
import mathGlsl  from './math.glsl?raw'

export const SNIPPETS: Record<string, string> = {
  noise: noiseGlsl,
  color: colorGlsl,
  math:  mathGlsl,
}
