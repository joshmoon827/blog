import type { Metadata } from 'next'
import { mosaicSlotCount } from '@/lib/mosaicPattern'
import { readMosaicPattern } from '@/lib/mosaicPattern.server'
import { getSeriesPreviewItems } from '@/lib/seriesItems'
import WebglMosaicLab from './WebglMosaicLab'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Interactive Mosaic | test-ui',
  description: 'WebGL mosaic banner lab — same footprint as the home series mosaic.',
}

export default function WebglMosaicPage() {
  const pattern = readMosaicPattern()
  const items = getSeriesPreviewItems(Math.max(3, mosaicSlotCount(pattern)))
  return <WebglMosaicLab items={items} />
}
