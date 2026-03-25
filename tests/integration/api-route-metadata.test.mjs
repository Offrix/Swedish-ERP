import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const REQUIRED_ROUTE_METADATA = Object.freeze([
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
  "/v1/ledger/accounting-periods/:accountingPeriodId/lock",
  "/v1/ledger/accounting-periods/:accountingPeriodId/reopen",
  "/v1/ledger/journal-entries/:journalEntryId/validate",
  "/v1/ledger/journal-entries/:journalEntryId/post",
  "/v1/ar/invoice-series",
  "/v1/backoffice/support-cases/:supportCaseId/approve-actions",
  "/v1/migration/cutover-plans/:cutoverPlanId/signoffs",
  "/v1/migration/cutover-plans/:cutoverPlanId/checklist/:itemCode"
]);

test("api root metadata lists critical auth, backoffice and migration routes without duplicates", async () => {
  const server = createApiServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(Array.isArray(payload.routes), true);

    for (const route of REQUIRED_ROUTE_METADATA) {
      assert.equal(payload.routes.includes(route), true, `${route} should be exposed in api root metadata`);
    }

    const uniqueCount = new Set(payload.routes).size;
    assert.equal(uniqueCount, payload.routes.length, "api root metadata should not contain duplicate route entries");
  } finally {
    await stopServer(server);
  }
});
