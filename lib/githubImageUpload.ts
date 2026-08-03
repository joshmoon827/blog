import { randomUUID } from 'crypto'

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
])

/** GitHub Contents API is happiest under ~1MB; allow a bit more for paste uploads. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

export type ImageUploadConfig = {
  token: string
  owner: string
  repo: string
  branch: string
  pathPrefix: string
}

export function getImageUploadConfig(): ImageUploadConfig | { error: string } {
  const token =
    process.env.GITHUB_IMAGE_UPLOAD_TOKEN || process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_IMAGE_OWNER
  const repo = process.env.GITHUB_IMAGE_REPO
  const branch = process.env.GITHUB_IMAGE_BRANCH || 'main'
  const pathPrefix = (process.env.GITHUB_IMAGE_PATH_PREFIX || 'images').replace(
    /^\/+|\/+$/g,
    '',
  )

  if (!token) {
    return {
      error:
        'Missing GITHUB_IMAGE_UPLOAD_TOKEN or GITHUB_TOKEN (server-only; never expose to the browser)',
    }
  }
  if (!owner || !repo) {
    return { error: 'Missing GITHUB_IMAGE_OWNER or GITHUB_IMAGE_REPO' }
  }

  return { token, owner, repo, branch, pathPrefix }
}

export function validateImageFile(
  type: string,
  size: number,
): { ok: true; ext: string } | { ok: false; error: string; status: number } {
  if (!ALLOWED_TYPES.has(type)) {
    return {
      ok: false,
      error: `Unsupported type "${type}". Allowed: png, jpeg, gif, webp`,
      status: 415,
    }
  }
  if (size <= 0 || size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `Image must be between 1 byte and ${MAX_IMAGE_BYTES / (1024 * 1024)}MB`,
      status: 413,
    }
  }
  return { ok: true, ext: EXT_BY_TYPE[type] }
}

function buildObjectPath(pathPrefix: string, ext: string): string {
  const now = new Date()
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const id = randomUUID().replace(/-/g, '').slice(0, 16)
  const base = pathPrefix ? `${pathPrefix}/` : ''
  return `${base}${yyyy}/${mm}/${id}.${ext}`
}

/** Public blog URL for a repo object path (works with private image repos). */
export function publicImageUrl(objectPath: string): string {
  const clean = objectPath.replace(/^\/+/, '')
  return `/api/images/${clean.split('/').map(encodeURIComponent).join('/')}`
}

/**
 * Normalize and validate a repo-relative image path for the public proxy.
 * Rejects traversal and paths outside the configured prefix.
 */
export function sanitizeImageObjectPath(
  pathPrefix: string,
  segments: string[],
): string | null {
  if (!segments.length) return null
  const decoded = segments.map((s) => {
    try {
      return decodeURIComponent(s)
    } catch {
      return null
    }
  })
  if (decoded.some((s) => s == null)) return null
  if (decoded.some((s) => !s || s === '.' || s === '..' || s.includes('\\'))) {
    return null
  }
  const joined = decoded.join('/')
  if (!/^[a-zA-Z0-9._/-]+$/.test(joined)) return null
  if (pathPrefix && !joined.startsWith(`${pathPrefix}/`)) return null
  return joined
}

/**
 * Fetch image bytes from a (possibly private) GitHub repo using the server token.
 */
export async function fetchImageFromGitHub(
  config: ImageUploadConfig,
  objectPath: string,
): Promise<{ bytes: Buffer; contentType: string }> {
  const rawUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${objectPath}`
  const res = await fetch(rawUrl, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github.raw',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    // Always revalidate through our proxy cache headers; avoid Next fetch cache surprises.
    cache: 'no-store',
  })

  if (!res.ok) {
    throw Object.assign(
      new Error(`GitHub fetch failed (${res.status})`),
      { status: res.status === 404 ? 404 : 502 },
    )
  }

  const ext = objectPath.split('.').pop()?.toLowerCase()
  const byExt: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  }
  const contentType =
    res.headers.get('content-type')?.split(';')[0] ||
    byExt[ext || ''] ||
    'application/octet-stream'

  return { bytes: Buffer.from(await res.arrayBuffer()), contentType }
}

/**
 * Method A — virtual commit via GitHub Contents API.
 * Public URL is `/api/images/...` so the hosting repo can stay private;
 * the Next.js proxy fetches raw content with the server token.
 */
export async function uploadImageToGitHub(
  config: ImageUploadConfig,
  bytes: Buffer,
  contentType: string,
  originalName?: string,
): Promise<{ url: string; path: string; commitSha?: string }> {
  const validated = validateImageFile(contentType, bytes.length)
  if (!validated.ok) {
    throw Object.assign(new Error(validated.error), { status: validated.status })
  }

  const objectPath = buildObjectPath(config.pathPrefix, validated.ext)
  const message = originalName
    ? `Upload image: ${originalName}`
    : `Upload image: ${objectPath}`

  const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${objectPath}`

  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: bytes.toString('base64'),
      branch: config.branch,
    }),
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const errBody = (await res.json()) as { message?: string }
      if (errBody.message) detail = errBody.message
    } catch {
      /* ignore */
    }
    throw Object.assign(
      new Error(`GitHub upload failed (${res.status}): ${detail}`),
      { status: res.status >= 400 && res.status < 500 ? res.status : 502 },
    )
  }

  const data = (await res.json()) as {
    content?: { path?: string; sha?: string }
    commit?: { sha?: string }
  }

  const path = data.content?.path || objectPath
  return {
    url: publicImageUrl(path),
    path,
    commitSha: data.commit?.sha,
  }
}
