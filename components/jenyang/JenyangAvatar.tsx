import { useId } from 'react'
import {
  DEFAULT_FACE,
  JENYANG_FACE_SPECS,
  type ExtraStyle,
  type EyeStyle,
  type FaceSpec,
  type HairStyle,
  type MouthStyle,
} from '@/lib/jenyangAvatarSpecs'
import { resolveJenyangFromName } from '@/lib/jenyangNicknames'

function hairPaths(style: HairStyle, fill: string) {
  switch (style) {
    case 'none':
      return null
    case 'short':
      return (
        <path
          d="M16 28c2-12 10-18 16-18s14 6 16 18H16z"
          fill={fill}
        />
      )
    case 'tuft':
      return (
        <>
          <path d="M18 30c1-11 9-17 14-17 6 0 13 6 14 17H18z" fill={fill} />
          <path d="M30 10c2-6 8-7 10-2 1 3-2 6-6 7-4 1-6-1-4-5z" fill={fill} />
        </>
      )
    case 'tiny-tuft':
      return (
        <>
          <path d="M20 32c1-8 8-13 12-13s11 5 12 13H20z" fill={fill} />
          <ellipse cx="32" cy="16" rx="4" ry="5" fill={fill} />
        </>
      )
    case 'fluffy':
      return (
        <>
          <circle cx="20" cy="20" r="9" fill={fill} />
          <circle cx="32" cy="16" r="11" fill={fill} />
          <circle cx="44" cy="20" r="9" fill={fill} />
          <circle cx="26" cy="24" r="8" fill={fill} />
          <circle cx="38" cy="24" r="8" fill={fill} />
        </>
      )
    case 'spiky':
      return (
        <path
          d="M14 30 20 10l6 16 6-18 6 18 6-14 6 16H14z"
          fill={fill}
        />
      )
    case 'side':
      return (
        <>
          <path d="M17 30c1-12 9-18 15-18 7 0 14 7 15 18H17z" fill={fill} />
          <path d="M44 22c6 4 10 10 8 16-4-2-8-8-8-16z" fill={fill} />
        </>
      )
    case 'bowl':
      return <path d="M14 32c1-14 10-20 18-20s17 6 18 20H14z" fill={fill} />
    case 'pigtails':
      return (
        <>
          <path d="M18 30c1-11 9-17 14-17s13 6 14 17H18z" fill={fill} />
          <circle cx="12" cy="36" r="6" fill={fill} />
          <circle cx="52" cy="36" r="6" fill={fill} />
        </>
      )
    case 'messy':
      return (
        <path
          d="M13 31c2-10 6-16 12-18 3 4 6-6 8-2 3-5 8 1 9-2 4 3 8 10 9 22H13z"
          fill={fill}
        />
      )
    case 'slick':
      return (
        <path d="M16 28c3-13 12-16 16-16s13 3 16 16c-4-6-10-8-16-8s-12 2-16 8z" fill={fill} />
      )
    case 'beanie':
      return (
        <>
          <path d="M15 28c2-12 10-16 17-16s15 4 17 16H15z" fill={fill} />
          <rect x="14" y="26" width="36" height="6" rx="2" fill={fill} />
          <circle cx="32" cy="12" r="3.5" fill={fill} />
        </>
      )
    case 'ears':
      return (
        <>
          <path d="M16 28c2-10 10-16 16-16s14 6 16 16H16z" fill={fill} />
          <path d="M16 22 10 8l14 10z" fill={fill} />
          <path d="M48 22 54 8 40 18z" fill={fill} />
        </>
      )
    default:
      return null
  }
}

