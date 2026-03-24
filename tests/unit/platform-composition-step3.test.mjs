import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform, API_PLATFORM_BUILD_ORDER } from "../../apps/api/src/platform.mjs";

test("Step 3 platform composition registers bounded contexts without breaking the flat API", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T08:00:00Z")
  });

  assert.deepEqual(
    platform.listRegisteredDomains().map((registration) => registration.domainKey),
    API_PLATFORM_BUILD_ORDER
  );
  assert.equal(typeof platform.getDomain("accountingMethod")?.getActiveMethodForDate, "function");
  assert.equal(typeof platform.getDomain("fiscalYear")?.getActiveFiscalYearForDate, "function");
  assert.equal(typeof platform.getDomain("ledger")?.createJournalEntry, "function");
  assert.equal(typeof platform.createJournalEntry, "function");
  assert.equal(platform.getDomainRegistration("payroll")?.dependsOn.includes("banking"), true);
  assert.equal(platform.platformContractVersions.eventEnvelopeVersion, 1);
  assert.equal(platform.platformContractVersions.auditEnvelopeVersion, 1);
});

test("Step 3 platform composition exposes immutable shared event and audit envelopes", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T08:15:00Z")
  });

  const eventEnvelope = platform.createEventEnvelope({
    eventType: "ledger.journal_entry.created",
    aggregateType: "journal_entry",
    aggregateId: "je_123",
    occurredAt: "2026-03-24T08:15:00Z",
    companyId: "company_123",
    actorId: "user_123",
    correlationId: "corr_123",
    idempotencyKey: "idem_123",
    payload: {
      journalEntryId: "je_123"
    }
  });
  const auditEnvelope = platform.createAuditEnvelope({
    action: "ledger.create_journal_entry",
    result: "success",
    actorId: "user_123",
    companyId: "company_123",
    recordedAt: "2026-03-24T08:15:05Z",
    entityType: "journal_entry",
    entityId: "je_123",
    explanation: "Journal entry created during Step 3 verification.",
    correlationId: "corr_123"
  });

  assert.equal(Object.isFrozen(eventEnvelope), true);
  assert.equal(eventEnvelope.idempotencyKey, "idem_123");
  assert.equal(Object.isFrozen(auditEnvelope), true);
  assert.equal(auditEnvelope.result, "success");
});
