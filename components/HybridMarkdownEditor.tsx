'use client'

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type ClipboardEvent,
} from 'react'
import { normalizeHardBreaks } from '@/lib/normalizeHardBreaks'
import styles from './HybridMarkdownEditor.module.css'

export type MarkdownImageUploader = (file: File) => Promise<string>

export type HybridMarkdownEditorHandle = {
  insertAtCursor: (text: string) => { value: string; caret: number }
  focus: () => void
  applyBlock: (label: string) => string | null
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
  pickImage: () => void
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
  uploadImage?: MarkdownImageUploader
  onUploadingChange?: (uploading: boolean) => void
  /** boxed: form field (new article). inline: blends into article body (⌘E edit). */
  variant?: 'boxed' | 'inline'
}

const BLOCK_SNIPPETS: Record<string, string> = {
  paragraph: '',
  'thematic-break': '\n\n---\n\n',
  'atx-heading 1': '\n\n# ',
  'atx-heading 2': '\n\n## ',
  'atx-heading 3': '\n\n### ',
  'atx-heading 4': '\n\n#### ',
  'atx-heading 5': '\n\n##### ',
  'atx-heading 6': '\n\n###### ',
  'atx-heading': '\n\n# ',
  table:
    '\n\n|  |  |\n| --- | --- |\n|  |  |\n\n',
  'code-block': '\n\n```\n\n```\n\n',
  'block-quote': '\n\n> ',
  'order-list': '\n\n1. ',
  'bullet-list': '\n\n- ',
  'task-list': '\n\n- [ ] ',
  'math-block': '\n\n$$\nE = mc^2\n$$\n\n',
}

