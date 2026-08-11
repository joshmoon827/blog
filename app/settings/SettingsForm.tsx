'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useCoverMatteSettings } from '@/hooks/useCoverMatteSettings'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import { DEFAULT_COVER_MATTE_SETTINGS } from '@/lib/coverMatteSettings'
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

export default function SettingsForm() {
  const router = useRouter()
  const { loading, authenticated } = useAuth()
  const canWrite = authenticated && isAuthoringEnabled()
  const { settings, ready, update, reset } = useCoverMatteSettings()

  useEffect(() => {
    if (loading) return
    if (!canWrite) {
      router.replace(isAuthoringEnabled() ? '/login?next=/settings' : '/')
    }
  }, [loading, canWrite, router])

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
    </div>
  )
}
