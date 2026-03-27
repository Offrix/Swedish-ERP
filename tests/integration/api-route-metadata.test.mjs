import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const REQUIRED_ROUTE_METADATA = Object.freeze([
  "/v1/system/runtime-mode",
  "/v1/system/invariants",
  "/v1/system/bootstrap/validate",
  "/v1/auth/logout",
  "/v1/auth/mfa/totp/enroll",
  "/v1/auth/mfa/totp/verify",
  "/v1/auth/mfa/passkeys/register-options",
  "/v1/auth/mfa/passkeys/register-verify",
  "/v1/auth/mfa/passkeys/assert",
  "/v1/auth/bankid/start",
  "/v1/auth/bankid/collect",
  "/v1/auth/sessions/:sessionId/revoke",
  "/v1/authz/check",
  "/v1/onboarding/runs/:runId",
  "/v1/onboarding/runs/:runId/checklist",
  "/v1/documents/:documentId/versions",
  "/v1/documents/:documentId/links",
  "/v1/inbox/messages/:emailIngestMessageId",
  "/v1/review-tasks/:reviewTaskId/claim",
  "/v1/review-tasks/:reviewTaskId/correct",
  "/v1/review-tasks/:reviewTaskId/approve",
  "/v1/review-center/items/:reviewItemId/approve",
  "/v1/review-center/items/:reviewItemId/reject",
  "/v1/review-center/items/:reviewItemId/escalate",
  "/v1/ledger/accounting-periods/:accountingPeriodId/lock",
  "/v1/ledger/accounting-periods/:accountingPeriodId/reopen",
  "/v1/ledger/journal-entries/:journalEntryId/validate",
  "/v1/ledger/journal-entries/:journalEntryId/post",
  "/v1/ar/invoice-series",
  "/v1/work-items",
  "/v1/work-items/:workItemId/claim",
  "/v1/work-items/:workItemId/resolve",
  "/v1/notifications/:notificationId/acknowledge",
  "/v1/activity/object/:objectType/:objectId",
  "/v1/backoffice/support-cases/:supportCaseId/close",
  "/v1/backoffice/support-cases/:supportCaseId/approve-actions",
  "/v1/backoffice/audit-correlations",
  "/v1/backoffice/audit-correlations/:correlationId",
  "/v1/backoffice/jobs",
  "/v1/backoffice/replays",
  "/v1/backoffice/replays/:replayPlanId/approve",
  "/v1/backoffice/replays/:replayPlanId/execute",
  "/v1/backoffice/dead-letters/:deadLetterId/triage",
  "/v1/backoffice/submissions/monitor",
  "/v1/backoffice/review-center/sla-scan",
  "/v1/backoffice/incidents/:incidentId/post-review",
  "/v1/backoffice/incidents/:incidentId/status",
  "/v1/ops/observability",
  "/v1/ops/secrets",
  "/v1/ops/secrets/:managedSecretId/rotate",
  "/v1/ops/secret-rotations",
  "/v1/ops/certificate-chains",
  "/v1/ops/callback-secrets",
  "/v1/ops/restore-drills/:restoreDrillId/start",
  "/v1/ops/restore-drills/:restoreDrillId/complete",
  "/v1/submissions/:submissionId/evidence-pack",
  "/v1/submissions/:submissionId/replay",
  "/v1/submissions/:submissionId/corrections",
  "/v1/migration/acceptance-records",
  "/v1/migration/post-cutover-correction-cases",
  "/v1/migration/cutover-plans/:cutoverPlanId/signoffs",
  "/v1/migration/cutover-plans/:cutoverPlanId/checklist/:itemCode"
]);

