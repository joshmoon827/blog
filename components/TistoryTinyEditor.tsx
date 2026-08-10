'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type MutableRefObject,
} from 'react'
import { Editor } from '@tinymce/tinymce-react'
import type { Editor as TinyMCEEditor } from 'tinymce'

/* Self-hosted TinyMCE (GPL) — no cloud API key */
import 'tinymce/tinymce'
import 'tinymce/themes/silver'
import 'tinymce/models/dom'
import 'tinymce/icons/default'
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/autolink'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/link'
import 'tinymce/plugins/image'
import 'tinymce/plugins/table'
import 'tinymce/plugins/code'
import 'tinymce/plugins/codesample'
import 'tinymce/plugins/emoticons'
import 'tinymce/plugins/emoticons/js/emojis'
import 'tinymce/plugins/charmap'
import 'tinymce/plugins/quickbars'
import 'tinymce/plugins/autoresize'
import { findImageFigure, imageInsertHtml, wrapBareImage } from '@/lib/imageBlock'
import {
  enhanceMoreLessForSave,
  stripMoreLessForEdit,
} from '@/lib/moreLessBlock'
import {
  TISTORY_FONT_CSS,
  type TistoryTinyEditorHandle,
} from '@/components/tistoryTinyShared'

export type { TistoryTinyEditorHandle } from '@/components/tistoryTinyShared'

type Props = {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
  uploadImage?: (file: File) => Promise<string>
  onUploadingChange?: (uploading: boolean) => void
  onEditorReady?: (editor: TinyMCEEditor) => void
  className?: string
}

export { TISTORY_FONT_CSS } from '@/components/tistoryTinyShared'

const EDITOR_FONT_FAMILIES = [
  'Noto Sans DemiLight',
  'Noto Sans Demilight',
  'Noto Sans Light',
  'Noto Sans KR',
  'Nanum Gothic',
  'Noto Serif KR',
] as const

