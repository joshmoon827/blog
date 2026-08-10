import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'
export const maxDuration = 300

const JOBS_DIR = path.join(process.cwd(), 'data', 'cover-jobs')
const LOGS_DIR = path.join(process.cwd(), 'data', 'cover-logs')
const REFS_DIR = path.join(process.cwd(), 'data', 'cover-refs')
const MAX_AUTHOR_REFS = 4
const MAX_REF_BYTES = 8 * 1024 * 1024
const ALLOWED_REF_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
])

function safeSlugName(slug: string) {
  return slug.replace(/[^a-z0-9가-힣_-]+/gi, '-')
}

function jobPath(slug: string) {
  return path.join(JOBS_DIR, `${safeSlugName(slug)}.json`)
}

function extForContentType(contentType: string, filename?: string) {
  const fromName = filename ? path.extname(filename).toLowerCase() : ''
  if (fromName && ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(fromName)) {
    return fromName === '.jpeg' ? '.jpg' : fromName
  }
  if (contentType.includes('png')) return '.png'
  if (contentType.includes('webp')) return '.webp'
  if (contentType.includes('gif')) return '.gif'
  return '.jpg'
}

/**
 * Persist author reference photos under data/cover-refs/<slug>/ for the cover script.
 * Returns absolute paths (empty if none).
 */
function saveAuthorReferenceImages(
  slug: string,
  images:
    | Array<{
        filename?: string
        contentType?: string
        contentBase64?: string
      }>
    | undefined,
): string[] {
  if (!images?.length) return []

  const dir = path.join(REFS_DIR, safeSlugName(slug))
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  const saved: string[] = []
  for (const item of images.slice(0, MAX_AUTHOR_REFS)) {
    const contentType = (item.contentType || '').toLowerCase()
    const b64 = item.contentBase64?.trim()
    if (!b64) continue
    if (!ALLOWED_REF_TYPES.has(contentType) && !contentType.startsWith('image/')) {
      throw new Error(`Unsupported reference image type: ${contentType || '(empty)'}`)
    }
    const bytes = Buffer.from(b64, 'base64')
    if (bytes.length === 0) continue
    if (bytes.length > MAX_REF_BYTES) {
      throw new Error(
        `Reference image exceeds ${MAX_REF_BYTES / (1024 * 1024)}MB: ${item.filename || 'image'}`,
      )
    }
    const ext = extForContentType(contentType, item.filename)
    const abs = path.join(dir, `ref-${saved.length + 1}${ext}`)
    writeFileSync(abs, bytes)
    saved.push(abs)
  }
  return saved
}

