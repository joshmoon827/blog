'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useCoverMatteSettings } from '@/hooks/useCoverMatteSettings'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import { DEFAULT_COVER_MATTE_SETTINGS } from '@/lib/coverMatteSettings'
import {
  HOME_SERIES_ALL_OPTIONS,
  HOME_SERIES_EXPERIMENT_OPTIONS,
  HOME_SERIES_INTERACTIVE_OPTIONS,
  HOME_SERIES_MODE_OPTIONS,
  interactiveModeLabHref,
  isInteractiveHomeSeriesMode,
  isWebglHomeSeriesMode,
  type HomeSeriesMode,
} from '@/lib/homeSeriesMode'
import styles from './settings.module.css'

function SliderRow({
  id,
  label,
  hint,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (n: number) => void
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowHead}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <span className={styles.value}>
          {value}
          {unit}
        </span>
      </div>
      <p className={styles.hint}>{hint}</p>
      <input
        id={id}
        className={styles.slider}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className={styles.rangeEnds} aria-hidden="true">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  )
}

export default function SettingsForm({
  initialSeriesMode,
  initialRandomPool,
  initialRandomEnabled,
}: {
  initialSeriesMode: HomeSeriesMode
  initialRandomPool: HomeSeriesMode[]
  initialRandomEnabled: boolean
}) {
  const router = useRouter()
  const { loading, authenticated } = useAuth()
  const canWrite = authenticated && isAuthoringEnabled()
  const { settings, ready, update, reset } = useCoverMatteSettings()
  const [seriesMode, setSeriesMode] = useState<HomeSeriesMode>(initialSeriesMode)
  const [randomPool, setRandomPool] = useState<HomeSeriesMode[]>(initialRandomPool)
  const [randomEnabled, setRandomEnabled] = useState(initialRandomEnabled)
  const [seriesModeError, setSeriesModeError] = useState<string | null>(null)
  const [savingMode, startSaveMode] = useTransition()
  const [settingsDirty, setSettingsDirty] = useState(false)
  const [pushingSettings, setPushingSettings] = useState(false)
  const [settingsGitError, setSettingsGitError] = useState<string | null>(null)
  const [settingsGitOk, setSettingsGitOk] = useState(false)

  async function refreshSettingsDirty() {
    try {
      const res = await fetch('/api/settings-git', { credentials: 'same-origin' })
      const data = (await res.json().catch(() => null)) as {
        dirty?: boolean
        error?: string
      } | null
      if (!res.ok) {
        setSettingsDirty(false)
        return
      }
      setSettingsDirty(Boolean(data?.dirty))
    } catch {
      setSettingsDirty(false)
    }
  }

  useEffect(() => {
    if (!canWrite) return
    void refreshSettingsDirty()
    const timer = window.setInterval(() => {
      void refreshSettingsDirty()
    }, 4000)
    return () => window.clearInterval(timer)
  }, [canWrite, savingMode])

  async function pushSettings() {
    if (!settingsDirty || pushingSettings) return
    setPushingSettings(true)
    setSettingsGitError(null)
    setSettingsGitOk(false)
    try {
      const res = await fetch('/api/settings-git', {
        method: 'POST',
        credentials: 'same-origin',
      })
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        setSettingsGitError(data?.error || '설정을 올리지 못했습니다.')
        return
      }
      setSettingsDirty(false)
      setSettingsGitOk(true)
    } catch {
      setSettingsGitError('설정을 올리지 못했습니다.')
    } finally {
      setPushingSettings(false)
      void refreshSettingsDirty()
    }
  }

  useEffect(() => {
    if (loading) return
    if (!canWrite) {
      router.replace(isAuthoringEnabled() ? '/login?next=/settings' : '/')
    }
  }, [loading, canWrite, router])

  function selectSeriesMode(mode: HomeSeriesMode) {
    if (mode === seriesMode || savingMode) return
    const prev = seriesMode
    setSeriesMode(mode)
    setSeriesModeError(null)
    startSaveMode(async () => {
      try {
        const res = await fetch('/api/home-series-mode', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(data?.error || `저장 실패 (${res.status})`)
        }
        const data = (await res.json()) as { mode: HomeSeriesMode }
        setSeriesMode(data.mode)
        router.refresh()
      } catch (err) {
        setSeriesMode(prev)
        setSeriesModeError(
          err instanceof Error ? err.message : '모드 저장에 실패했습니다.',
        )
      }
    })
  }

  function toggleRandomEnabled() {
    if (savingMode) return
    const prev = randomEnabled
    const next = !prev
    setRandomEnabled(next)
    setSeriesModeError(null)
    startSaveMode(async () => {
      try {
        const res = await fetch('/api/home-series-mode', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ randomEnabled: next }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(data?.error || `저장 실패 (${res.status})`)
        }
        const data = (await res.json()) as { randomEnabled: boolean }
        setRandomEnabled(Boolean(data.randomEnabled))
        router.refresh()
      } catch (err) {
        setRandomEnabled(prev)
        setSeriesModeError(
          err instanceof Error ? err.message : '랜덤 사용 저장에 실패했습니다.',
        )
      }
    })
  }

  function toggleRandomPool(mode: HomeSeriesMode) {
    if (savingMode) return
    const prev = randomPool
    const next = prev.includes(mode)
      ? prev.filter((id) => id !== mode)
      : [...prev, mode]
    setRandomPool(next)
    setSeriesModeError(null)
    startSaveMode(async () => {
      try {
        const res = await fetch('/api/home-series-mode', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ randomPool: next }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(data?.error || `저장 실패 (${res.status})`)
        }
        const data = (await res.json()) as { randomPool: HomeSeriesMode[] }
        setRandomPool(data.randomPool)
        router.refresh()
      } catch (err) {
        setRandomPool(prev)
        setSeriesModeError(
          err instanceof Error ? err.message : '랜덤 리스트 저장에 실패했습니다.',
        )
      }
    })
  }

  if (loading || !canWrite) {
    return <p className={styles.loading}>불러오는 중…</p>
  }

  return (
    <div className={styles.panel}>
      <section className={styles.section} aria-labelledby="cover-matte-heading">
        <h2 id="cover-matte-heading" className={styles.sectionTitle}>
          홈 표지 가장자리 패딩
        </h2>
        <p className={styles.sectionSub}>
          카드 표지 테두리에 다른 색이 있으면 안쪽으로 패딩을 넣고, 워터마크용
          오른쪽 아래 구석 색으로 배경을 채웁니다. 이 기기(브라우저)에만
          저장됩니다.
        </p>

        <SliderRow
          id="pad-percent"
          label="패딩 크기"
          hint="표지 높이 기준 안쪽 여백. 0이면 패딩 없음."
          value={ready ? settings.padPercent : DEFAULT_COVER_MATTE_SETTINGS.padPercent}
          min={0}
          max={20}
          step={1}
          unit="%"
          onChange={(padPercent) => update({ padPercent })}
        />

        <SliderRow
          id="color-diff"
          label="색 차이 임계값"
          hint="테두리 링에서 이 비율 이상 다른 색이 있으면 패딩 적용."
          value={
            ready
              ? settings.colorDiffPercent
              : DEFAULT_COVER_MATTE_SETTINGS.colorDiffPercent
          }
          min={0}
          max={50}
          step={1}
          unit="%"
          onChange={(colorDiffPercent) => update({ colorDiffPercent })}
        />

        <SliderRow
          id="ring-inset"
          label="테두리 샘플 위치"
          hint="카드 크롭 가장자리에서 안쪽으로 들어온 위치에서 색을 샘플링."
          value={
            ready
              ? settings.ringInsetPercent
              : DEFAULT_COVER_MATTE_SETTINGS.ringInsetPercent
          }
          min={1}
          max={20}
          step={1}
          unit="%"
          onChange={(ringInsetPercent) => update({ ringInsetPercent })}
        />

        <div className={styles.actions}>
          <button type="button" className={styles.reset} onClick={reset}>
            기본값으로
          </button>
          <Link href="/" className={styles.homeLink}>
            홈에서 확인
          </Link>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="series-pattern-heading">
        <h2 id="series-pattern-heading" className={styles.sectionTitle}>
          홈 카테고리 패턴
        </h2>
        <p className={styles.sectionSub}>
          홈 상단에 보여줄 카테고리 배너 스타일을 고릅니다. 랜덤 패턴 리스트를
          켜면 새로고침마다 고른 패턴 중 하나가 나옵니다.
        </p>

        <div
          className={styles.modeSwitch}
          role="group"
          aria-label="홈 카테고리 패턴"
        >
          {HOME_SERIES_MODE_OPTIONS.map((opt) => {
            const active = seriesMode === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                className={`${styles.modeBtn}${active ? ` ${styles.modeBtnActive}` : ''}`}
                aria-pressed={active}
                disabled={savingMode}
                onClick={() => selectSeriesMode(opt.id)}
              >
                <span className={styles.modeBtnLabel}>{opt.label}</span>
                <span className={styles.modeBtnHint}>{opt.hint}</span>
              </button>
            )
          })}
        </div>

        <div className={styles.experimentBlock}>
          <h3 className={styles.experimentTitle}>WebGL 실험 패턴</h3>
          <p className={styles.hint}>
            test-ui WebGL 장면입니다. 홈 모자이크와 같은 높이에 올라갑니다.
          </p>
          <div
            className={styles.modeSwitch}
            role="group"
            aria-label="실험 패턴"
          >
            {HOME_SERIES_EXPERIMENT_OPTIONS.map((opt) => {
              const active = seriesMode === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.modeBtn}${active ? ` ${styles.modeBtnActive}` : ''}`}
                  aria-pressed={active}
                  disabled={savingMode}
                  onClick={() => selectSeriesMode(opt.id)}
                >
                  <span className={styles.modeBtnLabel}>{opt.label}</span>
                  <span className={styles.modeBtnHint}>{opt.hint}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.experimentBlock}>
          <h3 className={styles.experimentTitle}>인터랙티브 라이브러리 패턴</h3>
          <p className={styles.hint}>
            Pretext, GSAP, p5.js로 만든 test-ui 장면을 홈 상단에 적용합니다.
          </p>
          <div
            className={styles.modeSwitch}
            role="group"
            aria-label="인터랙티브 라이브러리 패턴"
          >
            {HOME_SERIES_INTERACTIVE_OPTIONS.map((opt) => {
              const active = seriesMode === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.modeBtn}${active ? ` ${styles.modeBtnActive}` : ''}`}
                  aria-pressed={active}
                  disabled={savingMode}
                  onClick={() => selectSeriesMode(opt.id)}
                >
                  <span className={styles.modeBtnLabel}>{opt.label}</span>
                  <span className={styles.modeBtnHint}>{opt.hint}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.experimentBlock}>
          <div className={styles.randomHead}>
            <h3 className={styles.experimentTitle}>랜덤 패턴 리스트</h3>
            <button
              type="button"
              className={`${styles.randomUseBtn}${randomEnabled ? ` ${styles.randomUseBtnOn}` : ''}`}
              aria-pressed={randomEnabled}
              disabled={savingMode}
              onClick={toggleRandomEnabled}
            >
              {randomEnabled ? '사용 중' : '사용'}
            </button>
          </div>
          <p className={styles.hint}>
            {randomEnabled
              ? '사용 중이면 홈을 새로고침할 때마다 아래 고른 패턴 중 하나가 나옵니다.'
              : '사용을 누르면 리스트에서 패턴을 고를 수 있습니다. 끄면 위에서 고른 고정 패턴을 씁니다.'}
          </p>
          {randomEnabled ? (
            <div className={styles.randomList} role="group" aria-label="랜덤 패턴 리스트">
              {HOME_SERIES_ALL_OPTIONS.map((opt) => {
                const on = randomPool.includes(opt.id)
                return (
                  <label
                    key={opt.id}
                    className={`${styles.randomItem}${on ? ` ${styles.randomItemOn}` : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={savingMode}
                      onChange={() => toggleRandomPool(opt.id)}
                    />
                    <span>
                      <span className={styles.modeBtnLabel}>{opt.label}</span>
                      <span className={styles.randomHint}>{opt.hint}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          ) : null}
        </div>

        {seriesModeError ? (
          <p className={styles.modeError} role="alert">
            {seriesModeError}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.gitPushBtn}
            disabled={!settingsDirty || pushingSettings}
            onClick={() => void pushSettings()}
          >
            {pushingSettings ? '올리는 중…' : '설정 커밋·푸시'}
          </button>
          {settingsGitOk && !settingsDirty ? (
            <span className={styles.gitPushOk}>올렸습니다</span>
          ) : null}
        </div>
        {settingsGitError ? (
          <p className={styles.modeError} role="alert">
            {settingsGitError}
          </p>
        ) : null}

        {seriesMode === 'mosaic' ? (
          <div className={styles.actions}>
            <Link href="/settings/mosaic" className={styles.homeLink}>
              모자이크 패턴 편집 →
            </Link>
          </div>
        ) : seriesMode === 'slide' ? (
          <p className={styles.hint}>
            슬라이드 패턴은 가로 스냅 카드로 카테고리를 보여줍니다.
          </p>
        ) : isWebglHomeSeriesMode(seriesMode) ? (
          <div className={styles.actions}>
            <Link href="/test-ui/webgl" className={styles.homeLink}>
              WebGL 실험실에서 비교 →
            </Link>
            <Link href="/" className={styles.homeLink}>
              홈에서 확인
            </Link>
          </div>
        ) : isInteractiveHomeSeriesMode(seriesMode) ? (
          <div className={styles.actions}>
            <Link
              href={interactiveModeLabHref(seriesMode)}
              className={styles.homeLink}
            >
              test-ui에서 원본 비교 →
            </Link>
            <Link href="/" className={styles.homeLink}>
              홈에서 확인
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  )
}
