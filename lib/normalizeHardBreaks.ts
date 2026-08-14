/**
 * Convert HTML `<br>` (paste / rich editors) into markdown hard line breaks
 * so read mode renders them. Skips fenced code blocks.
 */
export function normalizeHardBreaks(source: string): string {
  if (!source || !/<br\s*\/?>/i.test(source)) return source

  const parts = source.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
  return parts
    .map((part, i) => {
      // odd indexes are fenced code (captured groups alternate if we use capturing split)
      if (i % 2 === 1 && /^(```|~~~)/.test(part)) return part
      return part.replace(/<br\s*\/?>/gi, '  \n')
    })
    .join('')
}
