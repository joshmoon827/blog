import type { Metadata } from 'next'
import { mosaicSlotCount } from '@/lib/mosaicPattern'
import { readMosaicPattern } from '@/lib/mosaicPattern.server'
import { getSeriesPreviewItems } from '@/lib/seriesItems'
import PaperJellyLab from './PaperJellyLab'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: 'Paper.js Jelly Shards | test-ui',
  description: 'Paper.js vector mosaic — shard outlines stretch like jelly.',
}

export default function PaperLabPage() {
  const pattern = readMosaicPattern()
  const items = getSeriesPreviewItems(Math.max(3, mosaicSlotCount(pattern)))
  return <PaperJellyLab items={items} pattern={pattern} />
}
