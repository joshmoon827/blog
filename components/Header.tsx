'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import { setStoredLanguage, type Language } from './LocalizedText'
import styles from './Header.module.css'

const navItems = [
  { href: '/', label: 'Articles' },
  { href: '/series', label: 'Series' },
]

const languageItems = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
] as const

function LogoMark() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* O — outer ring */}
      <circle cx="19" cy="19" r="17.5" stroke="currentColor" strokeWidth="1.3"/>
      {/* H — left vertical */}
      <line x1="12" y1="9" x2="12" y2="29" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      {/* H — right vertical */}
      <line x1="26" y1="9" x2="26" y2="29" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      {/* S — starts/ends at center-x, arcs right then left symmetrically */}
      <path
        d="M19 10 C26 10 26 19 19 19 C12 19 12 28 19 28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export default function Header() {
  const pathname = usePathname()
  const { authenticated } = useAuth()
  const canWrite = authenticated && isAuthoringEnabled()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const [language, setLanguage] = useState<Language>('ko')
  const [languageOpen, setLanguageOpen] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)

    const savedLanguage = localStorage.getItem('language')
    if (savedLanguage === 'en' || savedLanguage === 'ko') {
      setLanguage(savedLanguage)
      document.documentElement.setAttribute('lang', savedLanguage)
    } else {
      document.documentElement.setAttribute('lang', 'ko')
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const selectLanguage = (next: Language) => {
    setLanguage(next)
    setLanguageOpen(false)
    setStoredLanguage(next)
  }

  const selectedLanguage = languageItems.find((item) => item.value === language) ?? languageItems[0]

  return (
    <header className={styles.header} data-site-chrome="header">
      <div className={styles.inner}>
        <Link href="/" className={`${styles.logo} ${styles.desktopLogo}`} aria-label="Laws of UX">
          <LogoMark />
        </Link>

        <button
          className={`${styles.mobileLogo} ${menuOpen ? styles.mobileLogoOpen : ''}`}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className={styles.srOnly}>{menuOpen ? 'Close menu' : 'Open menu'}</span>
          <span className={styles.logoMark} aria-hidden="true">
            <LogoMark />
          </span>
          <span className={styles.logoMenuIcon} aria-hidden="true">
            <span /><span /><span />
          </span>
        </button>

        <nav className={styles.nav} aria-label="Main navigation">
          <ul>
            {navItems.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={pathname === href || (href === '/' && pathname.startsWith('/articles')) ? styles.active : ''}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.controls}>
          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            aria-pressed={theme === 'light'}
          >
            {theme === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M17.66 6.34l-1.41 1.41M6.34 17.66l-1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <div className={styles.langMenu}>
            <button
              className={styles.langToggle}
              aria-label="Language"
              aria-haspopup="listbox"
              aria-expanded={languageOpen}
              onClick={() => setLanguageOpen((open) => !open)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 3C12 3 9 7 9 12s3 9 3 9M12 3c0 0 3 4 3 9s-3 9-3 9M3 12h18" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {selectedLanguage.label}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {languageOpen && (
              <div className={styles.langDropdown} role="listbox" aria-label="Language options">
                {languageItems.map((item) => (
                  <button
                    key={item.value}
                    className={item.value === language ? styles.langOptionActive : ''}
                    role="option"
                    aria-selected={item.value === language}
                    onClick={() => selectLanguage(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {canWrite ? (
            <>
              <Link
                href="/articles/new"
                className={styles.writeLink}
                aria-label="새 글 작성"
                title="새 글 작성"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <Link
                href="/newrite"
                className={styles.writeLink}
                aria-label="newrite 글쓰기"
                title="newrite"
              >
                <span className={styles.writeLinkText}>newrite</span>
              </Link>
            </>
          ) : null}
        </div>
      </div>

      {menuOpen && (
        <div className={styles.mobileNav} onClick={() => setMenuOpen(false)}>
          <nav onClick={(event) => event.stopPropagation()}>
            <ul>
              {navItems.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} onClick={() => setMenuOpen(false)}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </header>
  )
}
