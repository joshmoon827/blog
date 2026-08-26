
'use client'

import { useCallback, useEffect, useState } from 'react'
import styles from './page.module.css'

const PIN_PATH = '/articles/agi'
const STATIC_CACHE = 'static-v2'
const API_PATH = '/api/articles'

type CacheRow = { name: string; urls: string[] }

export default function OfflineReaderLab() {
  const [online, setOnline] = useState(true)
  const [rows, setRows] = useState<CacheRow[]>([])
  const [status, setStatus] = useState('')

  const refresh = useCallback(async () => {
    if (!('caches' in window)) {
      setRows([])
      return
    }
    const names = await caches.keys()
    const next: CacheRow[] = []
    for (const name of names) {
      const cache = await caches.open(name)
      const keys = await cache.keys()
      next.push({
        name,
        urls: keys.map((request) => new URL(request.url).pathname),
      })
    }
    setRows(next)
  }, [])

  useEffect(() => {
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    refresh()
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [refresh])

  async function pinArticle() {
    setStatus('fetching…')
    try {
      const page = await fetch(PIN_PATH, { credentials: 'same-origin' })
      if (!page.ok) throw new Error(`article ${page.status}`)
      const cache = await caches.open(STATIC_CACHE)
      await cache.put(PIN_PATH, page.clone())

      const list = await fetch(API_PATH, { credentials: 'same-origin' })
      if (list.ok) {
        const apiCache = await caches.open('api-v2')
        await apiCache.put(API_PATH, list.clone())
      }
      setStatus(`${PIN_PATH} → ${STATIC_CACHE}`)
      await refresh()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'pin failed')
    }
  }

  return (
    <>
      <span className={`${styles.badge} ${online ? styles.badgeOn : styles.badgeOff}`}>
        {online ? 'onLine' : 'offline'}
      </span>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={pinArticle}>
          오프라인에 넣기 · /articles/agi
        </button>
        <button type="button" className={styles.btnGhost} onClick={() => refresh()}>
          캐시 다시 읽기
        </button>
      </div>
      {status ? <p className={styles.status}>{status}</p> : null}
      {rows.length === 0 ? (
        <p className={styles.status}>Cache Storage 비어 있음</p>
      ) : (
        rows.map((row) => (
          <div key={row.name}>
            <p className={styles.cacheName}>{row.name}</p>
            <ul className={styles.list}>
              {row.urls.length ? (
                row.urls.map((url) => (
                  <li key={`${row.name}-${url}`} className={styles.item}>
                    {url}
                  </li>
                ))
              ) : (
                <li className={styles.item}>(empty)</li>
              )}
            </ul>
          </div>
        ))
      )}
    </>
  )
}
