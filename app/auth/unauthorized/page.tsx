import type { Metadata } from 'next'
import ErrorPageView from '@/components/error-scenes/ErrorPageView'

export const instant = false

export const metadata: Metadata = {
  title: 'Unauthorized',
  robots: { index: false, follow: false },
}

/** Middleware rewrite target for signed-out access to protected pages. */
export default function UnauthorizedGate() {
  return <ErrorPageView kind="401" />
}
