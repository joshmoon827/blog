import type { Metadata } from 'next'
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'test-ui',
  robots: { index: false, follow: false },
}

type Item = { href: string; label: string }

function labelFrom(href: string) {
  if (href === '/offline') return 'Offline fallback'
  if (href === '/test-ui/tag1') return 'Tag glass'
  const rest = href.replace(/^\/test-ui\/?/, '')
  return rest || 'test-ui'
}

function walk(abs: string, urlBase: string): Item[] {
  const items: Item[] = []
  if (urlBase !== '/test-ui' && existsSync(path.join(abs, 'page.tsx'))) {
    items.push({ href: urlBase, label: labelFrom(urlBase) })
  }
  if (!existsSync(abs)) return items
  for (const name of readdirSync(abs).sort()) {
    if (name === 'tag[variant]') {
      items.push({ href: '/test-ui/tag1', label: 'Tag glass' })
      continue
    }
    if (name.startsWith('[') || name.includes('[')) continue
    const next = path.join(abs, name)
    if (!statSync(next).isDirectory()) continue
    items.push(...walk(next, `${urlBase}/${name}`))
  }
  return items
}

export default function TestUiIndexPage() {
  const dir = path.join(process.cwd(), 'app/test-ui')
  const labs = walk(dir, '/test-ui')
  const extra: Item[] = [{ href: '/offline', label: 'Offline fallback' }]
  const seen = new Set<string>()
  const items = [...labs, ...extra].filter((item) => {
    if (seen.has(item.href)) return false
    seen.add(item.href)
    return true
  })

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>test-ui</p>
      <h1 className={styles.title}>Lab index</h1>
      <p className={styles.lede}>
        로컬 실험만. 본편 라우트가 아니다. robots가 /test-ui/ 를 막는다.
      </p>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>
              <span className={styles.label}>{item.label}</span>
              <span className={styles.path}>{item.href}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
