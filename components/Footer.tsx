'use client'

import styles from './Footer.module.css'

export default function Footer() {
  const handleBackToTop = (e: React.MouseEvent) => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <a href="#" className={styles.backToTop} onClick={handleBackToTop} aria-label="Back to Top">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Top
        </a>
        <p className={styles.copy}>Laws of UX &copy; Jon Yablonski 2026</p>
        <nav className={styles.nav} aria-label="Footer navigation">
          <a href="#">Contact</a>
          <span aria-hidden="true">|</span>
          <a href="#">License</a>
        </nav>
      </div>
    </footer>
  )
}
