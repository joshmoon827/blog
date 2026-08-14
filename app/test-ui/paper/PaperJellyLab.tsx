'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { MosaicPattern } from '@/lib/mosaicPattern'
import type { SeriesCardItem } from '@/lib/seriesItems'
import LabChrome from '../LabChrome'
import lab from '../lab-chrome.module.css'

const PaperStage = dynamic(() => import('./PaperStage'), {
  ssr: false,
  loading: () => <div className={lab.stageFallback} aria-hidden />,
})

type Props = {
  items: SeriesCardItem[]
  pattern: MosaicPattern
}

export default function PaperJellyLab({ items, pattern }: Props) {
  const [hoverTitle, setHoverTitle] = useState<string | null>(null)

  return (
    <LabChrome
      kicker="test-ui · paper"
      title="Jelly Shards"
      lede={
        <>
          모자이크 다각형의 <strong>꼭짓점</strong>이 젤리처럼 늘어납니다. Paper.js
          벡터 패스가 사진을 클립한 채 변형됩니다.
        </>
      }
      note="샤드 전체가 이동하는 GSAP와 달리, 여기서는 조각의 윤곽선이 늘어납니다."
      captionKicker="Paper.js"
      caption={hoverTitle ?? '조각 위를 문지르면 윤곽이 늘어납니다'}
      currentHref="/test-ui/paper"
      aspectRatio={pattern.aspectRatio}
    >
      <PaperStage items={items} pattern={pattern} onHoverTitle={setHoverTitle} />
    </LabChrome>
  )
}
