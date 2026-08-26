import type { Metadata } from 'next'
import ErrorPageView from '@/components/error-scenes/ErrorPageView'

export const instant = false

export const metadata: Metadata = {
  title: 'Forbidden',
  robots: { index: false, follow: false },
}

/** Middleware rewrite target when authoring is disabled or access is denied. */
export default function ForbiddenGate() {
  return <ErrorPageView kind="403" />
}
