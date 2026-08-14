import type { Metadata } from 'next'
import { mosaicSlotCount } from '@/lib/mosaicPattern'
import { readMosaicPattern } from '@/lib/mosaicPattern.server'
import { getSeriesPreviewItems } from '@/lib/seriesItems'
import P5ParticleLab from './P5ParticleLab'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'p5 Particle Cover | test-ui',
  description: 'p5.js particle photo field — covers dissolve around the cursor.',
}

export default function P5LabPage() {
  const pattern = readMosaicPattern()
  const items = getSeriesPreviewItems(Math.max(3, mosaicSlotCount(pattern)))
  return <P5ParticleLab items={items} />
}
