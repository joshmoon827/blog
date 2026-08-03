import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import {
  AUTH_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyCredentials,
  verifySessionToken,
  type SessionPayload,
} from '@/lib/auth-session'

export {
  AUTH_COOKIE,
  SESSION_MAX_AGE_SEC,
  ADMIN_ID,
  createSessionToken,
  sessionCookieOptions,
  verifyCredentials,
  verifySessionToken,
} from '@/lib/auth-session'

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const jar = await cookies()
  return verifySessionToken(jar.get(AUTH_COOKIE)?.value)
}

export async function getSessionFromRequest(
  req: NextRequest,
): Promise<SessionPayload | null> {
  return verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value)
}

export async function isAuthedRequest(req: NextRequest): Promise<boolean> {
  return Boolean(await getSessionFromRequest(req))
}
