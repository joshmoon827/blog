import type { Metadata } from 'next'
import { mosaicSlotCount } from '@/lib/mosaicPattern'
import { readMosaicPattern } from '@/lib/mosaicPattern.server'
import { getSeriesPreviewItems } from '@/lib/seriesItems'
import PhysicsMosaicLab from './PhysicsMosaicLab'

export const metadata: Metadata = {
  title: 'Matter.js Throw Covers | test-ui',
  description: 'Matter.js 2D physics — grab and throw series covers.',
}

export default function PhysicsMosaicPage() {
  const pattern = readMosaicPattern()
  const items = getSeriesPreviewItems(Math.max(3, mosaicSlotCount(pattern)))
  return <PhysicsMosaicLab items={items} />
}
