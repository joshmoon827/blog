import type { Metadata } from 'next'
import Link from 'next/link'
import { sanitizeObsidianBody } from '@/lib/importObsidian'
import { readAll, readOne } from '@/lib/localArticles'
import { parseObsidianLab, type LabToken } from './sanitize'
import styles from './page.module.css'

export const instant = false

export const metadata: Metadata = {
  title: 'Obsidian body lab | test-ui',
  robots: { index: false, follow: false },
}

const SYNTHETIC = [
  '![[[L01-01A]_전북대학교_오일석.pdf]]',
  '',
  '실존 노트: [[Dreamer]] · 제목 매칭: [[월드모델과 AGI]] · 없는 노트: [[missing-note-xyz]].',
].join('\n')

const LAB_PDFS = new Set([
  '[L01-01A]_전북대학교_오일석.pdf',
  '[L08-03A]_서울대학교_김수현.pdf',
])

function pdfPublicPath(filename: string): string | null {
  if (!LAB_PDFS.has(filename)) return null
  return `/test-ui/attachments/${encodeURIComponent(filename)}`
}

function wikiSnippet(body: string, needle: string, pad = 80): string {
  const idx = body.indexOf(needle)
  if (idx === -1) return body.slice(0, 240)
  const start = Math.max(0, idx - 20)
  const end = Math.min(body.length, idx + needle.length + pad)
  return body.slice(start, end)
}

function LabBody({ tokens }: { tokens: LabToken[] }) {
  return (
    <div className={styles.body}>
      {tokens.map((token, i) => {
        if (token.type === 'text') {
          return <span key={i}>{token.value}</span>
        }
        if (token.type === 'pdf') {
          const label = token.alias || token.filename
          const href = pdfPublicPath(token.filename)
          return (
            <div key={i} className={styles.pdfCard}>
              <span className={styles.pdfIcon} aria-hidden>
                PDF
              </span>
              <span className={styles.pdfMeta}>
                <span className={styles.pdfName}>{label}</span>
                <span className={styles.pdfHint}>첨부 카드 · 렌더 시점에 파싱</span>
                {href ? (
                  <span className={styles.pdfActions}>
                    <a href={href} target="_blank" rel="noreferrer">
                      열기
                    </a>
                    <a href={href} download={token.filename}>
                      다운로드
                    </a>
                  </span>
                ) : (
                  <span className={styles.pdfHint}>파일 없음</span>
                )}
              </span>
            </div>
          )
        }
        const label = token.alias || token.target
        if (token.slug) {
          return (
            <Link key={i} href={`/articles/${token.slug}`}>
              {label}
            </Link>
          )
        }
        return (
          <span key={i} className={styles.unresolved} title="vault에 없는 노트">
            {label}
          </span>
        )
      })}
    </div>
  )
}

function Fixture({
  id,
  title,
  raw,
  articles,
}: {
  id: string
  title: string
  raw: string
  articles: { slug: string; title: string }[]
}) {
  const production = sanitizeObsidianBody(raw)
  const tokens = parseObsidianLab(raw, articles)
  return (
    <section id={id} className={styles.section}>
      <h2>{title}</h2>
      <p className={styles.note}>
        왼쪽은 원문/본편 sanitizer, 오른쪽은 랩 파서(대괄호 파일명 PDF → 카드,
        실존 슬러그만 링크).
      </p>
      <div className={styles.grid}>
        <div className={styles.panel}>
          <h3>Raw</h3>
          <pre className={styles.raw}>{raw}</pre>
        </div>
        <div className={styles.panel}>
          <h3>Production sanitizeObsidianBody</h3>
          <pre className={styles.raw}>{production}</pre>
        </div>
        <div className={styles.panel} style={{ gridColumn: '1 / -1' }}>
          <h3>Lab render</h3>
          <LabBody tokens={tokens} />
        </div>
      </div>
    </section>
  )
}

export default function ObsidianBodyLabPage() {
  const all = readAll().map((a) => ({ slug: a.slug, title: a.title }))
  const agi = readOne('agi')
  const lecture = readOne('article-mrlv2uja')
  const agiRaw = agi
    ? wikiSnippet(agi.body, '![[[L01-01A]_전북대학교_오일석.pdf]]')
    : '![[[L01-01A]_전북대학교_오일석.pdf]]'
  const lectureRaw = lecture
    ? wikiSnippet(lecture.body, '![[[L08-03A]_서울대학교_김수현.pdf]]')
    : '![[[L08-03A]_서울대학교_김수현.pdf]]'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>test-ui · obsidian</p>
        <h1 className={styles.pageTitle}>Obsidian body</h1>
        <p className={styles.lede}>
          파일명이 <strong>[L01-01A]</strong>처럼 대괄호로 시작하면 본편{' '}
          <code>sanitizeObsidianBody</code>가 매칭에 실패하고 원문이 그대로 보인다.
          랩에서는 PDF를 첨부 카드로, <code>[[노트]]</code>는 실존 슬러그만{' '}
          <code>/articles/...</code>로 건다.
        </p>
        <p className={styles.meta}>
          <Link href="/">← Articles</Link>
          <span aria-hidden>·</span>
          <Link href="/test-ui/footer">footer</Link>
          <span aria-hidden>·</span>
          <Link href="/test-ui/related">related</Link>
        </p>
      </header>
      <nav className={styles.toc} aria-label="Fixtures">
        <a href="#agi">agi</a>
        <a href="#lecture">article-mrlv2uja</a>
        <a href="#synthetic">synthetic</a>
      </nav>
      <Fixture id="agi" title="/articles/agi" raw={agiRaw} articles={all} />
      <Fixture
        id="lecture"
        title="/articles/article-mrlv2uja"
        raw={lectureRaw}
        articles={all}
      />
      <Fixture id="synthetic" title="Synthetic cases" raw={SYNTHETIC} articles={all} />
    </div>
  )
}
