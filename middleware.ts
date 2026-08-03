import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, verifySessionToken } from '@/lib/auth-session'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'

const PROTECTED_PAGE_PREFIXES = ['/articles/new', '/newrite']

const PROTECTED_API_MUTATION_PREFIXES = [
  '/api/articles',
  '/api/upload-image',
  '/api/generate-cover',
  '/api/obsidian',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  const isProtectedApiMutation =
    req.method !== 'GET' &&
    req.method !== 'HEAD' &&
    PROTECTED_API_MUTATION_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )

  if (!isProtectedPage && !isProtectedApiMutation) {
    return NextResponse.next()
  }

  // Production deploy: no create/edit surface at all (even with a session).
  if (!isAuthoringEnabled()) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authoring disabled' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/', req.url))
  }

  const session = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value)
  if (session) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const login = new URL('/login', req.url)
  login.searchParams.set('next', pathname)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: [
    '/articles/new',
    '/articles/new/:path*',
    '/newrite',
    '/newrite/:path*',
    '/api/articles',
    '/api/articles/:path*',
    '/api/upload-image',
    '/api/upload-image/:path*',
    '/api/generate-cover',
    '/api/generate-cover/:path*',
    '/api/obsidian',
    '/api/obsidian/:path*',
  ],
}
