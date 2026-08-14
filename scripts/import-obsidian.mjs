#!/usr/bin/env node
/**
 * Import Obsidian .md notes into data/articles.local.json
 * Image embeds (![[x.png]]) are uploaded via GitHub Contents API → /api/images/...
 *
 *   npm run import:obsidian -- ~/okestro/path/note.md
 *   npm run import:obsidian -- note.md --force
 */

import { existsSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs'
import {
  basename,
  dirname,
  extname,
  join,
  normalize,
  resolve,
  sep,
  parse as parsePath,
} from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DB_PATH = join(root, 'data', 'articles.local.json')
const DEFAULT_COVER = '/images/aesthetic-usability-effect.jpg'

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])
const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}
const ATTACHMENT_DIRS = [
  '99_Attachments',
  'Attachments',
  '00_inbox',
  'inbox',
  'assets',
  'Assets',
  'images',
]
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

function loadDotEnv() {
  const envPath = join(root, '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

function expandHome(p) {
  if (p === '~') return homedir()
  if (p.startsWith('~/')) return join(homedir(), p.slice(2))
  return p
}

function getVaultRoot() {
  const fromEnv = process.env.OBSIDIAN_VAULT?.trim()
  return resolve(expandHome(fromEnv || join(homedir(), 'okestro')))
}

function stripQuotes(value) {
  const t = value.trim()
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1)
  }
  return t
}

function parseScalar(value) {
  const t = value.trim()
  if (!t || t === 'null' || t === '~') return null
  if (t === 'true') return true
  if (t === 'false') return false
  return stripQuotes(t)
}

function parseYamlBlock(yaml) {
  const result = {}
  const lines = yaml.replace(/\r\n/g, '\n').split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || line.trimStart().startsWith('#')) {
      i++
      continue
    }
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!match) {
      i++
      continue
    }
    const key = match[1]
    const rest = match[2]
    if (rest === '' || rest === '|' || rest === '>') {
      const items = []
      let j = i + 1
      while (j < lines.length && /^\s+-\s+/.test(lines[j])) {
        items.push(stripQuotes(lines[j].replace(/^\s+-\s+/, '')))
        j++
      }
      result[key] = items.length ? items : rest === '' ? '' : rest
      i = j
      continue
    }
    result[key] = parseScalar(rest)
    i++
  }
  return result
}

function parseMarkdown(source) {
  const text = source.replace(/^\uFEFF/, '')
  if (!text.startsWith('---')) {
    return { fm: {}, body: text.trimStart() }
  }
  const end = text.indexOf('\n---', 3)
  if (end === -1) return { fm: {}, body: text.trimStart() }
  const yaml = text.slice(4, end).trim()
  const body = text.slice(end + 4).replace(/^\n/, '')
  return { fm: parseYamlBlock(yaml), body: body.trimStart() }
}

function slugifyTitle(title) {
  // NFC keeps Hangul syllables intact (NFKD would split jamo and strip them).
  const base = title
    .trim()
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `article-${Date.now().toString(36)}`
}

function normalizeCreated(value) {
  if (!value || typeof value !== 'string') return undefined
  const m = value.trim().match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : value.trim()
}

function readAll() {
  return JSON.parse(readFileSync(DB_PATH, 'utf8'))
}

function writeAll(articles) {
  writeFileSync(DB_PATH, JSON.stringify(articles, null, 2) + '\n', 'utf8')
}

function isImagePath(p) {
  return IMAGE_EXTS.has(extname(p).toLowerCase())
}

