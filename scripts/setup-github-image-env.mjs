#!/usr/bin/env node
/**
 * Pull GitHub credentials via `gh` CLI into .env.local for image paste upload.
 *
 * Usage:
 *   npm run setup:image-env
 *   npm run setup:image-env -- --repo my-blog-images
 *   npm run setup:image-env -- --repo my-blog-images --create
 *   npm run setup:image-env -- --print   # stdout only, no write
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.local')

function parseArgs(argv) {
  const out = { repo: null, create: false, print: false, branch: 'main', prefix: 'images' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--repo' || a === '-r') out.repo = argv[++i]
    else if (a === '--create') out.create = true
    else if (a === '--print') out.print = true
    else if (a === '--branch') out.branch = argv[++i]
    else if (a === '--prefix') out.prefix = argv[++i]
    else if (a === '--help' || a === '-h') out.help = true
  }
  return out
}

function gh(args, { trim = true } = {}) {
  const raw = execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return trim ? raw.trim() : raw
}

function upsertEnv(content, key, value) {
  const line = `${key}=${value}`
  const re = new RegExp(`^${key}=.*$`, 'm')
  if (re.test(content)) return content.replace(re, line)
  const body = content.endsWith('\n') || content === '' ? content : `${content}\n`
  return `${body}${line}\n`
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(`Usage: npm run setup:image-env -- [options]

Options:
  --repo, -r <name>   Image hosting repo name (default: blog-images)
  --create            Create the repo if missing (public)
  --branch <name>     Branch (default: main)
  --prefix <path>     Path prefix (default: images)
  --print             Print env lines only; do not write .env.local
`)
    process.exit(0)
  }

  try {
    gh(['auth', 'status'])
  } catch {
    console.error('gh is not logged in. Run: gh auth login')
    process.exit(1)
  }

  const token = gh(['auth', 'token'])
  if (!token) {
    console.error('Could not read token from gh. Run: gh auth login')
    process.exit(1)
  }

  const login = gh(['api', 'user', '--jq', '.login'])
  const repo = args.repo || 'blog-images'
  const full = `${login}/${repo}`

  let repoExists = false
  try {
    gh(['repo', 'view', full, '--json', 'name', '-q', '.name'])
    repoExists = true
  } catch {
    repoExists = false
  }

  if (!repoExists) {
    if (!args.create) {
      console.error(
        `Repo ${full} not found.\n` +
          `Create it with:\n` +
          `  npm run setup:image-env -- --repo ${repo} --create\n` +
          `Or pass an existing repo:\n` +
          `  npm run setup:image-env -- --repo <existing-repo>`,
      )
      process.exit(1)
    }
    console.log(`Creating public repo ${full}...`)
    gh([
      'repo',
      'create',
      full,
      '--public',
      '--description',
      'Blog image hosting (paste upload CDN)',
      '--clone=false',
    ])
    // Ensure default branch has a commit so Contents API paths resolve.
    const readme = Buffer.from(
      `# ${repo}\n\nImage hosting for blog paste uploads.\n`,
    ).toString('base64')
    try {
      execFileSync(
        'gh',
        [
          'api',
          `--method`,
          'PUT',
          `/repos/${login}/${repo}/contents/README.md`,
          '-f',
          `message=Initial commit`,
          '-f',
          `content=${readme}`,
          '-f',
          `branch=${args.branch}`,
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      )
    } catch (e) {
      console.warn('Warning: could not seed README (repo may already have content).')
      if (e.stderr) console.warn(String(e.stderr).trim())
    }
  }

  const lines = {
    GITHUB_IMAGE_UPLOAD_TOKEN: token,
    GITHUB_IMAGE_OWNER: login,
    GITHUB_IMAGE_REPO: repo,
    GITHUB_IMAGE_BRANCH: args.branch,
    GITHUB_IMAGE_PATH_PREFIX: args.prefix,
  }

  if (args.print) {
    for (const [k, v] of Object.entries(lines)) console.log(`${k}=${v}`)
    return
  }

  let content = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
  for (const [k, v] of Object.entries(lines)) {
    content = upsertEnv(content, k, v)
  }
  writeFileSync(envPath, content, { mode: 0o600 })

  console.log(`Wrote ${envPath}`)
  console.log(`  GITHUB_IMAGE_OWNER=${login}`)
  console.log(`  GITHUB_IMAGE_REPO=${repo}`)
  console.log(`  GITHUB_IMAGE_BRANCH=${args.branch}`)
  console.log(`  GITHUB_IMAGE_PATH_PREFIX=${args.prefix}`)
  console.log(`  GITHUB_IMAGE_UPLOAD_TOKEN=(from gh auth token, ${token.slice(0, 4)}…)`)
  console.log('')
  console.log('Local: npm run dev → edit article → paste image into body.')
  console.log('Vercel: set the same keys in Project → Settings → Environment Variables')
  console.log('  (prefer a fine-grained PAT with Contents:write on that repo only).')
}

main()
