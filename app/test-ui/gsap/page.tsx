import type { Metadata } from 'next'
import GsapTypeGallery from './GsapTypeGallery'

export const metadata: Metadata = {
  title: 'Welcome to josh!og — GSAP Type Lab',
  description:
    'Eight independent GSAP typography interactions inspired by the Animate Anything hero.',
}

export default function GsapLabPage() {
  return <GsapTypeGallery />
}
