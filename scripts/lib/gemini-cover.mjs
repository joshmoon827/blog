/**
 * Step 2 helpers: connect to CDP Chrome and run Gemini image generation.
 * CDP must come from cdp-orchestrator with the cdp-hello user-data-dir
 * (~/.chrome-cdp-hello) so Google/Gemini login is already present.
 * Reuses cdp-hello compose (no Imagen REST API).
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_ROOT = join(__dirname, "../..");
const CDP_HELLO = join(BLOG_ROOT, "..", "cdp-hello");
const START_CHROME_ORCH = join(CDP_HELLO, "common", "start-chrome-orchestrator.mjs");

/** Gemini cover profile — same as `cdp-hello npm run chrome` (not chrome:papers / 9224). */
const GEMINI_USER_DATA_DIR_NAME = "cdp-hello";
const GEMINI_USER_DATA_DIR_PATH = join(homedir(), ".chrome-cdp-hello");
const GEMINI_CDP_PORT = process.env.CDP_PORT ?? "9222";
const PREFERRED_CDP_URL = `http://127.0.0.1:${GEMINI_CDP_PORT}`;

const requireFromCdpHello = createRequire(join(CDP_HELLO, "package.json"));

const CDP_HINT = [
  "CDP는 cdp-orchestrator + Gemini 로그인 프로필(cdp-hello / ~/.chrome-cdp-hello)로 띄워야 합니다.",
  "  blog:     npm run chrome:cdp",
  "  또는:     cd ../cdp-hello && npm run chrome",
  "  직접:     cdp-orch start --user-data-dir cdp-hello --port 9222",
  "주의: `npm run chrome:papers`(9224 / hf-papers)는 표지 생성용 프로필이 아닙니다.",
].join("\n");

function loadPlaywright() {
  try {
    return requireFromCdpHello("playwright");
  } catch {
    try {
      const requireBlog = createRequire(join(BLOG_ROOT, "package.json"));
      return requireBlog("playwright");
    } catch {
      throw new Error(
        "playwright not found. Install in cdp-hello (`cd ../cdp-hello && npm i`) or blog."
      );
    }
  }
}

async function importCdpHello(rel) {
  const full = join(CDP_HELLO, rel);
  return import(pathToFileURL(full).href);
}

function readCdpUrlFile(file) {
  if (!existsSync(file)) return null;
  const v = readFileSync(file, "utf8").trim();
  return v || null;
}

function cdpUrlPort(url) {
  try {
    const u = new URL(url.includes("://") ? url : `http://${url}`);
    return u.port || (u.protocol === "https:" ? "443" : "80");
  } catch {
    return null;
  }
}

async function isCdpReachable(cdpUrl) {
  try {
    const { fetchCdpVersion } = await importCdpHello("common/cdp-utils.mjs");
    await fetchCdpVersion(cdpUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Candidate CDP URLs for cover gen (Gemini profile), in preference order.
 * Skips stale cdp-hello/.cdp-url leftovers from chrome:papers (9224) unless
 * CDP_URL is set explicitly or that URL is the preferred gemini port.
 */
export function listBlogCdpCandidates() {
  const out = [];
  const seen = new Set();
  const push = (url) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };

  if (process.env.CDP_URL) push(process.env.CDP_URL.trim());
  push(PREFERRED_CDP_URL);

  for (const file of [
    join(BLOG_ROOT, ".cdp-url"),
    join(process.cwd(), ".cdp-url"),
    join(CDP_HELLO, ".cdp-url"),
  ]) {
    const v = readCdpUrlFile(file);
    if (!v) continue;
    // Ignore papers/other-profile leftovers unless they match the gemini port
    // or the caller forced CDP_URL (already pushed above).
    const port = cdpUrlPort(v);
    if (port && port !== String(GEMINI_CDP_PORT) && !process.env.CDP_URL) {
      continue;
    }
    push(v);
  }

  return out;
}

/**
 * Sync resolver kept for callers that only need a best-guess URL.
 * Prefer `resolveLiveBlogCdpUrl` / `ensureBlogCdpUrl` for real connections.
 */
export function resolveBlogCdpUrl() {
  return listBlogCdpCandidates()[0] ?? PREFERRED_CDP_URL;
}

/** First reachable candidate, or null. */
export async function resolveLiveBlogCdpUrl() {
  for (const url of listBlogCdpCandidates()) {
    if (await isCdpReachable(url)) return url;
  }
  return null;
}

/**
 * Start/attach Chrome via the same orchestrator path as `cdp-hello npm run chrome`
 * (user-data-dir cdp-hello → ~/.chrome-cdp-hello, default port 9222).
 */
export function startChromeViaOrchestrator() {
  if (!existsSync(START_CHROME_ORCH)) {
    return Promise.reject(
      new Error(
        `Missing ${START_CHROME_ORCH}\n→ cdp-hello 저장소와 cdp-orchestrator가 blog 옆에 있어야 합니다.\n${CDP_HINT}`
      )
    );
  }

  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      CDP_PORT: String(GEMINI_CDP_PORT),
      CDP_USER_DATA_DIR_NAME: GEMINI_USER_DATA_DIR_NAME,
      CDP_USER_DATA_DIR_PATH: GEMINI_USER_DATA_DIR_PATH,
    };
    // Avoid inheriting a papers/other override that would point orch at the wrong profile.
    delete env.CDP_URL;

    const child = spawn(process.execPath, [START_CHROME_ORCH], {
      cwd: CDP_HELLO,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => {
      const s = c.toString();
      stdout += s;
      process.stderr.write(s);
    });
    child.stderr.on("data", (c) => {
      const s = c.toString();
      stderr += s;
      process.stderr.write(s);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else {
        reject(
          new Error(
            `cdp-orchestrator Chrome start failed (exit ${code})\n${(stderr || stdout).slice(-800)}\n${CDP_HINT}`
          )
        );
      }
    });
  });
}

