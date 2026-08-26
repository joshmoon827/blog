'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import { applyTheme, oppositeTheme, readStoredTheme } from '@/lib/theme'
import { setStoredLanguage, useLanguage, type Language } from './LocalizedText'
import { useCoverHeaderOverlayState } from '@/components/CoverHeaderOverlay'
import styles from './Header.module.css'

const navItems = [
  { href: '/', label: 'Articles' },
  { href: '/category', label: 'Category' },
]

const languageItems = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
] as const

function LogoMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- theme via CSS filter; avoid next/image SVG quirks
    <img
      src="/blog-logo.svg"
      alt=""
      width={46}
      height={38}
      className={styles.logoImg}
      draggable={false}
    />
  )
}

export default function Header() {
  const pathname = usePathname()
  const { authenticated, refresh } = useAuth()
  const canWrite = authenticated && isAuthoringEnabled()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const language = useLanguage()
  const [languageOpen, setLanguageOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const coverOverlay = useCoverHeaderOverlayState()
  const overCover = coverOverlay.overlapping && !menuOpen
  const coverTone = coverOverlay.tone

  const logout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      })
      await refresh()
      setMenuOpen(false)
    } finally {
      setLoggingOut(false)
    }
  }

  useEffect(() => {
    const saved = readStoredTheme()
    setTheme(saved)
    // Error pages own the invert→settle animation; don't snap over it.
    if (!document.documentElement.dataset.errorTheme) {
      applyTheme(saved)
    }
  }, [])

  const toggleTheme = () => {
    const next = oppositeTheme(theme)
    setTheme(next)
    localStorage.setItem('theme', next)
    applyTheme(next)
  }

  const selectLanguage = (next: Language) => {
    setLanguageOpen(false)
    setStoredLanguage(next)
  }

  const selectedLanguage = languageItems.find((item) => item.value === language) ?? languageItems[0]

  return (
    <header
      className={`${styles.header}${menuOpen ? ` ${styles.menuOpen}` : ''}${overCover ? ` ${styles.overCover}${coverTone === 'light' ? ` ${styles.overCoverLight}` : coverTone === 'dark' ? ` ${styles.overCoverDark}` : ''}` : ''}`}
      data-site-chrome="header"
      data-over-cover={overCover ? coverTone ?? undefined : undefined}
      data-menu-open={menuOpen ? '' : undefined}
    >
      <div className={styles.inner}>
        <Link href="/" className={`${styles.logo} ${styles.desktopLogo}`} aria-label="josh log">
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
                href="/settings"
                className={styles.writeLink}
                aria-label="설정"
                title="설정"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852 1.01 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
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
              <button
                type="button"
                className={styles.logoutBtn}
                onClick={() => void logout()}
                disabled={loggingOut}
                aria-label="로그아웃"
                title="로그아웃"
              >
                {loggingOut ? '…' : '로그아웃'}
              </button>
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
              {canWrite ? (
                <>
                  <li>
                    <Link href="/settings" onClick={() => setMenuOpen(false)}>
                      설정
                    </Link>
                  </li>
                  <li>
                    <Link href="/articles/new" onClick={() => setMenuOpen(false)}>
                      새 글
                    </Link>
                  </li>
                  <li>
                    <Link href="/newrite" onClick={() => setMenuOpen(false)}>
                      newrite
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={styles.mobileLogout}
                      onClick={() => void logout()}
                      disabled={loggingOut}
                    >
                      {loggingOut ? '로그아웃 중…' : '로그아웃'}
                    </button>
                  </li>
                </>
              ) : null}
            </ul>
          </nav>
        </div>
      )}
    </header>
  )
}
