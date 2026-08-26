
import type { Metadata } from 'next'
import Link from 'next/link'
import { LocalizedText } from '@/components/LocalizedText'
import EmptyNav from './EmptyNav'
import styles from './page.module.css'

export const instant = false

export const metadata: Metadata = {
  title: 'Empty pages lab | test-ui',
  robots: { index: false, follow: false },
}

export default function EmptyIndexPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.gesture}>08 / EMPTY</span>
        <p className={styles.kicker}>test-ui · empty family</p>
        <h1 className={styles.mark}>EMPTY</h1>
        <p className={styles.copy}>
          <LocalizedText
            ko="404 / 401 / 403 / 500 / 오프라인. 랩에서 버전을 고르고, 본편은 2번(드리프트)을 쓴다."
            en="404, 401, 403, 500, and offline. Pick a version in the lab; production uses version 2."
          />
        </p>
        <EmptyNav current="/test-ui/empty" />
      </section>

      <div className={styles.family}>
        <Link href="/test-ui/empty/not-found" className={styles.familyCard}>
          <span className={styles.familyLabel}>09 / MISSING</span>
          <span className={styles.familyNum}>404</span>
          <p className={styles.familyCopy}>
            <LocalizedText
              ko="이 글은 없거나 치웠습니다."
              en="This note is gone or never existed."
            />
          </p>
        </Link>
        <Link href="/test-ui/empty/unauthorized" className={styles.familyCard}>
          <span className={styles.familyLabel}>14 / AUTH</span>
          <span className={styles.familyNum}>401</span>
          <p className={styles.familyCopy}>
            <LocalizedText
              ko="로그아웃 뒤 보호된 페이지. 로그인 버튼."
              en="Signed-out hit on a protected page. Sign-in CTA."
            />
          </p>
        </Link>
        <Link href="/test-ui/empty/forbidden" className={styles.familyCard}>
          <span className={styles.familyLabel}>15 / DENIED</span>
          <span className={styles.familyNum}>403</span>
          <p className={styles.familyCopy}>
            <LocalizedText
              ko="권한이 없거나 작성 기능이 꺼진 환경."
              en="No access, or authoring is off in this environment."
            />
          </p>
        </Link>
        <Link href="/test-ui/empty/error" className={styles.familyCard}>
          <span className={styles.familyLabel}>10 / FAULT</span>
          <span className={styles.familyNum}>500</span>
          <p className={styles.familyCopy}>
            <LocalizedText
              ko="스택은 안 보여 준다. 다시 시도와 홈만."
              en="No stack trace. Retry and home only."
            />
          </p>
        </Link>
        <Link href="/test-ui/empty/offline" className={styles.familyCard}>
          <span className={styles.familyLabel}>11 / OFFLINE</span>
          <span className={styles.familyNum}>OFFLINE</span>
          <p className={styles.familyCopy}>
            <LocalizedText
              ko="SW 오프라인 폴백. 캐시된 글 추천."
              en="SW offline fallback, with cached-post tips."
            />
          </p>
        </Link>
      </div>
    </div>
  )
}
