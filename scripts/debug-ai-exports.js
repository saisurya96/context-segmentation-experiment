const fs = require("fs");

const endpoint =
  "http://127.0.0.1:7242/ingest/641dedf2-328e-4149-8249-b4691888bc44";

function log(payload) {
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "debug-session",
      runId: "post-fix3",
      timestamp: Date.now(),
      ...payload,
    }),
  }).catch(() => {});
}

// #region agent log
log({
  hypothesisId: "H1",
  location: "scripts/debug-ai-exports.js:20",
  message: "debug ai exports start",
  data: { cwd: process.cwd() },
});
// #endregion

let pkg = null;
try {
  const raw = fs.readFileSync("node_modules/ai/package.json", "utf8");
  pkg = JSON.parse(raw);
} catch (error) {
  // #region agent log
  log({
    hypothesisId: "H2",
    location: "scripts/debug-ai-exports.js:33",
    message: "read ai package.json failed",
    data: { error: error.message },
  });
  // #endregion
}

// #region agent log
log({
  hypothesisId: "H2",
  location: "scripts/debug-ai-exports.js:44",
  message: "ai package metadata",
  data: { version: pkg?.version ?? null, exports: pkg?.exports ?? null },
});
// #endregion

let aiExports = null;
try {
  aiExports = require("ai");
} catch (error) {
  // #region agent log
  log({
    hypothesisId: "H3",
    location: "scripts/debug-ai-exports.js:58",
    message: "require ai failed",
    data: { error: error.message },
  });
  // #endregion
}

// #region agent log
log({
  hypothesisId: "H4",
  location: "scripts/debug-ai-exports.js:69",
  message: "ai export keys",
  data: {
    hasChat: Boolean(aiExports?.Chat),
    hasDefaultChatTransport: Boolean(aiExports?.DefaultChatTransport),
    keys: aiExports ? Object.keys(aiExports).slice(0, 20) : null,
  },
});
// #endregion

// #region agent log
log({
  hypothesisId: "H1",
  location: "scripts/debug-ai-exports.js:83",
  message: "debug ai exports end",
  data: {},
});
// #endregion
