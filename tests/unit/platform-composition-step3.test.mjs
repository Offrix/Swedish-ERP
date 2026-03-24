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
  assert.equal(typeof platform.getDomain("taxAccount")?.createTaxAccountReconciliation, "function");
  assert.equal(typeof platform.getDomain("reviewCenter")?.createReviewItem, "function");
  assert.equal(typeof platform.getDomain("notifications")?.createNotification, "function");
  assert.equal(typeof platform.getDomain("activity")?.projectActivityEntry, "function");
  assert.equal(typeof platform.getDomain("egenkontroll")?.createChecklistTemplate, "function");
  assert.equal(typeof platform.getDomain("kalkyl")?.createEstimateVersion, "function");
  assert.equal(typeof platform.getDomain("projects")?.getProjectWorkspace, "function");
  assert.equal(typeof platform.getDomain("field")?.getProjectFieldSummary, "function");
  assert.equal(typeof platform.getDomain("balances")?.createBalanceType, "function");
  assert.equal(typeof platform.getDomain("collectiveAgreements")?.createAgreementFamily, "function");
  assert.equal(typeof platform.getDomain("time")?.getEmploymentTimeBase, "function");
  assert.equal(typeof platform.getDomain("documentClassification")?.createClassificationCase, "function");
  assert.equal(typeof platform.getDomain("importCases")?.createImportCase, "function");
  assert.equal(typeof platform.createPayrollMigrationBatch, "function");
  assert.equal(typeof platform.getDomain("ledger")?.upsertVoucherSeries, "function");
  assert.equal(typeof platform.getDomain("ledger")?.resolveVoucherSeriesForPurpose, "function");
  assert.equal(typeof platform.getDomain("ar")?.upsertInvoiceSeries, "function");
  assert.equal(typeof platform.createJournalEntry, "function");
  assert.deepEqual(platform.getDomainRegistration("ledger")?.dependsOn, ["accountingMethod", "fiscalYear"]);
  assert.equal(platform.getDomainRegistration("ledger")?.buildOrder > platform.getDomainRegistration("fiscalYear")?.buildOrder, true);
  assert.deepEqual(platform.getDomainRegistration("taxAccount")?.dependsOn, ["banking"]);
  assert.equal(platform.getDomainRegistration("taxAccount")?.buildOrder > platform.getDomainRegistration("banking")?.buildOrder, true);
  assert.deepEqual(platform.getDomainRegistration("reviewCenter")?.dependsOn, []);
  assert.equal(platform.getDomainRegistration("reviewCenter")?.buildOrder > platform.getDomainRegistration("taxAccount")?.buildOrder, true);
  assert.deepEqual(platform.getDomainRegistration("notifications")?.dependsOn, []);
  assert.deepEqual(platform.getDomainRegistration("activity")?.dependsOn, []);
  assert.equal(platform.getDomainRegistration("activity")?.buildOrder > platform.getDomainRegistration("notifications")?.buildOrder, true);
  assert.deepEqual(platform.getDomainRegistration("egenkontroll")?.dependsOn, ["projects", "field"]);
  assert.equal(platform.getDomainRegistration("egenkontroll")?.buildOrder > platform.getDomainRegistration("field")?.buildOrder, true);
  assert.deepEqual(platform.getDomainRegistration("kalkyl")?.dependsOn, ["ar", "projects"]);
  assert.equal(platform.getDomainRegistration("kalkyl")?.buildOrder > platform.getDomainRegistration("projects")?.buildOrder, true);
  assert.deepEqual(platform.getDomainRegistration("time")?.dependsOn, ["hr", "documents", "balances", "collectiveAgreements"]);
  assert.equal(platform.getDomainRegistration("time")?.buildOrder > platform.getDomainRegistration("collectiveAgreements")?.buildOrder, true);
  assert.deepEqual(platform.getDomainRegistration("balances")?.dependsOn, ["hr"]);
  assert.equal(platform.getDomainRegistration("balances")?.buildOrder > platform.getDomainRegistration("hr")?.buildOrder, true);
  assert.deepEqual(platform.getDomainRegistration("collectiveAgreements")?.dependsOn, ["hr", "balances"]);
  assert.equal(platform.getDomainRegistration("collectiveAgreements")?.buildOrder > platform.getDomainRegistration("balances")?.buildOrder, true);
  assert.deepEqual(platform.getDomainRegistration("core")?.dependsOn, ["orgAuth", "reporting", "ledger", "integrations", "hr", "balances", "collectiveAgreements"]);
  assert.deepEqual(platform.getDomainRegistration("documentClassification")?.dependsOn, ["documents", "reviewCenter", "benefits"]);
  assert.equal(platform.getDomainRegistration("documentClassification")?.buildOrder > platform.getDomainRegistration("benefits")?.buildOrder, true);
  assert.deepEqual(platform.getDomainRegistration("importCases")?.dependsOn, ["documents", "reviewCenter", "documentClassification"]);
  assert.equal(platform.getDomainRegistration("importCases")?.buildOrder > platform.getDomainRegistration("documentClassification")?.buildOrder, true);
  assert.deepEqual(
    platform.getDomainRegistration("payroll")?.dependsOn,
    ["orgAuth", "hr", "time", "balances", "collectiveAgreements", "benefits", "travel", "pension", "ledger", "banking"]
  );
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
