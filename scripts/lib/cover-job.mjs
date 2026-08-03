/**
 * Cover-generation job status files for background API runs.
 * Written by /api/generate-cover (detached child) and polled by the UI.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const BLOG_ROOT = join(__dirname, "../..");
export const COVER_JOBS_DIR = join(BLOG_ROOT, "data", "cover-jobs");
const DB_PATH = join(BLOG_ROOT, "data", "articles.local.json");

/** @param {string} slug */
export function coverJobPath(slug) {
  const safe = String(slug || "").replace(/[^a-z0-9가-힣_-]+/gi, "-");
  return join(COVER_JOBS_DIR, `${safe}.json`);
}

/** @param {string} slug */
export function readCoverJob(slug) {
  const file = coverJobPath(slug);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/** @param {string} slug @param {Record<string, unknown>} patch */
export function writeCoverJob(slug, patch) {
  mkdirSync(COVER_JOBS_DIR, { recursive: true });
  const prev = readCoverJob(slug) || {};
  const next = {
    ...prev,
    ...patch,
    slug,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(coverJobPath(slug), JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}

/** @param {string} slug */
export function readArticleImage(slug) {
  if (!existsSync(DB_PATH)) return null;
  try {
    const all = JSON.parse(readFileSync(DB_PATH, "utf8"));
    const article = all.find((a) => a.slug === slug);
    return article?.image ?? null;
  } catch {
    return null;
  }
}

/**
 * Combined status for GET /api/generate-cover?slug=
 * @param {string} slug
 */
export function getCoverJobStatus(slug) {
  const job = readCoverJob(slug);
  const image = readArticleImage(slug);
  const generated =
    typeof image === "string" && image.includes("/images/generated/");

  if (!job) {
    return {
      slug,
      status: generated ? "success" : "idle",
      image,
      publicUrl: generated ? image : null,
      error: null,
      job: null,
    };
  }

  // If job says running but article.image changed after this job started,
  // the script likely saved a new cover before finalizing the job file.
  const imageAtStart =
    typeof job.imageAtStart === "string" ? job.imageAtStart : null;
  if (
    job.status === "running" &&
    generated &&
    imageAtStart != null &&
    image !== imageAtStart
  ) {
    return {
      slug,
      status: "success",
      image,
      publicUrl: image,
      error: null,
      job: { ...job, status: "success", publicUrl: image },
    };
  }

  return {
    slug,
    status: job.status || "idle",
    image,
    publicUrl: job.publicUrl || (generated ? image : null),
    error: job.error || null,
    keywords: job.keywords || null,
    logo: job.logo || null,
    job,
  };
}
