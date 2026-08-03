/**
 * Local authoring tools (CDP cover gen, Obsidian vault import).
 *
 * - `next dev` → enabled
 * - production → disabled unless `NEXT_PUBLIC_LOCAL_TOOLS=1`
 */
export function isLocalToolsEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_LOCAL_TOOLS === '1') return true
  if (process.env.NEXT_PUBLIC_LOCAL_TOOLS === '0') return false
  return process.env.NODE_ENV === 'development'
}
