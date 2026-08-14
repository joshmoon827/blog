'use client'

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import type { Editor as TinyMCEEditor } from 'tinymce'
import {
  TISTORY_FONT_CSS,
  type TistoryTinyEditorHandle,
} from '@/components/tistoryTinyShared'
import {
  EMOTICON_TABS,
  emoticonInsertHtml,
  getEmoticonPack,
  type EmoticonAlign,
  type EmoticonTabId,
} from '@/data/emoticons'
import {
  applyImageKeStyle,
  applyImageWidth,
  findImageFigure,
  getImageKeStyle,
  resetImageWidth,
  type ImageKeStyle,
} from '@/lib/imageBlock'
import {
  applyPlaceFields,
  placeInsertHtml,
  readPlaceFields,
  type PlaceAlign,
} from '@/lib/placeBlock'
import {
  findMoreLess,
  moreLessEditorHtml,
  readMoreLessLabels,
  MORELESS_DEFAULT_LESS,
  MORELESS_DEFAULT_MORE,
} from '@/lib/moreLessBlock'
import { SPECIAL_CHARS } from '@/data/specialChars'
import styles from './newrite.module.css'

export type EditorViewMode = 'wysiwyg' | 'html' | 'markdown'

export const NEWRITE_SIDE_MARGIN_MIN = 0
export const NEWRITE_SIDE_MARGIN_MAX = 40
/** Tistory uses ~290px / ~20% each side on a 1440 viewport. */
export const NEWRITE_SIDE_MARGIN_DEFAULT = 20

type Props = {
  editorRef: RefObject<TistoryTinyEditorHandle | null>
  disabled?: boolean
  editorMode?: EditorViewMode
  onEditorModeChange?: (mode: EditorViewMode) => void
  /** Horizontal side margin % of canvas width (each side). */
  sideMarginPct?: number
  onSideMarginChange?: (pct: number) => void
}

type MenuId =
  | 'image'
  | 'para'
  | 'font'
  | 'color'
  | 'bg'
  | 'quote'
  | 'list'
  | 'emoji'
  | 'hr'
  | 'link'
  | 'more'
  | 'mode'
  | 'place'
  | 'table'
  | 'moreLess'
  | 'specialChar'
  | 'codeblock'
  | 'margin'
  | null

type ObjectKind = 'emoticon' | 'location' | 'image'

type ObjectUi = {
  kind: ObjectKind
  /** emoticon/location: data-ke-align; image: data-ke-style */
  style: string
  top: number
  left: number
  imgWidth?: number
}

const PARA_STYLES: {
  id: string
  label: string
  itemClass?: string
  apply: (ed: TinyMCEEditor) => void
}[] = [
  {
    id: 'h1',
    label: '제목1',
    itemClass: 'paraItemH1',
    apply: (ed) => ed.execCommand('FormatBlock', false, 'h2'),
  },
  {
    id: 'h2',
    label: '제목2',
    itemClass: 'paraItemH2',
    apply: (ed) => ed.execCommand('FormatBlock', false, 'h3'),
  },
  {
    id: 'h3',
    label: '제목3',
    itemClass: 'paraItemH3',
    apply: (ed) => ed.execCommand('FormatBlock', false, 'h4'),
  },
  {
    id: 'body1',
    label: '본문1',
    itemClass: 'paraItemBody1',
    apply: (ed) => {
      ed.execCommand('FormatBlock', false, 'p')
      ed.formatter.apply('custom_body1')
    },
  },
  {
    id: 'body',
    label: '본문2',
    itemClass: 'paraItemBody2',
    apply: (ed) => {
      ed.execCommand('FormatBlock', false, 'p')
      ed.formatter.apply('custom_body2')
    },
  },
  {
    id: 'body3',
    label: '본문3',
    itemClass: 'paraItemBody3',
    apply: (ed) => {
      ed.execCommand('FormatBlock', false, 'p')
      ed.formatter.apply('custom_body3')
    },
  },
]

/**
 * Tistory `font_formats` / CDM_font_match_formats — keep family strings identical
 * so HTML round-trips and FontName sync match oct-fe.
 * Note: Tistory writes "Noto Sans Demilight" (lowercase L); @font-face is DemiLight.
 */
const FONT_OPTIONS = [
  {
    id: 'default',
    label: '기본서체',
    family:
      'AppleSDGothicNeo-Regular, Malgun Gothic, 맑은 고딕, dotum, 돋움, sans-serif',
  },
  {
    id: 'noto-r',
    label: '본고딕 R',
    family: 'Noto Sans Demilight, Noto Sans KR',
  },
  {
    id: 'noto-l',
    label: '본고딕 L',
    family: 'Noto Sans Light',
  },
  {
    id: 'nanum',
    label: '나눔고딕',
    family: 'Nanum Gothic',
  },
  {
    id: 'serif',
    label: '본명조',
    family: 'Noto Serif KR',
  },
  {
    id: 'gungseo',
    label: '궁서',
    family: 'GungSeo, serif',
  },
] as const

