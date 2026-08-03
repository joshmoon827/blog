import { NextRequest, NextResponse } from 'next/server'
import {
  fetchImageFromGitHub,
  getImageUploadConfig,
  sanitizeImageObjectPath,
} from '@/lib/githubImageUpload'

export const runtime = 'nodejs'

/**
 * GET /api/images/{path}
 *
 * Proxies image bytes from a (possibly private) GitHub repo using the
 * server-side token. Keeps the image hosting repo private while still
 * serving images on the blog origin.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const config = getImageUploadConfig()
  if ('error' in config) {
    return NextResponse.json({ error: config.error }, { status: 503 })
  }

  const { path: segments } = await context.params
  const objectPath = sanitizeImageObjectPath(config.pathPrefix, segments || [])
  if (!objectPath) {
    return NextResponse.json({ error: 'Invalid image path' }, { status: 400 })
  }

  try {
    const { bytes, contentType } = await fetchImageFromGitHub(config, objectPath)
    const body = Uint8Array.from(bytes)
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed'
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status: number }).status) || 500
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