function findFileByBasename(root, baseName, alreadyTried) {
  const want = baseName.toLowerCase()
  const queue = [root]
  let visited = 0
  const MAX_DIRS = 4000
  while (queue.length && visited < MAX_DIRS) {
    const dir = queue.shift()
    visited += 1
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const ent of entries) {
      if (ent.name === '.' || ent.name === '..') continue
      const abs = join(dir, ent.name)
      if (ent.isDirectory()) {
        if (SKIP_WALK_DIRS.has(ent.name) || ent.name.startsWith('.')) continue
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

function resolveVaultImage(target, noteAbs, vault) {
  const cleaned = target.trim().replace(/\\/g, '/').replace(/^\/+/, '')
  if (!cleaned || cleaned.includes('\0') || cleaned.split('/').includes('..')) {
    return null
  }
  const noteDir = dirname(noteAbs)
  const candidates = [resolve(noteDir, cleaned), resolve(vault, cleaned)]
  const base = basename(cleaned)
  for (const dir of ATTACHMENT_DIRS) {
    candidates.push(resolve(vault, dir, base))
    candidates.push(resolve(noteDir, dir, base))
  }
  const vaultWithSep = vault.endsWith(sep) ? vault : vault + sep
  const seen = new Set()
  for (const abs of candidates) {
    const norm = normalize(abs)
    if (seen.has(norm)) continue
    seen.add(norm)
    if (norm !== vault && !norm.startsWith(vaultWithSep)) continue
    if (existsSync(norm) && statSync(norm).isFile()) return norm
  }
  if (base === cleaned || !cleaned.includes('/')) {
    return findFileByBasename(vault, base, seen)
  }
  return null
}

function publicImageUrl(objectPath) {
  const clean = objectPath.replace(/^\/+/, '')
  return `/api/images/${clean.split('/').map(encodeURIComponent).join('/')}`
}

async function uploadToGitHub(absPath) {
  const token =
    process.env.GITHUB_IMAGE_UPLOAD_TOKEN || process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_IMAGE_OWNER
  const repo = process.env.GITHUB_IMAGE_REPO
  const branch = process.env.GITHUB_IMAGE_BRANCH || 'main'
  const pathPrefix = (process.env.GITHUB_IMAGE_PATH_PREFIX || 'images').replace(
    /^\/+|\/+$/g,
    '',
  )
  if (!token || !owner || !repo) {
    throw new Error(
      'Missing GITHUB_IMAGE_UPLOAD_TOKEN / OWNER / REPO (run npm run setup:image-env)',
    )
  }
  const ext = extname(absPath).toLowerCase()
  const mime = MIME[ext]
  if (!mime) throw new Error(`Unsupported type ${ext}`)
  const bytes = readFileSync(absPath)
  const now = new Date()
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const id = randomUUID().replace(/-/g, '').slice(0, 16)
  const objectPath = `${pathPrefix ? pathPrefix + '/' : ''}${yyyy}/${mm}/${id}${ext}`
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${objectPath}`
  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Upload image: ${basename(absPath)}`,
      content: bytes.toString('base64'),
      branch,
    }),
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const err = await res.json()
      if (err.message) detail = err.message
    } catch {
      /* ignore */
    }
    throw new Error(`GitHub upload failed (${res.status}): ${detail}`)
  }
  const data = await res.json()
  return publicImageUrl(data.content?.path || objectPath)
}

