import Link from 'next/link'
import { LocalizedText } from '@/components/LocalizedText'
import styles from './page.module.css'

const ITEMS = [
  { href: '/test-ui/empty/not-found', ko: '404', en: '404' },
  { href: '/test-ui/empty/unauthorized', ko: '401', en: '401' },
  { href: '/test-ui/empty/forbidden', ko: '403', en: '403' },
  { href: '/test-ui/empty/error', ko: '500', en: '500' },
  { href: '/test-ui/empty/offline', ko: '오프라인', en: 'Offline' },
] as const

export default function EmptyNav({ current }: { current?: string }) {
  return (
    <ul className={styles.chips} aria-label="Empty page family">
      <li>
        <Link
          href="/test-ui/empty"
          className={`${styles.chip} ${current === '/test-ui/empty' ? styles.chipActive : ''}`}
        >
          Empty
        </Link>
      </li>
      {ITEMS.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className={`${styles.chip} ${current === item.href ? styles.chipActive : ''}`}
            aria-current={current === item.href ? 'page' : undefined}
          >
            <LocalizedText ko={item.ko} en={item.en} />
          </Link>
        </li>
      ))}
    </ul>
  )
}
