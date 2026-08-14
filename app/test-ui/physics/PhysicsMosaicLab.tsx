'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { SeriesCardItem } from '@/lib/seriesItems'
import LabChrome from '../LabChrome'
import lab from '../lab-chrome.module.css'

const PhysicsStage = dynamic(() => import('./PhysicsStage'), {
  ssr: false,
  loading: () => <div className={lab.stageFallback} aria-hidden />,
})

export default function PhysicsMosaicLab({ items }: { items: SeriesCardItem[] }) {
  const [hoverTitle, setHoverTitle] = useState<string | null>(null)

  return (
    <LabChrome
      kicker="test-ui · matter"
      title="Throw Covers"
      lede={
        <>
          카테고리 커버가 <strong>강체</strong>입니다. Matter.js가 중력과 충돌만
          계산하고, 캔버스 2D로 그립니다.
        </>
      }
      note="카드를 집어서 던지세요. 같은 물리 엔진의 다른 모드는 없습니다."
      captionKicker="Matter.js"
      caption={hoverTitle ?? '카드를 드래그해서 던지세요'}
      currentHref="/test-ui/physics"
    >
      <PhysicsStage items={items} mode="sandbox" onHoverTitle={setHoverTitle} />
    </LabChrome>
  )
}
