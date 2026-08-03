/** Tistory-style image figure helpers (`data-ke-type="image"`). */

export type ImageKeStyle =
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'floatLeft'
  | 'floatRight'
  | 'widthContent'

export type ImageAlign = 'alignLeft' | 'alignCenter' | 'alignRight'

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

export function imageInsertHtml(opts: {
  src: string
  alt?: string
  originWidth?: number
  originHeight?: number
  width?: number
  height?: number
  style?: ImageKeStyle
}): string {
  const src = escAttr(opts.src)
  const alt = escAttr(opts.alt || '')
  const style: ImageKeStyle = opts.style || 'alignCenter'
  const align: ImageAlign =
    style === 'alignLeft' || style === 'alignRight' ? style : 'alignCenter'
  const textAlign =
    align === 'alignLeft' ? 'left' : align === 'alignRight' ? 'right' : 'center'
  const ow = opts.originWidth
  const oh = opts.originHeight
  const w = opts.width
  const h = opts.height
  const originAttrs =
    ow && oh
      ? ` data-origin-width="${ow}" data-origin-height="${oh}"`
      : ''
  const sizeAttrs =
    w && h ? ` width="${Math.round(w)}" height="${Math.round(h)}"` : ''
  return (
    `<figure class="image" data-ke-type="image" data-ke-align="${align}" data-ke-style="${style}" ` +
    `data-ke-mobilestyle="widthOrigin" style="text-align: ${textAlign};">` +
    `<img src="${src}" alt="${alt}"${originAttrs}${sizeAttrs} style="object-fit: contain;" />` +
    `<figcaption></figcaption>` +
    `</figure>`
  )
}

export function findImageFigure(node: Node | null): HTMLElement | null {
  if (!node || !(node as HTMLElement).closest) return null
  const el = node as HTMLElement
  if (el.matches?.('figure[data-ke-type="image"]')) return el
  return el.closest('figure[data-ke-type="image"]') as HTMLElement | null
}

export function getImageKeStyle(fig: HTMLElement): ImageKeStyle {
  const raw = fig.getAttribute('data-ke-style') || 'alignCenter'
  const allowed: ImageKeStyle[] = [
    'alignLeft',
    'alignCenter',
    'alignRight',
    'floatLeft',
    'floatRight',
    'widthContent',
  ]
  return (allowed.includes(raw as ImageKeStyle) ? raw : 'alignCenter') as ImageKeStyle
}

export function applyImageKeStyle(fig: HTMLElement, style: ImageKeStyle): void {
  fig.setAttribute('data-ke-style', style)
  if (style === 'alignLeft' || style === 'alignCenter' || style === 'alignRight') {
    fig.setAttribute('data-ke-align', style)
    fig.style.textAlign =
      style === 'alignLeft' ? 'left' : style === 'alignRight' ? 'right' : 'center'
  } else if (style === 'widthContent') {
    fig.setAttribute('data-ke-align', 'alignCenter')
    fig.style.textAlign = 'center'
    const img = fig.querySelector('img')
    if (img) {
      img.removeAttribute('width')
      img.removeAttribute('height')
    }
  } else {
    // float — keep data-ke-align as center-ish default per Tistory
    fig.setAttribute('data-ke-align', 'alignCenter')
  }
}

/** Set explicit width; height derived from origin aspect when available. */
export function applyImageWidth(fig: HTMLElement, widthPx: number): void {
  const img = fig.querySelector('img')
  if (!img) return
  const w = Math.max(40, Math.min(4000, Math.round(widthPx)))
  const ow = Number(img.getAttribute('data-origin-width')) || img.naturalWidth || 0
  const oh = Number(img.getAttribute('data-origin-height')) || img.naturalHeight || 0
  img.setAttribute('width', String(w))
  if (ow > 0 && oh > 0) {
    img.setAttribute('height', String(Math.round((w * oh) / ow)))
  } else {
    img.removeAttribute('height')
  }
  // Custom width exits widthContent mode
  if (fig.getAttribute('data-ke-style') === 'widthContent') {
    fig.setAttribute('data-ke-style', 'alignCenter')
  }
}

export function resetImageWidth(fig: HTMLElement): void {
  const img = fig.querySelector('img')
  if (!img) return
  const ow = Number(img.getAttribute('data-origin-width'))
  const oh = Number(img.getAttribute('data-origin-height'))
  if (ow > 0 && oh > 0) {
    img.setAttribute('width', String(ow))
    img.setAttribute('height', String(oh))
  } else {
    img.removeAttribute('width')
    img.removeAttribute('height')
  }
}

/** Wrap a bare <img> (paste/insert) into a Tistory image figure. */
export function wrapBareImage(img: HTMLImageElement): HTMLElement {
  const doc = img.ownerDocument
  const fig = doc.createElement('figure')
  fig.className = 'image'
  fig.setAttribute('data-ke-type', 'image')
  fig.setAttribute('data-ke-align', 'alignCenter')
  fig.setAttribute('data-ke-style', 'alignCenter')
  fig.setAttribute('data-ke-mobilestyle', 'widthOrigin')
  fig.setAttribute('style', 'text-align: center;')

  const parent = img.parentElement
  // Prefer moving the img out of a lonely <p>
  if (parent && parent.tagName === 'P' && parent.childNodes.length === 1) {
    parent.replaceWith(fig)
  } else {
    img.replaceWith(fig)
  }

  const ow = img.naturalWidth || Number(img.getAttribute('width')) || 0
  const oh = img.naturalHeight || Number(img.getAttribute('height')) || 0
  if (ow) img.setAttribute('data-origin-width', String(ow))
  if (oh) img.setAttribute('data-origin-height', String(oh))
  img.style.objectFit = 'contain'

  fig.appendChild(img)
  const cap = doc.createElement('figcaption')
  fig.appendChild(cap)
  return fig
}
