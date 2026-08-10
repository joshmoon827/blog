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
  'assets',
  'Assets',
  'images',
]

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
 * Tries note-relative, vault-relative, and common attachment folders.
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
  for (const abs of candidates) {
    const norm = path.normalize(abs)
    if (seen.has(norm)) continue
    seen.add(norm)
    const vaultWithSep = vault.endsWith(path.sep) ? vault : vault + path.sep
    if (norm !== vault && !norm.startsWith(vaultWithSep)) continue
    try {
      if (fs.existsSync(norm) && fs.statSync(norm).isFile()) return norm
    } catch {
      /* ignore */
    }
  }
  return null
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
    const alt =
      alias && !/^\d+$/.test(alias) ? alias : path.parse(target).name
    out = out.replace(full, `![${alt}](${url})`)
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