function readJob(slug: string): Record<string, unknown> | null {
  const file = jobPath(slug)
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

function writeJob(slug: string, data: Record<string, unknown>) {
  mkdirSync(JOBS_DIR, { recursive: true })
  const prev = readJob(slug) || {}
  const next = {
    ...prev,
    ...data,
    slug,
    updatedAt: new Date().toISOString(),
  }
  writeFileSync(jobPath(slug), JSON.stringify(next, null, 2) + '\n', 'utf8')
  return next
}

function readArticleImage(slug: string): string | null {
  const db = path.join(process.cwd(), 'data', 'articles.local.json')
  if (!existsSync(db)) return null
  try {
    const all = JSON.parse(readFileSync(db, 'utf8')) as Array<{
      slug: string
      image?: string
    }>
    return all.find((a) => a.slug === slug)?.image ?? null
  } catch {
    return null
  }
}

/**
 * GET /api/generate-cover?slug=…
 * Poll background job status (and current article.image).
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim()
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  const job = readJob(slug)
  const image = readArticleImage(slug)
  const generated =
    typeof image === 'string' && image.includes('/images/generated/')

  if (!job) {
    return NextResponse.json({
      slug,
      status: generated ? 'success' : 'idle',
      image,
      publicUrl: generated ? image : null,
      error: null,
    })
  }

  const status = String(job.status || 'idle')
  // Only treat as success while "running" when article.image changed *after*
  // this job started (script wrote a new path but crashed before job finalize).
  // Comparing to job.cover was wrong: an existing generated cover + stock
  // reference made the UI stop polling and never pick up the new file.
  const imageAtStart =
    typeof job.imageAtStart === 'string' ? job.imageAtStart : null
  if (
    status === 'running' &&
    generated &&
    imageAtStart != null &&
    image !== imageAtStart
  ) {
    return NextResponse.json({
      slug,
      status: 'success',
      image,
      publicUrl: image,
      error: null,
      keywords: job.keywords ?? null,
      logo: job.logo ?? null,
      job,
    })
  }

  // Failed retry after a successful apply: still expose the applied cover.
  const publicUrl =
    (typeof job.publicUrl === 'string' && job.publicUrl) ||
    (generated ? image : null)

  return NextResponse.json({
    slug,
    status,
    image,
    publicUrl,
    error: job.error ?? null,
    keywords: job.keywords ?? null,
    logo: job.logo ?? null,
    startedAt: job.startedAt ?? null,
    finishedAt: job.finishedAt ?? null,
    job,
  })
}

/**
 * POST /api/generate-cover
 *
 * Local-dev helper: shells out to `scripts/generate-cover.mjs`.
 * Default `background: true` — returns immediately; poll GET ?slug=.
 *
 * Body: {
 *   slug: string,
 *   cover?: string,
 *   theme?: 'dark' | 'light',
 *   force?: boolean,
 *   keywordsOnly?: boolean,
 *   background?: boolean,
 *   mode?: 'generate' | 'redownload',
 *   additionalPrompt?: string,
 *   productRelated?: boolean,
 *   swissModernist?: boolean,
 *   paletteColors?: string[],
 *   backgroundColor?: string,
 *   referenceImages?: Array<{ filename: string, contentType: string, contentBase64: string }>,
 * }
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_COVER_GENERATE !== '1') {
    return NextResponse.json(
      {
        error:
          'Cover generation via CDP is disabled in production. Use the CLI locally (see docs/cover-generate.md).',
      },
      { status: 403 },
    )
  }

  let body: {
    slug?: string
    cover?: string
    theme?: 'dark' | 'light'
    force?: boolean
    keywordsOnly?: boolean
    background?: boolean
    mode?: 'generate' | 'redownload'
    additionalPrompt?: string
    productRelated?: boolean
    swissModernist?: boolean
    paletteColors?: string[]
    backgroundColor?: string
    referenceImages?: Array<{
      filename?: string
      contentType?: string
      contentBase64?: string
    }>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const slug = body.slug?.trim()
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  const background = body.background !== false && body.keywordsOnly !== true
  const mode = body.mode === 'redownload' ? 'redownload' : 'generate'
  const prevJob = readJob(slug)
  // Reuse last saved additional prompt on regenerate when the client omits/empties it.
  let additionalPrompt = body.additionalPrompt?.trim() || ''
  if (!additionalPrompt && mode === 'generate') {
    const prev =
      typeof prevJob?.additionalPrompt === 'string'
        ? prevJob.additionalPrompt.trim()
        : ''
    if (prev) additionalPrompt = prev
  }

  const normalizeHex = (c: string) => {
    const t = c.trim()
    if (!t) return ''
    const withHash = t.startsWith('#') ? t : `#${t}`
    return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : ''
  }

  let paletteColors = (Array.isArray(body.paletteColors) ? body.paletteColors : [])
    .map(normalizeHex)
    .filter(Boolean)

  if (!paletteColors.length && mode === 'generate') {
    const prev = prevJob?.paletteColors
    if (Array.isArray(prev)) {
      paletteColors = prev.map((c) => normalizeHex(String(c))).filter(Boolean)
    }
  }

  // Fallback: look up precomputed palette for the selected stock cover.
  if (!paletteColors.length && body.cover) {
    try {
      const mapPath = path.join(process.cwd(), 'data', 'cover-palettes.json')
      if (existsSync(mapPath)) {
        const map = JSON.parse(readFileSync(mapPath, 'utf8')) as Record<
          string,
          string[]
        >
        const key = body.cover.startsWith('/images/')
          ? body.cover
          : body.cover.includes('/images/')
            ? body.cover.slice(body.cover.lastIndexOf('/images/'))
            : ''
        if (key && Array.isArray(map[key])) {
          paletteColors = map[key].map(normalizeHex).filter(Boolean)
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Explicit '' clears a previously saved background; omit/undefined reuses last job.
  let backgroundColor = ''
  let backgroundColorExplicit = false
  if (typeof body.backgroundColor === 'string') {
    backgroundColorExplicit = true
    backgroundColor = normalizeHex(body.backgroundColor)
  } else if (mode === 'generate') {
    const prev = prevJob?.backgroundColor
    if (typeof prev === 'string') backgroundColor = normalizeHex(prev)
  }

  const script = path.join(process.cwd(), 'scripts', 'generate-cover.mjs')
  const args = [script, '--slug', slug]
  if (body.cover) args.push('--cover', body.cover)
  if (body.theme === 'dark' || body.theme === 'light') {
    args.push('--theme', body.theme)
  }
  if (body.force) args.push('--force')
  if (body.keywordsOnly) args.push('--keywords-only')
  if (mode === 'redownload') args.push('--redownload', '--force')
  if (additionalPrompt) args.push('--additional-prompt', additionalPrompt)
  if (paletteColors.length) args.push('--palette', paletteColors.join(','))
  if (backgroundColor) args.push('--background-color', backgroundColor)
  if (body.productRelated === false) args.push('--no-product-related')
  if (body.swissModernist === false) args.push('--no-swiss-modernist')

  let savedExtraRefs: string[] = []
  try {
    savedExtraRefs = saveAuthorReferenceImages(slug, body.referenceImages)
    for (const abs of savedExtraRefs) {
      args.push('--extra-ref', abs)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (background) {
    const existing = prevJob
    if (existing?.status === 'running') {
      const startedAt = existing.startedAt
        ? Date.parse(String(existing.startedAt))
        : 0
      if (startedAt && Date.now() - startedAt < 10 * 60_000) {
        return NextResponse.json({
          started: true,
          alreadyRunning: true,
          slug,
          status: 'running',
          job: existing,
        })
      }
    }

    mkdirSync(LOGS_DIR, { recursive: true })
    const safe = slug.replace(/[^a-z0-9가-힣_-]+/gi, '-')
    const logFile = path.join(LOGS_DIR, `${safe}.log`)
    const outFd = openSync(logFile, 'a')
    const errFd = openSync(logFile, 'a')

    const prevPrompt =
      typeof prevJob?.additionalPrompt === 'string'
        ? prevJob.additionalPrompt
        : null
    const prevPalette = Array.isArray(prevJob?.paletteColors)
      ? prevJob.paletteColors
      : null
    const prevBg =
      typeof prevJob?.backgroundColor === 'string'
        ? prevJob.backgroundColor
        : null
    writeJob(slug, {
      status: 'running',
      mode,
      cover: body.cover || null,
      theme: body.theme || null,
      force: Boolean(body.force),
      // Keep last prompt across redownload / empty regenerate payloads.
      additionalPrompt: additionalPrompt || prevPrompt,
      paletteColors: paletteColors.length ? paletteColors : prevPalette,
      backgroundColor: backgroundColorExplicit
        ? backgroundColor || null
        : backgroundColor || prevBg,
      productRelated: body.productRelated !== false,
      swissModernist: body.swissModernist !== false,
      extraRefs: savedExtraRefs.map((p) => path.basename(p)),
      imageAtStart: readArticleImage(slug),
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
      publicUrl: null,
      logFile,
      pid: null,
    })

    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        COVER_JOB_SLUG: slug,
        COVER_JOB_FILE: jobPath(slug),
      },
      detached: true,
      stdio: ['ignore', outFd, errFd],
    })

    writeJob(slug, { pid: child.pid ?? null })
    child.unref()

    return NextResponse.json({
      started: true,
      slug,
      status: 'running',
      logFile,
      pid: child.pid ?? null,
    })
  }

  try {
    const result = await runNodeScript(args, 280_000)
    let parsed: unknown = null
    const jsonMatch = result.stdout.match(/\{[\s\S]*\}\s*$/)
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch {
        parsed = null
      }
    }
    if (result.code !== 0) {
      return NextResponse.json(
        {
          error:
            result.stderr.slice(-1200) ||
            result.stdout.slice(-1200) ||
            `exit ${result.code}`,
          stdout: result.stdout.slice(-2000),
          result: parsed,
        },
        { status: 500 },
      )
    }
    return NextResponse.json({
      ok: true,
      result: parsed,
      stdout: result.stdout.slice(-4000),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function runNodeScript(
  args: string[],
  timeoutMs: number,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`generate-cover timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    child.stdout.on('data', (c) => {
      stdout += c.toString()
    })
    child.stderr.on('data', (c) => {
      stderr += c.toString()
    })
    child.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr })
    })
  })
}
