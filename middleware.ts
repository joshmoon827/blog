import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, verifySessionToken } from '@/lib/auth-session'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'

const PROTECTED_PAGE_PREFIXES = ['/articles/new', '/newrite', '/drafts', '/settings']

const PROTECTED_API_MUTATION_PREFIXES = [
  '/api/articles',
  '/api/upload-image',
  '/api/generate-cover',
  '/api/obsidian',
]

function authoringOn(req: NextRequest) {
  return isAuthoringEnabled(req.nextUrl.hostname)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const enabled = authoringOn(req)

  // Login is local-only — never serve on the public deploy.
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    if (!enabled) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  if (
    pathname === '/api/auth/login' ||
    pathname.startsWith('/api/auth/login/')
  ) {
    if (!enabled) {
      return NextResponse.json({ error: 'Login disabled' }, { status: 403 })
    }
    return NextResponse.next()
  }

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
  if (!enabled) {
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
    '/login',
    '/login/:path*',
    '/drafts',
    '/drafts/:path*',
    '/settings',
    '/settings/:path*',
    '/articles/new',
    '/articles/new/:path*',
    '/newrite',
    '/newrite/:path*',
    '/api/auth/login',
    '/api/auth/login/:path*',
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
