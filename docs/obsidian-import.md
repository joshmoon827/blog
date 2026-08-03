# Obsidian → Blog import

Vault: `~/okestro`  
Blog: `/Users/okestro_1/home/code/blog`

## CLI

```bash
cd ~/home/code/blog
npm run import:obsidian -- ~/okestro/path/to/note.md
npm run import:obsidian -- ~/okestro/path/to/note.md --force   # overwrite
```

## Cursor agent

노트 열고 / 경로 지정 후:

> 이 Obsidian 노트를 블로그로 import 해줘 (`npm run import:obsidian`)

## Local UI (new article)

With `next dev`:

1. Open `/articles/new`
2. Click **Obsidian에서 가져오기**
3. Pick a note — title / description / created / body fill the form

API (local only):

- `GET /api/obsidian/notes` — list `.md` notes under the vault
- `GET /api/obsidian/notes?path=00_inbox/note.md` — load one note (path-traversal safe)

Vault root: env `OBSIDIAN_VAULT` (supports `~/…`), default `~/okestro`.  
Skipped folders: `.obsidian`, `.git`, `99_Attachments`, `node_modules`, `_System`, `Excalidraw`, tool dirs.

Disabled in production unless `ALLOW_OBSIDIAN_IMPORT=1`.

## Phase 1 frontmatter → UI

| Obsidian | Blog |
|----------|------|
| `created` | 날짜 필드 / `<time>` |
| `description` | 설명 필드 |
| `title` (or filename) | 제목 |

Later: tags, related, updated, banner, …
