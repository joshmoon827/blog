#!/usr/bin/env node
/**
 * Start/attach Gemini CDP Chrome via cdp-orchestrator
 * (same as `cdp-hello npm run chrome`: user-data-dir cdp-hello → ~/.chrome-cdp-hello).
 *
 * Usage: npm run chrome:cdp
 */
import { startChromeViaOrchestrator, CDP_HINT } from "./lib/gemini-cover.mjs";

startChromeViaOrchestrator()
  .then(() => {
    console.log("[chrome:cdp] ready — you can run npm run generate:cover");
  })
  .catch((e) => {
    console.error("[chrome:cdp]", e.message ?? e);
    if (!String(e.message ?? "").includes("cdp-orchestrator")) {
      console.error(CDP_HINT);
    }
    process.exit(1);
  });