/**
 * Resolve a live CDP URL for the Gemini cover profile.
 * If none is up and autoStart is true, run cdp-hello's orchestrator start script.
 *
 * @param {{ autoStart?: boolean }} [opts]
 */
export async function ensureBlogCdpUrl(opts = {}) {
  const autoStart =
    opts.autoStart !== false &&
    process.env.CDP_AUTO_START !== "0" &&
    process.env.CDP_AUTO_START !== "false";

  const live = await resolveLiveBlogCdpUrl();
  if (live) return live;

  if (!autoStart) {
    throw new Error(
      `CDP 연결 실패 (tried: ${listBlogCdpCandidates().join(", ")})\n${CDP_HINT}`
    );
  }

  console.log(
    `[generate-cover] CDP not reachable — starting via cdp-orchestrator` +
      ` (user-data-dir: ${GEMINI_USER_DATA_DIR_NAME} → ${GEMINI_USER_DATA_DIR_PATH}, port ${GEMINI_CDP_PORT})`
  );
  await startChromeViaOrchestrator();

  const afterFile = readCdpUrlFile(join(CDP_HELLO, ".cdp-url"));
  const afterCandidates = [
    afterFile,
    PREFERRED_CDP_URL,
    ...listBlogCdpCandidates(),
  ].filter(Boolean);

  for (const url of afterCandidates) {
    if (await isCdpReachable(url)) return url;
  }

  throw new Error(
    `CDP still unreachable after orchestrator start (expected ${PREFERRED_CDP_URL})\n${CDP_HINT}`
  );
}

/**
 * Pick / open a Gemini page on an existing CDP browser context.
 * @param {import('playwright').BrowserContext} context
 * @param {string} openUrl
 */
export async function pickGeminiPage(context, openUrl) {
  const isChromeInternal = (u) =>
    !u || u.startsWith("devtools://") || u.startsWith("chrome-extension://");
  const isBlankish = (u) =>
    u === "about:blank" ||
    u.startsWith("chrome://new-tab") ||
    u === "chrome://newtab/";

  let page = context.pages().find((p) => p.url().includes("gemini.google.com"));
  if (!page) {
    page = context
      .pages()
      .find((p) => !isChromeInternal(p.url()) && isBlankish(p.url()));
  }
  if (!page) {
    page = context.pages().find((p) => !isChromeInternal(p.url()));
  }
  if (!page) {
    page = await context.newPage();
  }

  await page.bringToFront().catch(() => {});
  await page.goto(openUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  return page;
}

/**
 * @param {{
 *   prompt: string,
 *   referenceImagePath?: string | string[],
 *   referenceImagePaths?: string[],
 *   outPath: string,
 *   shouldSend?: boolean,
 *   waitForResult?: boolean,
 *   keepOpenMs?: number,
 *   openUrl?: string,
 *   timeoutMs?: number,
 *   autoStartCdp?: boolean,
 * }} opts
 */
export async function generateCoverViaGeminiCdp(opts) {
  const {
    prompt,
    referenceImagePath,
    referenceImagePaths,
    outPath,
    shouldSend = true,
    waitForResult = true,
    keepOpenMs = 3_000,
    openUrl = process.env.OPEN_URL ?? "https://gemini.google.com/app",
    timeoutMs = 180_000,
    autoStartCdp = true,
  } = opts;

  const refs = [
    ...(Array.isArray(referenceImagePaths) ? referenceImagePaths : []),
    ...(referenceImagePath
      ? Array.isArray(referenceImagePath)
        ? referenceImagePath
        : [referenceImagePath]
      : []),
  ].filter(Boolean);
  // Dedupe while preserving order
  const seen = new Set();
  const referencePaths = refs.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });

  const { chromium } = loadPlaywright();
  const { cdpHttpOrigin, fetchCdpVersion } = await importCdpHello(
    "common/cdp-utils.mjs"
  );
  const { runGeminiImageGeneration } = await importCdpHello(
    "Hello/gemini-compose.mjs"
  );

  let cdpUrl;
  try {
    cdpUrl = await ensureBlogCdpUrl({ autoStart: autoStartCdp });
  } catch (e) {
    throw new Error(e.message ?? String(e));
  }

  const origin = cdpHttpOrigin(cdpUrl);
  console.log(`[generate-cover] CDP URL: ${origin}`);

  try {
    await fetchCdpVersion(cdpUrl);
  } catch (e) {
    throw new Error(
      `CDP 연결 실패 (${origin}): ${e.message ?? e}\n${CDP_HINT}`
    );
  }

  let browser;
  try {
    // Chrome 149+ rejects Browser.setDownloadBehavior on some CDP attaches
    // ("Browser context management is not supported"). Playwright ≥1.60
    // noDefaults skips that override when attaching to an existing browser.
    browser = await chromium.connectOverCDP(cdpUrl, { noDefaults: true });
  } catch (e) {
    const msg = e?.message ?? String(e);
    if (/setDownloadBehavior|context management is not supported/i.test(msg)) {
      throw new Error(
        `Playwright CDP 연결 실패: ${msg}\n` +
          `→ playwright ≥1.60 필요 (noDefaults). cdp-hello에서: npm i playwright@^1.61`
      );
    }
    throw new Error(`Playwright CDP 연결 실패: ${msg}`);
  }

  try {
    const context = browser.contexts()[0];
    if (!context) {
      throw new Error("브라우저 컨텍스트가 없습니다. Chrome을 재시작해 보세요.");
    }

    const page = await pickGeminiPage(context, openUrl);
    console.log("[generate-cover] Gemini URL:", page.url());
    console.log(
      `[generate-cover] references (${referencePaths.length}):`,
      referencePaths.map((p) => basename(p)).join(", ")
    );

    const result = await runGeminiImageGeneration(page, {
      prompt,
      shouldSend,
      referenceImagePaths: referencePaths,
      waitForResult,
      timeoutMs,
      outPath: waitForResult ? outPath : undefined,
    });

    if (keepOpenMs > 0) {
      await new Promise((r) => setTimeout(r, keepOpenMs));
    }

    return {
      ...result,
      cdpUrl: origin,
      pageUrl: page.url(),
      referencePaths,
    };
  } finally {
    // Disconnect Playwright only — leave orchestrator-managed Chrome running.
    await browser.close().catch(() => {});
  }
}

