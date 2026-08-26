
'use client'

import styles from './page.module.css'
import { LocalizedText } from '@/components/LocalizedText'

export default function RetryButton() {
  return (
    <button
      type="button"
      className={styles.btn}
      onClick={() => window.location.reload()}
    >
      <LocalizedText ko="다시 시도" en="Try again" />
    </button>
  )
}
