'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './Header.module.css'

export default function Header() {
  const pathname = usePathname()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} aria-label="Laws of UX">
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
        </Link>

        <button
          className={styles.menuToggle}
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className={styles.menuIcon}>
            <span /><span /><span />
          </span>
          <span>MENU</span>
        </button>

        <nav className={styles.nav} aria-label="Main navigation">
          <ul>
            {[
              { href: '/', label: 'Articles' },
              { href: '/book', label: 'Book' },
              { href: '/cards', label: 'Cards' },
              { href: '/info', label: 'Info' },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={pathname === href || (href === '/' && pathname.startsWith('/articles')) ? styles.active : ''}>
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <a href="https://jonyablonski.bigcartel.com/" target="_blank" rel="noopener noreferrer" className={styles.external}>
                Store{' '}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </li>
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
          <button className={styles.langToggle} aria-label="Language">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 3C12 3 9 7 9 12s3 9 3 9M12 3c0 0 3 4 3 9s-3 9-3 9M3 12h18" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            English
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className={styles.mobileNav}>
          <nav>
            <ul>
              {['Articles', 'Book', 'Cards', 'Info', 'Store'].map((item) => (
                <li key={item}>
                  <Link href={item === 'Articles' ? '/' : `/${item.toLowerCase()}`} onClick={() => setMenuOpen(false)}>
                    {item}
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
