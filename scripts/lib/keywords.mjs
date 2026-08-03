/**
 * Step 1: extract 5 keywords + required logo brief via `cursor agent -p`.
 */

import { spawn } from "node:child_process";

export const KEYWORD_TEXT_MAX = 500;

/** @param {string} title @param {string} [description] @param {string} [body] */
export function buildKeywordSourceText(title, description = "", body = "") {
  const parts = [title, description, body].map((s) => (s || "").trim()).filter(Boolean);
  const joined = parts.join("\n\n");
  return joined.slice(0, KEYWORD_TEXT_MAX);
}

/**
 * @param {string} sourceText truncated article text (title excluded when passed separately)
 * @param {string} [title] article title
 * @param {{ additionalPrompt?: string, productRelated?: boolean }} [opts]
 * @returns {string}
 */
export function buildKeywordAgentPrompt(sourceText, title = "", opts = {}) {
  const additionalPrompt = String(opts.additionalPrompt || "").trim();
  const productRelated = opts.productRelated !== false;

  const titleBlock = title.trim()
    ? [`TITLE: ${title.trim()}`, ""]
    : [];

  const logoField = productRelated
    ? '- "logo": MUST be the official flat logo/icon of a software, company, or product mentioned in the title or article (e.g. React, GitHub, Notion, Cursor IDE). Prefer real product/brand marks — NOT abstract symbols or generic UI icons (e.g. NOT mouse cursor, pointer arrow, gear). If several products appear, pick the main one.'
    : '- "logo": use empty string "" — this article is NOT product-focused. Do NOT pick software, company, or product logos. Keywords should drive abstract geometry only.';

  const example = productRelated
    ? '{"keywords":["React","hooks","components","state","UI"],"logo":"React official atom logo (flat app icon)"}'
    : '{"keywords":["reflection","habits","growth","mindset","balance"],"logo":""}';

  // Placed first so author direction outranks defaults when they conflict.
  const extraBlock = additionalPrompt
    ? [
        "HIGHEST-PRIORITY AUTHOR OVERRIDES — follow these first.",
        "If any instruction below conflicts with these overrides, the overrides win.",
        "Apply to keyword and logo choices:",
        additionalPrompt,
        "",
      ]
    : [];

  return [
    ...extraBlock,
    "Analyze this blog article for cover image generation.",
    "Reply with ONLY a JSON object. No markdown fences, no commentary.",
    `Example: ${example}`,
    "",
    "Fields:",
    '- "keywords": exactly 5 single words or short phrases for abstract cover geometry',
    logoField,
    "",
    ...titleBlock,
    "ARTICLE TEXT:",
    sourceText,
  ].join("\n");
}

/**
 * @param {string[]} keywords
 * @param {string} [title]
 */
export function deriveFallbackLogo(keywords, title = "") {
  const topic = (title || keywords[0] || "article").trim();
  return `official flat logo/icon for "${topic}" software or product`;
}

/**
 * Parse exactly 5 keywords from cursor agent stdout (legacy array responses).
 * @param {string} output
 * @returns {string[]}
 */
export function parseKeywords(output) {
  const text = String(output || "").trim();
  if (!text) throw new Error("cursor agent returned empty output");

  const arrayMatch = text.match(/\[[\s\S]*?\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        const keywords = parsed
          .map((k) => String(k).trim())
          .filter(Boolean)
          .slice(0, 5);
        if (keywords.length === 5) return keywords;
        if (keywords.length > 0) {
          throw new Error(
            `Expected exactly 5 keywords, got ${keywords.length}: ${JSON.stringify(keywords)}`
          );
        }
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        /* fall through */
      } else {
        throw e;
      }
    }
  }

  const lines = text
    .split(/\n/)
    .map((l) =>
      l
        .replace(/^\s*[-*•]\s*/, "")
        .replace(/^\s*\d+[.)]\s*/, "")
        .replace(/^["']|["']$/g, "")
        .trim()
    )
    .filter((l) => l && !l.startsWith("{") && !/^here are|keywords|json/i.test(l));

  if (lines.length >= 5) return lines.slice(0, 5);

  const csv = text
    .replace(/^[\s\S]*?:/, "")
    .split(/[,，]/)
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
  if (csv.length >= 5) return csv.slice(0, 5);

  throw new Error(
    `Could not parse exactly 5 keywords from agent output:\n${text.slice(0, 500)}`
  );
}

/**
 * @param {string} output
 * @param {string} [title]
 * @param {{ productRelated?: boolean }} [opts]
 * @returns {{ keywords: string[], logo: string }}
 */
export function parseCoverAgentOutput(output, title = "", opts = {}) {
  const productRelated = opts.productRelated !== false;
  const text = String(output || "").trim();
  if (!text) throw new Error("cursor agent returned empty output");

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (parsed && Array.isArray(parsed.keywords)) {
        const keywords = parsed.keywords
          .map((k) => String(k).trim())
          .filter(Boolean)
          .slice(0, 5);
        const logo = String(parsed.logo || "").trim();
        if (keywords.length === 5 && (logo || !productRelated)) {
          return { keywords, logo };
        }
      }
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
    }
  }

  const keywords = parseKeywords(output);
  return {
    keywords,
    logo: productRelated ? deriveFallbackLogo(keywords, title) : "",
  };
}

/**
 * Run `cursor agent -p --mode ask` and return keywords + required logo brief.
 * @param {string} sourceText
 * @param {{ cursorBin?: string, timeoutMs?: number, title?: string, additionalPrompt?: string, productRelated?: boolean }} [opts]
 * @returns {Promise<{ keywords: string[], logo: string, raw: string }>}
 */
export function extractKeywordsWithCursorAgent(sourceText, opts = {}) {
  const cursorBin = opts.cursorBin || process.env.CURSOR_BIN || "cursor";
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const title = opts.title || "";
  const productRelated = opts.productRelated !== false;
  const prompt = buildKeywordAgentPrompt(sourceText, title, {
    additionalPrompt: opts.additionalPrompt,
    productRelated,
  });

  return new Promise((resolve, reject) => {
    const child = spawn(
      cursorBin,
      ["agent", "-p", "--mode", "ask", "--output-format", "text", prompt],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      }
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`cursor agent timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new Error(
          `Failed to spawn cursor agent (${cursorBin}): ${err.message}. Is the Cursor CLI installed?`
        )
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            `cursor agent exited ${code}\nstderr: ${stderr.slice(0, 800)}\nstdout: ${stdout.slice(0, 400)}`
          )
        );
        return;
      }
      try {
        const { keywords, logo } = parseCoverAgentOutput(stdout, title, {
          productRelated,
        });
        resolve({ keywords, logo, raw: stdout });
      } catch (e) {
        reject(e);
      }
    });
  });
}
