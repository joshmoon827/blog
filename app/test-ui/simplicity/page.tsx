import type { Metadata } from 'next'
import SimplicityGallery from './SimplicityGallery'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: 'Simplicity Gallery | test-ui',
  description: 'Horizontal session carousel with expand / collect views, after Toss Simplicity 23.',
}

export default function SimplicityTestUiPage() {
  return <SimplicityGallery />
}
