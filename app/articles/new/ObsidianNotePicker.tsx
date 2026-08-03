'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from '../[slug]/page.module.css'

export type ImportedObsidianNote = {
  path: string
  title: string
  description: string
  created: string
  tags: string[]
  body: string
}

type NoteListItem = {
  path: string
  name: string
  folder: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (note: ImportedObsidianNote) => void
}

export default function ObsidianNotePicker({ open, onClose, onSelect }: Props) {
  const [notes, setNotes] = useState<NoteListItem[]>([])
  const [vault, setVault] = useState('')
  const [query, setQuery] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [loadingNote, setLoadingNote] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoadingList(true)
    setError('')
    setQuery('')

    ;(async () => {
      try {
        const res = await fetch('/api/obsidian/notes')
        const data = (await res.json()) as {
          vault?: string
          notes?: NoteListItem[]
          error?: string
        }
        if (!res.ok) {
          throw new Error(data.error || `List failed (${res.status})`)
        }
        if (cancelled) return
        setVault(data.vault || '')
        setNotes(data.notes || [])
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setNotes([])
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loadingNote) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, loadingNote])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.folder.toLowerCase().includes(q) ||
        n.path.toLowerCase().includes(q),
    )
  }, [notes, query])

  const handlePick = async (item: NoteListItem) => {
    setLoadingNote(item.path)
    setError('')
    try {
      const res = await fetch(
        `/api/obsidian/notes?path=${encodeURIComponent(item.path)}`,
      )
      const data = (await res.json()) as {
        note?: ImportedObsidianNote
        error?: string
      }
      if (!res.ok || !data.note) {
        throw new Error(data.error || `Load failed (${res.status})`)
      }
      onSelect(data.note)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingNote(null)
    }
  }

  if (!open) return null

  return (
    <div
      className={styles.obsidianOverlay}
      role="presentation"
      onClick={() => {
        if (!loadingNote) onClose()
      }}
    >
      <div
        className={styles.obsidianModal}
        role="dialog"
        aria-modal="true"
        aria-label="Obsidian 노트 선택"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.obsidianModalHeader}>
          <div>
            <h2 className={styles.obsidianModalTitle}>Obsidian 노트 선택</h2>
            {vault && <p className={styles.obsidianModalMeta}>{vault}</p>}
          </div>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
            disabled={Boolean(loadingNote)}
          >
            닫기
          </button>
        </div>

        <input
          className={styles.obsidianSearch}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목 · 폴더 검색…"
          autoFocus
          disabled={loadingList || Boolean(loadingNote)}
        />

        {error && <p className={styles.coverGenError}>{error}</p>}

        <div className={styles.obsidianList} role="listbox" aria-label="노트 목록">
          {loadingList ? (
            <p className={styles.obsidianEmpty}>노트 목록 불러오는 중…</p>
          ) : filtered.length === 0 ? (
            <p className={styles.obsidianEmpty}>
              {notes.length === 0 ? '노트가 없습니다.' : '검색 결과가 없습니다.'}
            </p>
          ) : (
            filtered.map((item) => {
              const busy = loadingNote === item.path
              return (
                <button
                  key={item.path}
                  type="button"
                  role="option"
                  className={styles.obsidianNoteItem}
                  onClick={() => handlePick(item)}
                  disabled={Boolean(loadingNote)}
                  title={item.path}
                >
                  <span className={styles.obsidianNoteName}>
                    {busy ? '불러오는 중… ' : ''}
                    {item.name}
                  </span>
                  {item.folder && (
                    <span className={styles.obsidianNoteFolder}>{item.folder}</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
