import { NextRequest, NextResponse } from 'next/server'
import { unauthorizedIfGuest } from '@/lib/requireAuth'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import {
  commitAndPushSettings,
  settingsGitStatus,
} from '@/lib/settingsGit.server'

export const runtime = 'nodejs'

async function deny(req: NextRequest) {
  if (!isAuthoringEnabled(req.nextUrl.hostname)) {
    return NextResponse.json({ error: 'Authoring disabled' }, { status: 403 })
  }
  return unauthorizedIfGuest(req)
}

/** GET /api/settings-git */
export async function GET(req: NextRequest) {
  const denied = await deny(req)
  if (denied) return denied
  try {
    return NextResponse.json(await settingsGitStatus())
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** POST /api/settings-git */
export async function POST(req: NextRequest) {
  const denied = await deny(req)
  if (denied) return denied
  try {
    const result = await commitAndPushSettings()
    if (!result.pushed) {
      return NextResponse.json(
        { error: 'No settings changes to push', ...result },
        { status: 409 },
      )
    }
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
