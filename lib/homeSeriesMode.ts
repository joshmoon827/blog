/**
 * Which home series banner pattern is active.
 * Persisted in data/home-series-mode.json
 */

export type WebglHomeSeriesMode = 'liquid' | 'shards' | 'warp'

export type GsapHomeSeriesMode =
  | 'gsap-scatter'
  | 'gsap-columns'
  | 'gsap-wave'
  | 'gsap-slices'
  | 'gsap-flip'

export type InteractiveHomeSeriesMode =
  | 'pretext'
  | GsapHomeSeriesMode
  | 'p5-particles'

export type HomeSeriesMode =
  | 'mosaic'
  | 'slide'
  | WebglHomeSeriesMode
  | InteractiveHomeSeriesMode

export const DEFAULT_HOME_SERIES_MODE: HomeSeriesMode = 'mosaic'

export const HOME_SERIES_MODE_OPTIONS: Array<{
  id: HomeSeriesMode
  label: string
  hint: string
}> = [
  {
    id: 'mosaic',
    label: '모자이크 패턴',
    hint: '조각난 clip-path 배너',
  },
  {
    id: 'slide',
    label: '슬라이드 패턴',
    hint: '가로로 넘기는 카테고리 커버 슬라이드',
  },
]

export const HOME_SERIES_EXPERIMENT_OPTIONS: Array<{
  id: WebglHomeSeriesMode
  label: string
  hint: string
}> = [
  {
    id: 'liquid',
    label: '리퀴드 리플',
    hint: '커서 주변이 물결처럼 굴절됩니다',
  },
  {
    id: 'shards',
    label: '플로팅 샤드',
    hint: '카테고리 커버가 떠 있는 3D 조각',
  },
  {
    id: 'warp',
    label: '소프트 워프',
    hint: '표지가 숨 쉬듯 왜곡됩니다',
  },
]

export const HOME_SERIES_INTERACTIVE_OPTIONS: Array<{
  id: InteractiveHomeSeriesMode
  label: string
  hint: string
}> = [
  {
    id: 'pretext',
    label: 'Pretext · Flowing Article',
    hint: '표지를 드래그하면 실제 아티클 본문이 다시 흐릅니다',
  },
  {
    id: 'gsap-scatter',
    label: 'GSAP 01 · Hero Scatter',
    hint: '글자가 흩어져 등장하고 커서를 자석처럼 따라옵니다',
  },
  {
    id: 'gsap-columns',
    label: 'GSAP 02 · Vertical Type',
    hint: '독립된 글자 레일이 슬롯처럼 흩어지고 정렬됩니다',
  },
  {
    id: 'gsap-wave',
    label: 'GSAP 03 · Elastic Baseline',
    hint: '커서를 따라 타이포그래피 기준선이 휘어집니다',
  },
  {
    id: 'gsap-slices',
    label: 'GSAP 06 · Editorial Slices',
    hint: '여덟 개 절단면이 커서 방향으로 서로 어긋납니다',
  },
  {
    id: 'gsap-flip',
    label: 'GSAP 08 · Poster Flip',
    hint: '클릭하면 포스터 조각이 다른 레이아웃으로 이동합니다',
  },
  {
    id: 'p5-particles',
    label: 'p5.js · Particle Cover',
    hint: '카테고리 표지가 커서에 반응하는 픽셀 입자로 분해됩니다',
  },
]

const ALL_MODES: HomeSeriesMode[] = [
  'mosaic',
  'slide',
  'liquid',
  'shards',
  'warp',
  'pretext',
  'gsap-scatter',
  'gsap-columns',
  'gsap-wave',
  'gsap-slices',
  'gsap-flip',
  'p5-particles',
]

export const HOME_SERIES_ALL_OPTIONS: Array<{
  id: HomeSeriesMode
  label: string
  hint: string
}> = [
  ...HOME_SERIES_MODE_OPTIONS,
  ...HOME_SERIES_EXPERIMENT_OPTIONS,
  ...HOME_SERIES_INTERACTIVE_OPTIONS,
]

export type HomeSeriesSettings = {
  mode: HomeSeriesMode
  randomEnabled: boolean
  randomPool: HomeSeriesMode[]
}

export function isWebglHomeSeriesMode(
  mode: HomeSeriesMode,
): mode is WebglHomeSeriesMode {
  return mode === 'liquid' || mode === 'shards' || mode === 'warp'
}

export function isInteractiveHomeSeriesMode(
  mode: HomeSeriesMode,
): mode is InteractiveHomeSeriesMode {
  return (
    mode === 'pretext' ||
    mode === 'gsap-scatter' ||
    mode === 'gsap-columns' ||
    mode === 'gsap-wave' ||
    mode === 'gsap-slices' ||
    mode === 'gsap-flip' ||
    mode === 'p5-particles'
  )
}

export function interactiveModeLabHref(mode: InteractiveHomeSeriesMode) {
  if (mode === 'pretext') return '/test-ui/pretext'
  if (mode === 'p5-particles') return '/test-ui/p5'
  const anchor = mode.replace('gsap-', '')
  return `/test-ui/gsap#${anchor}`
}

export function sanitizeHomeSeriesMode(raw: unknown): HomeSeriesMode {
  return ALL_MODES.includes(raw as HomeSeriesMode) ? (raw as HomeSeriesMode) : 'mosaic'
}

export function sanitizeHomeSeriesRandomPool(raw: unknown): HomeSeriesMode[] {
  if (!Array.isArray(raw)) return []
  const out: HomeSeriesMode[] = []
  const seen = new Set<HomeSeriesMode>()
  for (const item of raw) {
    const mode = ALL_MODES.includes(item as HomeSeriesMode)
      ? (item as HomeSeriesMode)
      : null
    if (!mode || seen.has(mode)) continue
    seen.add(mode)
    out.push(mode)
  }
  return out
}

export function pickHomeSeriesMode(settings: HomeSeriesSettings): HomeSeriesMode {
  const pool = settings.randomPool
  if (settings.randomEnabled && pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)]!
  }
  return settings.mode
}
