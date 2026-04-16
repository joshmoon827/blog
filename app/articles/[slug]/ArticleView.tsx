'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { ArticleData } from '@/lib/localArticles'
import styles from './page.module.css'

interface Props {
  article: ArticleData
}

export default function ArticleView({ article: initial }: Props) {
  const [article, setArticle] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const draft = useRef({ ...initial })

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/articles/${article.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft.current),
      })
      if (!res.ok) throw new Error('Save failed')
      const updated = await res.json()
      setArticle(updated)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      alert('저장 실패: ' + e)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    draft.current = { ...article }
    setEditing(false)
  }

  return (
    <article className={styles.article}>
      {/* 배너 이미지 */}
      <div className={styles.banner}>
        <Image src={article.image} alt={article.title} fill sizes="100vw" className={styles.bannerImg} priority />
      </div>

      <div className={styles.content}>
        {/* 내비 + 편집 버튼 */}
        <div className={styles.topBar}>
          <Link href="/" className={styles.back}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All Articles
          </Link>
          <div className={styles.actions}>
            {saved && <span className={styles.savedBadge}>✓ 저장됨</span>}
            {editing ? (
              <>
                <button className={styles.btnCancel} onClick={handleCancel}>취소</button>
                <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
                  {saving ? '저장 중…' : '저장'}
                </button>
              </>
            ) : (
              <button className={styles.btnEdit} onClick={() => setEditing(true)}>편집</button>
            )}
          </div>
        </div>

        {/* 제목 */}
        {editing ? (
          <input
            className={styles.titleInput}
            defaultValue={article.title}
            onChange={(e) => (draft.current.title = e.target.value)}
          />
        ) : (
          <h1 className={styles.title}>{article.title}</h1>
        )}

        {/* 설명 */}
        {editing ? (
          <textarea
            className={styles.descInput}
            defaultValue={article.description}
            rows={2}
            onChange={(e) => (draft.current.description = e.target.value)}
          />
        ) : (
          <p className={styles.description}>{article.description}</p>
        )}

        <hr className={styles.divider} />

        {/* 본문 */}
        {editing ? (
          <textarea
            className={styles.bodyInput}
            defaultValue={article.body}
            rows={16}
            onChange={(e) => (draft.current.body = e.target.value)}
            placeholder="본문을 입력하세요 (Markdown 지원 예정)"
          />
        ) : (
          <div className={styles.body}>
            {article.body.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
