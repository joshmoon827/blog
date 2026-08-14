'use client'

import {
  mosaicHeightCss,
  polygonCss,
  resolveMosaicLayout,
  type MosaicPreset,
} from '@/lib/mosaicPattern'
import styles from './MosaicRecyclePresets.module.css'

type Props = {
  presets: MosaicPreset[]
  activeId?: string | null
  onApply: (preset: MosaicPreset) => void
  onDelete: (id: string) => void
  disabled?: boolean
}

function PresetThumb({ preset }: { preset: MosaicPreset }) {
  const pattern = preset.pattern
  const layout = resolveMosaicLayout(pattern)
  const free = pattern.layout === 'free'
  const height = mosaicHeightCss(pattern.aspectRatio, 320, 'cqw')

  if (free) {
    return (
      <div
        className={styles.thumb}
        style={{
          width: '100%',
          height,
          gridTemplateColumns: '1fr',
        }}
      >
        <div className={styles.thumbCell}>
          {pattern.pieces.map((piece) => (
            <span
              key={piece.id}
              className={styles.thumbShard}
              style={{
                clipPath: polygonCss(piece.points),
                zIndex: piece.zIndex ?? 1,
                background: `hsl(${(piece.slot * 57) % 360} 42% 58%)`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  const byColumn = new Map<number, typeof pattern.pieces>()
  for (const piece of pattern.pieces) {
    const list = byColumn.get(piece.column) ?? []
    list.push(piece)
    byColumn.set(piece.column, list)
  }

  return (
    <div
      className={styles.thumb}
      style={{
        width: `${layout.widthPercent}%`,
        maxWidth: '100%',
        marginInline: 'auto',
        height,
        gridTemplateColumns: layout.gridTemplateColumns,
        columnGap: `${layout.columnGapPercent}%`,
      }}
    >
      {pattern.columns.map((_, colIdx) => (
        <div key={`${preset.id}-c-${colIdx}`} className={styles.thumbCell}>
          {(byColumn.get(colIdx) ?? []).map((piece) => (
            <span
              key={piece.id}
              className={
                piece.overlay || (byColumn.get(colIdx)?.length ?? 0) > 1
                  ? styles.thumbShard
                  : styles.thumbShardFill
              }
              style={{
                clipPath: polygonCss(piece.points),
                zIndex: piece.zIndex ?? 1,
                background: `hsl(${(piece.slot * 57) % 360} 42% 58%)`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function MosaicRecyclePresets({
  presets,
  activeId,
  onApply,
  onDelete,
  disabled,
}: Props) {
  return (
    <section className={styles.section} aria-labelledby="mosaic-recycle-heading">
      <div className={styles.head}>
        <h2 id="mosaic-recycle-heading" className={styles.title}>
          재활용 패턴
        </h2>
        <p className={styles.sub}>
          저장 옆 재활용으로 현재 모양을 보관해 두고, 아래에서 클릭하면 바로
          적용됩니다.
        </p>
      </div>

      {!presets.length ? (
        <p className={styles.empty}>아직 재활용 패턴이 없습니다.</p>
      ) : (
        <ul className={styles.grid}>
          {presets.map((preset) => (
            <li key={preset.id}>
              <div
                className={`${styles.card} ${activeId === preset.id ? styles.cardActive : ''}`}
              >
                <button
                  type="button"
                  className={styles.previewBtn}
                  onClick={() => onApply(preset)}
                  disabled={disabled}
                  title="이 패턴 적용"
                >
                  <PresetThumb preset={preset} />
                  <span className={styles.cardMeta}>
                    <strong>{preset.name}</strong>
                    <span>
                      {preset.pattern.layout === 'free' ? '자유 캔버스' : '열 분할'}
                      {' · '}
                      조각 {preset.pattern.pieces.length}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => onDelete(preset.id)}
                  disabled={disabled}
                  title="재활용 목록에서 삭제"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
