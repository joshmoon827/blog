import type { Metadata } from 'next'
import { getPretextFeatureArticle } from '@/lib/pretextArticle.server'
import PretextArticleLab from './PretextArticleLab'

export const metadata: Metadata = {
  title: 'Flowing Article — Pretext Layout Lab',
  description:
    'A responsive editorial article pattern manually flowed around a moving cover with Pretext.',
}

export default function PretextLabPage() {
  return <PretextArticleLab {...getPretextFeatureArticle()} />
}
