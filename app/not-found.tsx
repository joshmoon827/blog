import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Not Found',
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Page Not Found</h2>
      <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
        죄송합니다. 요청하신 페이지를 찾을 수 없습니다.
      </p>
      <Link
        href="/"
        style={{
          padding: '0.75rem 1.5rem',
          background: 'var(--color-primary, #0070f3)',
          color: 'white',
          borderRadius: '0.5rem',
          textDecoration: 'none',
        }}
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
