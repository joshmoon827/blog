/** Edge + Node safe session token helpers (no next/headers). */

export const AUTH_COOKIE = 'blog_session'

/** Max cookie age: ~400 days (common browser cap). */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 400

export const ADMIN_ID = 'admin'
export const ADMIN_PASSWORD = 'cloud1234'

export type SessionPayload = {
  sub: string
  exp: number
}

function secret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.GITHUB_IMAGE_UPLOAD_TOKEN?.trim() ||
    'blog-local-auth-dev-secret-change-me'
  )
}

function b64url(bytes: ArrayBuffer | Uint8Array | string): string {
  const u8 =
    typeof bytes === 'string'
      ? new TextEncoder().encode(bytes)
      : bytes instanceof Uint8Array
        ? bytes
        : new Uint8Array(bytes)
  let bin = ''
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]!)
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(bin)
      : Buffer.from(u8).toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  if (typeof atob !== 'undefined') {
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }
  return new Uint8Array(Buffer.from(b64, 'base64'))
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

async function hmacSign(body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return b64url(sig)
}

export function verifyCredentials(id: string, password: string): boolean {
  return (
    timingSafeEqualStr(id.trim(), ADMIN_ID) &&
    timingSafeEqualStr(password, ADMIN_PASSWORD)
  )
}

export async function createSessionToken(subject = ADMIN_ID): Promise<string> {
  const payload: SessionPayload = {
    sub: subject,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  }
  const body = b64url(JSON.stringify(payload))
  const sig = await hmacSign(body)
  return `${body}.${sig}`
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = await hmacSign(body)
  if (!timingSafeEqualStr(sig, expected)) return null
  try {
    const json = new TextDecoder().decode(fromB64url(body))
    const payload = JSON.parse(json) as SessionPayload
    if (!payload?.sub || typeof payload.exp !== 'number') return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}
