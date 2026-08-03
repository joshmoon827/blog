import { NextRequest, NextResponse } from 'next/server'
import {
  getImageUploadConfig,
  uploadImageToGitHub,
  validateImageFile,
  MAX_IMAGE_BYTES,
} from '@/lib/githubImageUpload'

export const runtime = 'nodejs'

/**
 * POST /api/upload-image
 *
 * Accepts multipart form field `file` (preferred) or JSON
 * `{ contentBase64, contentType, filename? }`.
 * Uploads via GitHub Contents API (Method A) and returns
 * `{ url }` as `/api/images/...` (proxy; works with private image repos).
 *
 * Token stays server-side only (GITHUB_IMAGE_UPLOAD_TOKEN / GITHUB_TOKEN).
 */
export async function POST(req: NextRequest) {
  const config = getImageUploadConfig()
  if ('error' in config) {
    return NextResponse.json({ error: config.error }, { status: 503 })
  }

  try {
    const contentTypeHeader = req.headers.get('content-type') || ''
    let bytes: Buffer
    let contentType: string
    let filename: string | undefined

    if (contentTypeHeader.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file')
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: 'Expected multipart field "file"' },
          { status: 400 },
        )
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: `Image exceeds ${MAX_IMAGE_BYTES / (1024 * 1024)}MB limit` },
          { status: 413 },
        )
      }
      contentType = file.type || 'application/octet-stream'
      filename = file.name
      bytes = Buffer.from(await file.arrayBuffer())
    } else {
      const body = (await req.json()) as {
        contentBase64?: string
        contentType?: string
        filename?: string
      }
      if (!body.contentBase64 || !body.contentType) {
        return NextResponse.json(
          { error: 'Expected contentBase64 and contentType' },
          { status: 400 },
        )
      }
      contentType = body.contentType
      filename = body.filename
      bytes = Buffer.from(body.contentBase64, 'base64')
    }

    const validated = validateImageFile(contentType, bytes.length)
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error },
        { status: validated.status },
      )
    }

    const result = await uploadImageToGitHub(
      config,
      bytes,
      contentType,
      filename,
    )
    return NextResponse.json({
      url: result.url,
      path: result.path,
      commitSha: result.commitSha,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status: number }).status) || 500
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
