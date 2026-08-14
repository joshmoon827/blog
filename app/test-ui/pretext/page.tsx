import type { Metadata } from 'next'
import { getPretextFeatureArticle } from '@/lib/pretextArticle.server'
import PretextArticleLab from './PretextArticleLab'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: 'Flowing Article — Pretext Layout Lab',
  description:
    'A responsive editorial article pattern manually flowed around a moving cover with Pretext.',
}

export default function PretextLabPage() {
  return <PretextArticleLab {...getPretextFeatureArticle()} />
}
