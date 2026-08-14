import type { DoodleName } from './doodles'

export type CardKind = 'intro' | 'session' | 'note'

export type SessionCard = {
  id: string
  kind: CardKind
  tags?: string
  title?: string
  body?: string
  authors?: string
  time?: string
  doodle: DoodleName
  hasPlay?: boolean
}

export type SessionSection = {
  id: string
  kicker: string
  title: string
  accent: string
  blob: string
  cardTint: string
  cards: SessionCard[]
}

export const SECTIONS: SessionSection[] = [
  {
    id: 'attempts',
    kicker: '수많은 시도가 필요할 때',
    title: 'Countless Attempts',
    accent: '#efe07a',
    blob: '#5b3a86',
    cardTint: 'rgba(42, 32, 58, 0.9)',
    cards: [
      {
        id: 'attempts-intro',
        kind: 'intro',
        title: '완성 없는 이야기',
        body: '한 번에 끝나지 않는 문제를 붙잡고, 실험과 실패를 겹쳐 가며 제품을 다듬는 과정.',
        doodle: 'pencil',
      },
      {
        id: 'signup',
        kind: 'session',
        tags: '토스 가입 과정 · 프로덕트 디자인',
        title: '완성 없는 이야기, 가입 과정 개선',
        authors: '임경우, 윤지영',
        time: '16분',
        doodle: 'pencil',
      },
      {
        id: 'detail',
        kind: 'session',
        tags: '토스카드 · 브랜딩',
        title: '왜 이렇게까지 디테일을 챙기는 거예요?',
        authors: '최민수',
        time: '14분',
        doodle: 'thought',
      },
      {
        id: 'conference',
        kind: 'note',
        body: '완전히 새로운 컨퍼런스를 만드는 일은, 익숙한 형식을 의심하는 것에서 시작돼요.',
        authors: 'Simplicity Team',
        doodle: 'hat',
        hasPlay: true,
      },
    ],
  },
  {
    id: 'unknown',
    kicker: '미지의 영역에 도전할 때',
    title: 'Unknown Areas',
    accent: '#d8f07a',
    blob: '#3d5c1c',
    cardTint: 'rgba(22, 32, 18, 0.9)',
    cards: [
      {
        id: 'unknown-intro',
        kind: 'intro',
        title: '미지의 영역에 도전할 때',
        body: '레퍼런스가 없고, 사용자가 낯설고, 정답이 보이지 않을 때 디자이너는 어디로 가나요?',
        doodle: 'knot',
      },
      {
        id: 'teens',
        kind: 'session',
        tags: '틴즈 · 10대 유저 · 브랜딩',
        title: '30대 디자이너가 10대 전용 카드를 만든다면?',
        authors: '심석용',
        time: '18분',
        doodle: 'globe',
      },
      {
        id: 'elementary',
        kind: 'note',
        tags: '틴즈 · 10대 유저 · 프로덕트 디자인',
        body: '14세 미만을 위한 금융 서비스는 거의 없었어요. 초등학생도 쓸 수 있는 제품을 만들며 마주친 문제들.',
        authors: 'Product Designer 성소민',
        doodle: 'slide',
        hasPlay: true,
      },
      {
        id: 'data',
        kind: 'session',
        tags: '토스모바일 · MVP · AB테스트',
        title: '데이터로 내린 의사결정, 뒤집어엎기',
        authors: '정나림',
        time: '16분',
        doodle: 'spatula',
      },
      {
        id: 'logo',
        kind: 'session',
        tags: '로고 · 리브랜딩',
        title: '유일한 장애물이 상상력일 때',
        authors: '김지윤, 최민수',
        time: '14분',
        doodle: 'cone',
      },
      {
        id: 'bank',
        kind: 'session',
        tags: '토스뱅크 · 지금 이자 받기',
        title: '토스뱅크만의 차별화된 경험을 찾아서',
        authors: '허소임',
        time: '15분',
        doodle: 'glasses',
      },
    ],
  },
  {
    id: 'knots',
    kicker: '꼬인 매듭 풀기',
    title: 'Untangled Knots',
    accent: '#7ee8e0',
    blob: '#1b4a4c',
    cardTint: 'rgba(16, 38, 40, 0.9)',
    cards: [
      {
        id: 'knots-intro',
        kind: 'intro',
        title: '꼬인 매듭 풀기',
        body: '크고 복잡한 제품을 감당하면서, 한 번에 풀리지 않는 매듭을 조금씩 풀어낸 이야기.',
        doodle: 'knot',
      },
      {
        id: 'rewrite',
        kind: 'session',
        tags: '토스 주민센터 · 프로덕트 디자인',
        title: '크고 복잡한 제품, 과감하게 갈아엎기',
        authors: '이지윤',
        time: '17분',
        doodle: 'coffee',
      },
      {
        id: 'hundred',
        kind: 'session',
        tags: 'B2B · PG계약 · 인터널 제품 디자인',
        title: '100가지 문제를 한번에 해결하는 방법',
        authors: '하승주',
        time: '15분',
        doodle: 'funnel',
      },
      {
        id: 'saas',
        kind: 'session',
        tags: 'SaaS · 자동화 · 인터널 제품 디자인',
        title: '3,250개의 요구사항을 해결한 1개의 제품',
        authors: '윤종구',
        time: '15분',
        doodle: 'puzzle',
      },
      {
        id: 'b2b',
        kind: 'session',
        tags: '토스페이먼츠 · 결제창 · 유저인터뷰',
        title: '복잡한 B2B 제품, 정답으로 향하는 길',
        authors: '이영민',
        time: '16분',
        doodle: 'eyes',
      },
    ],
  },
]
