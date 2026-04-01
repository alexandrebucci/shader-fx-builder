import { liquidNoise } from './backgrounds/liquid-noise'
import { gradientFlow } from './backgrounds/gradient-flow'
import { particlesField } from './backgrounds/particles-field'
import { waveDistort } from './image-fx/wave-distort'
import { glitch } from './image-fx/glitch'
import { chromaticAberration } from './image-fx/chromatic-aberration'
import type { ShaderDef } from '@/shaders/types'

export const SHADER_LIBRARY: ShaderDef[] = [
  liquidNoise,
  gradientFlow,
  particlesField,
  waveDistort,
  glitch,
  chromaticAberration,
]
