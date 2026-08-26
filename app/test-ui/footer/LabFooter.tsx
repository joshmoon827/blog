import styles from '@/components/Footer.module.css'

/** Lab-only footer. Do not use from production layout. */
export default function LabFooter() {
  return (
    <footer className={styles.footer} data-lab-footer="true">
      <div className={styles.inner}>
        <a href="#main" className={styles.backToTop} aria-label="Back to Top">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 12V4M4 8l4-4 4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Top
        </a>
        <nav className={styles.nav} aria-label="Lab footer navigation">
          <a href="mailto:joshmoon827@gmail.com">Contact</a>
          <span aria-hidden="true">|</span>
          <a href="#license">License</a>
        </nav>
      </div>
    </footer>
  )
}
