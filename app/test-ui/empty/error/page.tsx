import type { Metadata } from 'next'
import ErrorLab from '@/components/error-scenes/ErrorLab'
import RetryButton from '../RetryButton'

export const instant = false

export const metadata: Metadata = {
  title: '500 lab | test-ui',
  robots: { index: false, follow: false },
}

export default function EmptyErrorPage() {
  return <ErrorLab kind="500" extra={<RetryButton />} />
}
