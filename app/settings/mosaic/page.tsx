import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import { mosaicSlotCount } from '@/lib/mosaicPattern'
import {
  readMosaicPattern,
  readMosaicPresets,
} from '@/lib/mosaicPattern.server'
import { getSeriesPreviewItems } from '@/lib/seriesItems'
import MosaicEditor from './MosaicEditor'
import styles from '../settings.module.css'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = {
  title: '모자이크 패턴 | josh log',
}

export default async function MosaicSettingsPage() {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host')
  if (!isAuthoringEnabled(host)) {
    redirect('/')
  }

  const pattern = readMosaicPattern()
  const presets = readMosaicPresets()
  const previewItems = getSeriesPreviewItems(mosaicSlotCount(pattern))

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <Link href="/settings">← 설정</Link>
          {' · '}
          <Link href="/">Articles</Link>
        </p>
        <h1 className={styles.title}>모자이크 패턴</h1>
        <p className={styles.sub}>
          홈 상단 카테고리 조각의 clip-path 좌표와 열 너비를 수정합니다. 점을
          드래그하거나 숫자로 편집한 뒤 저장하세요.
        </p>
      </section>
      <MosaicEditor
        initialPattern={pattern}
        initialPresets={presets}
        previewItems={previewItems}
      />
    </>
  )
}
