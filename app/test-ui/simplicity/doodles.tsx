type DoodleName =
  | 'globe'
  | 'slide'
  | 'spatula'
  | 'cone'
  | 'glasses'
  | 'pencil'
  | 'coffee'
  | 'funnel'
  | 'puzzle'
  | 'knot'
  | 'thought'
  | 'hat'
  | 'eyes'
  | 'play'

export type { DoodleName }

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function Doodle({ name, className }: { name: DoodleName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden>
      {name === 'globe' && (
        <g {...stroke}>
          <circle cx="58" cy="58" r="28" />
          <ellipse cx="58" cy="58" rx="12" ry="28" />
          <path d="M30 58h56M38 42h40M38 74h40" />
          <path d="M72 86c8 6 18 8 28 4" />
          <text
            x="58"
            y="64"
            textAnchor="middle"
            fill="currentColor"
            stroke="none"
            fontSize="11"
            fontWeight="700"
            fontFamily="inherit"
          >
            USS
          </text>
        </g>
      )}
      {name === 'slide' && (
        <g {...stroke}>
          <path d="M28 28h18v52H28z" />
          <path d="M46 32l52 38" />
          <path d="M46 80h52" />
          <circle cx="86" cy="86" r="6" />
          <path d="M34 22v6M40 22v6" />
        </g>
      )}
      {name === 'spatula' && (
        <g {...stroke}>
          <path d="M74 22c8 8 10 20 4 30L48 82" />
          <path d="M42 76l12 12" />
          <path d="M70 28c12-4 22 6 18 16" />
          <path d="M38 88c-8 10-4 18 8 16" />
          <path d="M86 40c8-2 16 6 12 14" opacity="0.7" />
        </g>
      )}
      {name === 'cone' && (
        <g {...stroke}>
          <path d="M60 28l22 64H38z" />
          <path d="M48 62h24M52 48h16" />
          <path d="M78 34c10-8 22-2 18 10" />
          <circle cx="94" cy="28" r="8" />
          <path d="M91 26h.5M97 26h.5M94 32v1" />
        </g>
      )}
      {name === 'glasses' && (
        <g {...stroke}>
          <circle cx="38" cy="58" r="18" />
          <circle cx="82" cy="58" r="18" />
          <path d="M56 58h8" />
          <path d="M20 54c-6-2-10 2-12 8M100 54c6-2 10 2 12 8" />
          <circle cx="34" cy="54" r="3" fill="currentColor" stroke="none" />
          <circle cx="78" cy="54" r="3" fill="currentColor" stroke="none" />
        </g>
      )}
      {name === 'pencil' && (
        <g {...stroke}>
          <path d="M34 86l52-52 12 12-52 52-16 4z" />
          <path d="M78 42l12 12" />
          <path d="M40 80l8 8" />
          <path d="M28 96c12 8 28 4 36-8" opacity="0.7" />
        </g>
      )}
      {name === 'coffee' && (
        <g {...stroke}>
          <path d="M34 44h44v28a18 18 0 0 1-18 18h-8A18 18 0 0 1 34 72V44z" />
          <path d="M78 52h10a10 10 0 0 1 0 20H78" />
          <path d="M28 92h56" />
          <path d="M48 28c0 8-8 8-8 16M62 26c0 10-10 8-8 18" />
        </g>
      )}
      {name === 'funnel' && (
        <g {...stroke}>
          <path d="M28 28h64L72 58v28l-12 8-12-8V58z" />
          <circle cx="44" cy="40" r="5" />
          <circle cx="62" cy="36" r="4" />
          <circle cx="54" cy="48" r="3.5" />
        </g>
      )}
      {name === 'puzzle' && (
        <g {...stroke}>
          <path d="M28 40h22c0-8 12-8 12 0h22v22c8 0 8 12 0 12v22H62c0 8-12 8-12 0H28V74c-8 0-8-12 0-12z" />
        </g>
      )}
      {name === 'knot' && (
        <g {...stroke} strokeWidth={3}>
          <path d="M28 62c8-22 28-28 36-8 8 22-8 36-22 24-12-10 2-28 18-22 18 8 14 34-4 40-22 8-36-18-22-32 10-10 28-2 28 12" />
        </g>
      )}
      {name === 'thought' && (
        <g {...stroke}>
          <circle cx="64" cy="44" r="22" />
          <circle cx="44" cy="72" r="8" />
          <circle cx="34" cy="86" r="4" />
          <path d="M54 38h.5M70 38h.5M62 50v1" />
        </g>
      )}
      {name === 'hat' && (
        <g {...stroke}>
          <path d="M28 70c8-28 56-28 64 0" />
          <path d="M22 70h76" />
          <path d="M48 42c4-10 20-10 24 0" />
          <circle cx="78" cy="36" r="10" opacity="0.8" />
          <circle cx="92" cy="48" r="6" opacity="0.6" />
        </g>
      )}
      {name === 'eyes' && (
        <g {...stroke}>
          <ellipse cx="40" cy="60" rx="20" ry="16" />
          <ellipse cx="80" cy="60" rx="20" ry="16" />
          <circle cx="44" cy="62" r="5" fill="currentColor" />
          <circle cx="84" cy="62" r="5" fill="currentColor" />
        </g>
      )}
      {name === 'play' && (
        <g {...stroke}>
          <circle cx="60" cy="60" r="28" />
          <path d="M50 44l28 16-28 16z" fill="currentColor" stroke="none" />
        </g>
      )}
    </svg>
  )
}
