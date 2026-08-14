/**
 * Split markdown on Obsidian column comments:
 *
 *   %% col-start %%
 *   %% col-break %% | %% col-break:38 %% | %% col-break:b:primary %%
 *   ...
 *   %% col-end %%
 */

import type { CSSProperties } from 'react'

export type ColumnSpec = {
  /** Raw specifier after `col-break:` (e.g. "38", "b:primary"), or null. */
  spec: string | null
  text: string
}

export type BodySegment =
  | { type: 'markdown'; text: string }
  | { type: 'columns'; columns: ColumnSpec[] }

const COL_TOKEN =
  /%%\s*(col-start|col-end|col-break(?::([^\s%]+))?)\s*%%/gi

function pushMarkdown(out: BodySegment[], text: string) {
  if (!text.trim()) return
  out.push({ type: 'markdown', text })
}

/**
 * Map a col-break specifier to CSS flex/basis for the column.
 * - number → percent width (e.g. 38 → 38%)
 * - b:primary → slightly wider flex grow
 * - empty / other → equal flex
 */
export function columnStyle(spec: string | null): CSSProperties {
  if (!spec) return { flex: '1 1 0' }
  const pct = Number(spec)
  if (Number.isFinite(pct) && pct > 0 && pct <= 100) {
    return { flex: `${pct} 1 0`, minWidth: 0 }
  }
  if (/^b:primary$/i.test(spec)) {
    return { flex: '1.35 1 0', minWidth: 0 }
  }
  return { flex: '1 1 0', minWidth: 0 }
}

/** Split source into markdown and column-layout segments. */
export function splitObsidianColumns(source: string): BodySegment[] {
  const text = source.replace(/\r\n/g, '\n')
  const out: BodySegment[] = []
  let cursor = 0
  let inColumns = false
  let columns: ColumnSpec[] = []
  let colStart = 0
  /** True after a col-break opened a column (spec may still be null). */
  let pendingOpen = false
  let pendingSpec: string | null = null

  COL_TOKEN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = COL_TOKEN.exec(text)) !== null) {
    const kindRaw = match[1]
    const kind = kindRaw.toLowerCase().startsWith('col-break')
      ? 'col-break'
      : kindRaw.toLowerCase()
    const spec = match[2] ?? null
    const tokenStart = match.index
    const tokenEnd = match.index + match[0].length

    if (kind === 'col-start') {
      if (!inColumns) {
        pushMarkdown(out, text.slice(cursor, tokenStart))
        inColumns = true
        columns = []
        pendingOpen = false
        pendingSpec = null
        colStart = tokenEnd
      }
      continue
    }

    if (!inColumns) {
      continue
    }

    if (kind === 'col-break') {
      const chunk = text.slice(colStart, tokenStart)
      if (pendingOpen) {
        columns.push({ spec: pendingSpec, text: chunk })
      }
      pendingOpen = true
      pendingSpec = spec
      colStart = tokenEnd
      continue
    }

    if (kind === 'col-end') {
      const chunk = text.slice(colStart, tokenStart)
      if (pendingOpen) {
        columns.push({ spec: pendingSpec, text: chunk })
      } else if (chunk.trim()) {
        columns.push({ spec: null, text: chunk })
      }
      if (columns.length) {
        out.push({ type: 'columns', columns })
      }
      inColumns = false
      columns = []
      pendingOpen = false
      pendingSpec = null
      cursor = tokenEnd
      continue
    }
  }

  if (inColumns) {
    pushMarkdown(out, text.slice(cursor))
  } else {
    pushMarkdown(out, text.slice(cursor))
  }

  return out.length ? out : [{ type: 'markdown', text }]
}
