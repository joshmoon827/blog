import { NextRequest, NextResponse } from 'next/server'
import {
  DEFAULT_MOSAIC_PATTERN,
  sanitizeMosaicPattern,
  type MosaicPattern,
} from '@/lib/mosaicPattern'
import {
  readMosaicPattern,
  writeMosaicPattern,
} from '@/lib/mosaicPattern.server'
import { unauthorizedIfGuest } from '@/lib/requireAuth'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'


/** GET /api/mosaic-pattern — public read of the home mosaic layout. */
export async function GET() {
  return NextResponse.json(readMosaicPattern())
}

/**
 * PUT /api/mosaic-pattern
 * Body: MosaicPattern (or partial). Auth + authoring host required.
 */
export async function PUT(req: NextRequest) {
  if (!isAuthoringEnabled(req.nextUrl.hostname)) {
    return NextResponse.json({ error: 'Authoring disabled' }, { status: 403 })
  }
  const denied = await unauthorizedIfGuest(req)
  if (denied) return denied

  let body: Partial<MosaicPattern>
  try {
    body = (await req.json()) as Partial<MosaicPattern>
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  try {
    const saved = writeMosaicPattern(sanitizeMosaicPattern(body))
    return NextResponse.json(saved)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** DELETE /api/mosaic-pattern — reset to defaults. */
export async function DELETE(req: NextRequest) {
  if (!isAuthoringEnabled(req.nextUrl.hostname)) {
    return NextResponse.json({ error: 'Authoring disabled' }, { status: 403 })
  }
  const denied = await unauthorizedIfGuest(req)
  if (denied) return denied

  try {
    const saved = writeMosaicPattern(structuredClone(DEFAULT_MOSAIC_PATTERN))
    return NextResponse.json(saved)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
