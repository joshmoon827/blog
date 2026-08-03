'use client'

import { useEffect, useState } from 'react'

export type Language = 'ko' | 'en'

const LANGUAGE_STORAGE_KEY = 'language'
const LANGUAGE_CHANGE_EVENT = 'languagechange'

function isLanguage(value: string | null): value is Language {
  return value === 'ko' || value === 'en'
}

function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'ko'

  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return isLanguage(savedLanguage) ? savedLanguage : 'ko'
}

export function setStoredLanguage(language: Language) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  document.documentElement.setAttribute('lang', language)
  window.dispatchEvent(new CustomEvent<Language>(LANGUAGE_CHANGE_EVENT, { detail: language }))
}

export function useLanguage() {
  const [language, setLanguage] = useState<Language>('ko')

  useEffect(() => {
    setLanguage(getStoredLanguage())

    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<Language>
      setLanguage(customEvent.detail ?? getStoredLanguage())
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY) {
        setLanguage(isLanguage(event.newValue) ? event.newValue : 'ko')
      }
    }

    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return language
}

export function LocalizedText({ ko, en }: { ko: string; en: string }) {
  const language = useLanguage()
  return <>{language === 'ko' ? ko : en}</>
}

export function LocalizedArticleCount({ count }: { count: number }) {
  const language = useLanguage()
  return <>{language === 'ko' ? `아티클 ${count}개` : `${count} articles`}</>
}
