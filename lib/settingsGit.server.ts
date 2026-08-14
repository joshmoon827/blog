import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const SETTINGS_GIT_PATHS = [
  'data/home-series-mode.json',
  'data/mosaic-pattern.json',
  'data/mosaic-presets.json',
] as const

const GIT_OPTS = {
  cwd: process.cwd(),
  encoding: 'utf8' as const,
  timeout: 60_000,
}

async function git(args: string[]) {
  const { stdout, stderr } = await execFileAsync('git', args, GIT_OPTS)
  return { stdout: stdout.trim(), stderr: stderr.trim() }
}

export async function settingsGitStatus() {
  const { stdout } = await git([
    'status',
    '--porcelain',
    '--',
    ...SETTINGS_GIT_PATHS,
  ])
  const files = stdout
    ? stdout
        .split('\n')
        .map((line) => line.slice(3).trim())
        .filter(Boolean)
    : []
  return { dirty: files.length > 0, files }
}

export async function commitAndPushSettings() {
  const before = await settingsGitStatus()
  if (!before.dirty) {
    return { pushed: false, ...before }
  }
  await git(['add', '--', ...before.files])
  await git([
    'commit',
    '-m',
    'Update home banner and mosaic settings.',
  ])
  await git(['push', 'origin', 'HEAD'])
  return { pushed: true, dirty: false, files: [] as string[] }
}
