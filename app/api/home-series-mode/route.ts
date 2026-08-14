import { NextRequest, NextResponse } from 'next/server'
import {
  sanitizeHomeSeriesMode,
  sanitizeHomeSeriesRandomPool,
  type HomeSeriesMode,
} from '@/lib/homeSeriesMode'
import {
  readHomeSeriesSettings,
  writeHomeSeriesSettings,
} from '@/lib/homeSeriesMode.server'
import { unauthorizedIfGuest } from '@/lib/requireAuth'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'


/** GET /api/home-series-mode */
export async function GET() {
  return NextResponse.json(readHomeSeriesSettings())
}

/** PUT /api/home-series-mode  Body: { mode?, randomPool? } */
export async function PUT(req: NextRequest) {
  if (!isAuthoringEnabled(req.nextUrl.hostname)) {
    return NextResponse.json({ error: 'Authoring disabled' }, { status: 403 })
  }
  const denied = await unauthorizedIfGuest(req)
  if (denied) return denied

  let body: {
    mode?: HomeSeriesMode
    randomPool?: unknown
    randomEnabled?: unknown
  }
  try {
    body = (await req.json()) as {
      mode?: HomeSeriesMode
      randomPool?: unknown
      randomEnabled?: unknown
    }
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  try {
    const next = writeHomeSeriesSettings({
      ...(body.mode !== undefined
        ? { mode: sanitizeHomeSeriesMode(body.mode) }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'randomPool')
        ? { randomPool: sanitizeHomeSeriesRandomPool(body.randomPool) }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'randomEnabled')
        ? { randomEnabled: Boolean(body.randomEnabled) }
        : {}),
    })
    return NextResponse.json(next)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
