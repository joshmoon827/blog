# Cover image generation (keywords → Gemini CDP)

Sequential pipeline for blog cover images. **Not** a Google Imagen REST API — Step 2 drives the Gemini web app through Chrome CDP (same stack as `cdp-hello` / `gemini-daily-hello`).

## Prerequisites (order matters)

### 1. Cursor CLI (Step 1)

`cursor agent -p …` must be on `PATH` for keyword extraction.

### 2. CDP Chrome via cdp-orchestrator (Step 2)

Cover gen needs the **Gemini-logged-in** Chrome profile, not a bare debugging port and not the papers profile.

| | Value |
|--|--|
| Orchestrator user-data-dir name | `cdp-hello` |
| Disk path | `~/.chrome-cdp-hello` |
| Default CDP port | **9222** |

Start (pick one):

```bash
# From blog (recommended)
cd ~/home/code/blog
npm run chrome:cdp

# Same path via cdp-hello
cd ~/home/code/cdp-hello
npm run chrome

# Or call the CLI directly
cdp-orch start --user-data-dir cdp-hello --port 9222
```

Optional health check:

```bash
cd ~/home/code/cdp-hello && npm run ping
# or: cdp-orch ping http://127.0.0.1:9222
```

Then generate:

```bash
cd ~/home/code/blog
npm run generate:cover -- --slug 22cursor-cli
```

**Do not** use `cdp-hello`’s `npm run chrome:papers` for covers — that writes `.cdp-url` as `http://127.0.0.1:9224` with the `hf-papers` profile (no Gemini login).

### 3. Gemini login

Be logged into [gemini.google.com](https://gemini.google.com/app) inside that Chrome profile (image generation available on the account). First-time: run `npm run chrome:cdp`, sign in once, leave the profile alone.

## CDP URL resolution (blog)

1. `CDP_URL` env (explicit override), if reachable  
2. Preferred gemini port `http://127.0.0.1:9222` (or `CDP_PORT`), if reachable  
3. `blog/.cdp-url` / `cdp-hello/.cdp-url` **only when** they point at that preferred port (stale `9224` leftovers are ignored)  
4. If nothing is up: **auto-start** via the same orchestrator script as `npm run chrome:cdp` (`CDP_AUTO_START=0` to disable and fail with instructions)

## Pipeline order (strict)

| Step | What | How |
|------|------|-----|
| **1** | Extract **exactly 5 keywords** | Truncate title+description+body to **500 chars** → `cursor agent -p --mode ask` → parse JSON array |
| **2** | Generate cover image | Attach **~5** geometric stock covers → prompt (minimalism + layout) → Gemini via CDP → save under `public/images/generated/` → update `article.image` |

## CLI

```bash
cd ~/home/code/blog

# Full pipeline for an article in data/articles.local.json (default theme: dark)
npm run generate:cover -- --slug 22cursor-cli

# Dark palette geometric minimalism — default
npm run generate:cover -- --slug 22cursor-cli --theme dark

# Light palette (Laws-of-UX bright poster style)
npm run generate:cover -- --slug 22cursor-cli --theme light

# Composition layout: single | 2-way | 3-way
npm run generate:cover -- --slug 22cursor-cli --layout 2-way

# Step 1 only (keywords + prompt; no Chrome needed)
npm run generate:cover -- --slug 22cursor-cli --keywords-only

# Custom extra reference cover + overwrite article.image when saved
npm run generate:cover -- --slug 22cursor-cli --cover /images/familiar-vs-novel.jpg --force

# From a markdown file or stdin
npm run generate:cover -- --file ./note.md --keywords-only
npm run generate:cover -- --stdin --title "My post" < body.txt
```

Useful flags: `--theme dark|light`, `--layout single|2-way|3-way`, `--no-send` (type only), `--no-wait` (send but skip download), `--out <path>`, `--force`.

## Prompt shape (Step 2)

Keywords from Step 1 are embedded like:

> Generate a blog cover image.  
> Study all N attached reference covers…  
> Style: flat / dark geometric minimalism (rects, circles, triangles, lines, grids)…  
> Layout: single | 2-way | 3-way…  
> Keywords to express visually: k1, k2, k3, k4, k5.  
> Landscape / wide cover suitable for a blog banner (roughly 16:9)…

**Display crop:** site CSS is unchanged from before cover-gen work (banner `16/7`, cards `5/4`, picker `16/10`, `object-fit: cover`). Do not rewrite those ratios.

**Style refs (~5):** `familiar-vs-novel`, `law-of-pragnanz`, `occams-razor`, `fitts-law`, `aesthetic-usability-effect`.

**Site dark UI** (Tossfeed-like charcoal) is separate from cover generation — do not attach Toss editorial images as cover style refs.

## Local API / UI (optional)

With `next dev` on the same machine as CDP Chrome:

- `POST /api/generate-cover` with `{ "slug": "…", "force": true, "layout": "2-way", "background": true }` shells out to the CLI (returns immediately; poll `GET ?slug=`).
- Article edit / new UI: **표지 생성**, layout pills (단일 / 2분할 / 3분할), **다시 시도** on failure.

Disabled in production unless `ALLOW_COVER_GENERATE=1`. Prefer the CLI for reliable long CDP runs.

## Implementation notes

- Upload + result extraction live in `cdp-hello/Hello/gemini-compose.mjs` (`attachReferenceImage`, `waitForGeneratedImageUrl`, `runGeminiImageGeneration`). Gemini’s DOM changes often — if attach/download fails, re-check selectors on the live UI (TODOs in that file).
- Prompt typing uses Shift+Enter for newlines; plain Enter only via `trySend` at the end.
- Blog scripts import cdp-hello rather than copying compose logic; Playwright is resolved from `cdp-hello/node_modules` (`connectOverCDP(..., { noDefaults: true })`).
- Chrome lifecycle is owned by **cdp-orchestrator**; Playwright `browser.close()` only disconnects the client.
