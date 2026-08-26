'use client'

import { useState, type ReactNode } from 'react'
import { LocalizedText } from '@/components/LocalizedText'
import EmptyNav from '@/app/test-ui/empty/EmptyNav'
import CachedPostsRecommend from './CachedPostsRecommend'
import ErrorStage from './ErrorStage'
import ErrorThemeReveal from './ErrorThemeReveal'
import type { ErrorKind, ErrorVersion } from './kinds'
import styles from './errorScenes.module.css'

const LAB_HREF: Record<ErrorKind, string> = {
  '404': '/test-ui/empty/not-found',
  '500': '/test-ui/empty/error',
  '401': '/test-ui/empty/unauthorized',
  '403': '/test-ui/empty/forbidden',
  offline: '/test-ui/empty/offline',
}

export default function ErrorLab({
  kind,
  extra,
}: {
  kind: ErrorKind
  extra?: ReactNode
}) {
  const [version, setVersion] = useState<ErrorVersion>(2)

  return (
    <ErrorThemeReveal>
      <div className={styles.wrap} data-error-scene="">
        <div className={styles.toolbar}>
          <p className={styles.kicker}>test-ui · {kind}</p>
          <div className={styles.switcher} role="group" aria-label={`${kind} versions`}>
            {([1, 2, 3] as ErrorVersion[]).map((n) => (
              <button
                key={n}
                type="button"
                className={styles.ver}
                aria-pressed={version === n}
                onClick={() => setVersion(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <p className={styles.selected}>
            <LocalizedText ko={`지금 버전 ${version}`} en={`Version ${version} selected`} />
          </p>
        </div>
        <EmptyNav current={LAB_HREF[kind]} />
        <ErrorStage key={`${kind}-${version}`} kind={kind} version={version} extra={extra} />
        <CachedPostsRecommend />
      </div>
    </ErrorThemeReveal>
  )
}
