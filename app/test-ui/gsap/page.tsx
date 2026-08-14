import type { Metadata } from 'next'
import GsapTypeGallery from './GsapTypeGallery'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: 'Welcome to josh!og — GSAP Type Lab',
  description:
    'Eight independent GSAP typography interactions inspired by the Animate Anything hero.',
}

export default function GsapLabPage() {
  return <GsapTypeGallery />
}
