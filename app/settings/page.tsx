import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { readHomeSeriesSettings } from '@/lib/homeSeriesMode.server'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import SettingsForm from './SettingsForm'
import styles from './settings.module.css'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = {
  title: '설정 | josh log',
}

export default async function SettingsPage() {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host')
  if (!isAuthoringEnabled(host)) {
    redirect('/')
  }

  const seriesSettings = readHomeSeriesSettings()

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <Link href="/">← Articles</Link>
        </p>
        <h1 className={styles.title}>설정</h1>
        <p className={styles.sub}>
          홈 표지 패딩과 상단 인터랙티브 패턴 등 작성용 옵션을 조절합니다.
        </p>
      </section>
      <SettingsForm
        initialSeriesMode={seriesSettings.mode}
        initialRandomPool={seriesSettings.randomPool}
        initialRandomEnabled={seriesSettings.randomEnabled}
      />
    </>
  )
}
