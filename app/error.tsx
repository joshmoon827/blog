'use client'

import ErrorPageView from '@/components/error-scenes/ErrorPageView'

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorPageView kind="500" onRetry={reset} />
}
