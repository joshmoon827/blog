
import type { Metadata } from 'next'
import Link from 'next/link'
import { LocalizedText } from '@/components/LocalizedText'
import OfflineReaderLab from './OfflineReaderLab'
import styles from './page.module.css'

export const instant = false

export const metadata: Metadata = {
  title: 'Offline reader lab | test-ui',
  robots: { index: false, follow: false },
}

export default function OfflineReaderPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>test-ui · offline-reader</p>
        <h1 className={styles.mark}>Offline reader</h1>
        <p className={styles.copy}>
          <LocalizedText
            ko="empty/offline은 그림이고, 이 페이지와 /offline이 진짜 폴백이다. 글을 한 번 연 뒤 캐시에 넣으면 오프라인에서도 그 URL이 열린다."
            en="empty/offline is a mock. This lab and /offline are the real fallback. Visit a post once, pin it, then reopen it offline."
          />
        </p>
        <p className={styles.qa}>
          QA: DevTools → Application → Service Workers가 /sw.js 인지 확인. 이
          페이지에서 「오프라인에 넣기」를 누른 다음 Application → Offline을
          체크하고 /articles/agi 와 /offline 을 다시 연다. 홈으로 조용히 바뀌면
          실패.
        </p>
        <p className={styles.copy}>
          <Link href="/offline">/offline</Link>
          {' · '}
          <Link href="/">← Articles</Link>
        </p>
      </header>
      <OfflineReaderLab />
    </div>
  )
}