function parseRoutesFromSource(sourceText) {
  const bindings = new Map(
    [...sourceText.matchAll(/const\s+(\w+)\s*=\s*matchPath\(path,\s*"([^"]+)"\)/g)].map((match) => [match[1], match[2]])
  );
  const routes = [];

  for (const match of sourceText.matchAll(/if\s*\(([^\{]+)\)\s*\{/g)) {
    const condition = match[1];
    const methods = [...condition.matchAll(/req\.method\s*===\s*"([A-Z]+)"/g)];
    if (methods.length === 0) {
      continue;
    }
    const directPaths = [...condition.matchAll(/path\s*===\s*"([^"]+)"/g)].map((directPath) => directPath[1]);
    const boundPaths = [...bindings.entries()]
      .filter(([binding]) => condition.includes(binding))
      .map(([, route]) => route);
    for (const { 1: method } of methods) {
      if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        continue;
      }
      for (const route of new Set([...directPaths, ...boundPaths])) {
        routes.push({ method, path: route });
      }
    }
  }
  return routes.filter((route) => !["/", "/healthz", "/readyz"].includes(route.path));
}

test("api root metadata lists critical auth, backoffice and migration routes without duplicates", async () => {
  const server = createApiServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(Array.isArray(payload.routes), true);
    assert.equal(Array.isArray(payload.routeContracts), true);

    for (const route of REQUIRED_ROUTE_METADATA) {
      assert.equal(payload.routes.includes(route), true, `${route} should be exposed in api root metadata`);
    }

    const supportCaseCloseContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/backoffice/support-cases/:supportCaseId/close"
    );
    assert.ok(supportCaseCloseContract);
    assert.equal(supportCaseCloseContract.requiredActionClass, "support_case_operate");
    assert.equal(supportCaseCloseContract.requiredTrustLevel, "strong_mfa");
    assert.equal(supportCaseCloseContract.requiredScopeType, "support_case");
    assert.equal(supportCaseCloseContract.expectedObjectVersion, true);

    const uniqueCount = new Set(payload.routes).size;
    assert.equal(uniqueCount, payload.routes.length, "api root metadata should not contain duplicate route entries");
    assert.equal(
      payload.routeContracts.every(
        (routeContract) =>
          typeof routeContract.requiredActionClass === "string"
          && routeContract.requiredActionClass.length > 0
          && typeof routeContract.requiredTrustLevel === "string"
          && routeContract.requiredTrustLevel.length > 0
          && typeof routeContract.requiredScopeType === "string"
          && routeContract.requiredScopeType.length > 0
          && typeof routeContract.expectedObjectVersion === "boolean"
      ),
      true,
      "every published route contract should expose action class, trust, scope and object-version requirements"
    );
  } finally {
    await stopServer(server);
  }
});

test("api root metadata covers all parsed route patterns from server and phase14 route handlers", async () => {
  const [serverSource, phase13Source, phase14Source] = await Promise.all([
    fs.readFile("apps/api/src/server.mjs", "utf8"),
    fs.readFile("apps/api/src/phase13-routes.mjs", "utf8"),
    fs.readFile("apps/api/src/phase14-routes.mjs", "utf8")
  ]);
  const parsedRoutes = [
    ...parseRoutesFromSource(serverSource),
    ...parseRoutesFromSource(phase13Source),
    ...parseRoutesFromSource(phase14Source)
  ];

  const server = createApiServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    const exposedRoutes = new Set(payload.routes || []);
    const exposedContracts = new Set((payload.routeContracts || []).map((routeContract) => `${routeContract.method} ${routeContract.path}`));
    const missingRoutes = parsedRoutes.map((route) => route.path).filter((route) => !exposedRoutes.has(route)).sort();
    const missingContracts = parsedRoutes
      .map((route) => `${route.method} ${route.path}`)
      .filter((route) => !exposedContracts.has(route))
      .sort();

    assert.deepEqual(missingRoutes, []);
    assert.deepEqual(missingContracts, []);
    assert.equal(payload.routeContracts.some((routeContract) => routeContract.path === "/v1/submissions/:submissionId/replay"), true);
  } finally {
    await stopServer(server);
  }
});