function replaceRange(
  value: string,
  start: number,
  end: number,
  insertion: string,
): { next: string; caret: number } {
  const next = value.slice(0, start) + insertion + value.slice(end)
  return { next, caret: start + insertion.length }
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
    const taRef = useRef<HTMLTextAreaElement>(null)
    const spellcheckRef = useRef(true)

    const emit = useCallback(
      (next: string, caret?: number) => {
        const normalized = normalizeHardBreaks(next)
        onChange(normalized)
        if (caret != null) {
          requestAnimationFrame(() => {
            const ta = taRef.current
            if (!ta) return
            ta.focus()
            ta.setSelectionRange(caret, caret)
          })
        }
        return normalized
      },
      [onChange],
    )

    const selection = useCallback(() => {
      const ta = taRef.current
      if (!ta) return { start: value.length, end: value.length }
      return {
        start: ta.selectionStart ?? value.length,
        end: ta.selectionEnd ?? value.length,
      }
    }, [value.length])

    const insertAtCursor = useCallback(
      (text: string) => {
        const { start, end } = selection()
        const { next, caret } = replaceRange(value, start, end, text)
        emit(next, caret)
        return { value: next, caret }
      },
      [emit, selection, value],
    )

    const wrapSelection = useCallback(
      (before: string, after = '', placeholderText = '텍스트') => {
        const { start, end } = selection()
        const selected = value.slice(start, end)
        const inner = selected || placeholderText
        const insertion = `${before}${inner}${after}`
        const { next } = replaceRange(value, start, end, insertion)
        const caretStart = start + before.length
        const caretEnd = caretStart + inner.length
        const normalized = emit(next)
        requestAnimationFrame(() => {
          const ta = taRef.current
          if (!ta) return
          ta.focus()
          ta.setSelectionRange(caretStart, caretEnd)
        })
        return normalized
      },
      [emit, selection, value],
    )

    const applyBlock = useCallback(
      (label: string) => {
        const snippet =
          BLOCK_SNIPPETS[label] ??
          BLOCK_SNIPPETS[label.replace(/\s+\d+$/, '')] ??
          null
        if (snippet == null) return null
        if (!snippet) return value
        return insertAtCursor(snippet).value
      },
      [insertAtCursor, value],
    )

    const replacePlaceholder = useCallback(
      (md: string, placeholderMd: string, replacement: string) => {
        if (md.includes(placeholderMd)) {
          return md.replace(placeholderMd, replacement)
        }
        return md + replacement
      },
      [],
    )

    const uploadAndInsert = useCallback(
      async (file: File) => {
        if (!uploadImage || disabled) return
        const placeholderMd = '![uploading…]()'
        const { start, end } = selection()
        const { next: withPlaceholder, caret } = replaceRange(
          value,
          start,
          end,
          placeholderMd,
        )
        emit(withPlaceholder, caret)

        onUploadingChange?.(true)
        try {
          const url = await uploadImage(file)
          const markdown = `![image](${url})`
          const current = taRef.current?.value ?? withPlaceholder
          emit(replacePlaceholder(current, placeholderMd, markdown))
        } catch (err) {
          const current = taRef.current?.value ?? withPlaceholder
          emit(replacePlaceholder(current, placeholderMd, ''))
          const msg = err instanceof Error ? err.message : String(err)
          alert('이미지 업로드 실패: ' + msg)
        } finally {
          onUploadingChange?.(false)
        }
      },
      [
        disabled,
        emit,
        onUploadingChange,
        replacePlaceholder,
        selection,
        uploadImage,
        value,
      ],
    )

    const pickImage = useCallback(() => {
      if (!uploadImage || disabled) return
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = () => {
        const file = input.files?.[0]
        if (file) void uploadAndInsert(file)
      }
      input.click()
    }, [disabled, uploadAndInsert, uploadImage])

    const setSpellcheck = useCallback((enabled: boolean) => {
      spellcheckRef.current = enabled
      const ta = taRef.current
      if (ta) ta.spellcheck = enabled
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        insertAtCursor,
        focus: () => taRef.current?.focus(),
        applyBlock,
        wrapSelection: (before, after, placeholderText) =>
          wrapSelection(before, after ?? '', placeholderText),
        insertLink: () => {
          const url = window.prompt('링크 URL')
          if (!url) return value
          const href = url.trim()
          if (!href) return value
          return wrapSelection('[', `](${href})`, '링크')
        },
        insertEmoji: (emoji) => insertAtCursor(emoji).value,
        wrapAlign: (align) =>
          wrapSelection(
            `<div style="text-align:${align}">`,
            '</div>',
            '텍스트',
          ),
        wrapColor: (color) =>
          wrapSelection(
            `<span style="color:${color}">`,
            '</span>',
            '텍스트',
          ),
        wrapHighlight: (color) =>
          wrapSelection(
            `<mark style="background:${color}">`,
            '</mark>',
            '텍스트',
          ),
        pickImage,
        setSpellcheck,
        getMarkdown: () => taRef.current?.value ?? value,
      }),
      [applyBlock, insertAtCursor, pickImage, setSpellcheck, value, wrapSelection],
    )

    const handlePaste = useCallback(
      async (e: ClipboardEvent<HTMLTextAreaElement>) => {
        if (disabled) return
        if (onPaste) {
          onPaste(e)
          return
        }

        const items = e.clipboardData?.items
        if (!items?.length || !uploadImage) return

        let imageFile: File | null = null
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            imageFile = item.getAsFile()
            break
          }
        }
        if (!imageFile) return

        e.preventDefault()
        await uploadAndInsert(imageFile)
      },
      [disabled, onPaste, uploadAndInsert, uploadImage],
    )

    const wrapperClass = inline
      ? `${styles.editorInline} ${className ?? ''}`
      : `${styles.editor} ${className ?? ''}`

    return (
      <div
        className={wrapperClass}
        data-disabled={disabled || undefined}
        data-variant={variant}
      >
        <textarea
          ref={taRef}
          className={inline ? styles.textareaInline : styles.textarea}
          value={value}
          onChange={(e) => onChange(normalizeHardBreaks(e.target.value))}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder={placeholder}
          spellCheck={spellcheckRef.current}
          aria-label="마크다운 본문"
        />
      </div>
    )
  },
)
