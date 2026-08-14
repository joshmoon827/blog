import { NextRequest, NextResponse } from 'next/server'
import { sanitizeMosaicPattern, type MosaicPattern } from '@/lib/mosaicPattern'
import {
  deleteMosaicPreset,
  readMosaicPresets,
  upsertMosaicPreset,
} from '@/lib/mosaicPattern.server'
import { unauthorizedIfGuest } from '@/lib/requireAuth'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'

export const runtime = 'nodejs'

/** GET /api/mosaic-presets — list reusable mosaic layouts. */
export async function GET() {
  return NextResponse.json({ presets: readMosaicPresets() })
}

/**
 * POST /api/mosaic-presets
 * Body: { name: string, pattern: MosaicPattern, id?: string }
 */
export async function POST(req: NextRequest) {
  if (!isAuthoringEnabled(req.nextUrl.hostname)) {
    return NextResponse.json({ error: 'Authoring disabled' }, { status: 403 })
  }
  const denied = await unauthorizedIfGuest(req)
  if (denied) return denied

  let body: { name?: string; pattern?: MosaicPattern; id?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!body.pattern) {
    return NextResponse.json({ error: 'pattern is required' }, { status: 400 })
  }

  try {
    const preset = upsertMosaicPreset({
      id: body.id,
      name,
      pattern: sanitizeMosaicPattern(body.pattern),
    })
    return NextResponse.json({ preset, presets: readMosaicPresets() })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** DELETE /api/mosaic-presets?id=… */
export async function DELETE(req: NextRequest) {
  if (!isAuthoringEnabled(req.nextUrl.hostname)) {
    return NextResponse.json({ error: 'Authoring disabled' }, { status: 403 })
  }
  const denied = await unauthorizedIfGuest(req)
  if (denied) return denied

  const id = req.nextUrl.searchParams.get('id')?.trim()
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  try {
    const presets = deleteMosaicPreset(id)
    return NextResponse.json({ presets })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
