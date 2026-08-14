'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { SeriesCardItem } from '@/lib/seriesItems'
import LabChrome from '../LabChrome'
import lab from '../lab-chrome.module.css'

const P5Stage = dynamic(() => import('./P5Stage'), {
  ssr: false,
  loading: () => <div className={lab.stageFallback} aria-hidden />,
})

export default function P5ParticleLab({ items }: { items: SeriesCardItem[] }) {
  const [hoverTitle, setHoverTitle] = useState<string | null>(null)

  return (
    <LabChrome
      kicker="test-ui · p5"
      title="Particle Cover"
      lede={
        <>
          표지를 <strong>픽셀 입자</strong>로 분해합니다. p5.js가 스프링과 반발로
          사진을 살아 있는 점군으로 그립니다.
        </>
      }
      note="커서를 사진 위로 밀면 입자가 흩어졌다가 제자리로 돌아옵니다. 카드나 물리 바디가 아닙니다."
      captionKicker="p5.js"
      caption={hoverTitle ?? '커서로 사진을 밀어 보세요'}
      currentHref="/test-ui/p5"
    >
      <P5Stage items={items} onHoverTitle={setHoverTitle} />
    </LabChrome>
  )
}
