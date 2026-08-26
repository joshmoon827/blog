'use client'

import Link from 'next/link'
import { LocalizedText } from '@/components/LocalizedText'
import CachedPostsRecommend from './CachedPostsRecommend'
import ErrorStage from './ErrorStage'
import ErrorThemeReveal from './ErrorThemeReveal'
import type { ErrorKind } from './kinds'
import styles from './errorScenes.module.css'

export default function ErrorPageView({
  kind,
  onRetry,
  loginHref = '/login',
}: {
  kind: ErrorKind
  onRetry?: () => void
  loginHref?: string
}) {
  const extra = (
    <>
      {kind === '401' ? (
        <Link href={loginHref} className={styles.btn}>
          <LocalizedText ko="로그인" en="Sign in" />
        </Link>
      ) : null}
      {onRetry ? (
        <button type="button" className={styles.btn} onClick={onRetry}>
          <LocalizedText ko="다시 시도" en="Try again" />
        </button>
      ) : null}
    </>
  )

  return (
    <ErrorThemeReveal>
      <div className={styles.shell} data-error-scene="">
        <div className={styles.wrap}>
          <ErrorStage kind={kind} version={2} extra={extra} />
          <CachedPostsRecommend />
        </div>
      </div>
    </ErrorThemeReveal>
  )
}
