import type { Metadata } from 'next'
import ErrorPageView from '@/components/error-scenes/ErrorPageView'

export const instant = false

export const metadata: Metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return <ErrorPageView kind="offline" />
}