function eyes(style: EyeStyle, accent: string) {
  const ink = '#2a2430'
  switch (style) {
    case 'round':
      return (
        <>
          <circle cx="24" cy="34" r="3.2" fill={ink} />
          <circle cx="40" cy="34" r="3.2" fill={ink} />
          <circle cx="25.2" cy="32.8" r="1" fill="#fff" />
          <circle cx="41.2" cy="32.8" r="1" fill="#fff" />
        </>
      )
    case 'sleepy':
      return (
        <>
          <path d="M20 35c2-3 6-3 8 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M36 35c2-3 6-3 8 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )
    case 'angry':
      return (
        <>
          <path d="M19 30l10 4" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M45 30l-10 4" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="24" cy="36" r="2.6" fill={ink} />
          <circle cx="40" cy="36" r="2.6" fill={ink} />
        </>
      )
    case 'sparkle':
      return (
        <>
          <circle cx="24" cy="34" r="4" fill={ink} />
          <circle cx="40" cy="34" r="4" fill={ink} />
          <path d="M24 28v4M22 30h4" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M40 28v4M38 30h4" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="25.4" cy="32.6" r="1.1" fill="#fff" />
          <circle cx="41.4" cy="32.6" r="1.1" fill="#fff" />
        </>
      )
    case 'closed':
      return (
        <>
          <path d="M20 35c3 3 7 3 10 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M34 35c3 3 7 3 10 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )
    case 'wide':
      return (
        <>
          <ellipse cx="24" cy="34" rx="4.4" ry="5" fill="#fff" stroke={ink} strokeWidth="1.6" />
          <ellipse cx="40" cy="34" rx="4.4" ry="5" fill="#fff" stroke={ink} strokeWidth="1.6" />
          <circle cx="24" cy="35" r="2.1" fill={ink} />
          <circle cx="40" cy="35" r="2.1" fill={ink} />
        </>
      )
    case 'dot':
      return (
        <>
          <circle cx="24" cy="34" r="2.1" fill={ink} />
          <circle cx="40" cy="34" r="2.1" fill={ink} />
        </>
      )
    case 'wink':
      return (
        <>
          <circle cx="24" cy="34" r="3.2" fill={ink} />
          <circle cx="25.2" cy="32.8" r="1" fill="#fff" />
          <path d="M36 35c2-3 6-3 8 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )
    case 'heart':
      return (
        <>
          <path
            d="M24 37c-3.5-3-6-1-6 1.2C18 41 24 43 24 43s6-2 6-4.8c0-2.2-2.5-4.2-6-1.2z"
            fill={accent}
          />
          <path
            d="M40 37c-3.5-3-6-1-6 1.2C34 41 40 43 40 43s6-2 6-4.8c0-2.2-2.5-4.2-6-1.2z"
            fill={accent}
          />
        </>
      )
    default:
      return null
  }
}

function brows(style: FaceSpec['brows'], ink = '#2a2430') {
  switch (style) {
    case 'angry':
      return (
        <>
          <path d="M18 27l10 4" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M46 27l-10 4" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
        </>
      )
    case 'sad':
      return (
        <>
          <path d="M18 30l10-4" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M46 30l-10-4" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
        </>
      )
    case 'raised':
      return (
        <>
          <path d="M18 28c3-3 8-3 11 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M35 27c3-2 8-2 11 1" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )
    case 'flat':
      return (
        <>
          <path d="M19 29h10" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M35 29h10" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
        </>
      )
    case 'curious':
      return (
        <>
          <path d="M19 29h9" stroke={ink} strokeWidth="2" strokeLinecap="round" />
          <path d="M36 26c3-2 8-1 10 2" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )
    default:
      return null
  }
}

function mouth(style: MouthStyle, ink = '#2a2430') {
  switch (style) {
    case 'smile':
      return (
        <path d="M26 46c3 4 9 4 12 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
      )
    case 'frown':
      return (
        <path d="M26 49c3-4 9-4 12 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
      )
    case 'flat':
      return <path d="M27 47h10" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    case 'open':
      return <ellipse cx="32" cy="47" rx="4.5" ry="3.4" fill={ink} />
    case 'wavy':
      return (
        <path
          d="M25 47c2-2 4 2 6 0s4 2 6 0 4 2 4 0"
          stroke={ink}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )
    case 'tiny':
      return <circle cx="32" cy="47" r="1.4" fill={ink} />
    case 'grin':
      return (
        <>
          <path d="M24 45c4 6 12 6 16 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M27 46h10" stroke="#fff" strokeWidth="1.4" opacity="0.7" />
        </>
      )
    case 'o':
      return <ellipse cx="32" cy="47" rx="3.2" ry="3.8" fill="none" stroke={ink} strokeWidth="2" />
    case 'tongue':
      return (
        <>
          <path d="M26 45c3 5 9 5 12 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cx="35" cy="48" rx="2.4" ry="2" fill="#e07090" />
        </>
      )
    default:
      return null
  }
}

function extraLayer(style: ExtraStyle, accent: string) {
  switch (style) {
    case 'tears':
      return (
        <>
          <path d="M20 38c0 4-3 7-3 7" stroke="#6b8ecf" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M44 38c0 4 3 7 3 7" stroke="#6b8ecf" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )
    case 'blush':
      return (
        <>
          <ellipse cx="18" cy="40" rx="5" ry="2.4" fill={accent} opacity="0.7" />
          <ellipse cx="46" cy="40" rx="5" ry="2.4" fill={accent} opacity="0.7" />
        </>
      )
    case 'steam':
      return (
        <>
          <path d="M12 18c3-4 1-7 4-10" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M52 18c-3-4-1-7-4-10" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )
    case 'rain':
      return (
        <>
          <path d="M14 14l-2 6M22 10l-2 6M42 10l2 6M50 14l2 6" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
        </>
      )
    case 'stars':
      return (
        <>
          <path d="M12 16l1.2 2.6L16 20l-2.8 1.1L12 24l-1.2-2.9L8 20l2.8-1.4z" fill={accent} />
          <path d="M50 14l1 2.2L53.4 17l-2.4.9L50 21l-1-2.4L46.6 17l2.4-1.2z" fill={accent} />
        </>
      )
    case 'zzz':
      return (
        <text x="44" y="16" fontSize="9" fontWeight="700" fill={accent} fontFamily="sans-serif">
          z
        </text>
      )
    case 'coffee':
      return (
        <>
          <rect x="46" y="40" width="10" height="8" rx="1.5" fill={accent} />
          <path d="M56 42h3c1.5 0 2 2 2 3s-.5 3-2 3h-3" fill="none" stroke={accent} strokeWidth="1.6" />
          <path d="M49 36c1-2 3-2 4 0" stroke="#c8b8a8" strokeWidth="1.4" fill="none" />
        </>
      )
    case 'sparkles':
      return (
        <>
          <path d="M10 24v6M7 27h6" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M54 20v6M51 23h6" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )
    case 'cloud':
      return (
        <>
          <ellipse cx="16" cy="14" rx="7" ry="4" fill={accent} />
          <ellipse cx="22" cy="14" rx="5" ry="3.5" fill={accent} />
        </>
      )
    case 'moon':
      return (
        <path d="M50 16a7 7 0 1 1-8 9 6 6 0 1 0 8-9z" fill={accent} />
      )
    case 'sun':
      return (
        <>
          <circle cx="50" cy="14" r="4.5" fill={accent} />
          <path
            d="M50 6v2.5M50 19.5V22M42 14h2.5M55.5 14H58M44.4 8.4l1.8 1.8M53.8 17.8l1.8 1.8M44.4 19.6l1.8-1.8M53.8 10.2l1.8-1.8"
            stroke={accent}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      )
    case 'hearts':
      return (
        <path
          d="M50 16c-2.4-2-4-0.6-4 1C46 19.2 50 21 50 21s4-1.8 4-4c0-1.6-1.6-3-4-1z"
          fill={accent}
        />
      )
    case 'sweat':
      return (
        <path d="M12 22c0 4 4 6 4 6s-1-4 0-7c-2 0-4 0-4 1z" fill={accent} />
      )
    case 'scarf':
      return (
        <>
          <path d="M18 48c5 6 23 6 28 0-4 4-8 8-10 12-2-4-8-8-18-12z" fill={accent} />
          <rect x="22" y="46" width="20" height="5" rx="2" fill={accent} />
        </>
      )
    case 'glasses':
      return (
        <>
          <circle cx="24" cy="34" r="6" fill="none" stroke={accent} strokeWidth="1.8" />
          <circle cx="40" cy="34" r="6" fill="none" stroke={accent} strokeWidth="1.8" />
          <path d="M30 34h4" stroke={accent} strokeWidth="1.8" />
        </>
      )
    case 'snack':
      return (
        <path d="M46 42 58 36l2 4-10 8z" fill={accent} />
      )
    case 'wind':
      return (
        <>
          <path d="M8 22c8 0 10 4 18 4" stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M10 28c7 0 9 3 16 3" stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      )
    case 'drool':
      return (
        <path d="M36 50c0 4 2 7 2 7" stroke="#7ec8e0" strokeWidth="2" fill="none" strokeLinecap="round" />
      )
    default:
      return null
  }
}

function Face({ spec }: { spec: FaceSpec }) {
  const s = spec.scale ?? 1
  const ox = 32 - 32 * s
  const oy = 32 - 32 * s
  return (
    <g transform={`translate(${ox} ${oy}) scale(${s})`}>
      <circle cx="32" cy="36" r="20" fill={spec.skin} />
      {hairPaths(spec.hairStyle, spec.hair)}
      {spec.hairStyle === 'ears' ? (
        <>
          <path d="M18 20 14 12l8 6z" fill="#f0b8c8" />
          <path d="M46 20 50 12l-8 6z" fill="#f0b8c8" />
        </>
      ) : null}
      {spec.hairStyle === 'none' ? (
        <ellipse cx="32" cy="22" rx="16" ry="8" fill={spec.skin} />
      ) : null}
      {brows(spec.brows)}
      {eyes(spec.eyes, spec.accent)}
      {mouth(spec.mouth)}
      {extraLayer(spec.extra, spec.accent)}
    </g>
  )
}

export default function JenyangAvatar({
  name,
  nicknameId,
  size = 40,
  className,
  title,
}: {
  name?: string
  nicknameId?: string
  size?: number
  className?: string
  title?: string
}) {
  const clipUid = useId().replace(/:/g, '')
  const id =
    nicknameId ??
    (name != null ? resolveJenyangFromName(name).id : 'default')
  const spec = id === 'default' ? DEFAULT_FACE : (JENYANG_FACE_SPECS[id] ?? DEFAULT_FACE)
  const label = title ?? name ?? '제냥이'
  const clipId = `jenyang-clip-${clipUid}`

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="32" fill={spec.accent} opacity="0.35" />
      <g clipPath={`url(#${clipId})`}>
        <circle cx="32" cy="32" r="32" fill={spec.accent} opacity="0.22" />
        <Face spec={spec} />
      </g>
      <circle
        cx="32"
        cy="32"
        r="31"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="2"
      />
    </svg>
  )
}
