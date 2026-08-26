export const JENYANG_SUFFIX = '제냥이'

export type JenyangNickname = {
  id: string
  prefix: string
  displayName: string
}

function nick(id: string, prefix: string): JenyangNickname {
  return {
    id,
    prefix,
    displayName: `${prefix} ${JENYANG_SUFFIX}`,
  }
}

/** ~50 adjective-style prefixes; display name is always `${prefix} 제냥이`. */
export const JENYANG_NICKNAMES: readonly JenyangNickname[] = [
  nick('simsim', '심심한'),
  nick('angry', '화난'),
  nick('sad', '슬픈'),
  nick('bald', '대머리'),
  nick('sleepy', '졸린'),
  nick('hungry', '배고픈'),
  nick('drowsy', '몽롱한'),
  nick('chilly', '추운'),
  nick('shy', '수줍은'),
  nick('proud', '뿌듯한'),
  nick('tiny', '조그마한'),
  nick('giant', '거대한'),
  nick('sparkling', '반짝이는'),
  nick('rainy', '비오는'),
  nick('midnight', '한밤의'),
  nick('coffee', '커피향'),
  nick('happy', '행복한'),
  nick('excited', '신난'),
  nick('flustered', '당황한'),
  nick('curious', '궁금한'),
  nick('tired', '피곤한'),
  nick('fluttering', '설레는'),
  nick('laidback', '느긋한'),
  nick('quirky', '엉뚱한'),
  nick('cozy', '포근한'),
  nick('dreaming', '꿈꾸는'),
  nick('sleeper', '잠꾸러기'),
  nick('sunny', '해맑은'),
  nick('gloomy', '시무룩한'),
  nick('buzzing', '들뜬'),
  nick('full', '배부른'),
  nick('thirsty', '목마른'),
  nick('smiling', '웃는'),
  nick('frowning', '찡그린'),
  nick('nodding', '꾸벅꾸벅'),
  nick('shivering', '떨리는'),
  nick('starryeyed', '초롱초롱'),
  nick('cloudy', '흐린'),
  nick('windy', '바람부는'),
  nick('warm', '따뜻한'),
  nick('cool', '시원한'),
  nick('blushing', '발그레한'),
  nick('nyang', '냥냥한'),
  nick('round', '동글동글'),
  nick('fluffy', '복슬복슬'),
  nick('starlight', '별빛'),
  nick('moonlight', '달빛'),
  nick('morning', '아침의'),
  nick('drowsy-afternoon', '나른한'),
  nick('snackish', '간식찾는'),
] as const

export const DEFAULT_JENYANG: JenyangNickname = {
  id: 'default',
  prefix: '',
  displayName: JENYANG_SUFFIX,
}

const byId = new Map<string, JenyangNickname>(
  JENYANG_NICKNAMES.map((n) => [n.id, n]),
)
const byPrefix = new Map<string, JenyangNickname>(
  JENYANG_NICKNAMES.map((n) => [n.prefix, n]),
)
const byDisplay = new Map<string, JenyangNickname>(
  JENYANG_NICKNAMES.map((n) => [n.displayName, n]),
)

export function getJenyangById(id: string): JenyangNickname | undefined {
  if (id === DEFAULT_JENYANG.id) return DEFAULT_JENYANG
  return byId.get(id)
}

export function getJenyangByPrefix(prefix: string): JenyangNickname | undefined {
  return byPrefix.get(prefix.trim())
}

/** Resolve a typed name to a known nickname, else the default 제냥이 face. */
export function resolveJenyangFromName(name: string): JenyangNickname {
  const trimmed = name.trim()
  if (!trimmed) return DEFAULT_JENYANG

  const exactDisplay = byDisplay.get(trimmed)
  if (exactDisplay) return exactDisplay

  const suffix = ` ${JENYANG_SUFFIX}`
  if (trimmed === JENYANG_SUFFIX) return DEFAULT_JENYANG
  if (trimmed.endsWith(suffix)) {
    const prefix = trimmed.slice(0, -suffix.length).trim()
    const found = byPrefix.get(prefix)
    if (found) return found
  }

  const prefixOnly = byPrefix.get(trimmed)
  if (prefixOnly) return prefixOnly

  return DEFAULT_JENYANG
}

export function randomJenyangNickname(
  exceptId?: string | null,
): JenyangNickname {
  const pool =
    exceptId == null
      ? JENYANG_NICKNAMES
      : JENYANG_NICKNAMES.filter((n) => n.id !== exceptId)
  const list = pool.length > 0 ? pool : JENYANG_NICKNAMES
  const index = Math.floor(Math.random() * list.length)
  return list[index] ?? JENYANG_NICKNAMES[0]
}

/** Old comment default like "제냥이 123" — replace with a random adjective name. */
export function isLegacyJenyangAuthor(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return true
  if (trimmed === JENYANG_SUFFIX) return true
  return /^제냥이\s*\d+$/.test(trimmed)
}
