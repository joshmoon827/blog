import type { Metadata } from 'next'
import { mosaicSlotCount } from '@/lib/mosaicPattern'
import { readMosaicPattern } from '@/lib/mosaicPattern.server'
import { getSeriesPreviewItems } from '@/lib/seriesItems'
import PhysicsMosaicLab from './PhysicsMosaicLab'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: 'Matter.js Throw Covers | test-ui',
  description: 'Matter.js 2D physics — grab and throw series covers.',
}

export default function PhysicsMosaicPage() {
  const pattern = readMosaicPattern()
  const items = getSeriesPreviewItems(Math.max(3, mosaicSlotCount(pattern)))
  return <PhysicsMosaicLab items={items} />
}
