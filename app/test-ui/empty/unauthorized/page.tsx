import type { Metadata } from 'next'
import ErrorLab from '@/components/error-scenes/ErrorLab'
import Link from 'next/link'
import { LocalizedText } from '@/components/LocalizedText'
import styles from '@/components/error-scenes/errorScenes.module.css'

export const instant = false

export const metadata: Metadata = {
  title: '401 lab | test-ui',
  robots: { index: false, follow: false },
}

export default function EmptyUnauthorizedPage() {
  return (
    <ErrorLab
      kind="401"
      extra={
        <Link href="/login" className={styles.btn}>
          <LocalizedText ko="로그인" en="Sign in" />
        </Link>
      }
    />
  )
}
