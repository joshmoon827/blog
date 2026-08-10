import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import LoginForm from './LoginForm'
import styles from './login.module.css'

export default async function LoginPage() {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host')
  if (!isAuthoringEnabled(host)) {
    redirect('/')
  }

  return (
    <main className={styles.page}>
      <Suspense fallback={<p className={styles.title}>Login</p>}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