function normalizeFontName(raw: string): string {
  return String(raw || '')
    .replace(/['"]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Map TinyMCE FontName / computed stack → toolbar label (never leave stale). */
function labelForFontName(fontNameRaw: string): string {
  const fontName = normalizeFontName(fontNameRaw)
  if (!fontName || fontName === 'false') return '기본서체'

  for (const f of FONT_OPTIONS) {
    if (f.id === 'default') continue
    const first = normalizeFontName(f.family.split(',')[0] || '')
    if (!first) continue
    // Prefer primary family token (avoids matching only the "Noto Sans KR" fallback)
    if (
      fontName === first ||
      fontName.startsWith(`${first},`) ||
      fontName.includes(first)
    ) {
      return f.label
    }
  }
  return '기본서체'
}

const COLORS = [
  '#111111',
  '#e03131',
  '#f08c00',
  '#2f9e44',
  '#1971c2',
  '#9c36b5',
  '#868e96',
]

const BG_COLORS = [
  '#fff3bf',
  '#ffc9c9',
  '#d3f9d8',
  '#d0ebff',
  '#e5dbff',
  '#ffe8cc',
  'transparent',
]

/** Tistory horizontal-rule variants (`data-ke-style`). style3 = zigzag. */
const HR_STYLES = [
  'style1',
  'style2',
  'style3',
  'style4',
  'style5',
  'style6',
  'style7',
  'style8',
] as const

type HrStyle = (typeof HR_STYLES)[number]

const HR_PREVIEW_CLASS: Record<HrStyle, string> = {
  style1: 'hrPreviewStyle1',
  style2: 'hrPreviewStyle2',
  style3: 'hrPreviewStyle3',
  style4: 'hrPreviewStyle4',
  style5: 'hrPreviewStyle5',
  style6: 'hrPreviewStyle6',
  style7: 'hrPreviewStyle7',
  style8: 'hrPreviewStyle8',
}

function insertHr(editor: TinyMCEEditor, style: HrStyle) {
  editor.insertContent(
    `<hr contenteditable="false" data-ke-type="horizontalRule" data-ke-style="${style}" />`,
  )
}

const QUOTE_STYLES = ['style1', 'style2', 'style3'] as const
type QuoteStyle = (typeof QUOTE_STYLES)[number]

function insertQuote(editor: TinyMCEEditor, style: QuoteStyle | 'remove') {
  if (style === 'remove') {
    const node = editor.selection.getNode()
    const bq = editor.dom.getParent(node, 'blockquote') as HTMLElement | null
    if (bq) {
      editor.dom.remove(bq, true)
      editor.nodeChanged()
    }
    return
  }
  const selected = editor.selection.getContent({ format: 'html' })
  let inner = selected?.trim() || '<p>인용</p>'
  inner = inner
    .replace(/^<blockquote[^>]*>/i, '')
    .replace(/<\/blockquote>$/i, '')
  if (!inner.trim()) inner = '<p>인용</p>'
  editor.insertContent(
    `<blockquote data-ke-style="${style}">${inner}</blockquote>`,
  )
}

const TABLE_GRID = 10

function insertTableAt(editor: TinyMCEEditor, rows: number, cols: number) {
  const r = Math.max(1, Math.min(TABLE_GRID, rows))
  const c = Math.max(1, Math.min(TABLE_GRID, cols))
  editor.execCommand('mceInsertTable', false, { rows: r, columns: c })
}

const CODEBLOCK_LANGS = [
  { value: 'text', label: 'Plain text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'sql', label: 'SQL' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
] as const

function insertMoreLess(
  editor: TinyMCEEditor,
  openText: string,
  closeText: string,
  bookmark?: ReturnType<TinyMCEEditor['selection']['getBookmark']> | null,
) {
  const open = openText.trim() || MORELESS_DEFAULT_MORE
  const close = closeText.trim() || MORELESS_DEFAULT_LESS
  editor.focus()
  if (bookmark) {
    try {
      editor.selection.moveToBookmark(bookmark)
    } catch {
      /* bookmark may be stale */
    }
  }

  const existing = findMoreLess(editor.selection.getNode())
  if (existing) {
    // Update labels on the current block (Tistory panel re-apply path)
    existing.setAttribute('data-text-more', open)
    existing.setAttribute('data-text-less', close)
    editor.nodeChanged()
    editor.fire('change')
    return
  }

  const selected = editor.selection.getContent({ format: 'html' })?.trim()
  if (selected) {
    // Prefer Tistory formatter.wrapper so selection is wrapped, not replaced
    if (editor.formatter?.get?.('moreless')) {
      editor.formatter.apply('moreless', { openText: open, closeText: close })
      editor.nodeChanged()
      return
    }
  }

  const inner = selected || '<p><br></p>'
  editor.insertContent(`${moreLessEditorHtml(open, close, inner)}<p><br></p>`)
}

function insertCodeblock(editor: TinyMCEEditor, lang: string, code: string) {
  const language = lang || 'text'
  const id = `code_${Date.now()}`
  const body = (code || '// code').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  editor.insertContent(
    `<pre id="${id}" class="${language}" data-ke-language="${language}" data-ke-type="codeblock">${body}</pre><p><br></p>`,
  )
}

function applyList(
  editor: TinyMCEEditor,
  kind: 'disc' | 'circle' | 'decimal' | 'remove',
) {
  if (kind === 'remove') {
    editor.execCommand('RemoveList')
    return
  }
  if (kind === 'decimal') {
    editor.execCommand('InsertOrderedList', false, {
      'list-style-type': 'decimal',
    })
    return
  }
  editor.execCommand('InsertUnorderedList', false, {
    'list-style-type': kind,
  })
}

/** Tab icon positions in sprites-emoticon@2x.png (bg-size 400×60). */
const EMOT_TAB_POS: Record<EmoticonTabId, { idle: string; active: string }> = {
  friends1: { idle: '-30px -2px', active: '-30px -30px' },
  niniz: { idle: '-58px -2px', active: '-58px -30px' },
  friends2: { idle: '-86px -2px', active: '-86px -30px' },
  face: { idle: '-114px -2px', active: '-114px -30px' },
}

/** Tistory sprites-toolbar-icon.svg positions (20px grid). */
const ICO: Record<string, string> = {
  image: '0 0',
  bold: '0 -20px',
  italic: '-20px -20px',
  underline: '-40px -20px',
  strike: '-60px -20px',
  forecolor: '-80px -20px',
  backcolor: '-80px -20px',
  alignleft: '-100px -20px',
  aligncenter: '-120px -20px',
  alignright: '-140px -20px',
  alignjustify: '-160px -20px',
  list: '-180px -20px',
  table: '-240px -20px',
  link: '-260px -20px',
  hr: '-280px -20px',
  more: '-300px -20px',
  location: '-100px 0',
  quote: '0 -140px',
  emoji: '-360px -20px',
}

function ToolSep() {
  return <span className={styles.toolSep} aria-hidden />
}

/** Map sprite Y to Tistory's white (#FFF) active row. Never rewrite X —
 *  e.g. italic `-20px -20px` must become `-20px -40px`, not `-40px -20px`. */
function spriteAxis(base: string): { x: string; y: string; yActive: string } {
  const [x = '0', y = '0'] = base.trim().split(/\s+/)
  const yActive =
    y === '-20px' || y === '0' || y === '0px' ? '-40px' : y
  return { x, y, yActive }
}

function SpriteIcon({
  name,
  active,
}: {
  name: keyof typeof ICO
  active?: boolean
}) {
  const { x, y, yActive } = spriteAxis(ICO[name])
  const hasWhiteRow = yActive !== y
  return (
    <i
      className={styles.spriteIcon}
      style={
        {
          '--sprite-x': x,
          '--sprite-y': y,
          '--sprite-y-active': yActive,
          backgroundPosition: active ? `${x} ${yActive}` : `${x} ${y}`,
        } as CSSProperties
      }
      data-has-white={hasWhiteRow ? 'true' : 'false'}
      data-active={active ? 'true' : undefined}
      aria-hidden
    />
  )
}

function ToolBtn({
  label,
  title,
  onClick,
  disabled,
  active,
  children,
  className,
}: {
  label?: string
  title: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      className={`${styles.toolBtn} ${active ? styles.toolBtnActive : ''} ${className ?? ''}`}
      // Keep caret in the TinyMCE iframe — do not move focus to toolbar chrome
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label || title}
      aria-pressed={active || undefined}
      tabIndex={-1}
    >
      {children}
    </button>
  )
}

function MenuShell({
  open,
  onClose,
  children,
  className,
  placement = 'start',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  /** start = left-aligned under trigger; end = right-aligned (emoticon) */
  placement?: 'start' | 'end'
}) {
  const markerRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  )

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    const group = markerRef.current?.parentElement
    if (!group) return
    const place = () => {
      const r = group.getBoundingClientRect()
      const menuEl = menuRef.current
      const mw = menuEl?.offsetWidth ?? 0
      const left =
        placement === 'end'
          ? Math.max(8, r.right - (mw || 390))
          : Math.max(8, r.left)
      setCoords({ top: r.bottom + 4, left })
    }
    place()
    // Second pass after mount so end-placement can use measured width
    const raf = requestAnimationFrame(place)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, placement])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t)) return
      if (markerRef.current?.parentElement?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <>
      <span ref={markerRef} hidden aria-hidden />
      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            className={`${styles.toolMenu} ${className ?? ''}`}
            style={{ top: coords.top, left: coords.left }}
            role="menu"
            // Preserve TinyMCE iframe selection when clicking menu chrome/items.
            // Allow real focus for inputs (link popover).
            onMouseDown={(e) => {
              const t = e.target as HTMLElement
              if (t.closest('input, textarea, select')) return
              e.preventDefault()
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  )
}

export default function NewriteToolbar({
  editorRef,
  disabled,
  editorMode = 'wysiwyg',
  onEditorModeChange,
  sideMarginPct = NEWRITE_SIDE_MARGIN_DEFAULT,
  onSideMarginChange,
}: Props) {
  const [menu, setMenu] = useState<MenuId>(null)
  const [paraLabel, setParaLabel] = useState('본문2')
  const [fontLabel, setFontLabel] = useState('기본서체')
  const [emoticonTab, setEmoticonTab] = useState<EmoticonTabId>('friends2')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [linkNewWindow, setLinkNewWindow] = useState(true)
  const [linkHasAnchor, setLinkHasAnchor] = useState(false)
  const linkBookmark = useRef<ReturnType<
    TinyMCEEditor['selection']['getBookmark']
  > | null>(null)
  const moreLessBookmark = useRef<ReturnType<
    TinyMCEEditor['selection']['getBookmark']
  > | null>(null)
  const [align, setAlign] = useState<
    'left' | 'center' | 'right' | 'justify' | null
  >('left')
  const [marks, setMarks] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  })
  const [objectUi, setObjectUi] = useState<ObjectUi | null>(null)
  const [placeName, setPlaceName] = useState('')
  const [placeAddress, setPlaceAddress] = useState('')
  const [placeSettingsOpen, setPlaceSettingsOpen] = useState(false)
  const [tableHover, setTableHover] = useState({ rows: 1, cols: 1 })
  const [moreOpenText, setMoreOpenText] = useState('더보기')
  const [moreCloseText, setMoreCloseText] = useState('닫기')
  const [codeLang, setCodeLang] = useState('javascript')
  const [codeBody, setCodeBody] = useState('')
  const [imageResizeOpen, setImageResizeOpen] = useState(false)
  const [imageWidthDraft, setImageWidthDraft] = useState('')
  const [imageAltOpen, setImageAltOpen] = useState(false)
  const [imageAltDraft, setImageAltDraft] = useState('')
  const uid = useId()
  const htmlMode = editorMode === 'html'
  const markdownMode = editorMode === 'markdown'
  const modeLabel = markdownMode
    ? '기본 모드'
    : htmlMode
      ? 'HTML'
      : 'tistory 모드'
  const fmtDisabled = Boolean(disabled || htmlMode || markdownMode)

  const ed = () => editorRef.current?.getEditor() ?? null

  /* Parent page needs the same webfonts so the font dropdown previews match the iframe */
  useEffect(() => {
    const id = 'newrite-tistory-font-css'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = TISTORY_FONT_CSS
      document.head.appendChild(link)
    }
    const families = [
      'Noto Sans Demilight',
      'Noto Sans DemiLight',
      'Noto Sans Light',
      'Nanum Gothic',
      'Noto Serif KR',
    ]
    const preload = () => {
      void Promise.all(
        families.map((fam) =>
          document.fonts.load(`13px "${fam}"`).catch(() => undefined),
        ),
      )
    }
    if (link.sheet) preload()
    else link.addEventListener('load', preload)
    return () => link?.removeEventListener('load', preload)
  }, [])

  /**
   * Map an element inside the TinyMCE iframe → viewport coords for a
   * position:fixed object bar. After the scroll-layout refactor the iframe
   * does not scroll; `[data-newrite-canvas]` does, so `iframe.getBoundingClientRect()`
   * must be re-read on every canvas scroll (fr is iframe-viewport-relative).
   */
  const positionForEl = (editor: TinyMCEEditor, el: HTMLElement) => {
    const iframe =
      editor.iframeElement ||
      (editor.getContentAreaContainer()?.querySelector(
        'iframe',
      ) as HTMLIFrameElement | null)
    const ir = iframe?.getBoundingClientRect()
    const fr = el.getBoundingClientRect()
    if (!ir || fr.width <= 0 || fr.height <= 0) return null

    const canvas = document.querySelector(
      '[data-newrite-canvas]',
    ) as HTMLElement | null
    const cr = canvas?.getBoundingClientRect()
    // Element top/bottom in the top-level viewport
    const elTop = ir.top + fr.top
    const elBottom = ir.top + fr.bottom
    const elLeft = ir.left + fr.left
    const elRight = ir.left + fr.right
    // Hide when the block is fully outside the visible canvas stage
    if (cr) {
      if (elBottom < cr.top + 8 || elTop > cr.bottom - 8) return null
      if (elRight < cr.left + 8 || elLeft > cr.right - 8) return null
    }

    const rawTop = elTop - 52
    const minTop = cr ? cr.top + 4 : 8
    const maxTop = cr ? Math.max(minTop, cr.bottom - 56) : rawTop
    return {
      top: Math.min(maxTop, Math.max(minTop, rawTop)),
      left: elLeft + fr.width / 2,
    }
  }

  const setEmoticonAlign = (next: EmoticonAlign) => {
    const editor = ed()
    if (!editor) return
    const node = editor.selection.getNode()
    const fig = editor.dom.getParent(
      node,
      'figure[data-ke-type="emoticon"]',
    ) as HTMLElement | null
    if (!fig) return
    fig.setAttribute('data-ke-align', next)
    editor.selection.select(fig)
    editor.nodeChanged()
    editor.undoManager.add()
    editor.fire('change')
  }

  const setLocationAlign = (next: PlaceAlign) => {
    const editor = ed()
    if (!editor) return
    const node = editor.selection.getNode()
    const fig = editor.dom.getParent(
      node,
      'figure[data-ke-type="location"]',
    ) as HTMLElement | null
    if (!fig) return
    fig.setAttribute('data-ke-align', next)
    editor.selection.select(fig)
    editor.nodeChanged()
    editor.undoManager.add()
    editor.fire('change')
  }

  const setImageStyle = (style: ImageKeStyle) => {
    const editor = ed()
    if (!editor) return
    const fig = findImageFigure(editor.selection.getNode())
    if (!fig) return
    applyImageKeStyle(fig, style)
    editor.selection.select(fig)
    editor.nodeChanged()
    editor.undoManager.add()
    editor.fire('change')
  }

  const run = (fn: (editor: TinyMCEEditor) => void) => {
    const editor = ed()
    if (!editor) return
    fn(editor)
    editor.focus()
    setMenu(null)
    setPlaceSettingsOpen(false)
    setImageResizeOpen(false)
    setImageAltOpen(false)
  }

  const toggle = (id: MenuId) => {
    setMenu((m) => (m === id ? null : id))
    setPlaceSettingsOpen(false)
    setImageResizeOpen(false)
    setImageAltOpen(false)
  }

  const applyFont = (family: string, label: string) => {
    run((editor) => {
      editor.focus()
      editor.undoManager.transact(() => {
        // Match Tistory: always apply FontName (including 기본서체 stack).
        // remove() leaves sticky named faces on collapsed carets.
        editor.formatter.apply('fontname', { value: family })
      })
      setFontLabel(label)
      editor.nodeChanged()
    })
  }

  const insertPlace = () => {
    const name = placeName.trim()
    if (!name) return
    run((editor) => {
      editor.insertContent(
        placeInsertHtml({
          name,
          address: placeAddress.trim(),
          align: 'alignCenter',
        }),
      )
      const figs = editor
        .getBody()
        .querySelectorAll('figure[data-ke-type="location"]')
      const fig = figs[figs.length - 1] as HTMLElement | undefined
      if (fig) {
        editor.selection.select(fig)
        editor.nodeChanged()
      }
    })
    setPlaceName('')
    setPlaceAddress('')
  }

  const savePlaceSettings = () => {
    const editor = ed()
    if (!editor) return
    const fig = editor.dom.getParent(
      editor.selection.getNode(),
      'figure[data-ke-type="location"]',
    ) as HTMLElement | null
    if (!fig) return
    applyPlaceFields(fig, {
      name: placeName,
      address: placeAddress,
    })
    editor.selection.select(fig)
    editor.nodeChanged()
    editor.undoManager.add()
    editor.fire('change')
    setPlaceSettingsOpen(false)
  }

  const openLinkMenu = () => {
    const editor = ed()
    if (editor) {
      linkBookmark.current = editor.selection.getBookmark(2)
      const anchor = editor.dom.getParent(
        editor.selection.getNode(),
        'a[href]',
      ) as HTMLAnchorElement | null
      const selected = editor.selection.getContent({ format: 'text' }).trim()
      setLinkHasAnchor(Boolean(anchor))
      setLinkUrl(anchor?.getAttribute('href') || '')
      setLinkText(
        anchor?.getAttribute('title') ||
          (selected && selected !== anchor?.textContent ? selected : '') ||
          '',
      )
      const target = anchor?.getAttribute('target')
      setLinkNewWindow(!target || target === '_blank')
    } else {
      linkBookmark.current = null
      setLinkHasAnchor(false)
      setLinkUrl('')
      setLinkText('')
      setLinkNewWindow(true)
    }
    toggle('link')
  }

  const applyLink = () => {
    const href = linkUrl.trim()
    if (!href) return
    run((editor) => {
      if (linkBookmark.current) {
        try {
          editor.selection.moveToBookmark(linkBookmark.current)
        } catch {
          /* bookmark may be stale */
        }
      }
      const title = linkText.trim()
      const selectedText = editor.selection.getContent({ format: 'text' }).trim()
      const attrs: Record<string, string> = { href }
      if (linkNewWindow) {
        attrs.target = '_blank'
        attrs.rel = 'noopener noreferrer'
      }
      if (title) attrs.title = title

      if (editor.selection.isCollapsed()) {
        const label = title || href
        const attrStr = Object.entries(attrs)
          .map(([k, v]) => `${k}="${v.replace(/"/g, '&quot;')}"`)
          .join(' ')
        editor.insertContent(`<a ${attrStr}>${label}</a>`)
      } else {
        editor.execCommand('mceInsertLink', false, attrs)
        if (title && selectedText && title !== selectedText) {
          // Title attribute already set via mceInsertLink when supported
          const a = editor.dom.getParent(
            editor.selection.getNode(),
            'a[href]',
          ) as HTMLAnchorElement | null
          if (a) a.setAttribute('title', title)
        }
      }
    })
  }

  const removeLink = () => {
    run((editor) => {
      if (linkBookmark.current) {
        try {
          editor.selection.moveToBookmark(linkBookmark.current)
        } catch {
          /* ignore */
        }
      }
      editor.execCommand('unlink')
    })
  }

  useEffect(() => {
    const tryBind = () => {
      const editor = ed()
      if (!editor) return false
      try {
        editor.formatter.register('custom_body1', {
          block: 'p',
          styles: { fontSize: '18px', lineHeight: '1.7' },
        })
        editor.formatter.register('custom_body2', {
          block: 'p',
          styles: { fontSize: '16px', lineHeight: '1.75' },
        })
        editor.formatter.register('custom_body3', {
          block: 'p',
          styles: { fontSize: '14px', lineHeight: '1.7' },
        })
      } catch {
        /* already registered */
      }

      /** Active object figure — kept so canvas scroll can reposition without NodeChange. */
      let activeObjectFig: HTMLElement | null = null
      let activeObjectKind: ObjectUi['kind'] | null = null
      let rafPos = 0

      const syncObjectUiPosition = () => {
        if (!activeObjectFig || !activeObjectKind) return
        if (!activeObjectFig.isConnected) {
          activeObjectFig = null
          activeObjectKind = null
          setObjectUi(null)
          return
        }
        const pos = positionForEl(editor, activeObjectFig)
        if (!pos) {
          setObjectUi(null)
          return
        }
        if (activeObjectKind === 'image') {
          const img = activeObjectFig.querySelector('img')
          const w =
            Number(img?.getAttribute('width')) ||
            Math.round(img?.getBoundingClientRect().width || 0) ||
            undefined
          setObjectUi({
            kind: 'image',
            style: getImageKeStyle(activeObjectFig),
            top: pos.top,
            left: pos.left,
            imgWidth: w,
          })
        } else if (activeObjectKind === 'emoticon') {
          const raw =
            activeObjectFig.getAttribute('data-ke-align') || 'alignCenter'
          setObjectUi({
            kind: 'emoticon',
            style:
              raw === 'alignLeft' || raw === 'alignRight' ? raw : 'alignCenter',
            top: pos.top,
            left: pos.left,
          })
        } else {
          const raw =
            activeObjectFig.getAttribute('data-ke-align') || 'alignCenter'
          setObjectUi({
            kind: 'location',
            style:
              raw === 'alignLeft' || raw === 'alignRight' ? raw : 'alignCenter',
            top: pos.top,
            left: pos.left,
          })
        }
      }

      const scheduleObjectUiPosition = () => {
        if (rafPos) cancelAnimationFrame(rafPos)
        rafPos = requestAnimationFrame(() => {
          rafPos = 0
          syncObjectUiPosition()
        })
      }

      const sync = () => {
        if (editor.queryCommandState('JustifyCenter')) setAlign('center')
        else if (editor.queryCommandState('JustifyRight')) setAlign('right')
        else if (editor.queryCommandState('JustifyFull')) setAlign('justify')
        else if (editor.queryCommandState('JustifyLeft')) setAlign('left')
        else setAlign(null)
        setMarks({
          bold: !!editor.queryCommandState('Bold'),
          italic: !!editor.queryCommandState('Italic'),
          underline: !!editor.queryCommandState('Underline'),
          strike: !!editor.queryCommandState('Strikethrough'),
        })
        // Update 본문/제목 label only — never move DOM focus to the toolbar
        const block = editor.queryCommandValue('FormatBlock') || ''
        const b = String(block).toLowerCase()
        if (b === 'h2') setParaLabel('제목1')
        else if (b === 'h3') setParaLabel('제목2')
        else if (b === 'h4') setParaLabel('제목3')
        else if (b === 'p' || b === 'div' || b === '') {
          const node = editor.selection.getNode()
          const fs = editor.dom.getStyle(node, 'font-size', true) || ''
          if (fs.startsWith('18')) setParaLabel('본문1')
          else if (fs.startsWith('14')) setParaLabel('본문3')
          else setParaLabel('본문2')
        }

        // Sync font label from selection — always resolve (never leave previous label)
        setFontLabel(
          labelForFontName(String(editor.queryCommandValue('FontName') || '')),
        )

        // Floating object toolbar: emoticon / location / image
        const body = editor.getBody()
        const selNode = editor.selection.getNode() as HTMLElement
        const imageFig =
          (body?.querySelector(
            'figure[data-ke-type="image"][data-mce-selected]',
          ) as HTMLElement | null) || findImageFigure(selNode)
        const emotFig =
          (body?.querySelector(
            'figure[data-ke-type="emoticon"][data-mce-selected]',
          ) as HTMLElement | null) ||
          (selNode?.closest?.('figure[data-ke-type="emoticon"]') as HTMLElement | null)
        const locFig =
          (body?.querySelector(
            'figure[data-ke-type="location"][data-mce-selected]',
          ) as HTMLElement | null) ||
          (selNode?.closest?.('figure[data-ke-type="location"]') as HTMLElement | null)

        // Prefer the figure that actually owns the selection / mce-selected,
        // so a stale image[data-mce-selected] does not mask a place click.
        let activeFig: HTMLElement | null = null
        let kind: ObjectUi['kind'] | null = null
        if (
          imageFig &&
          (imageFig.getAttribute('data-mce-selected') ||
            imageFig === selNode ||
            imageFig.contains(selNode))
        ) {
          activeFig = imageFig
          kind = 'image'
        } else if (
          emotFig &&
          (emotFig.getAttribute('data-mce-selected') ||
            emotFig === selNode ||
            emotFig.contains(selNode))
        ) {
          activeFig = emotFig
          kind = 'emoticon'
        } else if (
          locFig &&
          (locFig.getAttribute('data-mce-selected') ||
            locFig === selNode ||
            locFig.contains(selNode))
        ) {
          activeFig = locFig
          kind = 'location'
        } else if (imageFig || emotFig || locFig) {
          // Fallback: mce-selected on body without sel ancestry (CEF edge cases)
          activeFig = imageFig || emotFig || locFig
          kind = imageFig ? 'image' : emotFig ? 'emoticon' : 'location'
        }

        activeObjectFig = activeFig
        activeObjectKind = kind
        if (activeFig && kind) {
          syncObjectUiPosition()
        } else {
          setObjectUi(null)
          setPlaceSettingsOpen(false)
          setImageResizeOpen(false)
          setImageAltOpen(false)
        }
      }
      const closeToolbarMenus = () => {
        // Iframe events do not bubble to document, so MenuShell's outside-click
        // listener never sees body clicks — close menus here instead.
        setMenu(null)
        setPlaceSettingsOpen(false)
        setImageResizeOpen(false)
        setImageAltOpen(false)
        const ae = document.activeElement
        if (
          ae instanceof HTMLElement &&
          ae.closest('[role="toolbar"][aria-label="서식"]')
        ) {
          ae.blur()
        }
      }

      const canvas = document.querySelector(
        '[data-newrite-canvas]',
      ) as HTMLElement | null
      const onCanvasScroll = () => scheduleObjectUiPosition()
      canvas?.addEventListener('scroll', onCanvasScroll, { passive: true })
      window.addEventListener('resize', onCanvasScroll)

      editor.on('NodeChange', sync)
      editor.on('ObjectSelected', sync)
      editor.on('focus', closeToolbarMenus)
      editor.on('mousedown', closeToolbarMenus)
      editor.on('click', closeToolbarMenus)
      sync()
      unbind = () => {
        if (rafPos) cancelAnimationFrame(rafPos)
        canvas?.removeEventListener('scroll', onCanvasScroll)
        window.removeEventListener('resize', onCanvasScroll)
        editor.off('NodeChange', sync)
        editor.off('ObjectSelected', sync)
        editor.off('focus', closeToolbarMenus)
        editor.off('mousedown', closeToolbarMenus)
        editor.off('click', closeToolbarMenus)
      }
      return true
    }

    let unbind: (() => void) | undefined
    if (tryBind()) {
      return () => unbind?.()
    }
    const t = window.setInterval(() => {
      if (tryBind()) window.clearInterval(t)
    }, 200)
    return () => {
      window.clearInterval(t)
      unbind?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="서식">
      <div className={styles.toolGroup}>
        <ToolBtn
          title="첨부"
          className={styles.toolDrop}
          disabled={disabled || htmlMode || markdownMode}
          active={menu === 'image'}
          onClick={() => toggle('image')}
        >
          <SpriteIcon name="image" />
          <Chevron />
        </ToolBtn>
        <MenuShell open={menu === 'image'} onClose={() => setMenu(null)}>
          <button
            type="button"
            role="menuitem"
            className={styles.toolMenuItem}
            onClick={() => {
              editorRef.current?.pickImage()
              setMenu(null)
            }}
          >
            사진
          </button>
        </MenuShell>
      </div>

      <div className={styles.toolGroup}>
        <ToolBtn
          title="문단모양"
          className={styles.toolDrop}
          disabled={disabled}
          active={menu === 'para'}
          onClick={() => toggle('para')}
        >
          {paraLabel}
          <Chevron />
        </ToolBtn>
        <MenuShell
          open={menu === 'para'}
          onClose={() => setMenu(null)}
          className={styles.paraMenu}
        >
          {PARA_STYLES.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitem"
              className={`${styles.toolMenuItem}${p.itemClass ? ` ${styles[p.itemClass as keyof typeof styles] ?? ''}` : ''}`}
              onClick={() =>
                run((editor) => {
                  p.apply(editor)
                  setParaLabel(p.label)
                })
              }
            >
              {p.label}
            </button>
          ))}
        </MenuShell>
      </div>

      <div className={styles.toolGroup}>
        <ToolBtn
          title="글꼴"
          className={`${styles.toolDrop} ${styles.toolDropFont}`}
          disabled={fmtDisabled}
          active={menu === 'font'}
          onClick={() => toggle('font')}
        >
          {fontLabel}
          <Chevron />
        </ToolBtn>
        <MenuShell
          open={menu === 'font'}
          onClose={() => setMenu(null)}
          className={styles.fontMenu}
        >
          {FONT_OPTIONS.map((f) => {
            const selected = fontLabel === f.label
            return (
              <button
                key={f.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`${styles.toolMenuItem} ${styles.fontMenuItem}${selected ? ` ${styles.fontMenuItemActive}` : ''}`}
                style={{ fontFamily: f.family }}
                onClick={() => applyFont(f.family, f.label)}
              >
                <span className={styles.fontMenuCheck} aria-hidden>
                  {selected ? '✓' : ''}
                </span>
                <span className={styles.fontMenuLabel}>{f.label}</span>
              </button>
            )
          })}
        </MenuShell>
      </div>

      <ToolSep />

      <ToolBtn
        title="굵게"
        disabled={disabled}
        active={marks.bold}
        onClick={() => run((editor) => editor.execCommand('Bold'))}
      >
        <SpriteIcon name="bold" active={marks.bold} />
      </ToolBtn>
      <ToolBtn
        title="기울임꼴"
        disabled={disabled}
        active={marks.italic}
        onClick={() => run((editor) => editor.execCommand('Italic'))}
      >
        <SpriteIcon name="italic" active={marks.italic} />
      </ToolBtn>
      <ToolBtn
        title="밑줄"
        disabled={disabled}
        active={marks.underline}
        onClick={() => run((editor) => editor.execCommand('Underline'))}
      >
        <SpriteIcon name="underline" active={marks.underline} />
      </ToolBtn>
      <ToolBtn
        title="취소선"
        disabled={disabled}
        active={marks.strike}
        onClick={() => run((editor) => editor.execCommand('Strikethrough'))}
      >
        <SpriteIcon name="strike" active={marks.strike} />
      </ToolBtn>

      <div className={styles.toolGroup}>
        <ToolBtn
          title="글자색"
          disabled={disabled}
          active={menu === 'color'}
          onClick={() => toggle('color')}
        >
          <span className={styles.colorIconWrap}>
            <SpriteIcon name="forecolor" />
            <i
              className={styles.colorDot}
              style={{ background: '#e03131' }}
            />
          </span>
        </ToolBtn>
        <MenuShell
          open={menu === 'color'}
          onClose={() => setMenu(null)}
          className={styles.swatchMenu}
        >
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={styles.swatch}
              style={{ background: c }}
              title={c}
              aria-label={`글자색 ${c}`}
              onClick={() =>
                run((editor) => editor.execCommand('ForeColor', false, c))
              }
            />
          ))}
        </MenuShell>
      </div>

      <div className={styles.toolGroup}>
        <ToolBtn
          title="배경색"
          disabled={disabled}
          active={menu === 'bg'}
          onClick={() => toggle('bg')}
        >
          <span className={styles.colorIconWrap}>
            <SpriteIcon name="backcolor" />
            <i
              className={styles.colorBox}
              style={{ background: '#fff3bf', borderColor: '#ccc' }}
            />
          </span>
        </ToolBtn>
        <MenuShell
          open={menu === 'bg'}
          onClose={() => setMenu(null)}
          className={styles.swatchMenu}
        >
          {BG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={styles.swatch}
              style={{
                background: c === 'transparent' ? '#fff' : c,
                border: c === 'transparent' ? '1px dashed #bbb' : undefined,
              }}
              title={c}
              aria-label={`배경색 ${c}`}
              onClick={() =>
                run((editor) => {
                  if (c === 'transparent') {
                    editor.execCommand('RemoveFormat')
                    return
                  }
                  editor.execCommand('HiliteColor', false, c)
                })
              }
            />
          ))}
        </MenuShell>
      </div>

      <ToolSep />

      <ToolBtn
        title="왼쪽 정렬"
        disabled={disabled}
        active={align === 'left'}
        onClick={() =>
          run((editor) => {
            editor.execCommand('JustifyLeft')
            setAlign('left')
          })
        }
      >
        <SpriteIcon name="alignleft" active={align === 'left'} />
      </ToolBtn>
      <ToolBtn
        title="가운데 정렬"
        disabled={disabled}
        active={align === 'center'}
        onClick={() =>
          run((editor) => {
            editor.execCommand('JustifyCenter')
            setAlign('center')
          })
        }
      >
        <SpriteIcon name="aligncenter" active={align === 'center'} />
      </ToolBtn>
      <ToolBtn
        title="오른쪽 정렬"
        disabled={disabled}
        active={align === 'right'}
        onClick={() =>
          run((editor) => {
            editor.execCommand('JustifyRight')
            setAlign('right')
          })
        }
      >
        <SpriteIcon name="alignright" active={align === 'right'} />
      </ToolBtn>
      <ToolBtn
        title="양쪽정렬"
        disabled={disabled}
        active={align === 'justify'}
        onClick={() =>
          run((editor) => {
            editor.execCommand('JustifyFull')
            setAlign('justify')
          })
        }
      >
        <SpriteIcon name="alignjustify" active={align === 'justify'} />
      </ToolBtn>

      <ToolSep />

      <div className={styles.toolGroup}>
        <ToolBtn
          title="인용"
          disabled={disabled}
          active={menu === 'quote'}
          onClick={() => toggle('quote')}
        >
          <SpriteIcon name="quote" />
        </ToolBtn>
        <MenuShell
          open={menu === 'quote'}
          onClose={() => setMenu(null)}
          className={styles.quoteMenu}
        >
          <button
            type="button"
            role="menuitem"
            className={styles.quoteItem}
            title="인용1"
            aria-label="인용1"
            onClick={() => run((editor) => insertQuote(editor, 'style1'))}
          >
            <span className={`${styles.quotePreview} ${styles.quotePreview1}`}>
              인용1
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.quoteItem}
            title="인용2"
            aria-label="인용2"
            onClick={() => run((editor) => insertQuote(editor, 'style2'))}
          >
            <span className={`${styles.quotePreview} ${styles.quotePreview2}`}>
              인용2
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.quoteItem}
            title="인용3"
            aria-label="인용3"
            onClick={() => run((editor) => insertQuote(editor, 'style3'))}
          >
            <span className={`${styles.quotePreview} ${styles.quotePreview3}`}>
              인용3
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.quoteItem}
            title="리셋"
            aria-label="인용 해제"
            onClick={() => run((editor) => insertQuote(editor, 'remove'))}
          >
            <i
              className={styles.spriteIcon}
              style={{ backgroundPosition: '-380px -20px' }}
              aria-hidden
            />
          </button>
        </MenuShell>
      </div>

      <div className={styles.toolGroup}>
        <ToolBtn
          title="이모티콘"
          disabled={disabled}
          active={menu === 'emoji'}
          onClick={() => toggle('emoji')}
        >
          <SpriteIcon name="emoji" active={menu === 'emoji'} />
        </ToolBtn>
        <MenuShell
          open={menu === 'emoji'}
          onClose={() => setMenu(null)}
          className={styles.emoticonPanel}
          placement="end"
        >
          <ul className={styles.emoticonTabs} role="tablist" aria-label="이모티콘 팩">
            {EMOTICON_TABS.map((tab) => {
              const active = emoticonTab === tab.id
              const pos = EMOT_TAB_POS[tab.id]
              return (
                <li key={tab.id} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={tab.label}
                    title={tab.label}
                    className={`${styles.emoticonTab} ${active ? styles.emoticonTabActive : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setEmoticonTab(tab.id)}
                  >
                    <i
                      className={styles.emoticonTabIcon}
                      style={{
                        backgroundPosition: active ? pos.active : pos.idle,
                      }}
                      aria-hidden
                    />
                  </button>
                </li>
              )
            })}
          </ul>
          <div
            className={styles.emoticonGrid}
            role="tabpanel"
            aria-label={EMOTICON_TABS.find((t) => t.id === emoticonTab)?.label}
          >
            {getEmoticonPack(emoticonTab).map((item) => (
              <button
                key={`${emoticonTab}-${item.name}`}
                type="button"
                className={`${styles.emoticonItem} ${emoticonTab === 'face' ? styles.emoticonItemFace : ''}`}
                title={item.label}
                aria-label={item.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  run((editor) => {
                    editor.insertContent(
                      emoticonInsertHtml(item, emoticonTab),
                    )
                    // Select inserted figure so Tistory-style align bar appears
                    const figs = editor
                      .getBody()
                      .querySelectorAll('figure[data-ke-type="emoticon"]')
                    const fig = figs[figs.length - 1] as HTMLElement | undefined
                    if (fig) {
                      editor.selection.select(fig)
                      editor.nodeChanged()
                    }
                  })
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumb}
                  alt=""
                  height={item.thumbHeight}
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </MenuShell>
      </div>

      <div className={styles.toolGroup}>
        <ToolBtn
          title="테이블"
          disabled={disabled}
          active={menu === 'table'}
          onClick={() => {
            setTableHover({ rows: 1, cols: 1 })
            toggle('table')
          }}
        >
          <SpriteIcon name="table" />
        </ToolBtn>
        <MenuShell
          open={menu === 'table'}
          onClose={() => setMenu(null)}
          className={styles.tableMenu}
        >
          <table
            className={styles.tableGrid}
            role="grid"
            aria-label="표 크기 선택"
            onMouseLeave={() => setTableHover({ rows: 1, cols: 1 })}
          >
            <tbody>
              {Array.from({ length: TABLE_GRID }, (_, y) => (
                <tr key={y}>
                  {Array.from({ length: TABLE_GRID }, (_, x) => {
                    const active =
                      x < tableHover.cols && y < tableHover.rows
                    return (
                      <td key={x} role="gridcell">
                        <button
                          type="button"
                          className={`${styles.tableGridCell} ${active ? styles.tableGridCellActive : ''}`}
                          aria-label={`${y + 1} x ${x + 1}`}
                          onMouseEnter={() =>
                            setTableHover({ rows: y + 1, cols: x + 1 })
                          }
                          onClick={() =>
                            run((editor) =>
                              insertTableAt(editor, y + 1, x + 1),
                            )
                          }
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.tableGridLabel} role="presentation">
            {tableHover.cols} x {tableHover.rows}
          </div>
        </MenuShell>
      </div>

      <div className={styles.toolGroup}>
        <ToolBtn
          title="링크 삽입/수정"
          disabled={disabled}
          active={menu === 'link'}
          onClick={openLinkMenu}
        >
          <SpriteIcon name="link" />
        </ToolBtn>
        <MenuShell
          open={menu === 'link'}
          onClose={() => setMenu(null)}
          className={styles.linkPanel}
        >
          <form
            className={styles.linkForm}
            onSubmit={(e) => {
              e.preventDefault()
              applyLink()
            }}
          >
            <label className={styles.linkField}>
              <span className={styles.srOnly}>URL</span>
              <input
                className={styles.linkInput}
                type="text"
                inputMode="url"
                placeholder="URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                autoFocus
              />
            </label>
            <label className={styles.linkField}>
              <span className={styles.srOnly}>대체텍스트</span>
              <input
                className={styles.linkInput}
                type="text"
                placeholder="대체텍스트"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
              />
            </label>
            <div className={styles.linkFooter}>
              <label className={styles.linkNewWindow}>
                <input
                  type="checkbox"
                  checked={linkNewWindow}
                  onChange={(e) => setLinkNewWindow(e.target.checked)}
                />
                새창으로 열기
              </label>
              {linkHasAnchor ? (
                <button
                  type="button"
                  className={styles.linkUnlink}
                  onClick={removeLink}
                >
                  링크해제
                </button>
              ) : null}
              <button
                type="submit"
                className={styles.linkSubmit}
                disabled={!linkUrl.trim()}
              >
                확인
              </button>
            </div>
          </form>
        </MenuShell>
      </div>

      <div className={styles.toolGroup}>
        <ToolBtn
          title="리스트"
          disabled={disabled}
          active={menu === 'list'}
          onClick={() => toggle('list')}
        >
          <SpriteIcon name="list" />
        </ToolBtn>
        <MenuShell
          open={menu === 'list'}
          onClose={() => setMenu(null)}
          className={styles.listMenu}
        >
          <button
            type="button"
            role="menuitem"
            className={styles.listItem}
            title="원반"
            aria-label="원반 목록"
            onClick={() => run((editor) => applyList(editor, 'disc'))}
          >
            <ul className={`${styles.listPreview} ${styles.listPreviewDisc}`} aria-hidden>
              <li>──</li>
              <li>──</li>
              <li>──</li>
            </ul>
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.listItem}
            title="원"
            aria-label="원 목록"
            onClick={() => run((editor) => applyList(editor, 'circle'))}
          >
            <ul className={`${styles.listPreview} ${styles.listPreviewCircle}`} aria-hidden>
              <li>──</li>
              <li>──</li>
              <li>──</li>
            </ul>
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.listItem}
            title="숫자"
            aria-label="숫자 목록"
            onClick={() => run((editor) => applyList(editor, 'decimal'))}
          >
            <ol className={`${styles.listPreview} ${styles.listPreviewDecimal}`} aria-hidden>
              <li>──</li>
              <li>──</li>
              <li>──</li>
            </ol>
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.listItem}
            title="목록 해제"
            aria-label="목록 해제"
            onClick={() => run((editor) => applyList(editor, 'remove'))}
          >
            <span className={styles.listPreviewRemove} aria-hidden>
              ⌫
            </span>
          </button>
        </MenuShell>
      </div>

      <div className={styles.toolGroup}>
        <ToolBtn
          title="구분선"
          disabled={disabled}
          active={menu === 'hr'}
          onClick={() => toggle('hr')}
        >
          <SpriteIcon name="hr" />
        </ToolBtn>
        <MenuShell
          open={menu === 'hr'}
          onClose={() => setMenu(null)}
          className={styles.hrMenu}
        >
          {HR_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              role="menuitem"
              className={styles.hrItem}
              title={`구분선 ${style}`}
              aria-label={`구분선 ${style}`}
              onClick={() => run((editor) => insertHr(editor, style))}
            >
              <i
                className={`${styles.hrPreview} ${styles[HR_PREVIEW_CLASS[style]]}`}
                aria-hidden
              />
            </button>
          ))}
        </MenuShell>
      </div>

      <div className={styles.toolGroup}>
        <ToolBtn
          title="더보기"
          disabled={disabled}
          active={
            menu === 'more' ||
            menu === 'moreLess' ||
            menu === 'specialChar' ||
            menu === 'codeblock' ||
            menu === 'margin'
          }
          onClick={() => toggle('more')}
        >
          <SpriteIcon name="more" />
        </ToolBtn>
        <MenuShell open={menu === 'more'} onClose={() => setMenu(null)}>
          <button
            type="button"
            role="menuitem"
            className={styles.toolMenuItem}
            onClick={() => {
              const editor = ed()
              if (editor) {
                moreLessBookmark.current = editor.selection.getBookmark(2)
              } else {
                moreLessBookmark.current = null
              }
              const existing = editor
                ? findMoreLess(editor.selection.getNode())
                : null
              if (existing) {
                const labels = readMoreLessLabels(existing)
                setMoreOpenText(labels.openText)
                setMoreCloseText(labels.closeText)
              } else {
                setMoreOpenText(MORELESS_DEFAULT_MORE)
                setMoreCloseText(MORELESS_DEFAULT_LESS)
              }
              setMenu('moreLess')
            }}
          >
            접은글
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.toolMenuItem}
            onClick={() => setMenu('specialChar')}
          >
            특수문자
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.toolMenuItem}
            onClick={() => {
              setCodeLang('javascript')
              setCodeBody('')
              setMenu('codeblock')
            }}
          >
            코드블럭
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.toolMenuItem}
            onClick={() => setMenu('margin')}
          >
            여백
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.toolMenuItem}
            onClick={() => onEditorModeChange?.('html')}
          >
            HTML 소스
          </button>
        </MenuShell>
        <MenuShell
          open={menu === 'margin'}
          onClose={() => setMenu(null)}
          className={styles.marginPanel}
        >
          <div className={styles.marginPanelHeader}>
            <span className={styles.formLabel}>여백</span>
            <span className={styles.marginValue} aria-live="polite">
              {sideMarginPct}%
            </span>
          </div>
          <p className={styles.marginHint}>
            좌·우 각각 (가운데 글쓰기 폭{' '}
            {Math.max(0, 100 - sideMarginPct * 2)}%)
          </p>
          <label className={styles.marginSliderRow}>
            <span className={styles.srOnly}>좌우 여백</span>
            <input
              type="range"
              className={styles.marginSlider}
              min={NEWRITE_SIDE_MARGIN_MIN}
              max={NEWRITE_SIDE_MARGIN_MAX}
              step={1}
              value={sideMarginPct}
              onChange={(e) =>
                onSideMarginChange?.(Number(e.target.value))
              }
              aria-valuemin={NEWRITE_SIDE_MARGIN_MIN}
              aria-valuemax={NEWRITE_SIDE_MARGIN_MAX}
              aria-valuenow={sideMarginPct}
              aria-label="좌우 여백 퍼센트"
            />
          </label>
          <div className={styles.marginScale}>
            <span>{NEWRITE_SIDE_MARGIN_MIN}%</span>
            <button
              type="button"
              className={styles.marginReset}
              onClick={() =>
                onSideMarginChange?.(NEWRITE_SIDE_MARGIN_DEFAULT)
              }
            >
              기본 {NEWRITE_SIDE_MARGIN_DEFAULT}%
            </button>
            <span>{NEWRITE_SIDE_MARGIN_MAX}%</span>
          </div>
        </MenuShell>
        <MenuShell
          open={menu === 'moreLess'}
          onClose={() => setMenu(null)}
          className={styles.moreLessPanel}
        >
          <form
            className={styles.moreLessForm}
            onSubmit={(e) => {
              e.preventDefault()
              const bookmark = moreLessBookmark.current
              moreLessBookmark.current = null
              run((editor) =>
                insertMoreLess(editor, moreOpenText, moreCloseText, bookmark),
              )
              setMenu(null)
            }}
          >
            <label className={styles.linkField}>
              <span className={styles.formLabel}>열기 문구</span>
              <input
                className={styles.linkInput}
                value={moreOpenText}
                onChange={(e) => setMoreOpenText(e.target.value)}
                placeholder="열기 문구"
                autoFocus
              />
            </label>
            <label className={styles.linkField}>
              <span className={styles.formLabel}>닫기 문구</span>
              <input
                className={styles.linkInput}
                value={moreCloseText}
                onChange={(e) => setMoreCloseText(e.target.value)}
                placeholder="닫기 문구"
              />
            </label>
            <div className={styles.linkFooter}>
              <button type="submit" className={styles.linkSubmit}>
                확인
              </button>
              <button
                type="button"
                className={styles.linkUnlink}
                onClick={() => setMenu(null)}
              >
                취소
              </button>
            </div>
          </form>
        </MenuShell>
        <MenuShell
          open={menu === 'specialChar'}
          onClose={() => setMenu(null)}
          className={styles.charmapPanel}
        >
          <div className={styles.charmapTitle}>특수문자</div>
          <div className={styles.charmapGrid} role="listbox" aria-label="특수문자">
            {SPECIAL_CHARS.map((ch) => (
              <button
                key={ch}
                type="button"
                role="option"
                className={styles.charmapCell}
                title={ch}
                onClick={() =>
                  run((editor) => {
                    editor.insertContent(ch)
                  })
                }
              >
                {ch}
              </button>
            ))}
          </div>
        </MenuShell>
        <MenuShell
          open={menu === 'codeblock'}
          onClose={() => setMenu(null)}
          className={styles.codeblockPanel}
        >
          <form
            className={styles.codeblockForm}
            onSubmit={(e) => {
              e.preventDefault()
              run((editor) => insertCodeblock(editor, codeLang, codeBody))
            }}
          >
            <label className={styles.linkField}>
              <span className={styles.formLabel}>언어</span>
              <select
                className={styles.linkInput}
                value={codeLang}
                onChange={(e) => setCodeLang(e.target.value)}
              >
                {CODEBLOCK_LANGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.linkField}>
              <span className={styles.formLabel}>코드</span>
              <textarea
                className={styles.codeblockInput}
                value={codeBody}
                onChange={(e) => setCodeBody(e.target.value)}
                placeholder="코드를 입력해 주세요"
                rows={8}
                autoFocus
              />
            </label>
            <div className={styles.linkFooter}>
              <button type="submit" className={styles.linkSubmit}>
                삽입
              </button>
              <button
                type="button"
                className={styles.linkUnlink}
                onClick={() => setMenu(null)}
              >
                취소
              </button>
            </div>
          </form>
        </MenuShell>
      </div>

      <div className={styles.toolGroup}>
        <ToolBtn
          title="장소"
          disabled={disabled || htmlMode || markdownMode}
          active={menu === 'place'}
          onClick={() => toggle('place')}
        >
          <SpriteIcon name="location" />
        </ToolBtn>
        <MenuShell
          open={menu === 'place'}
          onClose={() => setMenu(null)}
          className={styles.placePanel}
        >
          <form
            className={styles.placeForm}
            onSubmit={(e) => {
              e.preventDefault()
              insertPlace()
            }}
          >
            <label className={styles.linkField}>
              <span className={styles.srOnly}>장소명</span>
              <input
                className={styles.linkInput}
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="장소명"
                autoFocus
              />
            </label>
            <label className={styles.linkField}>
              <span className={styles.srOnly}>주소</span>
              <input
                className={styles.linkInput}
                value={placeAddress}
                onChange={(e) => setPlaceAddress(e.target.value)}
                placeholder="주소 (선택)"
              />
            </label>
            <div className={styles.linkActions}>
              <button type="submit" className={styles.linkSubmit} disabled={!placeName.trim()}>
                삽입
              </button>
            </div>
          </form>
        </MenuShell>
      </div>

      <div className={styles.toolbarSpacer} />

      <div className={styles.toolGroup}>
        <ToolBtn
          title="편집 모드"
          className={styles.modePill}
          disabled={disabled}
          active={menu === 'mode'}
          onClick={() => toggle('mode')}
          aria-controls={`${uid}-mode`}
        >
          {modeLabel}
          <Chevron />
        </ToolBtn>
        <MenuShell
          open={menu === 'mode'}
          onClose={() => setMenu(null)}
          className={styles.modeMenu}
          placement="end"
        >
          {(
            [
              ['tistory 모드', 'wysiwyg', 'TinyMCE WYSIWYG (HTML)'],
              ['기본 모드', 'markdown', '마크다운 편집'],
              ['HTML', 'html', '소스 보기 (코드 편집)'],
            ] as const
          ).map(([label, mode, hint]) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className={styles.toolMenuItem}
              onClick={() => {
                onEditorModeChange?.(mode)
                setMenu(null)
              }}
            >
              <strong>{label}</strong>
              <span className={styles.menuHint}>{hint}</span>
            </button>
          ))}
        </MenuShell>
      </div>
      {objectUi &&
        createPortal(
          <div
            className={`${styles.objectAlignBar} ${
              objectUi.kind === 'image' ? styles.objectAlignBarImage : ''
            }`}
            style={{ top: objectUi.top, left: objectUi.left }}
            role="toolbar"
            aria-label={
              objectUi.kind === 'image'
                ? '이미지 도구'
                : objectUi.kind === 'location'
                  ? '장소 정렬'
                  : '이모티콘 정렬'
            }
            onMouseDown={(e) => e.preventDefault()}
          >
            {objectUi.kind === 'image' ? (
              <>
                <button
                  type="button"
                  title="이미지 교체"
                  aria-label="이미지 편집"
                  className={styles.objectAlignBtn}
                  onClick={() => editorRef.current?.pickImage()}
                >
                  <span className={styles.objectGlyph}>✎</span>
                </button>
                <button
                  type="button"
                  title="크기 변경"
                  aria-label="크기 변경"
                  aria-expanded={imageResizeOpen}
                  className={`${styles.objectAlignBtn} ${
                    imageResizeOpen ? styles.objectAlignBtnActive : ''
                  }`}
                  onClick={() => {
                    setImageResizeOpen((o) => !o)
                    setImageAltOpen(false)
                    setImageWidthDraft(
                      objectUi.imgWidth ? String(objectUi.imgWidth) : '',
                    )
                  }}
                >
                  <span className={styles.objectGlyph}>↔</span>
                </button>
                <span className={styles.objectBarSep} aria-hidden />
                {(
                  [
                    ['widthContent', '본문 폭 맞춤'],
                    ['alignLeft', '왼쪽 정렬'],
                    ['alignCenter', '가운데 정렬'],
                    ['alignRight', '오른쪽 정렬'],
                    ['floatLeft', '글 왼쪽 정렬'],
                    ['floatRight', '글 오른쪽 정렬'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    title={label}
                    aria-label={label}
                    aria-pressed={objectUi.style === value}
                    className={`${styles.objectAlignBtn} ${
                      objectUi.style === value ? styles.objectAlignBtnActive : ''
                    }`}
                    onClick={() => setImageStyle(value)}
                  >
                    <i
                      className={`${styles.objectAlignIcon} ${
                        value === 'widthContent'
                          ? styles.objectAlignIconWidth
                          : value === 'alignLeft' || value === 'floatLeft'
                            ? styles.emoticonAlignIconLeft
                            : value === 'alignRight' || value === 'floatRight'
                              ? styles.emoticonAlignIconRight
                              : styles.emoticonAlignIconCenter
                      }`}
                      aria-hidden
                    />
                  </button>
                ))}
                <span className={styles.objectBarSep} aria-hidden />
                <button
                  type="button"
                  title="링크 삽입/수정"
                  aria-label="링크 삽입/수정"
                  className={styles.objectAlignBtn}
                  onClick={() => {
                    openLinkMenu()
                  }}
                >
                  <SpriteIcon name="link" />
                </button>
                <button
                  type="button"
                  title="대체 텍스트"
                  aria-label="대체 텍스트 삽입"
                  aria-expanded={imageAltOpen}
                  className={`${styles.objectAlignBtn} ${
                    imageAltOpen ? styles.objectAlignBtnActive : ''
                  }`}
                  onClick={() => {
                    const editor = ed()
                    const fig = editor
                      ? findImageFigure(editor.selection.getNode())
                      : null
                    const img = fig?.querySelector('img')
                    setImageAltDraft(img?.getAttribute('alt') || '')
                    setImageAltOpen((o) => !o)
                    setImageResizeOpen(false)
                  }}
                >
                  <span className={styles.objectGlyph}>ALT</span>
                </button>
                {imageResizeOpen ? (
                  <div className={styles.imageResizePopover} role="dialog">
                    <span className={styles.imageResizeLabel}>W</span>
                    <input
                      className={styles.imageResizeInput}
                      value={imageWidthDraft}
                      maxLength={4}
                      placeholder="860"
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        setImageWidthDraft(e.target.value.replace(/\D/g, ''))
                      }
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        const n = Number(imageWidthDraft)
                        if (!n) return
                        run((editor) => {
                          const fig = findImageFigure(editor.selection.getNode())
                          if (!fig) return
                          applyImageWidth(fig, n)
                          editor.selection.select(fig)
                          editor.nodeChanged()
                        })
                      }}
                    />
                    <button
                      type="button"
                      title="원본 크기"
                      aria-label="Width reset"
                      className={styles.objectAlignBtn}
                      onClick={() =>
                        run((editor) => {
                          const fig = findImageFigure(editor.selection.getNode())
                          if (!fig) return
                          resetImageWidth(fig)
                          editor.selection.select(fig)
                          editor.nodeChanged()
                        })
                      }
                    >
                      <span className={styles.objectGlyph}>↺</span>
                    </button>
                  </div>
                ) : null}
                {imageAltOpen ? (
                  <form
                    className={styles.imageAltPopover}
                    onSubmit={(e) => {
                      e.preventDefault()
                      run((editor) => {
                        const fig = findImageFigure(editor.selection.getNode())
                        const img = fig?.querySelector('img')
                        if (!img) return
                        img.setAttribute('alt', imageAltDraft)
                        if (fig) editor.selection.select(fig)
                        editor.nodeChanged()
                      })
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <textarea
                      className={styles.imageAltInput}
                      value={imageAltDraft}
                      onChange={(e) => setImageAltDraft(e.target.value)}
                      placeholder="대체텍스트"
                      rows={2}
                    />
                    <button type="submit" className={styles.linkSubmit}>
                      확인
                    </button>
                  </form>
                ) : null}
              </>
            ) : (
              <>
                {(
                  [
                    ['alignLeft', '왼쪽 정렬', styles.emoticonAlignIconLeft],
                    ['alignCenter', '가운데 정렬', styles.emoticonAlignIconCenter],
                    ['alignRight', '오른쪽 정렬', styles.emoticonAlignIconRight],
                  ] as const
                ).map(([value, label, iconClass]) => (
                  <button
                    key={value}
                    type="button"
                    title={label}
                    aria-label={label}
                    aria-pressed={objectUi.style === value}
                    className={`${styles.objectAlignBtn} ${
                      objectUi.style === value ? styles.objectAlignBtnActive : ''
                    }`}
                    onClick={() => {
                      if (objectUi.kind === 'emoticon') {
                        setEmoticonAlign(value)
                      } else {
                        setLocationAlign(value)
                      }
                    }}
                  >
                    <i
                      className={`${styles.objectAlignIcon} ${iconClass}`}
                      aria-hidden
                    />
                  </button>
                ))}
                {objectUi.kind === 'location' ? (
                  <>
                    <span className={styles.objectBarSep} aria-hidden />
                    <button
                      type="button"
                      title="장소 설정"
                      aria-label="장소 설정"
                      aria-expanded={placeSettingsOpen}
                      className={`${styles.objectAlignBtn} ${
                        placeSettingsOpen ? styles.objectAlignBtnActive : ''
                      }`}
                      onClick={() => {
                        const editor = ed()
                        const fig = editor?.dom.getParent(
                          editor.selection.getNode(),
                          'figure[data-ke-type="location"]',
                        ) as HTMLElement | null
                        if (fig) {
                          const fields = readPlaceFields(fig)
                          setPlaceName(fields.name)
                          setPlaceAddress(fields.address)
                        }
                        setPlaceSettingsOpen((o) => !o)
                      }}
                    >
                      <span className={styles.objectGlyph}>⚙</span>
                    </button>
                    <button
                      type="button"
                      title="삭제"
                      aria-label="삭제"
                      className={styles.objectAlignBtn}
                      onClick={() =>
                        run((editor) => {
                          const fig = editor.dom.getParent(
                            editor.selection.getNode(),
                            'figure[data-ke-type="location"]',
                          )
                          if (fig) {
                            editor.dom.remove(fig)
                            editor.nodeChanged()
                          }
                        })
                      }
                    >
                      <span className={styles.objectGlyph}>×</span>
                    </button>
                    {placeSettingsOpen ? (
                      <form
                        className={styles.placeSettingsPopover}
                        onSubmit={(e) => {
                          e.preventDefault()
                          savePlaceSettings()
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <input
                          className={styles.linkInput}
                          value={placeName}
                          onChange={(e) => setPlaceName(e.target.value)}
                          placeholder="장소명"
                        />
                        <input
                          className={styles.linkInput}
                          value={placeAddress}
                          onChange={(e) => setPlaceAddress(e.target.value)}
                          placeholder="주소"
                        />
                        <button type="submit" className={styles.linkSubmit}>
                          적용
                        </button>
                      </form>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}

function Chevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M2 4l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