/**
 * Re-download cover from an existing Gemini generation (no prompt / attach).
 * @param {{
 *   outPath: string,
 *   keepOpenMs?: number,
 *   openUrl?: string,
 *   autoStartCdp?: boolean,
 * }} opts
 */
export async function redownloadCoverViaGeminiCdp(opts) {
  const {
    outPath,
    keepOpenMs = 3_000,
    openUrl = process.env.OPEN_URL ?? "https://gemini.google.com/app",
    autoStartCdp = true,
  } = opts;

  const { chromium } = loadPlaywright();
  const { cdpHttpOrigin, fetchCdpVersion } = await importCdpHello(
    "common/cdp-utils.mjs"
  );
  const { redownloadGeneratedImageFromPage } = await importCdpHello(
    "Hello/gemini-compose.mjs"
  );

  let cdpUrl;
  try {
    cdpUrl = await ensureBlogCdpUrl({ autoStart: autoStartCdp });
  } catch (e) {
    throw new Error(e.message ?? String(e));
  }

  const origin = cdpHttpOrigin(cdpUrl);
  console.log(`[generate-cover] CDP URL (redownload): ${origin}`);

  try {
    await fetchCdpVersion(cdpUrl);
  } catch (e) {
    throw new Error(
      `CDP 연결 실패 (${origin}): ${e.message ?? e}\n${CDP_HINT}`
    );
  }

  let browser;
  try {
    browser = await chromium.connectOverCDP(cdpUrl, { noDefaults: true });
  } catch (e) {
    const msg = e?.message ?? String(e);
    if (/setDownloadBehavior|context management is not supported/i.test(msg)) {
      throw new Error(
        `Playwright CDP 연결 실패: ${msg}\n` +
          `→ playwright ≥1.60 필요 (noDefaults). cdp-hello에서: npm i playwright@^1.61`
      );
    }
    throw new Error(`Playwright CDP 연결 실패: ${msg}`);
  }

  try {
    const context = browser.contexts()[0];
    if (!context) {
      throw new Error("브라우저 컨텍스트가 없습니다. Chrome을 재시작해 보세요.");
    }

    const page = await pickGeminiPage(context, openUrl);
    console.log("[generate-cover] Gemini URL (redownload):", page.url());

    const result = await redownloadGeneratedImageFromPage(page, outPath, {
      openUrl,
    });

    if (keepOpenMs > 0) {
      await new Promise((r) => setTimeout(r, keepOpenMs));
    }

    return {
      ...result,
      cdpUrl: origin,
      pageUrl: page.url(),
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

export {
  CDP_HELLO,
  BLOG_ROOT,
  PREFERRED_CDP_URL,
  GEMINI_USER_DATA_DIR_NAME,
  GEMINI_USER_DATA_DIR_PATH,
  CDP_HINT,
};
