import { NextRequest, NextResponse } from 'next/server'
import {
  getVaultRoot,
  listVaultNotes,
  readVaultNote,
} from '@/lib/obsidianVault'


/**
 * GET /api/obsidian/notes
 * GET /api/obsidian/notes?path=00_inbox/note.md
 *
 * Local-dev helper: reads markdown from the Obsidian vault (fs).
 * Vault: OBSIDIAN_VAULT env → default ~/okestro
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_OBSIDIAN_IMPORT !== '1') {
    return NextResponse.json(
      {
        error:
          'Obsidian vault access is disabled in production. Use local next dev (see docs/obsidian-import.md).',
      },
      { status: 403 },
    )
  }

  const notePath = req.nextUrl.searchParams.get('path')?.trim()

  try {
    if (notePath) {
      const note = await readVaultNote(notePath)
      return NextResponse.json({ vault: getVaultRoot(), note })
    }

    const notes = listVaultNotes()
    return NextResponse.json({
      vault: getVaultRoot(),
      count: notes.length,
      notes,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status: number }).status) || 500
        : 500
    return NextResponse.json({ error: message, vault: getVaultRoot() }, { status })
  }
}