const CONTENT_STYLE = `
  /* autoresize: iframe grows with content; outer .canvas scrolls (Tistory model) */
  html {
    width: 100%;
    overflow: hidden;
  }
  body {
    font-family: AppleSDGothicNeo-Regular, 'Malgun Gothic', '맑은 고딕', dotum, '돋움',
      sans-serif;
    font-size: 16px;
    line-height: 1.7;
    color: #333;
    margin: 0;
    /* Full-bleed host: side padding only (no fixed 860/880 column) */
    padding: 0 10px 16px;
    background: #fff;
    width: 100%;
    outline: none;
    box-sizing: border-box;
    overflow: hidden;
  }
  p { margin: 0; line-height: 1.75; }
  h1 { font-size: 32px; font-weight: 400; line-height: 1.35; margin: 32px 0 20px; color: #000; }
  h2 { font-size: 1.62em; font-weight: 400; line-height: 1.46; margin: 1.62em 0 20px; color: #000; }
  h3 { font-size: 1.44em; font-weight: 400; line-height: 1.48; margin: 10px 0 20px; color: #000; }
  h4 { font-size: 1.25em; font-weight: 400; line-height: 1.55; margin: 10px 0 20px; color: #000; }
  /* Default / style1 — Tistory editor-content + tistory/content.css */
  blockquote,
  blockquote[data-ke-style='style1'] {
    margin: 20px 0 0;
    text-align: center;
    background: url(/newrite/blockquote-style1.svg) no-repeat 50% 0;
    padding: 34px 0 0 0;
    font-family: 'Noto Serif KR', 'Noto Serif', serif;
    font-size: 1.12em;
    color: #333;
    line-height: 1.67;
    border: 0 none;
  }
  blockquote[data-ke-style='style2'] {
    text-align: left;
    background: none;
    border-color: #d0d0d0;
    border-width: 0 0 0 4px;
    border-style: solid;
    padding: 1px 0 0 12px;
    color: #666;
    line-height: 1.75;
    font-size: 1em;
    font-family: inherit;
  }
  blockquote[data-ke-style='style3'] {
    text-align: left;
    background-color: #fcfcfc;
    background-image: none;
    border: 1px solid #dddddd;
    padding: 21px 25px 20px 25px;
    color: #666;
    font-size: 1em;
    line-height: 1.75;
    font-family: inherit;
  }
  ul, ol { margin: 14px 0 24px; padding-left: 10px; }
  li { margin: 0 0 3px 22px; line-height: 1.7; }
  hr { margin: 32px 80px; border: none; border-top: 1px solid #ddd; }
  hr[data-ke-style] {
    border: none;
    font-size: 0;
    line-height: 0;
    margin: 20px auto 0;
    background: url(/newrite/divider-line.svg) no-repeat;
    background-size: 200px 420px;
    cursor: default;
  }
  hr[data-ke-style='style1'] {
    background-position: center 0;
    width: 64px;
    height: 4px;
    padding: 20px;
  }
  hr[data-ke-style='style2'] {
    background-position: center -48px;
    width: 64px;
    height: 3px;
    padding: 20px;
  }
  hr[data-ke-style='style3'] {
    background-position: center -96px;
    width: 64px;
    height: 8px;
    padding: 18px 20px;
  }
  hr[data-ke-style='style4'] {
    background-position: center -144px;
    width: 2px;
    height: 60px;
    padding: 0 51px;
  }
  hr[data-ke-style='style4'] + hr[data-ke-style='style4'] { margin-top: 0; }
  hr[data-ke-style='style5'] {
    background-position: center -208px;
    background-repeat: repeat-x;
    height: 2px;
    padding: 21px 0;
  }
  hr[data-ke-style='style6'] {
    background-position: center -256px;
    background-repeat: repeat-x;
    height: 2px;
    padding: 21px 0;
  }
  hr[data-ke-style='style7'] {
    background-position: center -304px;
    width: 200px;
    height: 19px;
    padding: 18px 20px 17px 20px;
  }
  hr[data-ke-style='style8'] {
    background-position: center -362px;
    width: 200px;
    height: 19px;
    padding: 18px 20px 17px 20px;
  }
  img {
    max-width: 100%;
    height: auto;
    object-fit: contain;
  }
  /* TinyMCE resize chrome — Tistory tistory/content.css overrides */
  .mce-content-body div.mce-resizehandle {
    position: absolute;
    border: 2px solid #000 !important;
    border-radius: 6px !important;
    box-sizing: content-box;
    background: #fff;
    width: 8px;
    height: 8px;
    z-index: 10000;
  }
  .mce-content-body .mce-resizehandle:hover { background: #000; }
  .mce-content-body img[data-mce-selected],
  .mce-content-body hr[data-mce-selected] {
    outline: 0 none;
  }
  /*
   * Oxide content.css normally ships with skin — we use skin:false, so CEF
   * selection clones (.mce-offscreen-selection) must be parked off-screen or
   * they render as a visible “ghost” duplicate under place/image figures.
   */
  .mce-content-body [data-mce-caret] {
    left: -1000px;
    margin: 0;
    padding: 0;
    position: absolute;
    right: auto;
    top: 0;
  }
  .mce-content-body .mce-offscreen-selection {
    left: -2000000px;
    max-width: 1000000px;
    position: absolute;
  }
  .mce-content-body .mce-clonedresizable {
    position: absolute;
    outline: #000 dashed 1px;
    opacity: 0.5;
    z-index: 10000;
  }
  .mce-content-body .mce-resize-helper {
    background: rgba(0, 0, 0, 0.75);
    border-radius: 3px;
    color: #fff;
    display: none;
    font-family: sans-serif;
    font-size: 12px;
    white-space: nowrap;
    line-height: 14px;
    margin: 5px 10px;
    padding: 5px;
    position: absolute;
    z-index: 10001;
  }
  a { color: #1686cc; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ddd; padding: 8px; }
  pre { background: #f5f5f5; padding: 12px; overflow: auto; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }

  /* Emoticon figures — Tistory editor-content.css */
  figure[data-ke-type='emoticon'] {
    display: table;
    clear: both;
    position: relative;
    caret-color: transparent;
    cursor: default;
  }
  figure[data-ke-type='emoticon'] img:not([width]) { width: 100%; }
  figure[data-ke-type='emoticon'][data-ke-align='alignLeft'] {
    text-align: left;
  }
  figure[data-ke-type='emoticon'][data-ke-align='alignCenter'] {
    margin: 20px auto 0;
    text-align: center;
  }
  figure[data-ke-type='emoticon'][data-ke-align='alignRight'] {
    text-align: right;
    margin-left: auto;
  }
  figure[data-ke-type='emoticon'][data-mce-selected] img {
    outline: 1px solid #000;
  }

  /* Place / location card — Tistory editor-content.css (pin fixed left) */
  figure[data-ke-type='location'] {
    margin: 0;
    width: fit-content;
    min-width: 284px;
    outline-offset: -2px;
    caret-color: transparent;
    cursor: default;
  }
  figure[data-ke-type='location'][data-ke-align='alignCenter'] {
    margin-right: auto;
    margin-left: auto;
  }
  figure[data-ke-type='location'][data-ke-align='alignRight'] {
    margin-right: 0;
    margin-left: auto;
  }
  figure[data-ke-type='location'] a {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 17px;
    border: 1px solid #eaeaea;
    border-radius: 12px;
    background-color: #fff;
    text-decoration: none;
    color: inherit;
  }
  figure[data-ke-type='location'][data-mce-selected] a,
  figure[data-ke-type='location'][data-mce-selected='inline-boundary'] a {
    border-color: #ff5847;
    background-color: rgba(255, 88, 71, 0.05);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  /* Explicit pin node (preferred) — same asset/size as Tistory ::before */
  figure[data-ke-type='location'] .location-pin {
    flex-shrink: 0;
    display: block;
    width: 20px;
    height: 25px;
    overflow: hidden;
    color: transparent;
    font-size: 0;
    line-height: 0;
    background: url(/newrite/location-pin.svg) no-repeat center;
    background-size: contain;
  }
  /* Fallback when older markup has no .location-pin */
  figure[data-ke-type='location'] a:not(:has(.location-pin))::before {
    content: '';
    flex-shrink: 0;
    display: block;
    width: 20px;
    height: 25px;
    background: url(/newrite/location-pin.svg) no-repeat center;
    background-size: contain;
  }
  figure[data-ke-type='location'] .location-info {
    min-width: 272px;
  }
  figure[data-ke-type='location'] .location-name {
    display: block;
    font-size: 16px;
    font-weight: bold;
    line-height: 20px;
    color: #0f172a;
  }
  figure[data-ke-type='location'] .location-address {
    display: block;
    font-size: 14px;
    font-weight: normal;
    line-height: 20px;
    color: #64748b;
  }

  /* Image figures — Tistory editor-content.css */
  figure[data-ke-type='image'] {
    display: table;
    clear: both;
    position: relative;
    caret-color: transparent;
  }
  figure[data-ke-type='image'] img {
    max-width: 100%;
    height: auto;
    object-fit: contain;
    transition-duration: 0.5s;
    transition-timing-function: ease;
  }
  figure[data-ke-type='image'] img:not([width]) { width: 100%; }
  figure[data-ke-type='image'][data-ke-style='widthContent'] img { width: 100%; }
  figure[data-ke-type='image'][data-ke-style='alignLeft'] { text-align: left; }
  figure[data-ke-type='image'][data-ke-style='alignCenter'] {
    margin: 20px auto 0;
    text-align: center;
  }
  figure[data-ke-type='image'][data-ke-style='alignRight'] {
    text-align: right;
    margin-left: auto;
  }
  figure[data-ke-type='image'][data-ke-style='floatLeft'] {
    float: left;
    margin-right: 20px;
  }
  figure[data-ke-type='image'][data-ke-style='floatRight'] {
    float: right;
    margin-left: 20px;
  }
  figure[data-ke-type='image'] figcaption {
    caret-color: auto;
    caption-side: bottom;
    display: table-caption;
    text-align: center;
    color: #777;
    font-size: 13px;
    margin-top: 0;
    padding-top: 10px;
    min-height: 20px;
    white-space: break-spaces;
    word-break: break-word;
  }
  figure[data-ke-type='image'][data-ke-style='floatLeft'] figcaption,
  figure[data-ke-type='image'][data-ke-style='floatRight'] figcaption {
    text-align: left;
  }
  figure[data-ke-type='image'] figcaption:empty::before {
    content: '이미지를 설명해 보세요';
    color: #bbb;
  }
  /* Tistory: 2px outline, color overridden to #000 in tistory/content.css */
  figure[data-ke-type='image'][data-mce-selected] img,
  figure[data-ke-type='image'] img[data-mce-selected] {
    outline: 2px solid #000;
    transition-duration: 0s;
  }

  /* 접은글 — Tistory editor (always expanded; toggle chrome stripped) */
  div[data-ke-type='moreLess'] {
    caret-color: auto;
    background-color: #fafafa;
    padding: 20px 20px 22px;
    margin: 20px 0;
    border: 1px dashed #dddddd;
    color: #333333;
  }
  div[data-ke-type='moreLess'] > :first-child {
    margin-top: 0;
    margin-bottom: 0;
  }
  /* If saved HTML is pasted with chrome, hide toggle UI in the editor */
  div[data-ke-type='moreLess'] > .btn-toggle-moreless {
    display: none;
  }
  div[data-ke-type='moreLess'] > .moreless-content {
    display: block;
  }

  /* 코드블록 — Tistory codeblock */
  pre[data-ke-type='codeblock'] {
    margin: 20px 0 0;
    padding: 16px 18px;
    background: #f7f7f7;
    border: 1px solid #e8e8e8;
    border-radius: 2px;
    overflow: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px;
    line-height: 1.55;
    color: #333;
    white-space: pre;
  }
`

