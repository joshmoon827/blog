'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  COVER_MATTE_CHANGE_EVENT,
  COVER_MATTE_STORAGE_KEY,
  DEFAULT_COVER_MATTE_SETTINGS,
  readCoverMatteSettings,
  resetCoverMatteSettings,
  writeCoverMatteSettings,
  type CoverMatteSettings,
} from '@/lib/coverMatteSettings'

export function useCoverMatteSettings() {
  const [settings, setSettings] = useState<CoverMatteSettings>(
    DEFAULT_COVER_MATTE_SETTINGS,
  )
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSettings(readCoverMatteSettings())
    setReady(true)

    const sync = () => setSettings(readCoverMatteSettings())
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<CoverMatteSettings>).detail
      if (detail) setSettings(detail)
      else sync()
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === COVER_MATTE_STORAGE_KEY || e.key === null) sync()
    }

    window.addEventListener(COVER_MATTE_CHANGE_EVENT, onCustom)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(COVER_MATTE_CHANGE_EVENT, onCustom)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const update = useCallback((patch: Partial<CoverMatteSettings>) => {
    setSettings((prev) => writeCoverMatteSettings({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setSettings(resetCoverMatteSettings())
  }, [])

  return { settings, ready, update, reset }
}
