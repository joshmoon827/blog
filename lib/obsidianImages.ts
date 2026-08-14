import fs from 'fs'
import path from 'path'
import {
  getImageUploadConfig,
  uploadImageToGitHub,
} from '@/lib/githubImageUpload'

const IMAGE_EXTS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
])

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

/** Folders to search when wiki target is a bare filename. */
const ATTACHMENT_DIRS = [
  '99_Attachments',
  'Attachments',
  '00_inbox',
  'inbox',
  'assets',
  'Assets',
  'images',
]

/** Skip when walking the vault for a basename match. */
const SKIP_WALK_DIRS = new Set([
  '.obsidian',
  '.git',
  '.agents',
  '.claude',
  '.claudian',
  '.cursor',
  'node_modules',
  'Excalidraw',
  '_System',
])

export type ObsidianImageRewriteResult = {
  body: string
  uploaded: number
  skipped: string[]
  errors: string[]
}

function isImagePath(filePath: string): boolean {
  return IMAGE_EXTS.has(path.extname(filePath).toLowerCase())
}

function mimeFor(filePath: string): string | null {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] || null
}

/**
 * Resolve an Obsidian image target to an absolute file path inside the vault.
 * Tries note-relative, vault-relative, common attachment folders, then a
 * basename walk (for paste targets that land in 00_inbox, etc.).
 */
export function resolveVaultImagePath(
  target: string,
  noteAbsPath: string,
  vaultRoot: string,
): string | null {
  const vault = path.resolve(vaultRoot)
  const cleaned = target.trim().replace(/\\/g, '/').replace(/^\/+/, '')
  if (!cleaned || cleaned.includes('\0') || cleaned.split('/').includes('..')) {
    return null
  }

  const noteDir = path.dirname(noteAbsPath)
  const candidates: string[] = [
    path.resolve(noteDir, cleaned),
    path.resolve(vault, cleaned),
  ]

  const base = path.basename(cleaned)
  for (const dir of ATTACHMENT_DIRS) {
    candidates.push(path.resolve(vault, dir, base))
    candidates.push(path.resolve(noteDir, dir, base))
  }

  const seen = new Set<string>()
  const vaultWithSep = vault.endsWith(path.sep) ? vault : vault + path.sep
  for (const abs of candidates) {
    const norm = path.normalize(abs)
    if (seen.has(norm)) continue
    seen.add(norm)
    if (norm !== vault && !norm.startsWith(vaultWithSep)) continue
    try {
      if (fs.existsSync(norm) && fs.statSync(norm).isFile()) return norm
    } catch {
      /* ignore */
    }
  }

  // Bare filename still missing — walk vault (case-insensitive basename).
  if (base === cleaned || !cleaned.includes('/')) {
    const found = findFileByBasename(vault, base, seen)
    if (found) return found
  }
  return null
}

function findFileByBasename(
  root: string,
  baseName: string,
  alreadyTried: Set<string>,
): string | null {
  const want = baseName.toLowerCase()
  const queue = [root]
  let visited = 0
  const MAX_DIRS = 4000

  while (queue.length && visited < MAX_DIRS) {
    const dir = queue.shift()!
    visited += 1
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const ent of entries) {
      if (ent.name === '.' || ent.name === '..') continue
      if (ent.name.startsWith('.') && ent.name !== baseName) {
        if (ent.isDirectory() && SKIP_WALK_DIRS.has(ent.name)) continue
      }
      const abs = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        if (SKIP_WALK_DIRS.has(ent.name)) continue
        queue.push(abs)
        continue
      }
      if (!ent.isFile()) continue
      if (alreadyTried.has(abs)) continue
      if (ent.name.toLowerCase() === want) return abs
    }
  }
  return null
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

/** Obsidian `![[file.png|700]]` pipe suffix — width px, WxH, or alt label. */
export type ObsidianImagePipeSpec =
  | { kind: 'width'; px: number }
  | { kind: 'size'; width: number; height: number }
  | { kind: 'alt'; text: string }

export function parseObsidianImagePipe(
  pipe: string | undefined,
): ObsidianImagePipeSpec | null {
  const s = pipe?.trim() ?? ''
  if (!s) return null
  if (/^\d+$/.test(s)) return { kind: 'width', px: Number(s) }
  const dim = /^(\d+)x(\d+)$/i.exec(s)
  if (dim) {
    return { kind: 'size', width: Number(dim[1]), height: Number(dim[2]) }
  }
  return { kind: 'alt', text: s }
}

