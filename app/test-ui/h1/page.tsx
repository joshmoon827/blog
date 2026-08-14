import type { Metadata } from 'next'
import Link from 'next/link'
import styles from './page.module.css'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: 'Heading Styles Lab | test-ui',
  description: 'h1–h5 typography experiments for article body headings.',
}

const SAMPLE = {
  h1: '표지 썸네일 resizing 하기',
  h2: '표지기능 리사이징 이슈',
  h3: '해결방법',
  h4: '리사이징은 이미지 재인코딩이 아님',
  h5: '가장자리 픽셀 샘플링',
  p: '홈에서 보이는 표지 썸네일의 리사이징이 마음에 들지 않아 배경색으로 패딩을 추가하는 과정에서 발생한 트러블 슈팅을 정리하였다.',
}

const VERSIONS = [
  {
    id: 'current',
    title: 'Current Blog',
    note: '지금 본문 기본값 = Docs Ladder (07) — ink 하이라이트 h1, 계단형 h2–h5.',
    className: styles.vCurrent,
  },
  {
    id: 'tistory',
    title: 'Tistory Soft',
    note: '티스토리 본문 톤 — 가벼운 weight, px 스케일, 여유 있는 줄간격.',
    className: styles.vTistory,
  },
  {
    id: 'obsidian',
    title: 'Obsidian Rule',
    note: '옵시디언 읽기 모드 — h1/h2 하단 hairline, 약간 낮은 weight.',
    className: styles.vObsidian,
  },
  {
    id: 'toss',
    title: 'Toss Feed Air',
    note: '토스피드식 여백 — 큰 디스플레이 h1, 아래로 갈수록 빠르게 작아짐.',
    className: styles.vToss,
  },
  {
    id: 'swiss',
    title: 'Swiss Tight',
    note: '인터내셔널 타이포 — 타이트 트래킹, 강한 대비, 짧은 줄높이.',
    className: styles.vSwiss,
  },
  {
    id: 'serif',
    title: 'Editorial Serif',
    note: '세리프 디스플레이 + 산세리프 하위 제목. 긴 에세이용.',
    className: styles.vSerif,
  },
  {
    id: 'docs',
    title: 'Docs Ladder',
    note: '기술 문서형 — ink 하이라이트 h1 + 계단형 h2–h5, 모노 악센트 h5.',
    className: styles.vDocs,
  },
  {
    id: 'quiet',
    title: 'Quiet Scale',
    note: '거의 같은 크기, weight/색으로만 계층. 미니멀 블로그.',
    className: styles.vQuiet,
  },
  {
    id: 'poster',
    title: 'Poster Stack',
    note: '포스터형 — h1 초대형, 나머지 촘촘한 스택.',
    className: styles.vPoster,
  },
] as const

export default function HeadingStylesLabPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>test-ui · typography</p>
        <h1 className={styles.pageTitle}>Heading Styles Lab</h1>
        <p className={styles.lede}>
          본문용 <strong>h1–h5</strong> 스타일 레퍼런스입니다. 각 카드는 독립된
          타이포 시스템이고, 같은 샘플 문장으로 비교합니다.
        </p>
        <p className={styles.meta}>
          <Link href="/">← Articles</Link>
          <span aria-hidden>·</span>
          <span>{VERSIONS.length} versions</span>
        </p>
      </header>

      <nav className={styles.toc} aria-label="Heading style versions">
        {VERSIONS.map((v, i) => (
          <a key={v.id} href={`#${v.id}`} className={styles.tocLink}>
            <span className={styles.tocIndex}>{String(i + 1).padStart(2, '0')}</span>
            {v.title}
          </a>
        ))}
      </nav>

      <div className={styles.grid}>
        {VERSIONS.map((v, i) => (
          <section
            key={v.id}
            id={v.id}
            className={`${styles.card} ${v.className}`}
            aria-labelledby={`${v.id}-label`}
          >
            <div className={styles.cardMeta}>
              <p className={styles.cardIndex}>Version {String(i + 1).padStart(2, '0')}</p>
              <h2 id={`${v.id}-label`} className={styles.cardTitle}>
                {v.title}
              </h2>
              <p className={styles.cardNote}>{v.note}</p>
            </div>

            <div className={styles.sample}>
              <h1>{SAMPLE.h1}</h1>
              <p>{SAMPLE.p}</p>
              <h2>{SAMPLE.h2}</h2>
              <p>{SAMPLE.p}</p>
              <h3>{SAMPLE.h3}</h3>
              <p>{SAMPLE.p}</p>
              <h4>{SAMPLE.h4}</h4>
              <p>{SAMPLE.p}</p>
              <h5>{SAMPLE.h5}</h5>
              <p>{SAMPLE.p}</p>
            </div>

            <dl className={styles.spec}>
              <div>
                <dt>h1</dt>
                <dd>display</dd>
              </div>
              <div>
                <dt>h2</dt>
                <dd>section</dd>
              </div>
              <div>
                <dt>h3</dt>
                <dd>subsection</dd>
              </div>
              <div>
                <dt>h4</dt>
                <dd>minor</dd>
              </div>
              <div>
                <dt>h5</dt>
                <dd>label</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
    </div>
  )
}
