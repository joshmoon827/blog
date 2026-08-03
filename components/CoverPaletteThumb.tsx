import styles from './CoverPaletteThumb.module.css'

type Props = {
  colors: string[]
  label?: string
}

/** 2×2 color grid that fills the stock-cover picker box. */
export default function CoverPaletteThumb({ colors, label }: Props) {
  const swatches = [...colors]
  while (swatches.length < 4) {
    swatches.push(swatches[swatches.length - 1] || '#666')
  }
  return (
    <div className={styles.palette} role="img" aria-label={label || 'color palette'}>
      {swatches.slice(0, 4).map((hex, i) => (
        <span
          key={`${hex}-${i}`}
          className={styles.swatch}
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  )
}