/** Markdown/HTML snippet for an uploaded Obsidian image embed. */
export function markdownForObsidianImage(
  url: string,
  fileName: string,
  pipe?: string,
): string {
  const defaultAlt = path.parse(fileName).name
  const spec = parseObsidianImagePipe(pipe)
  if (!spec || spec.kind === 'alt') {
    const alt = spec?.kind === 'alt' ? spec.text : defaultAlt
    return `![${alt}](${url})`
  }
  if (spec.kind === 'width') {
    const w = spec.px
    return `<img src="${url}" alt="${escapeHtmlAttr(defaultAlt)}" style="width:${w}px;max-width:100%;height:auto;display:block;" />`
  }
  const { width, height } = spec
  return `<img src="${url}" alt="${escapeHtmlAttr(defaultAlt)}" width="${width}" height="${height}" style="max-width:100%;height:auto;display:block;" />`
}

async function uploadLocalImage(absPath: string): Promise<string> {
  const config = getImageUploadConfig()
  if ('error' in config) {
    throw Object.assign(new Error(config.error), { status: 503 })
  }
  const mime = mimeFor(absPath)
  if (!mime) {
    throw Object.assign(
      new Error(`Unsupported image type: ${path.extname(absPath)}`),
      { status: 415 },
    )
  }
  const bytes = fs.readFileSync(absPath)
  const { url } = await uploadImageToGitHub(
    config,
    bytes,
    mime,
    path.basename(absPath),
  )
  return url
}

/**
 * Rewrite Obsidian image embeds / relative markdown images into hosted
 * `/api/images/...` URLs (GitHub Contents API commit via uploadImageToGitHub).
 *
 * Non-image wiki embeds stay as text placeholders. Wiki links stay as plain text.
 */
export async function rewriteObsidianImagesInBody(
  body: string,
  noteAbsPath: string,
  vaultRoot: string,
): Promise<ObsidianImageRewriteResult> {
  const skipped: string[] = []
  const errors: string[] = []
  let uploaded = 0
  const cache = new Map<string, string>()

  const uploadCached = async (abs: string): Promise<string | null> => {
    const hit = cache.get(abs)
    if (hit) return hit
    try {
      const url = await uploadLocalImage(abs)
      cache.set(abs, url)
      uploaded += 1
      return url
    } catch (err) {
      errors.push(
        `${path.basename(abs)}: ${err instanceof Error ? err.message : String(err)}`,
      )
      return null
    }
  }

  let out = body

  // ![[file|width]] or ![[path/to/file.png]]
  const wikiEmbedRe = /!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g
  const wikiMatches = [...body.matchAll(wikiEmbedRe)]
  for (const match of wikiMatches) {
    const full = match[0]
    const target = String(match[1] || '').trim()
    const alias = match[2] ? String(match[2]).trim() : ''
    if (!isImagePath(target)) {
      const label = alias || target.replace(/\.[^.]+$/, '')
      out = out.replace(full, `*[embedded: ${label}]*`)
      skipped.push(target)
      continue
    }
    const abs = resolveVaultImagePath(target, noteAbsPath, vaultRoot)
    if (!abs) {
      errors.push(`not found: ${target}`)
      out = out.replace(full, `*[missing image: ${target}]*`)
      continue
    }
    const url = await uploadCached(abs)
    if (!url) {
      out = out.replace(full, `*[image upload failed: ${target}]*`)
      continue
    }
    out = out.replace(full, markdownForObsidianImage(url, target, alias))
  }

  // Relative markdown images (skip remote / already-hosted)
  const mdImgRe = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  const mdMatches = [...out.matchAll(mdImgRe)]
  for (const match of mdMatches) {
    const full = match[0]
    const alt = match[1] || ''
    const src = String(match[2] || '').trim()
    if (!src || /^(https?:|data:|\/api\/)/i.test(src)) continue
    if (!isImagePath(src)) continue
    const abs = resolveVaultImagePath(src, noteAbsPath, vaultRoot)
    if (!abs) {
      errors.push(`not found: ${src}`)
      continue
    }
    const url = await uploadCached(abs)
    if (!url) continue
    out = out.replace(full, `![${alt || path.parse(src).name}](${url})`)
  }

  // Remaining wiki links (non-embed) + callouts
  out = out
    .replace(
      /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g,
      (_m, target, alias) => alias || String(target),
    )
    .replace(/^>\s*\[!(\w+)\][^\n]*\n?/gm, (_m, kind) => `> **${kind}**\n`)

  return { body: out, uploaded, skipped, errors }
}
