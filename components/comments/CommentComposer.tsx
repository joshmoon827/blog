'use client'

import type { FormEvent, KeyboardEvent } from 'react'
import JenyangNameField from '@/components/jenyang/JenyangNameField'
import styles from './CommentsSection.module.css'

type Labels = {
  commentPlaceholder: string
  namePlaceholder: string
  submitButton: string
  submittingButton: string
}

type Props = {
  body: string
  author: string
  submitting: boolean
  error: string
  labels: Labels
  onBodyChange: (value: string) => void
  onAuthorChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  onCmdEnter: (e: KeyboardEvent<HTMLTextAreaElement>) => void
}

/** Stable comment form tree for SSR + first client paint (textarea, then name row + submit). */
export default function CommentComposer({
  body,
  author,
  submitting,
  error,
  labels,
  onBodyChange,
  onAuthorChange,
  onSubmit,
  onCmdEnter,
}: Props) {
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <textarea
        className={styles.textarea}
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        onKeyDown={onCmdEnter}
        placeholder={labels.commentPlaceholder}
        maxLength={4000}
        required
        disabled={submitting}
      />
      <div className={styles.formActions}>
        <JenyangNameField
          value={author}
          onChange={onAuthorChange}
          placeholder={labels.namePlaceholder}
          maxLength={40}
          required
          disabled={submitting}
          inputClassName={styles.nameInput}
        />
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? labels.submittingButton : labels.submitButton}
        </button>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
