'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ClipboardEvent,
} from 'react'
import type { Muya } from '@muyajs/core'
import type { MuyaImageUploader } from '@/lib/muya/muyaClient'
import { normalizeHardBreaks } from '@/lib/normalizeHardBreaks'
import { normalizeMathMarkdown } from '@/lib/normalizeMathMarkdown'
import { useQuickInsertMenu } from '@/lib/muya/useQuickInsertMenu'
import {
  applyToolbarBlock,
  insertEmoji as insertEmojiAtCursor,
  insertLink as insertLinkAtCursor,
  wrapAlign as wrapAlignAtCursor,
  wrapColor as wrapColorAtCursor,
  wrapHighlight as wrapHighlightAtCursor,
  wrapSelection as wrapSelectionAtCursor,
} from '@/lib/muya/toolbarFormat'
import { QuickInsertMenu } from '@/components/QuickInsertMenu'
import './HybridMarkdownEditor.muya-body.css'
import '@/styles/muya-read-parity.css'
import styles from './HybridMarkdownEditor.module.css'

export type HybridMarkdownEditorHandle = {
  insertAtCursor: (text: string) => { value: string; caret: number }
  focus: () => void
  /** Apply a Muya quick-insert block (heading, list, quote, table, hr, …). */
  applyBlock: (label: string) => string | null
  /** Wrap selection with markdown/HTML markers. */
  wrapSelection: (
    before: string,
    after?: string,
    placeholder?: string,
  ) => string | null
  insertLink: () => string | null
  insertEmoji: (emoji: string) => string | null
  wrapAlign: (
    align: 'left' | 'center' | 'right' | 'justify',
  ) => string | null
  wrapColor: (color: string) => string | null
  wrapHighlight: (color: string) => string | null
  /** Open file picker and upload an image (requires uploadImage prop). */
  pickImage: () => void
  /** Toggle browser/OS spellcheck on the editable surface. */
  setSpellcheck: (enabled: boolean) => void
  getMarkdown: () => string
}

type Props = {
  value: string
  onChange: (value: string) => void
  onPaste?: (e: ClipboardEvent<HTMLTextAreaElement>) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  previewClassName?: string
  imageClassName?: string
  uploadImage?: MuyaImageUploader
  onUploadingChange?: (uploading: boolean) => void
  /** boxed: form field (new article). inline: blends into article body (⌘E edit). */
  variant?: 'boxed' | 'inline'
}