async function rewriteImages(body, noteAbs, vault) {
  const cache = new Map()
  let uploaded = 0
  const errors = []

  const uploadCached = async (abs) => {
    if (cache.has(abs)) return cache.get(abs)
    try {
      const url = await uploadToGitHub(abs)
      cache.set(abs, url)
      uploaded += 1
      return url
    } catch (err) {
      errors.push(`${basename(abs)}: ${err instanceof Error ? err.message : err}`)
      return null
    }
  }

  let out = body
  const wikiEmbedRe = /!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g

  const escapeHtmlAttr = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')

  const markdownForObsidianImage = (url, fileName, pipe) => {
    const defaultAlt = parsePath(fileName).name
    const s = pipe?.trim() ?? ''
    if (/^\d+$/.test(s)) {
      const w = Number(s)
      return `<img src="${url}" alt="${escapeHtmlAttr(defaultAlt)}" style="width:${w}px;max-width:100%;height:auto;display:block;" />`
    }
    const dim = /^(\d+)x(\d+)$/i.exec(s)
    if (dim) {
      const width = Number(dim[1])
      const height = Number(dim[2])
      return `<img src="${url}" alt="${escapeHtmlAttr(defaultAlt)}" width="${width}" height="${height}" style="max-width:100%;height:auto;display:block;" />`
    }
    const alt = s || defaultAlt
    return `![${alt}](${url})`
  }

  for (const match of [...body.matchAll(wikiEmbedRe)]) {
    const full = match[0]
    const target = String(match[1] || '').trim()
    const alias = match[2] ? String(match[2]).trim() : ''
    if (!isImagePath(target)) {
      const label = alias || target.replace(/\.[^.]+$/, '')
      out = out.replace(full, `*[embedded: ${label}]*`)
      continue
    }
    const abs = resolveVaultImage(target, noteAbs, vault)
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

  const mdImgRe = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  for (const match of [...out.matchAll(mdImgRe)]) {
    const full = match[0]
    const alt = match[1] || ''
    const src = String(match[2] || '').trim()
    if (!src || /^(https?:|data:|\/api\/)/i.test(src)) continue
    if (!isImagePath(src)) continue
    const abs = resolveVaultImage(src, noteAbs, vault)
    if (!abs) {
      errors.push(`not found: ${src}`)
      continue
    }
    const url = await uploadCached(abs)
    if (!url) continue
    out = out.replace(full, `![${alt || parsePath(src).name}](${url})`)
  }

  out = out
    .replace(
      /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g,
      (_m, target, alias) => alias || String(target),
    )
    .replace(/^>\s*\[!(\w+)\][^\n]*\n?/gm, (_m, kind) => `> **${kind}**\n`)

  return { body: out, uploaded, errors }
}

async function toArticle(filePath, opts = {}) {
  const source = readFileSync(filePath, 'utf8')
  const { fm, body } = parseMarkdown(source)
  const title =
    (typeof fm.title === 'string' && fm.title.trim()) ||
    basename(filePath, extname(filePath)).trim()
  const slug = opts.slug || slugifyTitle(title)
  const description =
    typeof fm.description === 'string'
      ? fm.description.trim()
      : typeof fm.summary === 'string'
        ? fm.summary.trim()
        : ''
  const created = normalizeCreated(
    typeof fm.created === 'string'
      ? fm.created
      : typeof fm.date === 'string'
        ? fm.date
        : undefined,
  )

  const vault = getVaultRoot()
  const rewritten = await rewriteImages(body, filePath, vault)
  for (const e of rewritten.errors) console.warn(`  image: ${e}`)
  if (rewritten.uploaded) {
    console.log(`  uploaded ${rewritten.uploaded} image(s) → GitHub`)
  }

  return {
    slug,
    title,
    description,
    created,
    format: 'obsidian',
    image: opts.image || DEFAULT_COVER,
    body: rewritten.body,
    sourcePath: filePath,
  }
}

async function importFile(filePath, { force, slug, image }) {
  const abs = resolve(filePath)
  if (!existsSync(abs)) throw new Error(`File not found: ${abs}`)
  if (!abs.endsWith('.md')) throw new Error('Only .md files are supported')

  const article = await toArticle(abs, { slug, image })
  const all = readAll()
  let idx = all.findIndex((a) => a.slug === article.slug)
  // Prefer matching an existing import of the same vault file (stable re-import).
  if (idx === -1) {
    idx = all.findIndex(
      (a) =>
        typeof a.sourcePath === 'string' &&
        resolve(a.sourcePath) === abs,
    )
  }

  if (idx !== -1 && !force) {
    throw new Error(
      `Slug already exists: ${all[idx].slug}. Re-run with --force to overwrite.`,
    )
  }

  if (idx !== -1) {
    const keepSlug = all[idx].slug
    all[idx] = { ...all[idx], ...article, slug: keepSlug }
    writeAll(all)
    return { action: 'updated', article: all[idx] }
  }

  all.unshift(article)
  writeAll(all)
  return { action: 'created', article }
}

function parseArgs(argv) {
  const out = { force: false, slug: null, image: null, files: [], help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') out.help = true
    else if (a === '--force') out.force = true
    else if (a === '--slug') out.slug = argv[++i]
    else if (a === '--image') out.image = argv[++i]
    else out.files.push(a)
  }
  return out
}

async function main() {
  loadDotEnv()
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.files.length) {
    console.log(`Usage: npm run import:obsidian -- <file.md> [more.md…] [--force]

Options:
  --force     Overwrite existing slug
  --slug X    Force slug (single file only)
  --image X   Cover image path

Image embeds (![[file.png]]) upload via GitHub Contents API (same as paste upload).
Requires GITHUB_IMAGE_* in .env.local (npm run setup:image-env).
`)
    process.exit(args.help ? 0 : 1)
  }

  if (args.slug && args.files.length > 1) {
    console.error('--slug only works with a single file')
    process.exit(1)
  }

  let failed = false
  for (const file of args.files) {
    try {
      const { action, article } = await importFile(file, {
        force: args.force,
        slug: args.files.length === 1 ? args.slug : null,
        image: args.image,
      })
      console.log(
        `${action}: ${article.slug}` +
          (article.created ? ` (created ${article.created})` : '') +
          `\n  title: ${article.title}` +
          `\n  description: ${article.description || '(none)'}` +
          `\n  → http://localhost:3000/articles/${article.slug}`,
      )
    } catch (err) {
      failed = true
      console.error(`FAIL ${file}: ${err instanceof Error ? err.message : err}`)
    }
  }
  process.exit(failed ? 1 : 0)
}

main()
