import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { runDoctor } from "../../scripts/doctor.mjs";
import { runHealthcheck } from "../../scripts/healthcheck.mjs";

function createMemoryStream() {
  let buffer = "";
  return {
    stream: {
      write(chunk) {
        buffer += String(chunk);
      }
    },
    read() {
      return buffer;
    }
  };
}

async function runDoctorScript() {
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();
  const result = await runDoctor({
    stdout: stdout.stream,
    stderr: stderr.stream
  });
  return {
    code: result.exitCode,
    stdout: stdout.read(),
    stderr: stderr.read()
  };
}

async function runHealthcheckScript(env) {
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();
  const result = await runHealthcheck({
    env: {
      ...process.env,
      ...env
    },
    stdout: stdout.stream,
    stderr: stderr.stream
  });
  return {
    code: result.exitCode,
    stdout: stdout.read(),
    stderr: stderr.read()
  };
}

async function startHealthServer() {
  const server = http.createServer((request, response) => {
    if (request.url === "/healthz") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    response.writeHead(404);
    response.end();
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to determine health server address.");
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}/healthz`
  };
}

test("doctor validates the toolchain including pnpm availability", async () => {
  const result = await runDoctorScript();

  assert.equal(result.code, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /node:\s+v24\.14\.0/u);
  assert.match(result.stdout, /pnpm:\s+10\.12\.4/u);
});

test("healthcheck succeeds when all configured targets answer /healthz", async () => {
  const api = await startHealthServer();
  const desktop = await startHealthServer();
  const field = await startHealthServer();

  try {
    const result = await runHealthcheckScript({
      API_HEALTH_URL: api.url,
      DESKTOP_HEALTH_URL: desktop.url,
      FIELD_HEALTH_URL: field.url
    });

    assert.equal(result.code, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /api: ok/u);
    assert.match(result.stdout, /desktop-web: ok/u);
    assert.match(result.stdout, /field-mobile: ok/u);
  } finally {
    await Promise.all([
      new Promise((resolve) => api.server.close(resolve)),
      new Promise((resolve) => desktop.server.close(resolve)),
      new Promise((resolve) => field.server.close(resolve))
    ]);
  }
});

test("healthcheck reports unreachable services with actionable wording", async () => {
  const result = await runHealthcheckScript({
    API_HEALTH_URL: "http://127.0.0.1:65530/healthz",
    DESKTOP_HEALTH_URL: "http://127.0.0.1:65531/healthz",
    FIELD_HEALTH_URL: "http://127.0.0.1:65532/healthz"
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /api: unreachable \(service not running or port closed\)/u);
  assert.match(result.stderr, /desktop-web: unreachable \(service not running or port closed\)/u);
  assert.match(result.stderr, /field-mobile: unreachable \(service not running or port closed\)/u);
});
