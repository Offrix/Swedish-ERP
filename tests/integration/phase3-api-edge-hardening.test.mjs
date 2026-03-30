import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 3.4 edge emits central security headers and hides raw 500 details", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T09:00:00Z")
  });
  platform.startLogin = () => {
    throw new Error("sensitive internal stack detail");
  };
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const healthResponse = await fetch(`${baseUrl}/healthz`);
    assert.equal(healthResponse.status, 200);
    assert.equal(healthResponse.headers.get("cache-control"), "no-store");
    assert.equal(healthResponse.headers.get("x-content-type-options"), "nosniff");
    assert.equal(healthResponse.headers.get("x-frame-options"), "DENY");
    assert.match(healthResponse.headers.get("content-security-policy") || "", /default-src 'none'/);
    assert.equal(healthResponse.headers.get("referrer-policy"), "no-referrer");

    const failureResponse = await fetch(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        email: DEMO_ADMIN_EMAIL
      })
    });
    assert.equal(failureResponse.status, 500);
    const failurePayload = await failureResponse.json();
    assert.equal(failurePayload.message, "Internal server error.");
    assert.equal(typeof failurePayload.supportRef, "string");
    assert.equal(JSON.stringify(failurePayload).includes("sensitive internal stack detail"), false);
  } finally {
    await stopServer(server);
  }
});

test("Phase 3.4 edge blocks oversized JSON bodies", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T09:05:00Z")
  });
  const server = createApiServer({
    platform,
    edgePolicy: {
      defaultMaxBodyBytes: 128
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const oversizedResponse = await fetch(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        email: `${"oversized-".repeat(20)}@example.test`
      })
    });
    assert.equal(oversizedResponse.status, 413);
    const payload = await oversizedResponse.json();
    assert.equal(payload.error, "request_body_too_large");
  } finally {
    await stopServer(server);
  }
});

test("Phase 3.4 edge rejects cookie-bound mutation transport", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T09:10:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const cookieResponse = await fetch(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "session=fake-cookie-session"
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        email: DEMO_ADMIN_EMAIL
      })
    });
    assert.equal(cookieResponse.status, 403);
    const payload = await cookieResponse.json();
    assert.equal(payload.error, "cookie_transport_not_supported");
  } finally {
    await stopServer(server);
  }
});

test("Phase 3.4 edge enforces origin policy and abuse throttling on login", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T09:15:00Z")
  });
  const server = createApiServer({
    platform,
    edgePolicy: {
      rateLimitProfiles: {
        authLogin: {
          limit: 1,
          windowMs: 60_000
        }
      }
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const blockedOrigin = await fetch(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
        "x-forwarded-for": "203.0.113.10"
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        email: DEMO_ADMIN_EMAIL
      })
    });
    assert.equal(blockedOrigin.status, 403);
    assert.equal((await blockedOrigin.json()).error, "origin_not_allowed");

    const firstAllowed = await fetch(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1:4173",
        "x-forwarded-for": "198.51.100.42"
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        email: DEMO_ADMIN_EMAIL
      })
    });
    assert.equal(firstAllowed.status, 200);

    const throttled = await fetch(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1:4173",
        "x-forwarded-for": "198.51.100.42"
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        email: DEMO_ADMIN_EMAIL
      })
    });
    assert.equal(throttled.status, 429);
    assert.equal(throttled.headers.get("retry-after"), "60");
    assert.equal((await throttled.json()).error, "edge_rate_limited");
  } finally {
    await stopServer(server);
  }
});

test("Phase 3.4 edge times out stalled request bodies", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T09:20:00Z")
  });
  const server = createApiServer({
    platform,
    edgePolicy: {
      requestTimeoutMs: 100
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const partialBody = `{"companyId":"${DEMO_IDS.companyId}","email":"${DEMO_ADMIN_EMAIL}"`;
    const rawResponse = await new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: "127.0.0.1", port });
      let received = "";
      socket.setEncoding("utf8");
      socket.on("connect", () => {
        socket.write(
          [
            "POST /v1/auth/login HTTP/1.1",
            "Host: 127.0.0.1",
            "Content-Type: application/json",
            `Content-Length: ${Buffer.byteLength(partialBody) + 16}`,
            "",
            partialBody
          ].join("\r\n")
        );
      });
      socket.on("data", (chunk) => {
        received += chunk;
      });
      socket.on("close", () => resolve(received));
      socket.on("error", reject);
    });
    assert.match(rawResponse, /408/);
    assert.match(rawResponse, /request_timeout/);
  } finally {
    await stopServer(server);
  }
});
