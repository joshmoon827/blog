#!/usr/bin/env node
/**
 * Verify NEXT_PUBLIC_SUPABASE_* without printing secrets.
 *
 * Usage: npm run check:supabase
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.local')

function loadEnvLocal(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function digShort(host) {
  try {
    return execFileSync('dig', ['+short', host, 'A'], {
      encoding: 'utf8',
      timeout: 8000,
    }).trim()
  } catch {
    return ''
  }
}

async function probe(url) {
  try {
    const res = await fetch(new URL('/rest/v1/', url), {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
    })
    return { ok: true, status: res.status }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      reason: err && typeof err === 'object' && 'cause' in err
        ? String(/** @type {{ cause?: { code?: string } }} */ (err).cause?.code || err.message)
        : String(err?.message || err),
    }
  }
}

const fileEnv = loadEnvLocal(envPath)
const url =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const key =
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '').trim()

console.log('check:supabase')
console.log('  .env.local:', existsSync(envPath) ? 'found' : 'missing')
console.log('  URL set:', Boolean(url), url ? `(len ${url.length})` : '')
console.log('  anon key set:', Boolean(key), key ? `(len ${key.length}, jwt-shaped ${key.split('.').length === 3})` : '')

if (!url || !key) {
  console.log('  result: NOT CONFIGURED')
  console.log('  → Fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (docs/comments-supabase.md)')
  process.exit(1)
}

let parsed
try {
  parsed = new URL(url.includes('://') ? url : `https://${url}`)
} catch {
  console.log('  result: BAD URL (unparseable)')
  process.exit(1)
}

const host = parsed.hostname
const isLocal = host === '127.0.0.1' || host === 'localhost'
if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocal)) {
  console.log('  result: BAD URL (use https://…supabase.co or http://127.0.0.1:54321)')
  process.exit(1)
}

console.log('  hostname:', host)
console.log('  protocol:', parsed.protocol.replace(':', ''))

if (!isLocal) {
  const a = digShort(host)
  console.log('  DNS A:', a ? 'resolves' : 'NXDOMAIN / empty')
  if (!a) {
    console.log('  result: DEAD PROJECT REF')
    console.log('  → Host does not resolve. Create a new Supabase project and replace .env.local values.')
    process.exit(1)
  }
}

const probeResult = await probe(parsed.origin)
if (probeResult.ok) {
  console.log('  REST probe: HTTP', probeResult.status)
  console.log('  result: REACHABLE')
  console.log('  → If UI still fails, run supabase/schema.sql in the SQL Editor, then restart next dev.')
  process.exit(0)
}

console.log('  REST probe: failed', probeResult.reason || '')
console.log('  result: UNREACHABLE')
process.exit(1)
