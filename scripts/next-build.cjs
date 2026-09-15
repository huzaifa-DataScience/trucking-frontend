#!/usr/bin/env node
/**
 * Production build without Next's interactive TTY spinner.
 *
 * Cursor terminals break on stdin.setRawMode (EIO) and sometimes never exit
 * after a successful build. We:
 *  1. Force CI / dumb terminal so Next prints plain step logs (no spinner)
 *  2. Force-exit a few seconds after the success footer if workers hang
 */
const { spawn, execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const FORCE_EXIT_MS = 5000;

console.log("[build] starting (no interactive spinner)…");

const child = spawn(process.execPath, [nextCli, "build", "--webpack"], {
  cwd: root,
  env: {
    ...process.env,
    // Kill interactive progress / setRawMode path entirely.
    CI: "1",
    TERM: "dumb",
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    NEXT_TELEMETRY_DISABLED: "1",
  },
  // No TTY on stdin → Next cannot call setRawMode.
  stdio: ["ignore", "pipe", "pipe"],
});

let settled = false;
let buffer = "";
let successAt = null;

function stripAnsi(s) {
  return s.replace(/\u001b\[[0-9;]*m/g, "");
}

function killTree(pid) {
  if (!pid) return;
  try {
    execSync(`pkill -9 -P ${String(pid)}`, { stdio: "ignore" });
  } catch {
    /* none */
  }
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    /* gone */
  }
}

function finish(code) {
  if (settled) return;
  settled = true;
  killTree(child.pid);
  try {
    process.stdout.write(
      code === 0 ? "\n[build] ok — exited\n" : "\n[build] failed\n"
    );
  } catch {
    /* ignore */
  }
  process.exit(code);
}

function buildFinishedInOutput() {
  const p = stripAnsi(buffer);
  return (
    p.includes("Compiled successfully") &&
    (p.includes("(Static)   prerendered as static content") ||
      p.includes("server-rendered on demand"))
  );
}

const poll = setInterval(() => {
  if (settled) {
    clearInterval(poll);
    return;
  }
  if (!buildFinishedInOutput()) return;
  if (successAt == null) successAt = Date.now();
  if (Date.now() - successAt >= FORCE_EXIT_MS) {
    clearInterval(poll);
    finish(0);
  }
}, 250);

function onChunk(chunk, stream) {
  buffer += chunk.toString();
  stream.write(chunk);
}

child.stdout.on("data", (c) => onChunk(c, process.stdout));
child.stderr.on("data", (c) => onChunk(c, process.stderr));

child.on("exit", (code, signal) => {
  if (settled) return;
  clearInterval(poll);
  const ok = code === 0 || buildFinishedInOutput();
  finish(ok ? 0 : code ?? (signal ? 1 : 0));
});

child.on("error", (err) => {
  console.error(err);
  clearInterval(poll);
  finish(1);
});

setTimeout(() => {
  if (!settled) {
    console.error("\n[build] timed out after 10 minutes.");
    clearInterval(poll);
    finish(buildFinishedInOutput() ? 0 : 1);
  }
}, 10 * 60 * 1000);
