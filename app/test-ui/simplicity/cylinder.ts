/** Inner-cylinder projection: viewer stands at the center, cards sit on the wall. */

export function projectCylinderCard(
  nx: number,
  ny: number,
  hovered: boolean,
): { transform: string; opacity: number } {
  const x = clamp(nx, -1.35, 1.35)
  const y = clamp(ny, -1.45, 1.45)

  const theta = x * 0.62
  const phi = y * 0.42
  const rotateY = (theta * 180) / Math.PI
  const rotateX = (phi * 180) / Math.PI
  const depth =
    (Math.cos(theta) * Math.cos(phi) - 1) * 520 - y * y * 110 - Math.abs(x) * 36
  const lift = hovered ? 48 : 0
  const scale = 1 - x * x * 0.045 - y * y * 0.09 + (hovered ? 0.025 : 0)
  const opacity = 0.42 + 0.58 * (1 - smoothstep(0.55, 1.35, Math.hypot(x * 0.7, y)))

  return {
    transform: `rotateY(${rotateY.toFixed(2)}deg) rotateX(${rotateX.toFixed(2)}deg) translateZ(${(depth + lift).toFixed(1)}px) scale(${scale.toFixed(3)})`,
    opacity,
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function applyCylinderProjection(root: HTMLElement) {
  const cells = root.querySelectorAll<HTMLElement>('[data-cylinder]')
  if (!cells.length) return

  const vw = window.innerWidth
  const vh = window.innerHeight
  const originX = vw * 0.5
  const originY = vh * 0.48
  const reads: Array<{ card: HTMLElement; nx: number; ny: number; hovered: boolean }> = []

  for (const cell of cells) {
    const card = cell.firstElementChild as HTMLElement | null
    if (!card) continue
    const rect = cell.getBoundingClientRect()
    reads.push({
      card,
      nx: (rect.left + rect.width / 2 - originX) / (vw * 0.5),
      ny: (rect.top + rect.height / 2 - originY) / (vh * 0.5),
      hovered: card.matches(':hover'),
    })
  }

  for (const item of reads) {
    const { transform, opacity } = projectCylinderCard(item.nx, item.ny, item.hovered)
    item.card.style.transform = transform
    item.card.style.opacity = String(opacity)
  }
}
