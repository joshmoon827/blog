/**
 * Normalize TeX delimiters for article view + Muya editor.
 *
 * - Trims spaces/tabs immediately inside `$$ … $$` (Obsidian / paste quirks)
 * - Turns single-line display math into Muya block form:
 *   `$$ P ... $$` → `$$\nP ...\n$$`
 *   (Muya only treats multiline `$$\n...\n$$` as math-block; one-liners are inlineMath.)
 *
 * Note: in `String.replace` replacement strings, `$$` means a single `$` —
 * always use a function replacer when emitting `$$`.
 */
export function normalizeMathMarkdown(source: string): string {
  const dollars = () => '$$'

  // Trim spaces/tabs right after opening $$ and right before closing $$
  // (do not use \s — that would eat fence newlines)
  let out = source
    .replace(/\$\$[ \t]+/g, dollars)
    .replace(/[ \t]+\$\$/g, dollars)

  out = out.replace(
    /(^|\n)\$\$([^\n]+?)\$\$(?=\n|$)/g,
    (_m, pre: string, body: string) => {
      const tex = body.trim()
      if (!tex) return `${pre}$$\n\n$$`
      return `${pre}$$\n${tex}\n$$`
    },
  )

  return out
}
