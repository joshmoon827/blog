/**
 * Article create / edit / upload (authoring surface).
 *
 * - `next dev` / localhost → enabled (still requires login)
 * - production deploy → disabled (no UI, APIs rejected)
 * - Override: `NEXT_PUBLIC_AUTHORING=1` or `=0`
 */
export function isAuthoringEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_AUTHORING === '1') return true
  if (process.env.NEXT_PUBLIC_AUTHORING === '0') return false
  if (process.env.NODE_ENV === 'development') return true
  // Local browser hosts even if a production build is served on localhost.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      return true
    }
  }
  return false
}
