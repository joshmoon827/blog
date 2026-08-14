import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  markdownFileToArticle,
  sanitizeObsidianBodyWithImages,
} from '@/lib/importObsidian'
import { parseMarkdownWithFrontmatter } from '@/lib/parseFrontmatter'

const SKIP_DIR_NAMES = new Set([
  '.obsidian',
  '.git',
  '.agents',
  '.claude',
  '.claudian',
  '.cursor',
  'node_modules',
  '99_Attachments',
  '_System',
  'Excalidraw',
  '--help',
])

export type VaultNoteListItem = {
  path: string
  name: string
  folder: string
}

export type VaultNoteContent = {
  path: string
  title: string
  description: string
  created: string
  tags: string[]
  body: string
}

function expandHome(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

/** Vault root: `OBSIDIAN_VAULT` env, else `~/okestro`. */
export function getVaultRoot(): string {
  const fromEnv = process.env.OBSIDIAN_VAULT?.trim()
  const raw = fromEnv || path.join(os.homedir(), 'okestro')
  return path.resolve(expandHome(raw))
}

/**
 * Resolve a vault-relative path safely (no traversal outside vault).
 * Also accepts an absolute path that already lives under the vault.
 * Returns absolute path or throws with `.status`.
 */
export function resolveVaultPath(relativeOrAbsolute: string): string {
  const vault = getVaultRoot()
  const raw = relativeOrAbsolute.replace(/\\/g, '/').trim()
  if (!raw || raw.includes('\0')) {
    throw Object.assign(new Error('Invalid path'), { status: 400 })
  }

  // Absolute path under vault → treat as vault file
  if (path.isAbsolute(raw) || raw.startsWith('/')) {
    const abs = path.resolve(raw)
    const vaultWithSep = vault.endsWith(path.sep) ? vault : vault + path.sep
    if (abs !== vault && !abs.startsWith(vaultWithSep)) {
      throw Object.assign(new Error('Path is outside the vault'), { status: 403 })
    }
    return abs
  }

  const cleaned = raw.replace(/^\/+/, '')
  if (cleaned.split('/').some((seg) => seg === '..')) {
    throw Object.assign(new Error('Path traversal is not allowed'), { status: 400 })
  }

  const abs = path.resolve(vault, cleaned)
  const vaultWithSep = vault.endsWith(path.sep) ? vault : vault + path.sep
  if (abs !== vault && !abs.startsWith(vaultWithSep)) {
    throw Object.assign(new Error('Path is outside the vault'), { status: 403 })
  }
  return abs
}

/** Vault-relative path for API/query use (from absolute or relative). */
export function toVaultRelativePath(relativeOrAbsolute: string): string {
  return toVaultRelative(resolveVaultPath(relativeOrAbsolute), getVaultRoot())
}

function toVaultRelative(absPath: string, vault: string): string {
  return path.relative(vault, absPath).split(path.sep).join('/')
}

export function listVaultNotes(options?: { max?: number }): VaultNoteListItem[] {
  const vault = getVaultRoot()
  if (!fs.existsSync(vault) || !fs.statSync(vault).isDirectory()) {
    throw Object.assign(new Error(`Vault not found: ${vault}`), { status: 404 })
  }

  const max = options?.max ?? 2000
  const notes: VaultNoteListItem[] = []

  const walk = (dir: string) => {
    if (notes.length >= max) return
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    entries.sort((a, b) => a.name.localeCompare(b.name, 'ko'))

    for (const entry of entries) {
      if (notes.length >= max) break
      if (entry.name.startsWith('.') && entry.name !== '.') continue
      if (SKIP_DIR_NAMES.has(entry.name)) continue

      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(abs)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue

      const rel = toVaultRelative(abs, vault)
      const folder = path.posix.dirname(rel)
      notes.push({
        path: rel,
        name: entry.name.replace(/\.md$/i, ''),
        folder: folder === '.' ? '' : folder,
      })
    }
  }

  walk(vault)
  notes.sort((a, b) => {
    const folderCmp = a.folder.localeCompare(b.folder, 'ko')
    if (folderCmp !== 0) return folderCmp
    return a.name.localeCompare(b.name, 'ko')
  })
  return notes
}

export async function readVaultNote(
  relativeOrAbsolute: string,
): Promise<VaultNoteContent & { imageUpload?: { uploaded: number; errors: string[] } }> {
  const abs = resolveVaultPath(relativeOrAbsolute)
  if (!abs.endsWith('.md')) {
    throw Object.assign(new Error('Only .md files are supported'), { status: 400 })
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    throw Object.assign(
      new Error(`Note not found: ${relativeOrAbsolute}`),
      { status: 404 },
    )
  }

  const source = fs.readFileSync(abs, 'utf-8')
  const article = markdownFileToArticle(abs, source)
  const vault = getVaultRoot()
  const { body: rawBody } = parseMarkdownWithFrontmatter(source)
  const rewritten = await sanitizeObsidianBodyWithImages(rawBody, abs, vault)

  return {
    path: toVaultRelative(abs, vault),
    title: article.title,
    description: article.description || '',
    created: article.created || new Date().toISOString().slice(0, 10),
    tags: article.tags || [],
    body: rewritten.body,
    imageUpload: {
      uploaded: rewritten.uploaded,
      errors: rewritten.errors,
    },
  }
}