export const HybridMarkdownEditor = forwardRef<HybridMarkdownEditorHandle, Props>(
  function HybridMarkdownEditor(
    {
      value,
      onChange,
      onPaste,
      disabled = false,
      placeholder,
      className,
      uploadImage,
      onUploadingChange,
      variant = 'boxed',
    },
    ref,
  ) {
    const inline = variant === 'inline'
    const hostRef = useRef<HTMLDivElement>(null)
    const muyaRef = useRef<Muya | null>(null)
    const lastEmitted = useRef(value)
    const syncingRef = useRef(false)
    const insertTextRef = useRef<
      ((muya: Muya, text: string) => string) | null
    >(null)
    const [ready, setReady] = useState(false)
    const [initError, setInitError] = useState<string | null>(null)

    const { menuProps: quickInsertMenuProps } = useQuickInsertMenu({
      muyaRef,
      hostRef,
      ready,
      disabled,
      onMarkdownChange: (md) => {
        const next = normalizeHardBreaks(md)
        lastEmitted.current = next
        onChange(next)
      },
    })

    const emitMarkdown = useCallback(
      (md: string) => {
        const next = normalizeHardBreaks(md)
        if (next === lastEmitted.current) return
        lastEmitted.current = next
        onChange(next)
      },
      [onChange],
    )

    useEffect(() => {
      let cancelled = false
      const host = hostRef.current
      if (!host || muyaRef.current) return

      ;(async () => {
        try {
          const { createMuyaEditor } = await import('@/lib/muya/muyaClient')
          const { insertTextAtMuyaCursor } = await import('@/lib/muya/insertText')
          if (cancelled) return

          insertTextRef.current = insertTextAtMuyaCursor

          const editorRoot = document.createElement('div')
          editorRoot.className = styles.muyaRoot
          if (inline) editorRoot.dataset.hideSyntax = 'true'
          host.appendChild(editorRoot)

          const muya = createMuyaEditor(editorRoot, value, {
            hideSyntaxMarkers: inline,
          })
          if (cancelled) {
            muya.destroy()
            editorRoot.remove()
            return
          }

          muyaRef.current = muya
          lastEmitted.current = value

          const onJsonChange = () => {
            if (syncingRef.current) return
            emitMarkdown(muya.getMarkdown())
          }
          muya.on('json-change', onJsonChange)

          const { applyMuyaPatches } = await import('@/lib/muya/muyaPatches')
          applyMuyaPatches(muya)

          document.body.classList.add('muya-edit')
          if (inline) document.body.classList.add('muya-inline-edit')
          setReady(true)
        } catch (err) {
          if (!cancelled) {
            const msg = err instanceof Error ? err.message : String(err)
            setInitError(msg)
            console.error('[HybridMarkdownEditor] init failed:', err)
          }
        }
      })()

      return () => {
        cancelled = true
        document.body.classList.remove('muya-edit', 'muya-inline-edit')
        const muya = muyaRef.current
        if (muya) {
          muya.destroy()
          muyaRef.current = null
        }
        if (host) host.innerHTML = ''
        setReady(false)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      const muya = muyaRef.current
      if (!muya || !ready) return
      if (value === lastEmitted.current) return
      syncingRef.current = true
      muya.setContent(normalizeHardBreaks(normalizeMathMarkdown(value)), false)
      lastEmitted.current = value
      syncingRef.current = false
    }, [value, ready])

    useEffect(() => {
      const muya = muyaRef.current
      const host = hostRef.current
      if (!muya || !host || !ready) return
      host.dataset.disabled = disabled ? 'true' : 'false'
      const surface = muya.domNode
      surface.setAttribute('aria-disabled', disabled ? 'true' : 'false')
      if (disabled) surface.setAttribute('contenteditable', 'false')
      else surface.removeAttribute('contenteditable')
    }, [disabled, ready])

    const emitFromMuya = useCallback(
      (next: string | null | undefined) => {
        if (next == null) return null
        const normalized = normalizeHardBreaks(next)
        lastEmitted.current = normalized
        onChange(normalized)
        return normalized
      },
      [onChange],
    )

    const insertAtCursor = useCallback(
      (text: string) => {
        const muya = muyaRef.current
        const insert = insertTextRef.current
        if (!muya || !insert) return { value, caret: text.length }
        const next = insert(muya, text)
        lastEmitted.current = next
        onChange(next)
        return { value: next, caret: text.length }
      },
      [onChange, value],
    )

    const pickImage = useCallback(() => {
      if (!uploadImage || disabled) return
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        const muya = muyaRef.current
        const insert = insertTextRef.current
        if (!muya || !insert) return

        const placeholder = '![uploading…]()'
        let md = insert(muya, placeholder)
        lastEmitted.current = md
        onChange(md)

        onUploadingChange?.(true)
        try {
          const url = await uploadImage(file)
          const markdown = `![image](${url})`
          md = muya.getMarkdown().replace(placeholder, markdown)
          syncingRef.current = true
          muya.setContent(md, true)
          syncingRef.current = false
          lastEmitted.current = md
          onChange(md)
        } catch (err) {
          md = muya.getMarkdown().replace(placeholder, '')
          syncingRef.current = true
          muya.setContent(md, true)
          syncingRef.current = false
          lastEmitted.current = md
          onChange(md)
          const msg = err instanceof Error ? err.message : String(err)
          alert('이미지 업로드 실패: ' + msg)
        } finally {
          onUploadingChange?.(false)
        }
      }
      input.click()
    }, [disabled, onChange, onUploadingChange, uploadImage])

    const setSpellcheck = useCallback((enabled: boolean) => {
      const muya = muyaRef.current
      const host = hostRef.current
      if (!muya) return
      const surface = muya.domNode as HTMLElement
      surface.setAttribute('spellcheck', enabled ? 'true' : 'false')
      if (host) host.dataset.spellcheck = enabled ? 'true' : 'false'
      surface.querySelectorAll('[contenteditable]').forEach((el) => {
        el.setAttribute('spellcheck', enabled ? 'true' : 'false')
      })
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        insertAtCursor,
        focus: () => muyaRef.current?.focus(),
        applyBlock: (label) => {
          const muya = muyaRef.current
          if (!muya) return null
          return emitFromMuya(applyToolbarBlock(muya, label))
        },
        wrapSelection: (before, after, placeholder) => {
          const muya = muyaRef.current
          if (!muya) return null
          return emitFromMuya(
            wrapSelectionAtCursor(muya, before, after, placeholder),
          )
        },
        insertLink: () => {
          const muya = muyaRef.current
          if (!muya) return null
          return emitFromMuya(insertLinkAtCursor(muya))
        },
        insertEmoji: (emoji) => {
          const muya = muyaRef.current
          if (!muya) return null
          return emitFromMuya(insertEmojiAtCursor(muya, emoji))
        },
        wrapAlign: (align) => {
          const muya = muyaRef.current
          if (!muya) return null
          return emitFromMuya(wrapAlignAtCursor(muya, align))
        },
        wrapColor: (color) => {
          const muya = muyaRef.current
          if (!muya) return null
          return emitFromMuya(wrapColorAtCursor(muya, color))
        },
        wrapHighlight: (color) => {
          const muya = muyaRef.current
          if (!muya) return null
          return emitFromMuya(wrapHighlightAtCursor(muya, color))
        },
        pickImage,
        setSpellcheck,
        getMarkdown: () => muyaRef.current?.getMarkdown() ?? value,
      }),
      [emitFromMuya, insertAtCursor, pickImage, setSpellcheck, value],
    )

    const handlePasteCapture = useCallback(
      async (e: ClipboardEvent<HTMLDivElement>) => {
        if (disabled || !ready) return
        if (onPaste) {
          onPaste(e as unknown as ClipboardEvent<HTMLTextAreaElement>)
          return
        }

        const items = e.clipboardData?.items
        if (!items?.length) return

        let imageFile: File | null = null
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            imageFile = item.getAsFile()
            break
          }
        }
        if (!imageFile || !uploadImage) return

        e.preventDefault()
        e.stopPropagation()

        const muya = muyaRef.current
        const insert = insertTextRef.current
        if (!muya || !insert) return

        const placeholder = '![uploading…]()'
        let md = insert(muya, placeholder)
        lastEmitted.current = md
        onChange(md)

        onUploadingChange?.(true)
        try {
          const url = await uploadImage(imageFile)
          const markdown = `![image](${url})`
          md = muya.getMarkdown().replace(placeholder, markdown)
          syncingRef.current = true
          muya.setContent(md, true)
          syncingRef.current = false
          lastEmitted.current = md
          onChange(md)
        } catch (err) {
          md = muya.getMarkdown().replace(placeholder, '')
          syncingRef.current = true
          muya.setContent(md, true)
          syncingRef.current = false
          lastEmitted.current = md
          onChange(md)
          const msg = err instanceof Error ? err.message : String(err)
          alert('이미지 업로드 실패: ' + msg)
        } finally {
          onUploadingChange?.(false)
        }
      },
      [disabled, onChange, onPaste, onUploadingChange, ready, uploadImage],
    )

    const isEmpty = value.trim() === ''

    if (initError) {
      return (
        <div className={`${styles.editor} ${styles.editorError} ${className ?? ''}`}>
          <p>에디터를 불러오지 못했습니다: {initError}</p>
        </div>
      )
    }

    const wrapperClass = inline
      ? `${styles.editorInline} ${className ?? ''}`
      : `${styles.editor} ${className ?? ''}`

    return (
      <div
        className={wrapperClass}
        data-disabled={disabled || undefined}
        data-ready={ready || undefined}
        data-variant={variant}
        onPasteCapture={handlePasteCapture}
      >
        {!ready && !inline && (
          <p className={styles.loading}>MarkText 스타일 에디터 로딩 중…</p>
        )}
        {isEmpty && placeholder && ready ? (
          <p
            className={
              inline ? styles.placeholderInline : styles.placeholder
            }
          >
            {placeholder}
          </p>
        ) : null}
        <div ref={hostRef} className={styles.host} />
        <QuickInsertMenu {...quickInsertMenuProps} />
      </div>
    )
  },
)
