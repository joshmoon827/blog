import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import SettingsForm from './SettingsForm'
import styles from './settings.module.css'

export const metadata = {
  title: '설정 | Laws of UX',
}

export default async function SettingsPage() {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host')
  if (!isAuthoringEnabled(host)) {
    redirect('/')
  }

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <Link href="/">← Articles</Link>
        </p>
        <h1 className={styles.title}>설정</h1>
        <p className={styles.sub}>홈 표지 가장자리 패딩 등 작성용 옵션을 조절합니다.</p>
      </section>
      <SettingsForm />
    </>
  )
}
