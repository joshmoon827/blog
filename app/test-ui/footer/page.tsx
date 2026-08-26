import type { Metadata } from 'next'
import Link from 'next/link'
import LabFooter from './LabFooter'
import styles from './page.module.css'

export const instant = false

export const metadata: Metadata = {
  title: 'Footer lab | test-ui',
  robots: { index: false, follow: false },
}

export default function FooterLabPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>test-ui · chrome</p>
        <h1 className={styles.pageTitle}>Footer links</h1>
        <p className={styles.lede}>
          본편 <code>components/Footer.tsx</code>의 Contact/License는{' '}
          <code>href=&quot;#&quot;</code>이고 Back to Top만 onClick이다. 아래 점선
          박스가 랩 Footer다. 사이트 맨 아래 크롬 Footer는 아직 본편 그대로다.
        </p>
        <p className={styles.meta}>
          <Link href="/">← Articles</Link>
          <span aria-hidden>·</span>
          <Link href="/test-ui/obsidian-body">obsidian-body</Link>
          <span aria-hidden>·</span>
          <Link href="/test-ui/related">related</Link>
        </p>
      </header>

      <section className={styles.tall} aria-label="Scroll fodder">
        <p className={styles.note}>
          Contact는 레포/사이트에 있던 메일 <code>joshmoon827@gmail.com</code>로
          간다. LinkedIn URL은 코드베이스에 없어서 넣지 않았다. License는 저장소에
          LICENSE 파일이 없어 이 페이지의 <a href="#license">#license</a>로 건다.
          Back to Top은 레이아웃의 <code>#main</code> 앵커다.
        </p>
        <p className={styles.lede}>
          스크롤을 내린 뒤 랩 Footer의 Back to Top, Contact, License를 눌러 보면
          된다.
        </p>
      </section>

      <section id="license" className={styles.licenseBox}>
        <h2>License</h2>
        <p className={styles.note}>
          joshlog 저장소에는 LICENSE 파일이 없고 package.json에도 license 필드가
          없다. 본편에 넣기 전에 SPDX를 정하면 이 링크를 그 파일이나 표준 URL로
          바꾸면 된다.
        </p>
      </section>

      <div className={styles.labFooterWrap}>
        <p className={styles.labFooterLabel}>Lab footer (proposed)</p>
        <LabFooter />
      </div>
    </div>
  )
}
