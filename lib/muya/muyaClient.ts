/**
 * Client-only Muya bootstrap. Import only from browser code (useEffect / dynamic import).
 */
import {
  CodeBlockLanguageSelector,
  EmojiSelector,
  en,
  FootnoteTool,
  ImageEditTool,
  ImageResizeBar,
  ImageToolBar,
  LinkTools,
  Muya,
} from '@muyajs/core'

import { normalizeMathMarkdown } from '@/lib/normalizeMathMarkdown'

import '@muyajs/core/lib/core.css'

let pluginsReady: 'full' | 'minimal' | false = false

export type MuyaImageUploader = (file: File) => Promise<string>

type PluginMode = 'full' | 'minimal'

function registerMuyaBasePlugins() {
  Muya.use(EmojiSelector)
  Muya.use(FootnoteTool)
  Muya.use(LinkTools, {
    jumpClick: (linkInfo: { href?: string }) => {
      const href = linkInfo?.href
      if (href && /^https?:\/\//i.test(href)) {
        window.open(href, '_blank', 'noopener,noreferrer')
      }
    },
  })
  Muya.use(CodeBlockLanguageSelector)
}

function registerMuyaUiPlugins() {
  // Intentionally skip MarkText chrome (front menus, table bars, format picker)
  // so edit surfaces match the read article styles. Slash menu is custom.
  Muya.use(ImageToolBar)
  Muya.use(ImageResizeBar)
  Muya.use(ImageEditTool)
}

export function ensureMuyaPlugins(options: { minimal?: boolean } = {}) {
  const mode: PluginMode = options.minimal ? 'minimal' : 'full'
  if (pluginsReady === 'full') return
  if (pluginsReady === mode) return
  if (pluginsReady === 'minimal' && mode === 'full') {
    registerMuyaUiPlugins()
    pluginsReady = 'full'
    return
  }
  registerMuyaBasePlugins()
  if (mode === 'full') registerMuyaUiPlugins()
  pluginsReady = mode
}

export type MuyaEditorOptions = {
  /** Hide ##, **, ` etc. — inline article edit */
  hideSyntaxMarkers?: boolean
}

export function createMuyaEditor(
  container: HTMLElement,
  markdown: string,
  options: MuyaEditorOptions = {},
): Muya {
  ensureMuyaPlugins({ minimal: options.hideSyntaxMarkers ?? false })

  const muya = new Muya(container, {
    markdown: normalizeMathMarkdown(markdown),
    locale: en,
    footnote: true,
    math: true,
    frontMatter: true,
    codeBlockLineNumbers: false,
    spellcheckEnabled: true,
    focusMode: false,
    autoPairBracket: true,
    autoPairMarkdownSyntax: true,
    autoPairQuote: true,
    preferLooseListItem: true,
    bulletListMarker: '-',
    // Match article .body (1.05rem @ 16px root ≈ 16.8; line-height 1.8)
    fontSize: 16.8,
    lineHeight: 1.8,
    tabSize: 2,
    listIndentation: 1,
    hideQuickInsertHint: options.hideSyntaxMarkers ?? false,
    mermaidTheme: 'dark',
  })

  muya.init()
  return muya
}

export type { Muya }
