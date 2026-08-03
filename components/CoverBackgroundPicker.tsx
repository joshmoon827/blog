'use client'

import { useEffect, useId, useState } from 'react'
import {
  COVER_BACKGROUND_COLORS,
  isPresetCoverBackgroundColor,
  normalizeCoverBackgroundHex,
} from '@/data/coverBackgrounds'
import styles from './CoverBackgroundPicker.module.css'

type Props = {
  /** Selected hex (#rrggbb) or '' / null for none (default prompt). */
  value: string | null
  onChange: (hex: string) => void
  disabled?: boolean
}

const FALLBACK_PICKER = '#808080'

/** Solid background swatches + custom hex / native color picker for cover generation. */
export default function CoverBackgroundPicker({
  value,
  onChange,
  disabled,
}: Props) {
  const selected = normalizeCoverBackgroundHex(value)
  const noneActive = !selected
  const hexInputId = useId()
  const colorInputId = useId()

  /** Draft text so users can paste/type partial hex without fighting controlled input. */
  const [hexDraft, setHexDraft] = useState(selected)

  useEffect(() => {
    setHexDraft(selected)
  }, [selected])

  const commitHex = (raw: string) => {
    const trimmed = String(raw || '').trim().replace(/^#/, '')
    if (!trimmed) {
      onChange('')
      setHexDraft('')
      return
    }
    const n = normalizeCoverBackgroundHex(trimmed)
    if (n) {
      onChange(n)
      setHexDraft(n)
      return
    }
    // Invalid: revert display to current selection (or empty)
    setHexDraft(selected)
  }

  const pickerValue = selected || FALLBACK_PICKER

  return (
    <div className={styles.wrap}>
      <div className={styles.labelRow}>
        <span className={styles.label}>배경색 (선택)</span>
        <span className={styles.hint}>
          {selected || '없음 · 기본 동작'}
        </span>
      </div>
      <div
        className={styles.grid}
        role="listbox"
        aria-label="표지 배경색 선택"
      >
        <button
          type="button"
          role="option"
          aria-selected={noneActive}
          className={`${styles.none} ${noneActive ? styles.noneActive : ''}`}
          onClick={() => onChange('')}
          disabled={disabled}
          title="배경색 강제 없음"
        >
          없음
        </button>
        {COVER_BACKGROUND_COLORS.map((hex) => {
          const active = selected === hex
          return (
            <button
              key={hex}
              type="button"
              role="option"
              aria-selected={active}
              className={`${styles.swatch} ${active ? styles.swatchActive : ''}`}
              style={{ backgroundColor: hex }}
              onClick={() => onChange(hex)}
              disabled={disabled}
              title={hex}
              aria-label={`배경색 ${hex}`}
            />
          )
        })}
      </div>
      <div className={styles.customRow}>
        <label
          className={`${styles.colorWell} ${selected && !isPresetCoverBackgroundColor(selected) ? styles.colorWellActive : ''}`}
          htmlFor={colorInputId}
          title="색상 선택기"
        >
          <span
            className={styles.colorWellFace}
            style={{ backgroundColor: pickerValue }}
            aria-hidden
          />
          <input
            id={colorInputId}
            type="color"
            className={styles.colorInput}
            value={pickerValue}
            onChange={(e) => {
              const n = normalizeCoverBackgroundHex(e.target.value)
              if (n) onChange(n)
            }}
            disabled={disabled}
            aria-label="배경색 컬러 피커"
          />
        </label>
        <label className={styles.hexLabel} htmlFor={hexInputId}>
          <span className={styles.hexPrefix}>#</span>
          <input
            id={hexInputId}
            type="text"
            className={styles.hexInput}
            value={hexDraft.startsWith('#') ? hexDraft.slice(1) : hexDraft}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
              setHexDraft(raw ? `#${raw}` : '')
              const n = normalizeCoverBackgroundHex(raw)
              if (n) onChange(n)
            }}
            onBlur={() => commitHex(hexDraft)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitHex(hexDraft)
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            placeholder="rrggbb"
            spellCheck={false}
            autoComplete="off"
            maxLength={6}
            disabled={disabled}
            aria-label="배경색 헥스 코드"
            inputMode="text"
          />
        </label>
      </div>
    </div>
  )
}
