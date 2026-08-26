'use client'

import { useId } from 'react'
import JenyangAvatar from './JenyangAvatar'
import {
  randomJenyangNickname,
  resolveJenyangFromName,
} from '@/lib/jenyangNicknames'
import styles from './jenyang.module.css'

type Props = {
  value: string
  onChange: (name: string) => void
  placeholder?: string
  maxLength?: number
  required?: boolean
  disabled?: boolean
  autoComplete?: string
  inputClassName?: string
}

export default function JenyangNameField({
  value,
  onChange,
  placeholder = '이름',
  maxLength = 40,
  required,
  disabled,
  autoComplete = 'nickname',
  inputClassName,
}: Props) {
  const inputId = useId()
  const nick = resolveJenyangFromName(value)

  function reroll() {
    const next = randomJenyangNickname(nick.id === 'default' ? null : nick.id)
    onChange(next.displayName)
  }

  return (
    <div className={styles.row}>
      <JenyangAvatar
        name={value}
        size={28}
        className={styles.avatar}
        title={nick.displayName}
      />
      <input
        id={inputId}
        className={inputClassName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-label={placeholder}
      />
      <button
        type="button"
        className={styles.randomBtn}
        onClick={reroll}
        disabled={disabled}
        aria-label="랜덤 닉네임"
        title="랜덤"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M2 3.5h4.2L8 5.8 9.8 3.5H14v2.2h-2.6L9.2 8l2.2 2.3H14V12.5H9.8L8 10.2 6.2 12.5H2v-2.2h2.6L6.8 8 4.6 5.7H2z"
            fill="currentColor"
          />
        </svg>
        랜덤
      </button>
    </div>
  )
}
