import type { Metadata } from 'next'
import ErrorLab from '@/components/error-scenes/ErrorLab'

export const instant = false

export const metadata: Metadata = {
  title: '403 lab | test-ui',
  robots: { index: false, follow: false },
}

export default function EmptyForbiddenPage() {
  return <ErrorLab kind="403" />
}
