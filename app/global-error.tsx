'use client'

import ErrorPageView from '@/components/error-scenes/ErrorPageView'
import { THEME_BOOT_SCRIPT } from '@/lib/theme'
import './globals.css'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <ErrorPageView kind="500" onRetry={reset} />
      </body>
    </html>
  )
}
