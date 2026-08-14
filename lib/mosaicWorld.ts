import {
  resolveMosaicLayout,
  type MosaicPattern,
  type MosaicPiece,
  type MosaicPoint,
} from '@/lib/mosaicPattern'

/** Map a piece's local % points into canvas pixels. */
export function mosaicPieceWorldPoints(
  pattern: MosaicPattern,
  piece: MosaicPiece,
  canvasW: number,
  canvasH: number,
): MosaicPoint[] {
  const layout = resolveMosaicLayout(pattern)
  if (pattern.layout === 'free') {
    return piece.points.map((p) => ({
      x: (p.x / 100) * canvasW,
      y: (p.y / 100) * canvasH,
    }))
  }
  const rect = mosaicPieceColumnRect(pattern, piece, canvasW, canvasH)
  return piece.points.map((p) => ({
    x: rect.x + (p.x / 100) * rect.w,
    y: rect.y + (p.y / 100) * rect.h,
  }))
}

export function mosaicPieceColumnRect(
  pattern: MosaicPattern,
  piece: MosaicPiece,
  canvasW: number,
  canvasH: number,
): { x: number; y: number; w: number; h: number } {
  const layout = resolveMosaicLayout(pattern)
  if (pattern.layout === 'free') {
    return { x: 0, y: 0, w: canvasW, h: canvasH }
  }
  const cols = layout.columnPercents
  const gap = pattern.columnGap
  let x0 = 0
  for (let i = 0; i < piece.column; i += 1) {
    x0 += (((cols[i] ?? 0) + gap) / 100) * canvasW
  }
  return {
    x: x0,
    y: 0,
    w: ((cols[piece.column] ?? 0) / 100) * canvasW,
    h: canvasH,
  }
}
