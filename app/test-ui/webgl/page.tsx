import type { Metadata } from 'next'
import { mosaicSlotCount } from '@/lib/mosaicPattern'
import { readMosaicPattern } from '@/lib/mosaicPattern.server'
import { getSeriesPreviewItems } from '@/lib/seriesItems'
import WebglMosaicLab from './WebglMosaicLab'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: 'Interactive Mosaic | test-ui',
  description: 'WebGL mosaic banner lab — same footprint as the home series mosaic.',
}

export default function WebglMosaicPage() {
  const pattern = readMosaicPattern()
  const items = getSeriesPreviewItems(Math.max(3, mosaicSlotCount(pattern)))
  return <WebglMosaicLab items={items} />
}
