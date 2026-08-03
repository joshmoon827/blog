#!/usr/bin/env node
/**
 * Sequential cover-image pipeline:
 *   Step 1 — cursor agent extracts exactly 5 keywords
 *   Step 2 — Gemini via CDP (cdp-hello) generates a cover from a reference image
 *
 * Usage:
 *   npm run generate:cover -- --slug <slug>
 *   npm run generate:cover -- --file article.md
 *   npm run generate:cover -- --stdin < body.txt
 *   npm run generate:cover -- --slug <slug> --keywords-only
 *   npm run generate:cover -- --slug <slug> --cover /path/to/ref.jpg --force
 *
 * Prerequisites for Step 2 (Gemini login profile via cdp-orchestrator):
 *   npm run chrome:cdp
 *   # or: cd ../cdp-hello && npm run chrome
 *   # or: cdp-orch start --user-data-dir cdp-hello --port 9222
 * Do not use cdp-hello `npm run chrome:papers` (9224 / hf-papers) for covers.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";

import {
  buildKeywordSourceText,
  extractKeywordsWithCursorAgent,
} from "./lib/keywords.mjs";
import { buildCoverPrompt } from "./lib/cover-prompt.mjs";
import { patchCoverRightCorners } from "./lib/cover-postprocess.mjs";
import {
  generateCoverViaGeminiCdp,
  redownloadCoverViaGeminiCdp,
  BLOG_ROOT,
} from "./lib/gemini-cover.mjs";
import { readCoverJob, writeCoverJob } from "./lib/cover-job.mjs";

function updateJob(patch) {
  const slug = process.env.COVER_JOB_SLUG;
  if (!slug) return;
  try {
    writeCoverJob(slug, patch);
  } catch (e) {
    console.error("[generate-cover] job status write failed:", e?.message ?? e);
  }
}

const DB_PATH = join(BLOG_ROOT, "data", "articles.local.json");
const PUBLIC_IMAGES = join(BLOG_ROOT, "public", "images");
const GENERATED_DIR = join(PUBLIC_IMAGES, "generated");

function printHelp() {
  console.log(`Usage:
  npm run generate:cover -- --slug <slug>
  npm run generate:cover -- --file <path.md>
  npm run generate:cover -- --stdin
  npm run generate:cover -- --slug <slug> --keywords-only
  npm run generate:cover -- --slug <slug> --cover /path/to/ref.jpg [--force]
  npm run generate:cover -- --slug <slug> --theme dark
  npm run generate:cover -- --slug <slug> --redownload

Options:
  --slug <slug>       Load article from data/articles.local.json
  --file <path>       Read markdown file (optional YAML frontmatter)
  --stdin             Read body from stdin
  --title <text>      Override title (with --file / --stdin)
  --description <t>   Override description
  --cover <path>      Extra reference cover (absolute, or /images/... under public)
  --theme <dark|light> Cover palette (default: dark — geometric minimalism)
  --out <path>        Output image path (default: public/images/generated/<slug>-<ts>.png)
  --force             Overwrite --out if it exists
  --redownload        Re-download image from open Gemini page (skip keywords + prompt)
  --keywords-only     Step 1 only (dry-run for Gemini). Prints keywords + prompt
  --no-send           Attach + type prompt but do not send (Gemini UI check)
  --no-wait           Send but do not wait for / download result image
  --keep-open-ms <n>  Leave Gemini tab open after run (default 3000)
  --additional-prompt <t>  Optional extra instructions for keyword agent + Gemini prompt
  --palette <#hex,...>     Motif palette hex list (comma-separated)
  --background-color <#hex> Forced solid background hex (omit = default prompt)
  --product-related   Emphasize product/software logos (default)
  --no-product-related  Skip product logo priority; abstract geometry only
  --help              Show this help
`);
}

function parseArgs(argv) {
  const args = {
    slug: null,
    file: null,
    stdin: false,
    title: null,
    description: null,
    cover: null,
    theme: "dark",
    out: null,
    force: false,
    redownload: false,
    keywordsOnly: false,
    additionalPrompt: null,
    /** @type {string[] | null} */
    paletteColors: null,
    /** @type {string | null} */
    backgroundColor: null,
    productRelated: true,
    extraRefs: [],
    send: true,
    wait: true,
    keepOpenMs: 3000,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v == null) throw new Error(`Missing value for ${a}`);
      return v;
    };
    switch (a) {
      case "--slug":
        args.slug = next();
        break;
      case "--file":
        args.file = next();
        break;
      case "--stdin":
        args.stdin = true;
        break;
      case "--title":
        args.title = next();
        break;
      case "--description":
        args.description = next();
        break;
      case "--cover":
        args.cover = next();
        break;
      case "--theme": {
        const t = next().toLowerCase();
        if (t !== "dark" && t !== "light") {
          throw new Error(`--theme must be dark|light, got: ${t}`);
        }
        args.theme = t;
        break;
      }
      case "--out":
        args.out = next();
        break;
      case "--force":
        args.force = true;
        break;
      case "--redownload":
        args.redownload = true;
        break;
      case "--keywords-only":
      case "--dry-run":
        args.keywordsOnly = true;
        break;
      case "--additional-prompt":
        args.additionalPrompt = next();
        break;
      case "--palette": {
        // Comma-separated hex: #a1b2c3,#d4e5f6,...
        const raw = next();
        args.paletteColors = raw
          .split(/[,;\s]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => (s.startsWith("#") ? s : `#${s}`));
        break;
      }
      case "--background-color":
      case "--bg-color": {
        const raw = next().trim();
        const withHash = raw.startsWith("#") ? raw : `#${raw}`;
        if (!/^#[0-9a-fA-F]{6}$/.test(withHash)) {
          throw new Error(`--background-color must be #rrggbb, got: ${raw}`);
        }
        args.backgroundColor = withHash.toLowerCase();
        break;
      }
      case "--extra-ref":
        args.extraRefs.push(next());
        break;
      case "--no-product-related":
        args.productRelated = false;
        break;
      case "--product-related":
        args.productRelated = true;
        break;
      case "--no-send":
        args.send = false;
        break;
      case "--no-wait":
        args.wait = false;
        break;
      case "--keep-open-ms":
        args.keepOpenMs = Number(next());
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  return args;
}

