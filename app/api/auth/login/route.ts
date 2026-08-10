import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyCredentials,
} from '@/lib/auth-session'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'

export async function POST(req: NextRequest) {
  if (!isAuthoringEnabled(req.nextUrl.hostname)) {
    return NextResponse.json({ error: 'Login disabled' }, { status: 403 })
  }
  try {
    const body = (await req.json()) as { id?: string; password?: string }
    const id = (body.id || '').trim()
    const password = body.password || ''
    if (!verifyCredentials(id, password)) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      )
    }
    const token = await createSessionToken(id)
    const res = NextResponse.json({ ok: true, user: { id } })
    res.cookies.set(AUTH_COOKIE, token, sessionCookieOptions())
    return res
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
