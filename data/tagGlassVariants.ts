export const TAG_GLASS_VARIANTS = [
  {
    slug: '1',
    id: 'glassFrost',
    title: 'Frost Glass',
    description: '얇은 하이라이트와 부드러운 블러가 있는 클래식 프로스트 글래스.',
  },
  {
    slug: '2',
    id: 'glassCrystal',
    title: 'Crystal Edge',
    description: '선명한 테두리와 inset 하이라이트가 있는 크리스탈 글래스.',
  },
  {
    slug: '3',
    id: 'glassAurora',
    title: 'Aurora Sheen',
    description: '은은한 gradient 테두리와 컬러 틴트가 있는 오로라 글래스.',
  },
  {
    slug: '4',
    id: 'glassSatin',
    title: 'Satin Mist',
    description: '낮은 대비와 넓은 블러로 은은하게 떠 있는 새틴 글래스.',
  },
  {
    slug: '5',
    id: 'glassDeep',
    title: 'Deep Tint',
    description: '짙은 틴트와 강한 블러로 깊이감 있는 다크 글래스.',
  },
  {
    slug: '6',
    id: 'glassPrism',
    title: 'Prism Light',
    description: '다층 gradient와 빛 굴절 느낌의 프리즘 글래스.',
  },
  {
    slug: '7',
    id: 'glassBubble',
    title: 'Bubble Float',
    description: '둥근 볼륨과 inner glow가 있는 버블 글래스.',
  },
  {
    slug: '8',
    id: 'glassPanel',
    title: 'Panel Tile',
    description: '약간 각진 타일 형태의 패널 글래스.',
  },
  {
    slug: '9',
    id: 'glassGlow',
    title: 'Soft Glow',
    description: '호버·선택 시 외곽 glow가 퍼지는 소프트 글래스.',
  },
  {
    slug: '10',
    id: 'glassMinimal',
    title: 'Ultra Clear',
    description: '최소 테두리와 높은 투명도의 울트라 클리어 글래스.',
  },
] as const

export type TagGlassVariantId = (typeof TAG_GLASS_VARIANTS)[number]['id']

export function getTagGlassVariant(slug: string) {
  return TAG_GLASS_VARIANTS.find((variant) => variant.slug === slug)
}

export function getTagGlassHref(slug: string, tag?: string) {
  return tag ? `/test-ui/tag${slug}?tag=${encodeURIComponent(tag)}` : `/test-ui/tag${slug}`
}