function stripQuotes(value) {
  const t = value.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function parseMarkdown(source) {
  const text = source.replace(/^\uFEFF/, "");
  if (!text.startsWith("---")) {
    return { fm: {}, body: text.trimStart() };
  }
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: text.trimStart() };
  const yaml = text.slice(4, end).trim();
  const body = text.slice(end + 4).replace(/^\n/, "");
  const fm = {};
  for (const line of yaml.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) fm[m[1]] = stripQuotes(m[2]);
  }
  return { fm, body };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function loadArticleBySlug(slug) {
  if (!existsSync(DB_PATH)) {
    throw new Error(`Missing ${DB_PATH}`);
  }
  const all = JSON.parse(readFileSync(DB_PATH, "utf8"));
  const article = all.find((a) => a.slug === slug);
  if (!article) throw new Error(`Article not found: ${slug}`);
  return { article, all };
}

function isGeneratedCoverPath(p) {
  const n = String(p || "").replace(/\\/g, "/");
  return n.includes("/images/generated/") || n.includes("/generated/");
}

const STOCK_IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/** @returns {string[]} absolute paths to stock covers (not generated/) */
function listStockCoverPaths() {
  if (!existsSync(PUBLIC_IMAGES)) return [];
  return readdirSync(PUBLIC_IMAGES)
    .filter((name) => {
      const ext = extname(name).toLowerCase();
      return STOCK_IMAGE_EXT.has(ext);
    })
    .map((name) => join(PUBLIC_IMAGES, name))
    .filter((p) => existsSync(p) && !isGeneratedCoverPath(p));
}

