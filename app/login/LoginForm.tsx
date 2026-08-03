'use client'

import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import styles from './login.module.css'

export default function LoginForm() {
  const router = useRouter()
  const search = useSearchParams()
  const { refresh } = useAuth()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error || '로그인에 실패했습니다.')
        return
      }
      await refresh()
      const next = search.get('next') || '/'
      router.replace(next.startsWith('/') ? next : '/')
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <h1 className={styles.title}>Login</h1>
      <label className={styles.label}>
        ID
        <input
          className={styles.input}
          name="id"
          autoComplete="username"
          value={id}
          onChange={(e) => setId(e.target.value)}
          required
        />
      </label>
      <label className={styles.label}>
        Password
        <input
          className={styles.input}
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? '…' : 'Sign in'}
      </button>
    </form>
  )
}
