/**
 * Article create / edit / upload / login (authoring surface).
 *
 * - Local `next dev` (and localhost) → enabled (still requires login)
 * - Public deploy (joshlog.blog / Vercel production) → always disabled
 * - `NEXT_PUBLIC_AUTHORING=0` forces off everywhere
 */

function isLocalHostname(host: string | undefined | null): boolean {
  if (!host) return false
  const h = host.split(':')[0].toLowerCase()
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]'
}

function resolveHostname(explicit?: string | null): string | null {
  if (explicit != null && explicit !== '') return explicit
  if (typeof window !== 'undefined') return window.location.hostname
  return null
}

export function isAuthoringEnabled(hostname?: string | null): boolean {
  if (process.env.NEXT_PUBLIC_AUTHORING === '0') return false

  // Vercel production deployments: never expose login / write UI.
  if (process.env.VERCEL_ENV === 'production') return false

  const host = resolveHostname(hostname)
  const onLocalHost = isLocalHostname(host)

  // Any non-local production build (public domain) → off, even if AUTHORING=1.
  if (process.env.NODE_ENV === 'production' && !onLocalHost) return false

  if (process.env.NODE_ENV === 'development') return true
  if (onLocalHost) return true
  if (process.env.NEXT_PUBLIC_AUTHORING === '1') return true

  return false
}
