import type { Metadata } from 'next'
import SimplicityGallery from './SimplicityGallery'

export const metadata: Metadata = {
  title: 'Simplicity Gallery | test-ui',
  description: 'Horizontal session carousel with expand / collect views, after Toss Simplicity 23.',
}

export default function SimplicityTestUiPage() {
  return <SimplicityGallery />
}
