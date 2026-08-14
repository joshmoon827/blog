/**
 * Cover-generation job status files for background API runs.
 * Written by /api/generate-cover (detached child) and polled by the UI.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

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

/** @param {unknown} pid */
export function isCoverPidAlive(pid) {
  const n = typeof pid === "number" ? pid : Number(pid);
  if (!Number.isFinite(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * True when pid is alive and looks like our generate-cover worker.
 * Avoids killing a recycled PID that belongs to another process.
 * @param {unknown} pid
 */
export function isCoverWorkerPid(pid) {
  const n = typeof pid === "number" ? pid : Number(pid);
  if (!Number.isFinite(n) || n <= 0) return false;
  if (!isCoverPidAlive(n)) return false;
  try {
    // macOS / Linux: command line for the pid
    const out = execFileSync("ps", ["-p", String(n), "-o", "command="], {
      encoding: "utf8",
    }).trim();
    return /generate-cover\.mjs/.test(out);
  } catch {
    // If we cannot inspect, do not treat as our worker (safer).
    return false;
  }
}

/**
 * Kill a detached generate-cover child (process group when possible).
 * @param {unknown} pid
 * @returns {{ killed: boolean, signal?: string, error?: string }}
 */
export function killCoverPid(pid) {
  const n = typeof pid === "number" ? pid : Number(pid);
  if (!Number.isFinite(n) || n <= 0) {
    return { killed: false, error: "no pid" };
  }
  if (!isCoverPidAlive(n)) {
    return { killed: false, error: "not running" };
  }
  if (!isCoverWorkerPid(n)) {
    return { killed: false, error: "pid is not a generate-cover worker" };
  }

  const tryKill = (target, signal) => {
    try {
      process.kill(target, signal);
      return true;
    } catch {
      return false;
    }
  };

  // Detached spawn → own process group; negative pid kills the group.
  if (!tryKill(-n, "SIGTERM") && !tryKill(n, "SIGTERM")) {
    return { killed: false, error: "kill failed" };
  }
  // Cancel should stop immediately — escalate if the worker ignores TERM.
  if (isCoverPidAlive(n) && isCoverWorkerPid(n)) {
    tryKill(-n, "SIGKILL") || tryKill(n, "SIGKILL");
    return { killed: true, signal: "SIGKILL" };
  }
  return { killed: true, signal: "SIGTERM" };
}

/**
 * Mark job cancelled and kill the worker if still alive.
 * @param {string} slug
 */
export function cancelCoverJob(slug) {
  const job = readCoverJob(slug);
  if (!job) {
    return { ok: true, slug, status: "idle", killed: false, already: "no-job" };
  }
  if (job.status !== "running") {
    return {
      ok: true,
      slug,
      status: job.status || "idle",
      killed: false,
      already: job.status || "idle",
      job,
    };
  }

  const kill = killCoverPid(job.pid);
  const next = writeCoverJob(slug, {
    status: "cancelled",
    finishedAt: new Date().toISOString(),
    error: "Cancelled by user",
    pid: null,
  });
  return {
    ok: true,
    slug,
    status: "cancelled",
    killed: kill.killed,
    killSignal: kill.signal || null,
    killError: kill.error || null,
    job: next,
  };
}

/**
 * If status is running but the worker PID is gone, finalize as error (zombie heal).
 * @param {string} slug
 * @param {Record<string, unknown> | null} [job]
 */
export function healStaleRunningCoverJob(slug, job = readCoverJob(slug)) {
  if (!job || job.status !== "running") return job;
  const pid = job.pid;
  const hasPid = typeof pid === "number" || (typeof pid === "string" && String(pid).trim());
  if (hasPid && isCoverWorkerPid(pid)) return job;

  const startedAt = job.startedAt ? Date.parse(String(job.startedAt)) : 0;
  // No pid yet (spawn race): give it a few seconds before declaring dead.
  if (!hasPid && startedAt && Date.now() - startedAt < 15_000) return job;

  return writeCoverJob(slug, {
    status: "error",
    finishedAt: new Date().toISOString(),
    error: hasPid
      ? `Cover worker process exited unexpectedly (pid ${pid})`
      : "Cover worker process never started or exited unexpectedly",
    pid: null,
  });
}

/**
 * Combined status for GET /api/generate-cover?slug=
 * @param {string} slug
 */
export function getCoverJobStatus(slug) {
  let job = readCoverJob(slug);
  job = healStaleRunningCoverJob(slug, job);
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
