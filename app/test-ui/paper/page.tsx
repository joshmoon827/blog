import type { Metadata } from 'next'
import { mosaicSlotCount } from '@/lib/mosaicPattern'
import { readMosaicPattern } from '@/lib/mosaicPattern.server'
import { getSeriesPreviewItems } from '@/lib/seriesItems'
import PaperJellyLab from './PaperJellyLab'

export const metadata: Metadata = {
  title: 'Paper.js Jelly Shards | test-ui',
  description: 'Paper.js vector mosaic — shard outlines stretch like jelly.',
}

export default function PaperLabPage() {
  const pattern = readMosaicPattern()
  const items = getSeriesPreviewItems(Math.max(3, mosaicSlotCount(pattern)))
  return <PaperJellyLab items={items} pattern={pattern} />
}
