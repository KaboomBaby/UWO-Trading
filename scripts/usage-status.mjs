#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const CACHE_VERSION = 2;
const TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 4_000;
const home = homedir();
const cachePath = join(tmpdir(), `terminal-usage-${Buffer.from(home).toString("base64url")}-v${CACHE_VERSION}.json`);
const lockPath = `${cachePath}.lock`;

const ansi = (code, text) => `\u001b[${code}m${text}\u001b[0m`;
const dim = (text) => ansi("2", text);
const cyan = (text) => ansi("96", text);
const magenta = (text) => ansi("95", text);
const green = (text) => ansi("92", text);
const yellow = (text) => ansi("93", text);
const red = (text) => ansi("91", text);

function readCodexProvider() {
  const configPath = join(home, ".codex", "config.toml");
  if (!existsSync(configPath)) return {};

  const config = readFileSync(configPath, "utf8");
  const section = config.match(/\[model_providers\.([^\]]+)\]([^\[]*)/);
  if (!section) return {};

  const [, name, body] = section;
  const baseUrl = body.match(/^\s*base_url\s*=\s*"([^"]+)"/m)?.[1];
  const token =
    process.env.ZAI_API_KEY ||
    process.env.GLM_API_TOKEN ||
    body.match(/^\s*experimental_bearer_token\s*=\s*"([^"]+)"/m)?.[1];

  return { name, baseUrl, token };
}

function glmLimits(payload) {
  const limits = payload?.data?.limits ?? payload?.limits ?? [];
  if (!Array.isArray(limits)) return [];

  return limits
    .map((item) => ({
      kind: item.type === "TOKENS_LIMIT" ? "5h" : item.type === "TIME_LIMIT" ? "mo" : item.type,
      value: Number.parseFloat(item.percentage),
    }))
    .filter((item) => item.kind && Number.isFinite(item.value));
}

async function glmUsage() {
  const { baseUrl, token } = readCodexProvider();
  if (!baseUrl || !token) throw new Error("GLM credentials unavailable");

  const origin = new URL(baseUrl).origin;
  const response = await fetch(`${origin}/api/monitor/usage/quota/limit`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en-US,en",
      Authorization: token,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`GLM HTTP ${response.status}`);
  return glmLimits(await response.json());
}

function codexWindow(window) {
  if (!window) return null;
  const minutes = window.windowDurationMins;
  let label = "window";
  if (Number.isFinite(minutes)) {
    if (minutes <= 360) label = "5h";
    else if (minutes <= 45 * 24 * 60) label = "mo";
    else label = `${Math.round(minutes / (24 * 60))}d`;
  }
  return { label, value: window.usedPercent };
}

function codexUsage() {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", ["app-server", "--listen", "stdio://"], {
      stdio: ["pipe", "pipe", "ignore"],
    });

    let output = "";
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill("SIGTERM");
      fn(value);
    };

    const timer = setTimeout(() => finish(reject, new Error("Codex status timed out")), REQUEST_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const lines = output.split(/\\r?\\n/);
      output = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;

        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }

        if (message.id === 2 && message.result) {
          const snapshot = message.result.rateLimits ?? {};
          const buckets = [codexWindow(snapshot.primary), codexWindow(snapshot.secondary)].filter(Boolean);
          finish(resolve, buckets);
        } else if (message.id === 2 && message.error) {
          finish(reject, new Error(message.error.message ?? "Codex status failed"));
        }
      }
    });

    child.on("error", (error) => finish(reject, error));
    child.on("exit", () => finish(reject, new Error("Codex status exited early")));

    child.stdin.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { clientInfo: { name: "terminal-usage", version: "1.0" } },
    })}\\n`);
    child.stdin.write(`${JSON.stringify({
      jsonrpc: "2.0",
      method: "initialized",
      params: {},
    })}\\n`);
    child.stdin.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "account/rateLimits/read",
      params: { excludeResetCreditDetails: true },
    })}\\n`);
    child.stdin.end();
  });
}

async function fetchUsage() {
  const [glmResult, codexResult] = await Promise.allSettled([glmUsage(), codexUsage()]);
  return {
    version: CACHE_VERSION,
    fetchedAt: Date.now(),
    glm: glmResult.status === "fulfilled" ? glmResult.value : null,
    codex: codexResult.status === "fulfilled" ? codexResult.value : null,
  };
}

function usagePart(label, items, color) {
  if (!items?.length) return `${color(label)} ${dim("--")}`;
  const rendered = items.map((item) => {
    const value = `${Math.round(item.value)}%`;
    const colored = item.value >= 85 ? red(value) : item.value >= 65 ? yellow(value) : green(value);
    return `${dim(item.label ?? "usage")} ${colored}`;
  });
  return `${color(label)} ${rendered.join(dim(" / "))}`;
}

function renderUsage(data) {
  const parts = [
    usagePart("GLM", data.glm, cyan),
    usagePart("Codex", data.codex, magenta),
  ];
  return parts.join(dim(" · "));
}

function readCache() {
  try {
    const parsed = JSON.parse(readFileSync(cachePath, "utf8"));
    return parsed.version === CACHE_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  writeFileSync(cachePath, JSON.stringify(data), { mode: 0o600 });
}

function startRefresh() {
  try {
    writeFileSync(lockPath, process.pid.toString(), { flag: "wx" });
    const child = spawn(process.execPath, [import.meta.url, "--fetch"], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // Another prompt is already refreshing.
  }
}

function clearLock() {
  try {
    if (statSync(lockPath).mtimeMs < Date.now() - 15_000) writeFileSync(lockPath, "");
  } catch {
    // No stale lock.
  }
}

if (process.argv.includes("--fetch")) {
  try {
    writeCache(await fetchUsage());
  } finally {
    try {
      if (readFileSync(lockPath, "utf8") === process.pid.toString()) writeFileSync(lockPath, "");
    } catch {
      // Lock already removed.
    }
  }
} else {
  const cache = readCache();
  const age = cache ? Date.now() - cache.fetchedAt : Number.POSITIVE_INFINITY;

  if (age <= TTL_MS) {
    console.log(renderUsage(cache));
  } else {
    clearLock();
    startRefresh();
    console.log(cache ? renderUsage(cache) : dim("AI usage…"));
  }
}