function useEditorRef() {
  return useRef<TinyMCEEditor | null>(null)
}

export const TistoryTinyEditor = forwardRef<TistoryTinyEditorHandle, Props>(
  function TistoryTinyEditor(
    {
      value,
      onChange,
      disabled,
      placeholder = '본문을 입력하세요',
      uploadImage,
      onUploadingChange,
      onEditorReady,
      className,
    },
    ref,
  ) {
    const editorRef = useEditorRef()
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const pickImage = useCallback(() => {
      fileInputRef.current?.click()
    }, [])

    const insertImage = useCallback((url: string, alt = '') => {
      const ed = editorRef.current
      if (!ed) return
      const selected = findImageFigure(ed.selection.getNode())
      if (selected) {
        const img = selected.querySelector('img')
        if (img) {
          img.setAttribute('src', url)
          if (alt) img.setAttribute('alt', alt)
          img.removeAttribute('width')
          img.removeAttribute('height')
          img.removeAttribute('data-origin-width')
          img.removeAttribute('data-origin-height')
          const applyOrigin = () => {
            if (img.naturalWidth) {
              img.setAttribute('data-origin-width', String(img.naturalWidth))
              img.setAttribute('data-origin-height', String(img.naturalHeight))
            }
          }
          if (img.complete) applyOrigin()
          else img.addEventListener('load', applyOrigin, { once: true })
          ed.selection.select(selected)
          ed.nodeChanged()
          ed.undoManager.add()
          ed.fire('change')
          return
        }
      }
      ed.insertContent(imageInsertHtml({ src: url, alt }))
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        focus: () => editorRef.current?.focus(),
        getEditor: () => editorRef.current,
        setSpellcheck: (on: boolean) => {
          const ed = editorRef.current
          if (!ed) return
          const body = ed.getBody()
          if (body) body.setAttribute('spellcheck', on ? 'true' : 'false')
        },
        pickImage,
        insertImage,
      }),
      [insertImage, pickImage],
    )

    const onFile = async (file: File | undefined) => {
      if (!file || !uploadImage) return
      onUploadingChange?.(true)
      try {
        const url = await uploadImage(file)
        insertImage(url, file.name)
      } catch (err) {
        alert(
          '이미지 업로드 실패: ' +
            (err instanceof Error ? err.message : String(err)),
        )
      } finally {
        onUploadingChange?.(false)
      }
    }

    useEffect(() => {
      const ed = editorRef.current
      if (!ed) return
      ed.mode.set(disabled ? 'readonly' : 'design')
    }, [disabled])

    return (
      <div className={className}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            void onFile(file)
          }}
        />
        <Editor
          licenseKey="gpl"
          onInit={(_evt, editor) => {
            editorRef.current = editor
            const container = editor.getContainer()
            if (container) {
              container.style.visibility = 'visible'
              container.style.width = '100%'
              container.style.height = 'auto'
            }
            // Preload Tistory webfonts so FontName spans compute the real face immediately
            const doc = editor.getDoc()
            void Promise.all(
              EDITOR_FONT_FAMILIES.map((fam) =>
                doc.fonts.load(`16px "${fam}"`).catch(() => undefined),
              ),
            )

            /*
             * Tistory scroll model: grow the iframe with content (no inner scroll);
             * outer [data-newrite-canvas] scrolls category+title+body+tags together.
             * Oxide + skin:false often leaves iframe height stuck — sync explicitly.
             */
            const MIN_EDITOR_H = 400
            const syncImageResizeHandles = () => {
              const cs = editor.selection?.controlSelection as
                | {
                    showResizeRect?: (el: Element) => void
                    hideResizeRect?: () => void
                    isResizable?: (el: Element) => boolean
                  }
                | undefined
              if (!cs?.showResizeRect) return
              const body = editor.getBody()
              const sel = editor.selection.getNode() as HTMLElement | null
              const fig =
                (body?.querySelector(
                  'figure[data-ke-type="image"][data-mce-selected]',
                ) as HTMLElement | null) || findImageFigure(sel)
              if (
                !fig ||
                !(
                  fig.getAttribute('data-mce-selected') ||
                  fig === sel ||
                  (sel && fig.contains(sel))
                )
              ) {
                return
              }
              const img = fig.querySelector('img')
              if (!img) return
              try {
                // CEF figure selection does not auto-show ObjectResizing handles;
                // force them onto the <img> so drag-resize still works.
                cs.showResizeRect(img)
              } catch {
                /* controlSelection unavailable */
              }
            }
            const syncIframeHeight = () => {
              const iframe = editor.iframeElement
              const body = editor.getBody()
              if (!iframe || !body) return
              const pad = 12
              const next = Math.max(MIN_EDITOR_H, body.scrollHeight + pad)
              if (Math.abs((parseFloat(iframe.style.height) || 0) - next) < 2) {
                syncImageResizeHandles()
                return
              }
              iframe.style.height = `${next}px`
              const area = editor.getContentAreaContainer?.()
              if (area instanceof HTMLElement) {
                area.style.height = `${next}px`
              }
              const root = editor.getContainer()
              if (root) root.style.height = 'auto'
              // Re-anchor handles after iframe geometry changes
              syncImageResizeHandles()
            }
            syncIframeHeight()
            editor.on('NodeChange SetContent KeyUp change input ResizeEditor', syncIframeHeight)
            try {
              const ro = new ResizeObserver(() => syncIframeHeight())
              ro.observe(editor.getBody())
              editor.on('remove', () => ro.disconnect())
            } catch {
              /* ResizeObserver unavailable */
            }

            /*
             * Same-origin iframe wheel does not bubble — forward to canvas like
             * Tistory's overflow:hidden iframe + #editorContainer scroll.
             */
            const forwardWheel = (e: WheelEvent) => {
              const canvas = document.querySelector(
                '[data-newrite-canvas]',
              ) as HTMLElement | null
              if (!canvas) return
              const max = canvas.scrollHeight - canvas.clientHeight
              if (max <= 0) return
              const next = Math.min(
                max,
                Math.max(0, canvas.scrollTop + e.deltaY),
              )
              if (next === canvas.scrollTop) return
              canvas.scrollTop = next
              e.preventDefault()
            }
            doc.addEventListener('wheel', forwardWheel, { passive: false })
            editor.on('remove', () => {
              doc.removeEventListener('wheel', forwardWheel)
            })
            onEditorReady?.(editor)
          }}
          value={value}
          onEditorChange={(html) => onChange(html)}
          disabled={disabled}
          init={{
            menubar: false,
            toolbar: false,
            statusbar: false,
            branding: false,
            promotion: false,
            skin: false,
            /* Link tag (like Tistory) — @import inside content_style is flaky for @font-face */
            content_css: [TISTORY_FONT_CSS],
            content_style: CONTENT_STYLE,
            plugins:
              'advlist autolink lists link image table code codesample emoticons charmap quickbars autoresize',
            quickbars_selection_toolbar: false,
            quickbars_insert_toolbar: false,
            contextmenu: 'link image table',
            placeholder,
            /* Tistory: autoresize (+ manual sync above). Never set fixed `height`. */
            min_height: 400,
            autoresize_bottom_margin: 0,
            autoresize_overflow_padding: 12,
            resize: false,
            object_resizing: true,
            resize_img_proportional: true,
            paste_data_images: true,
            automatic_uploads: true,
            images_file_types: 'jpeg,jpg,png,gif,webp',
            elementpath: false,
            convert_urls: false,
            relative_urls: false,
            remove_script_host: false,
            entity_encoding: 'raw',
            /* Keep Tistory HR / figure / moreLess attrs through getContent */
            extended_valid_elements:
              'hr[class|style|contenteditable|data-ke-type|data-ke-style],' +
              'a[href|target|rel|title|class|style],' +
              'div[class|style|data-ke-type|data-text-more|data-text-less],' +
              'figure[*],figcaption[*],img[*]',
            style_formats: [
              {
                title: '본문2',
                block: 'p',
                styles: { fontSize: '16px', lineHeight: '1.75' },
              },
              { title: '제목1', block: 'h2' },
              { title: '제목2', block: 'h3' },
              { title: '제목3', block: 'h4' },
              {
                title: '본문1',
                block: 'p',
                styles: { fontSize: '18px', lineHeight: '1.7' },
              },
              {
                title: '본문3',
                block: 'p',
                styles: { fontSize: '14px', lineHeight: '1.7' },
              },
              { title: '인용', block: 'blockquote' },
              { title: '코드', block: 'pre' },
            ],
            /* Match Tistory font_formats (Demilight casing) for HTML parity */
            font_family_formats:
              '기본서체=AppleSDGothicNeo-Regular, Malgun Gothic, 맑은 고딕, dotum, 돋움, sans-serif;' +
              '본고딕 R=Noto Sans Demilight, Noto Sans KR;' +
              '본고딕 L=Noto Sans Light;' +
              '나눔고딕=Nanum Gothic;' +
              '본명조=Noto Serif KR;' +
              '궁서=GungSeo, serif',
            formats: {
              bold: { inline: 'b' },
              italic: { inline: 'i' },
              underline: { inline: 'u', exact: true },
              strikethrough: { inline: 's', exact: true },
              fontname: {
                inline: 'span',
                styles: { fontFamily: '%value' },
                remove_similar: true,
              },
              /* Tistory moreLess wrapper format */
              moreless: {
                block: 'div',
                wrapper: true,
                remove: 'all',
                attributes: {
                  'data-ke-type': 'moreLess',
                  'data-text-more': '%openText',
                  'data-text-less': '%closeText',
                },
              },
            },
            color_map: [
              '111111',
              '검정',
              'E03131',
              '빨강',
              'F08C00',
              '주황',
              '2F9E44',
              '초록',
              '1971C2',
              '파랑',
              '9C36B5',
              '보라',
              '868E96',
              '회색',
            ],
            images_upload_handler: uploadImage
              ? async (blobInfo) => {
                  onUploadingChange?.(true)
                  try {
                    const file = new File(
                      [blobInfo.blob()],
                      blobInfo.filename(),
                      {
                        type: blobInfo.blob().type || 'image/png',
                      },
                    )
                    return await uploadImage(file)
                  } finally {
                    onUploadingChange?.(false)
                  }
                }
              : undefined,
            setup: (editor) => {
              editor.on('init', () => {
                const body = editor.getBody()
                if (body) body.setAttribute('spellcheck', 'true')
              })
              // Wrap pasted/dropped bare images into Tistory figure blocks
              const wrapImages = () => {
                const body = editor.getBody()
                if (!body) return
                body.querySelectorAll('img').forEach((img) => {
                  if (img.closest('figure[data-ke-type]')) return
                  if (img.getAttribute('data-mce-object')) return
                  // Emoticon/location metadata without a figure wrapper — don't re-wrap as image
                  if (
                    img.getAttribute('data-emoticon-src') ||
                    img.closest('[data-emoticon-src]')
                  ) {
                    return
                  }
                  const fig = wrapBareImage(img as HTMLImageElement)
                  const im = fig.querySelector('img')
                  if (im && !im.getAttribute('data-origin-width')) {
                    const applyOrigin = () => {
                      if (im.naturalWidth) {
                        im.setAttribute(
                          'data-origin-width',
                          String(im.naturalWidth),
                        )
                        im.setAttribute(
                          'data-origin-height',
                          String(im.naturalHeight),
                        )
                      }
                    }
                    if (im.complete) applyOrigin()
                    else im.addEventListener('load', applyOrigin, { once: true })
                  }
                })
                // Drop accidental duplicate <img> nodes inside emoticon figures
                body
                  .querySelectorAll('figure[data-ke-type="emoticon"]')
                  .forEach((fig) => {
                    const imgs = fig.querySelectorAll('img')
                    imgs.forEach((img, i) => {
                      if (i > 0) img.remove()
                      else {
                        img.setAttribute('data-mce-resize', 'false')
                        img.setAttribute('contenteditable', 'false')
                      }
                    })
                  })
              }
              // Keep selection on the figure — selecting the <img> can clone chrome
              editor.on('click ObjectSelected', (e) => {
                const target = (e as { target?: EventTarget | null }).target
                const el =
                  target instanceof HTMLElement
                    ? target
                    : ((target as Node | null)?.parentElement ?? null)
                const fig = el?.closest?.(
                  'figure[data-ke-type="emoticon"]',
                ) as HTMLElement | null
                if (!fig) return
                if (editor.selection.getNode() !== fig) {
                  editor.selection.select(fig)
                }
              })
              /*
               * Image figures become contenteditable=false (CEF) when selected.
               * TinyMCE paints data-mce-selected but skips ObjectResizing handles
               * for CEF roots — re-show handles on the inner <img>.
               */
              const refreshImageResize = () => {
                const cs = editor.selection?.controlSelection as
                  | {
                      showResizeRect?: (el: Element) => void
                    }
                  | undefined
                if (!cs?.showResizeRect) return
                const body = editor.getBody()
                const sel = editor.selection.getNode() as HTMLElement | null
                const fig =
                  (body?.querySelector(
                    'figure[data-ke-type="image"][data-mce-selected]',
                  ) as HTMLElement | null) || findImageFigure(sel)
                if (
                  !fig ||
                  !(
                    fig.getAttribute('data-mce-selected') ||
                    fig === sel ||
                    (sel && fig.contains(sel))
                  )
                ) {
                  return
                }
                const img = fig.querySelector('img')
                if (!img) return
                try {
                  cs.showResizeRect(img)
                } catch {
                  /* ignore */
                }
              }
              editor.on('NodeChange ObjectSelected click', refreshImageResize)
              editor.on('SetContent', () => {
                const body = editor.getBody()
                if (body) stripMoreLessForEdit(body)
                wrapImages()
              })
              editor.on('BeforeSetContent', (e) => {
                if (!e.content || typeof e.content !== 'string') return
                if (!e.content.includes('data-ke-type="moreLess"')) return
                const tmp = document.createElement('div')
                tmp.innerHTML = e.content
                stripMoreLessForEdit(tmp)
                e.content = tmp.innerHTML
              })
              editor.on('PastePostProcess', () => {
                // Defer so DOM is ready
                setTimeout(() => {
                  const body = editor.getBody()
                  if (body) stripMoreLessForEdit(body)
                  wrapImages()
                }, 0)
              })
              editor.on('ObjectResized', (e) => {
                const target = e.target as HTMLElement
                if (!target || target.tagName !== 'IMG') return
                const img = target as HTMLImageElement
                const w = Math.round(e.width)
                const h = Math.round(e.height)
                img.setAttribute('width', String(w))
                img.setAttribute('height', String(h))
                img.style.width = ''
                img.style.height = ''
                img.style.objectFit = 'contain'
                const fig = img.closest(
                  'figure[data-ke-type="image"]',
                ) as HTMLElement | null
                if (fig && fig.getAttribute('data-ke-style') === 'widthContent') {
                  fig.setAttribute('data-ke-style', 'alignCenter')
                }
                editor.undoManager.add()
                editor.fire('change')
              })
              // Tistory: PreProcess adds btn-toggle-moreless + moreless-content
              editor.on('PreProcess', (e) => {
                const node = e.node as HTMLElement | undefined
                if (node) enhanceMoreLessForSave(node)
              })
              // Tistory TinyMCE 4 emits <b>/<i>; keep that in persisted HTML.
              editor.on('GetContent', (e) => {
                if (e.format && e.format !== 'html' && e.format !== 'raw') return
                e.content = e.content
                  .replace(/<\/?strong\b/gi, (m) =>
                    m.toLowerCase().startsWith('</') ? '</b' : '<b',
                  )
                  .replace(/<\/?em\b/gi, (m) =>
                    m.toLowerCase().startsWith('</') ? '</i' : '<i',
                  )
              })
            },
          }}
        />
      </div>
    )
  },
)

export type TinyEditorRef = MutableRefObject<TinyMCEEditor | null>
