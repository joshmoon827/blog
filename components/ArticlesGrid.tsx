'use client'

import { useEffect, type ReactNode } from 'react'
import {
  ArticleAdminProvider,
  useArticleAdmin,
} from '@/components/ArticleAdminContext'
import styles from './ArticlesGrid.module.css'

function GridShell({
  className,
  children,
  'aria-label': ariaLabel,
}: {
  className?: string
  children: ReactNode
  'aria-label'?: string
}) {
  const admin = useArticleAdmin()

  useEffect(() => {
    if (!admin?.deleteMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') admin.exitDeleteMode()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [admin])

  return (
    <div className={styles.wrap}>
      {admin?.deleteMode ? (
        <div className={styles.deleteBar} role="status">
          <span>삭제 모드 · X로 휴지통 · Esc 종료</span>
          <button
            type="button"
            className={styles.doneBtn}
            onClick={() => admin.exitDeleteMode()}
          >
            완료
          </button>
        </div>
      ) : null}
      <section className={className} aria-label={ariaLabel}>
        {children}
      </section>
    </div>
  )
}

/** Client wrapper: admin long-press delete mode shared across cards. */
export default function ArticlesGrid({
  className,
  children,
  'aria-label': ariaLabel = 'Articles',
}: {
  className?: string
  children: ReactNode
  'aria-label'?: string
}) {
  return (
    <ArticleAdminProvider>
      <GridShell className={className} aria-label={ariaLabel}>
        {children}
      </GridShell>
    </ArticleAdminProvider>
  )
}
