import DOMPurify from 'isomorphic-dompurify'

function toDisplayImageUrl(url: string): string {
  if (url.startsWith('/api/images/')) return url
  const raw = url.match(
    /^https?:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/(.+)$/,
  )
  if (raw?.[1]) {
    return `/api/images/${raw[1].split('/').map(encodeURIComponent).join('/')}`
  }
  return url
}

const ALLOWED_TAGS = [
  'p',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'del',
  'span',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
  'pre',
  'code',
  'figure',
  'figcaption',
  'sub',
  'sup',
  'font',
]

const ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'title',
  'class',
  'style',
  'width',
  'height',
  'align',
  'color',
  'face',
  'size',
  'colspan',
  'rowspan',
  'id',
  'role',
  'data-ke-style',
  'data-ke-type',
  'data-ke-align',
  'data-ke-language',
  'data-mce-style',
  'data-text-more',
  'data-text-less',
]

/**
 * Turn editor moreLess markup into Tistory read-view structure:
 * button + `.moreless-content` (collapsed until `.open`).
 */
function enhanceMoreLess(root: ParentNode, doc: Document): void {
  root.querySelectorAll('div[data-ke-type="moreLess"]').forEach((el) => {
    if (el.querySelector(':scope > .btn-toggle-moreless')) return

    const more = el.getAttribute('data-text-more')?.trim() || '더보기'
    if (!el.getAttribute('data-text-more')) {
      el.setAttribute('data-text-more', more)
    }
    if (!el.getAttribute('data-text-less')?.trim()) {
      el.setAttribute('data-text-less', '닫기')
    }

    const existingContent = el.querySelector(':scope > .moreless-content')
    let content = existingContent
    if (!content) {
      content = doc.createElement('div')
      content.className = 'moreless-content'
      while (el.firstChild) {
        content.appendChild(el.firstChild)
      }
    }

    const btn = doc.createElement('a')
    btn.className = 'btn-toggle-moreless'
    btn.setAttribute('role', 'button')
    btn.setAttribute('href', '#')
    btn.textContent = more

    el.appendChild(btn)
    if (!existingContent) {
      el.appendChild(content)
    }
  })
}

function serializeFragment(frag: DocumentFragment, doc: Document): string {
  const wrap = doc.createElement('div')
  wrap.appendChild(frag)
  return wrap.innerHTML
}

/** Sanitize TinyMCE / Tistory HTML for safe read-view rendering. */
export function sanitizeTistoryHtml(html: string): string {
  if (!html.trim()) return ''

  const frag = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  }) as DocumentFragment

  const doc = frag.ownerDocument
  if (!doc) {
    return String(DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR }))
  }

  enhanceMoreLess(frag, doc)

  let clean = serializeFragment(frag, doc)

  // Rewrite private-repo / raw GitHub image URLs through the blog proxy.
  return clean.replace(
    /(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi,
    (_m, pre: string, src: string, post: string) =>
      `${pre}${toDisplayImageUrl(src)}${post}`,
  )
}
