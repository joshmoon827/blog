'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type ArticleAdminContextValue = {
  deleteMode: boolean
  enterDeleteMode: () => void
  exitDeleteMode: () => void
  trashArticle: (slug: string) => Promise<boolean>
  isHidden: (slug: string) => boolean
}

const ArticleAdminContext = createContext<ArticleAdminContextValue | null>(null)

export function ArticleAdminProvider({ children }: { children: ReactNode }) {
  const [deleteMode, setDeleteMode] = useState(false)
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())

  const enterDeleteMode = useCallback(() => {
    setDeleteMode(true)
    try {
      navigator.vibrate?.([12, 40, 18])
    } catch {
      /* ignore */
    }
  }, [])

  const exitDeleteMode = useCallback(() => {
    setDeleteMode(false)
  }, [])

  const trashArticle = useCallback(async (slug: string) => {
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      })
      if (!res.ok) return false
      setHidden((prev) => {
        const next = new Set(prev)
        next.add(slug)
        return next
      })
      try {
        navigator.vibrate?.(10)
      } catch {
        /* ignore */
      }
      return true
    } catch {
      return false
    }
  }, [])

  const isHidden = useCallback((slug: string) => hidden.has(slug), [hidden])

  const value = useMemo(
    () => ({
      deleteMode,
      enterDeleteMode,
      exitDeleteMode,
      trashArticle,
      isHidden,
    }),
    [deleteMode, enterDeleteMode, exitDeleteMode, trashArticle, isHidden],
  )

  return (
    <ArticleAdminContext.Provider value={value}>
      {children}
    </ArticleAdminContext.Provider>
  )
}

export function useArticleAdmin() {
  return useContext(ArticleAdminContext)
}
