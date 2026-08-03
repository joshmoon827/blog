#!/usr/bin/env node
/**
 * Import Obsidian .md notes into data/articles.local.json
 *
 *   npm run import:obsidian -- ~/okestro/path/note.md
 *   npm run import:obsidian -- note.md --force
 *
 * Phase 1 frontmatter: created, description (+ title)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DB_PATH = join(root, 'data', 'articles.local.json')
const DEFAULT_COVER = '/images/aesthetic-usability-effect.jpg'

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
  const base = title
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `article-${Date.now().toString(36)}`
}

function sanitizeBody(body) {
  return body
    .replace(
      /!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g,
      (_m, file, alias) => `*[embedded: ${alias || String(file).replace(/\.[^.]+$/, '')}]*`,
    )
    .replace(
      /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g,
      (_m, target, alias) => alias || String(target),
    )
    .replace(/^>\s*\[!(\w+)\][^\n]*\n?/gm, (_m, kind) => `> **${kind}**\n`)
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

function toArticle(filePath, opts = {}) {
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

  return {
    slug,
    title,
    description,
    created,
    format: 'obsidian',
    image: opts.image || DEFAULT_COVER,
    body: sanitizeBody(body),
    sourcePath: filePath,
  }
}

function importFile(filePath, { force, slug, image }) {
  const abs = resolve(filePath)
  if (!existsSync(abs)) throw new Error(`File not found: ${abs}`)
  if (!abs.endsWith('.md')) throw new Error('Only .md files are supported')

  const article = toArticle(abs, { slug, image })
  const all = readAll()
  const idx = all.findIndex((a) => a.slug === article.slug)

  if (idx !== -1 && !force) {
    throw new Error(
      `Slug already exists: ${article.slug}. Re-run with --force to overwrite.`,
    )
  }

  if (idx !== -1) {
    all[idx] = { ...all[idx], ...article, slug: article.slug }
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

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.files.length) {
    console.log(`Usage: npm run import:obsidian -- <file.md> [more.md…] [--force]

Options:
  --force     Overwrite existing slug
  --slug X    Force slug (single file only)
  --image X   Cover image path

Phase 1 frontmatter → article: created, description, title
Vault tip: ~/okestro/...
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
      const { action, article } = importFile(file, {
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