/** Fisher–Yates shuffle (mutates copy). @param {string[]} arr @returns {string[]} */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick `count` random stock covers. @param {number} count @returns {string[]} */
function pickRandomStockCovers(count = 5) {
  const pool = listStockCoverPaths();
  if (pool.length === 0) {
    throw new Error(`No stock cover examples found under ${PUBLIC_IMAGES}`);
  }
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

/** Prefer a real stock cover, never a prior Gemini output. */
function defaultStockCoverPath() {
  const [first] = pickRandomStockCovers(1);
  if (first) return first;
  throw new Error(`No stock cover found under ${PUBLIC_IMAGES}`);
}

/**
 * Resolve style-reference covers for Gemini attach.
 * Author --extra-ref photos first, then stock fills (up to 5 total).
 *
 * @param {{ coverArg?: string | null, extraRefs?: string[] }} opts
 * @returns {string[]}
 */
function resolveExampleCoverPaths({ coverArg = null, extraRefs = [] } = {}) {
  const chosen = [];
  const seen = new Set();

  const push = (abs, { allowGenerated = false } = {}) => {
    if (!abs || !existsSync(abs)) return;
    if (!allowGenerated && isGeneratedCoverPath(abs)) return;
    const key = resolve(abs);
    if (seen.has(key)) return;
    seen.add(key);
    chosen.push(key);
  };

  for (const raw of extraRefs || []) {
    if (!raw) continue;
    const abs = isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
    push(abs, { allowGenerated: true });
  }

  if (coverArg) push(resolveCoverPath(coverArg, null));

  const random = shuffle(
    listStockCoverPaths().filter((p) => !seen.has(resolve(p)))
  );
  for (const p of random) {
    push(p);
    if (chosen.length >= 5) break;
  }

  if (chosen.length === 0) {
    throw new Error(`No stock cover examples found under ${PUBLIC_IMAGES}`);
  }
  return chosen.slice(0, 5);
}

function resolveCoverPath(coverArg, articleImage) {
  const raw = coverArg || articleImage;
  if (!raw) {
    console.warn(
      "[generate-cover] no cover arg / article.image — using stock reference"
    );
    return defaultStockCoverPath();
  }

  let resolved = null;
  if (isAbsolute(raw) && existsSync(raw)) resolved = raw;
  else if (raw.startsWith("/images/")) {
    const local = join(BLOG_ROOT, "public", raw.replace(/^\//, ""));
    if (existsSync(local)) resolved = local;
  }
  if (!resolved) {
    const asRel = resolve(process.cwd(), raw);
    if (existsSync(asRel)) resolved = asRel;
  }
  if (!resolved) {
    const underPublic = join(PUBLIC_IMAGES, basename(raw));
    if (existsSync(underPublic)) resolved = underPublic;
  }

  if (!resolved) {
    console.warn(
      `[generate-cover] reference not found (${raw}) — using stock cover`
    );
    return defaultStockCoverPath();
  }

  // Prior generated outputs are poor style refs — use a stock cover.
  if (isGeneratedCoverPath(resolved)) {
    const stock = defaultStockCoverPath();
    console.warn(
      `[generate-cover] refusing generated cover as style reference:\n  ${resolved}\n  → ${stock}`
    );
    return stock;
  }

  return resolved;
}

function defaultOutPath(slug) {
  const safe = (slug || "cover").replace(/[^a-z0-9가-힣_-]+/gi, "-");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return join(GENERATED_DIR, `${safe}-${ts}.png`);
}

function publicUrlForOut(outPath) {
  const abs = resolve(outPath);
  const prefix = join(BLOG_ROOT, "public");
  if (abs.startsWith(prefix)) {
    return abs.slice(prefix.length).replace(/\\/g, "/");
  }
  return abs;
}

function updateArticleImage(slug, imageUrl) {
  const { all } = loadArticleBySlug(slug);
  const idx = all.findIndex((a) => a.slug === slug);
  all[idx] = { ...all[idx], image: imageUrl };
  writeFileSync(DB_PATH, JSON.stringify(all, null, 2) + "\n", "utf8");
}

function resolveRedownloadOutPath(slug, args) {
  if (args.out) return resolve(args.out);
  const prevJob = slug ? readCoverJob(slug) : null;
  if (
    typeof prevJob?.savedPath === "string" &&
    existsSync(prevJob.savedPath)
  ) {
    return resolve(prevJob.savedPath);
  }
  return defaultOutPath(slug || "cover");
}

async function finalizeSavedCover({ slug, result, patchJob = {} }) {
  if (result.savedPath && existsSync(result.savedPath)) {
    try {
      const patch = await patchCoverRightCorners(result.savedPath);
      console.log(
        "[generate-cover] post-process right corners:",
        `top ${patch.topH}px + bottom ${patch.bottomH}px × ${patch.cornerW}px`
      );
    } catch (e) {
      console.error(
        "[generate-cover] corner post-process failed:",
        e?.message ?? e
      );
      throw new Error(
        `표지 후처리 실패 (오른쪽 구석 패치): ${e?.message ?? e}`
      );
    }
  }

  const publicUrl = result.savedPath
    ? publicUrlForOut(result.savedPath)
    : null;

  if (publicUrl && slug) {
    if (!result.savedPath || !existsSync(result.savedPath)) {
      throw new Error(
        `표지 파일이 디스크에 없습니다: ${result.savedPath || "(empty)"}`
      );
    }
    updateArticleImage(slug, publicUrl);
    console.log("[generate-cover] updated article.image →", publicUrl);
  }

  updateJob({
    status: "success",
    finishedAt: new Date().toISOString(),
    publicUrl,
    savedPath: result.savedPath || null,
    error: null,
    ...patchJob,
  });

  return { publicUrl };
}

async function runRedownloadFlow({ args, slug }) {
  if (!slug) {
    throw new Error("--redownload requires --slug");
  }

  const outPath = resolveRedownloadOutPath(slug, args);
  mkdirSync(dirname(outPath), { recursive: true });

  console.log("[generate-cover] redownload mode — Gemini page scrape only");
  console.log("[generate-cover] out:", outPath);

  const result = await redownloadCoverViaGeminiCdp({
    outPath,
    keepOpenMs: args.keepOpenMs,
  });

  const { publicUrl } = await finalizeSavedCover({
    slug,
    result,
    patchJob: { mode: "redownload" },
  });

  if (!publicUrl) {
    throw new Error("표지 이미지가 저장되지 않았습니다 (savedPath 없음).");
  }

  console.log(
    JSON.stringify(
      {
        step: "redownload",
        imageUrl: result.imageUrl,
        savedPath: result.savedPath,
        publicUrl,
        pageUrl: result.pageUrl,
      },
      null,
      2
    )
  );
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    printHelp();
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  const additionalPrompt =
    (
      args.additionalPrompt ||
      process.env.COVER_ADDITIONAL_PROMPT ||
      process.env.COVER_EXTRA_PROMPT ||
      ""
    ).trim() || null;

  /** Resolve selected cover palette: CLI --palette > env > cover-palettes.json by cover path. */
  function resolvePaletteColors() {
    if (Array.isArray(args.paletteColors) && args.paletteColors.length) {
      return args.paletteColors;
    }
    const fromEnv = (process.env.COVER_PALETTE_COLORS || "").trim();
    if (fromEnv) {
      return fromEnv
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (s.startsWith("#") ? s : `#${s}`));
    }
    try {
      const map = JSON.parse(
        readFileSync(join(BLOG_ROOT, "data", "cover-palettes.json"), "utf8")
      );
      const coverKey = (() => {
        const raw = args.cover || "";
        if (!raw) return "";
        const norm = raw.replace(/\\/g, "/");
        const idx = norm.lastIndexOf("/images/");
        if (idx >= 0) return norm.slice(idx);
        if (norm.startsWith("/images/")) return norm;
        return "";
      })();
      if (coverKey && Array.isArray(map[coverKey])) return map[coverKey];
    } catch {
      /* ignore */
    }
    return [];
  }

  const paletteColors = resolvePaletteColors();

  function resolveBackgroundColor() {
    if (args.backgroundColor) return args.backgroundColor;
    const fromEnv = (process.env.COVER_BACKGROUND_COLOR || "").trim();
    if (!fromEnv) return null;
    const withHash = fromEnv.startsWith("#") ? fromEnv : `#${fromEnv}`;
    return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : null;
  }

  const backgroundColor = resolveBackgroundColor();
  const productRelated =
    process.env.COVER_PRODUCT_RELATED === "0"
      ? false
      : process.env.COVER_PRODUCT_RELATED === "1"
        ? true
        : args.productRelated;

  let title = args.title || "";
  let description = args.description || "";
  let body = "";
  let slug = args.slug || null;
  let articleImage = null;

  if (args.slug) {
    const { article } = loadArticleBySlug(args.slug);
    title = args.title ?? article.title ?? "";
    description = args.description ?? article.description ?? "";
    body = article.body ?? "";
    articleImage = article.image;
    slug = article.slug;
  } else if (args.file) {
    const src = readFileSync(resolve(args.file), "utf8");
    const { fm, body: mdBody } = parseMarkdown(src);
    title = args.title ?? fm.title ?? basename(args.file, extname(args.file));
    description = args.description ?? fm.description ?? "";
    body = mdBody;
    articleImage = fm.image || fm.cover || null;
    slug = slug || basename(args.file, extname(args.file));
  } else if (args.stdin) {
    body = await readStdin();
    title = args.title || "stdin";
  } else {
    console.error("Provide --slug, --file, or --stdin");
    printHelp();
    process.exit(1);
  }

  if (slug && process.env.COVER_JOB_SLUG) {
    updateJob({
      status: "running",
      mode: args.redownload ? "redownload" : "generate",
      startedAt: new Date().toISOString(),
    });
  }

  if (args.redownload) {
    await runRedownloadFlow({ args, slug });
    return;
  }

  const sourceText = buildKeywordSourceText("", description, body);
  console.log("[generate-cover] Step 1: keywords via cursor agent");
  console.log("[generate-cover] title:", title);
  console.log("[generate-cover] source chars:", sourceText.length, "/ 500");
  if (additionalPrompt) {
    console.log("[generate-cover] additional prompt:", additionalPrompt.slice(0, 120));
  }
  if (paletteColors.length) {
    console.log("[generate-cover] palette:", paletteColors.join(", "));
  }
  if (backgroundColor) {
    console.log("[generate-cover] background color:", backgroundColor);
  }
  console.log("[generate-cover] product-related:", productRelated);

  const { keywords, logo, raw } = await extractKeywordsWithCursorAgent(sourceText, {
    title,
    additionalPrompt: additionalPrompt || undefined,
    productRelated,
  });
  console.log("[generate-cover] keywords:", keywords.join(", "));
  console.log("[generate-cover] logo:", logo);
  updateJob({ keywords, logo });

  const theme = args.theme === "light" ? "light" : "dark";
  const authorRefCount = (args.extraRefs || []).filter(Boolean).length;
  const exampleCovers = resolveExampleCoverPaths({
    coverArg: args.cover,
    extraRefs: args.extraRefs || [],
  });
  const primaryCover = exampleCovers[0];
  console.log(`[generate-cover] theme: ${theme}`);
  console.log(
    `[generate-cover] example covers (${exampleCovers.length}):`,
    exampleCovers.map((p) => basename(p)).join(", ")
  );
  if (authorRefCount) {
    console.log(`[generate-cover] author extra refs: ${authorRefCount}`);
  }

  const prompt = buildCoverPrompt(keywords, {
    title,
    logo,
    theme,
    referenceCount: exampleCovers.length,
    additionalPrompt: additionalPrompt || undefined,
    productRelated,
    authorReferenceCount: authorRefCount,
    paletteColors,
    backgroundColor: backgroundColor || undefined,
  });
  console.log("[generate-cover] Step 2 prompt:\n---\n" + prompt + "\n---");

  if (args.keywordsOnly) {
    console.log(
      JSON.stringify(
        {
          step: 1,
          keywords,
          logo,
          theme,
          prompt,
          coverPath: primaryCover,
          exampleCovers,
          sourceText,
          agentRawPreview: raw.slice(0, 400),
        },
        null,
        2
      )
    );
    updateJob({
      status: "success",
      finishedAt: new Date().toISOString(),
      keywordsOnly: true,
    });
    return;
  }

  const outPath = resolve(args.out || defaultOutPath(slug || "cover"));

  if (existsSync(outPath) && !args.force) {
    throw new Error(`Output exists (use --force): ${outPath}`);
  }

  console.log("[generate-cover] Step 2: Gemini CDP image generation");
  console.log("[generate-cover] theme:", theme);
  console.log("[generate-cover] cover refs:", exampleCovers.join("\n  "));
  console.log("[generate-cover] out:", outPath);

  const result = await generateCoverViaGeminiCdp({
    prompt,
    referenceImagePaths: exampleCovers,
    outPath,
    shouldSend: args.send,
    waitForResult: args.wait && args.send,
    keepOpenMs: args.keepOpenMs,
  });

  let publicUrl = null;
  if (result.savedPath && existsSync(result.savedPath)) {
    ({ publicUrl } = await finalizeSavedCover({
      slug: args.slug,
      result,
      patchJob: {
        mode: "generate",
        attach: result.attach || null,
        theme,
        logo,
        exampleCovers: exampleCovers.map((p) => basename(p)),
      },
    }));
  } else if (args.wait && args.send) {
    throw new Error("표지 이미지가 저장되지 않았습니다 (savedPath 없음).");
  } else {
    updateJob({
      status: "success",
      finishedAt: new Date().toISOString(),
      mode: "generate",
      attach: result.attach || null,
      theme,
      logo,
      exampleCovers: exampleCovers.map((p) => basename(p)),
      error: null,
    });
  }

  console.log(
    JSON.stringify(
      {
        step: 2,
        keywords,
        logo,
        theme,
        prompt,
        exampleCovers: exampleCovers.map((p) => basename(p)),
        attach: result.attach,
        imageUrl: result.imageUrl,
        savedPath: result.savedPath,
        publicUrl,
        pageUrl: result.pageUrl,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  const msg = e?.message ?? String(e);
  console.error("[generate-cover]", msg);
  updateJob({
    status: "error",
    finishedAt: new Date().toISOString(),
    error: msg,
  });
  process.exit(1);
});
