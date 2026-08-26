import type { Metadata } from 'next'
import ErrorLab from '@/components/error-scenes/ErrorLab'

export const instant = false

export const metadata: Metadata = {
  title: '404 lab | test-ui',
  robots: { index: false, follow: false },
}

export default function EmptyNotFoundPage() {
  return <ErrorLab kind="404" />
}
