const fs = require("fs");

const endpoint =
  "http://127.0.0.1:7242/ingest/641dedf2-328e-4149-8249-b4691888bc44";

function log(payload) {
  const body = JSON.stringify({
    sessionId: "debug-session",
    runId: "pre-fix",
    timestamp: Date.now(),
    ...payload,
  });
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});
}

// #region agent log
log({
  hypothesisId: "H1",
  location: "scripts/debug-ai-resolve.js:20",
  message: "debug script start",
  data: { cwd: process.cwd() },
});
// #endregion

let packageJson = null;
try {
  const raw = fs.readFileSync("package.json", "utf8");
  packageJson = JSON.parse(raw);
} catch (error) {
  // #region agent log
  log({
    hypothesisId: "H2",
    location: "scripts/debug-ai-resolve.js:34",
    message: "package.json read failed",
    data: { error: error.message },
  });
  // #endregion
}

// #region agent log
log({
  hypothesisId: "H2",
  location: "scripts/debug-ai-resolve.js:44",
  message: "package.json deps snapshot",
  data: {
    dependencies: packageJson?.dependencies ?? null,
    devDependencies: packageJson?.devDependencies ?? null,
  },
});
// #endregion

function resolveModule(name, hypothesisId) {
  try {
    const resolved = require.resolve(name);
    // #region agent log
    log({
      hypothesisId,
      location: "scripts/debug-ai-resolve.js:58",
      message: "module resolved",
      data: { name, resolved },
    });
    // #endregion
  } catch (error) {
    // #region agent log
    log({
      hypothesisId,
      location: "scripts/debug-ai-resolve.js:67",
      message: "module resolve failed",
      data: { name, error: error.message },
    });
    // #endregion
  }
}

resolveModule("ai/react", "H1");
resolveModule("ai", "H3");
resolveModule("@ai-sdk/react", "H4");
resolveModule("@ai-sdk/openai", "H5");

// #region agent log
log({
  hypothesisId: "H1",
  location: "scripts/debug-ai-resolve.js:81",
  message: "debug script end",
  data: {},
});
// #endregion
