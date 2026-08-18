'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { isLanguage, setStoredLanguage } from './LocalizedText'

/** Applies ?lang=en|ko on load and client navigations, then persists like the toggle. */
export default function LanguageQuerySync() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const lang = searchParams.get('lang')
    if (isLanguage(lang)) setStoredLanguage(lang)
  }, [searchParams])

  return null
}
