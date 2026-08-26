import type { Metadata } from 'next'
import Link from 'next/link'
import { readAll, readOne } from '@/lib/localArticles'
import { parseObsidianLab } from '../obsidian-body/sanitize'
import WikiHover, { type PreviewArticle } from './WikiHover'
import styles from '../heading-permalinks/lab.module.css'

export const instant = false

export const metadata: Metadata = {
  title: 'Hover preview lab | test-ui',
  robots: { index: false, follow: false },
}

const SAMPLE = [
  '월드모델 쪽은 [[Dreamer]]와 [[월드모델과 AGI]]를 같이 보면 된다.',
  '',
  '엔진 노트는 [[v8]], 없는 연결은 [[missing-note-xyz]]다.',
].join('\n')

function snippetOf(body: string, description: string): string {
  const raw = (description || body || '').replace(/\s+/g, ' ').trim()
  return raw.length > 120 ? `${raw.slice(0, 120)}…` : raw
}

export default function HoverPreviewPage() {
  const all = readAll()
  const refs = all.map((a) => ({ slug: a.slug, title: a.title }))
  const tokens = parseObsidianLab(SAMPLE, refs)
  const agi = readOne('agi')
  const agiTokens = agi
    ? parseObsidianLab(agi.body.slice(0, 800), refs)
    : tokens
  const previews: PreviewArticle[] = all.map((a) => ({
    slug: a.slug,
    title: a.title,
    snippet: snippetOf(a.body, a.description),
  }))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>test-ui · hover-preview</p>
        <h1 className={styles.pageTitle}>Wiki hover preview</h1>
        <p className={styles.lede}>
          obsidian-body 파서 위. 실존 노트는 300ms 호버에 제목+120자, 없는{' '}
          <code>[[wiki]]</code>는 점선과 “아직 없는 노트”.
        </p>
        <p className={styles.meta}>
          <Link href="/test-ui/obsidian-body">obsidian-body</Link>
          {' · '}
          <Link href="/test-ui/heading-permalinks">permalinks</Link>
        </p>
      </header>
      <h2 className={`${styles.heading} ${styles.h2}`}>Synthetic</h2>
      <WikiHover tokens={tokens} articles={previews} />
      {agi ? (
        <>
          <h2 className={`${styles.heading} ${styles.h2}`}>/articles/agi snippet</h2>
          <WikiHover tokens={agiTokens} articles={previews} />
        </>
      ) : null}
    </div>
  )
}
