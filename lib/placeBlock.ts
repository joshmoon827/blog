/** Tistory-style place (location) block — no map API / coordinates. */

export type PlaceAlign = 'alignLeft' | 'alignCenter' | 'alignRight'

export type PlaceFields = {
  name: string
  address: string
  align?: PlaceAlign
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Kakao map search URL (name only — no lat/lng). */
export function placeSearchHref(name: string): string {
  const q = encodeURIComponent(name.trim() || 'place')
  return `https://map.kakao.com/link/search/${q}`
}

export function placeInsertHtml({
  name,
  address,
  align = 'alignCenter',
}: PlaceFields): string {
  const n = esc(name.trim() || '장소')
  const a = esc(address.trim())
  const href = placeSearchHref(name.trim() || '장소').replace(/"/g, '&quot;')
  return (
    `<figure contenteditable="false" data-ke-type="location" data-ke-align="${align}">` +
    `<a href="${href}" target="_blank" rel="noopener noreferrer">` +
    /* Non-empty pin span — TinyMCE strips empty inline elements */
    `<span class="location-pin" contenteditable="false" aria-hidden="true">&nbsp;</span>` +
    `<span class="location-info">` +
    `<span class="location-name">${n}</span>` +
    (a ? `<span class="location-address">${a}</span>` : '') +
    `</span>` +
    `</a>` +
    `</figure>`
  )
}

export function readPlaceFields(fig: HTMLElement): PlaceFields {
  const raw = fig.getAttribute('data-ke-align') || 'alignCenter'
  const align: PlaceAlign =
    raw === 'alignLeft' || raw === 'alignRight' ? raw : 'alignCenter'
  return {
    name: fig.querySelector('.location-name')?.textContent?.trim() || '',
    address: fig.querySelector('.location-address')?.textContent?.trim() || '',
    align,
  }
}

export function applyPlaceFields(fig: HTMLElement, fields: PlaceFields): void {
  const nameEl = fig.querySelector('.location-name')
  const addrEl = fig.querySelector('.location-address')
  const a = fig.querySelector('a')
  const name = fields.name.trim() || '장소'
  const address = fields.address.trim()
  if (nameEl) nameEl.textContent = name
  if (addrEl) {
    addrEl.textContent = address
  } else if (address) {
    const info = fig.querySelector('.location-info')
    if (info) {
      const span = fig.ownerDocument!.createElement('span')
      span.className = 'location-address'
      span.textContent = address
      info.appendChild(fig.ownerDocument!.createTextNode(' '))
      info.appendChild(span)
    }
  }
  if (a) {
    a.setAttribute('href', placeSearchHref(name))
  }
  if (fields.align) {
    fig.setAttribute('data-ke-align', fields.align)
  }
}
