import { NextRequest, NextResponse } from 'next/server'
import { isLocalToolsEnabled } from '@/lib/isLocalTools'

/**
 * GET /api/obsidian/notes
 * GET /api/obsidian/notes?path=00_inbox/note.md
 *
 * Local-dev helper: reads markdown from the Obsidian vault (fs).
 * Vault: OBSIDIAN_VAULT env → default data/obsidian-vault (set ~/okestro in .env.local)
 */
export async function GET(req: NextRequest) {
  if (!isLocalToolsEnabled()) {
    return NextResponse.json(
      {
        error:
          'Obsidian vault access is disabled outside local development. Use `next dev` locally (see docs/obsidian-import.md).',
      },
      { status: 403 },
    )
  }

  const { getVaultRoot, listVaultNotes, readVaultNote } = await import(
    '@/lib/obsidianVault'
  )

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
