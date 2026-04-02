import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 48 public production flow exposes annual packages, tax-account reconciliation state and webhook deliveries", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T07:20:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    const publicClient = await requestJson(baseUrl, "/v1/public-api/clients", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        displayName: "Phase 48 Production Client",
        mode: "production",
        scopes: ["api_spec.read", "annual_reporting.read", "tax_account.read", "webhook.manage"]
      }
    });
    const subscription = await requestJson(baseUrl, "/v1/public-api/webhooks", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        clientId: publicClient.clientId,
        mode: "production",
        eventTypes: ["annual_reporting.package.updated", "tax_account.reconciliation.updated"],
        targetUrl: "https://example.test/phase48-production"
      }
    });
    const publicToken = await requestJson(baseUrl, "/v1/public/oauth/token", {
      method: "POST",
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        clientId: publicClient.clientId,
        clientSecret: publicClient.clientSecret,
        scopes: ["annual_reporting.read", "tax_account.read"]
      }
    });

    const initialSummary = await requestJson(
      baseUrl,
      `/v1/public/tax-account/summary?companyId=${DEMO_IDS.companyId}`,
      { token: publicToken.accessToken }
    );

    const period = prepareAccounting(platform, DEMO_IDS.companyId, "phase48-e2e");
    platform.lockAccountingPeriod({
      companyId: DEMO_IDS.companyId,
      accountingPeriodId: period.accountingPeriodId,
      status: "hard_closed",
      actorId: "phase48-e2e-close",
      reasonCode: "annual_reporting_ready",
      approvedByActorId: DEMO_IDS.userId,
      approvedByRoleCode: "company_admin"
    });

    const annualPackage = await requestJson(baseUrl, "/v1/annual-reporting/packages", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        accountingPeriodId: period.accountingPeriodId,
        profileCode: "k2",
        textSections: {
          management_report: "Phase 48 public annual package",
          accounting_policies: "Phase 48 K2 policies"
        },
        noteSections: {
          notes_bundle: "Phase 48 notes",
          simplified_notes: "Phase 48 simplified notes"
        }
      }
    });

    platform.registerExpectedTaxLiability({
      companyId: DEMO_IDS.companyId,
      liabilityTypeCode: "AGI",
      sourceDomainCode: "PAYROLL",
      sourceObjectType: "agi_run",
      sourceObjectId: "agi_run_phase48_e2e_2026_01",
      sourceReference: "AGI-PHASE48-E2E",
      periodKey: "2026-01",
      dueDate: "2026-01-10",
      amount: 12000,
      actorId: "phase48-e2e"
    });
    platform.registerExpectedTaxLiability({
      companyId: DEMO_IDS.companyId,
      liabilityTypeCode: "VAT",
      sourceDomainCode: "VAT",
      sourceObjectType: "vat_declaration_run",
      sourceObjectId: "vat_run_phase48_e2e_2026_01",
      sourceReference: "VAT-PHASE48-E2E",
      periodKey: "2026-01",
      dueDate: "2026-01-11",
      amount: 15000,
      actorId: "phase48-e2e"
    });

    const importResponse = await requestJson(baseUrl, "/v1/tax-account/imports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        importSource: "SKV_CSV",
        statementDate: "2026-01-12",
        events: [
          {
            eventTypeCode: "AGI_ASSESSMENT",
            eventDate: "2026-01-10",
            postingDate: "2026-01-10",
            amount: 12000,
            externalReference: "SKV-AGI-PHASE48-E2E",
            sourceObjectType: "agi_run",
            sourceObjectId: "agi_run_phase48_e2e_2026_01",
            periodKey: "2026-01"
          },
          {
            eventTypeCode: "VAT_ASSESSMENT",
            eventDate: "2026-01-11",
            postingDate: "2026-01-11",
            amount: 15000,
            externalReference: "SKV-VAT-PHASE48-E2E",
            sourceObjectType: "vat_declaration_run",
            sourceObjectId: "vat_run_phase48_e2e_2026_01",
            periodKey: "2026-01"
          },
          {
            eventTypeCode: "PAYMENT",
            eventDate: "2026-01-12",
            postingDate: "2026-01-12",
            amount: 20000,
            externalReference: "SKV-PAY-PHASE48-E2E"
          }
        ]
      }
    });
    const reconciliation = await requestJson(baseUrl, "/v1/tax-account/reconciliations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    for (const suggestion of reconciliation.suggestedOffsets.slice(0, 2)) {
      await requestJson(baseUrl, "/v1/tax-account/offsets", {
        method: "POST",
        token: adminToken,
        expectedStatus: 201,
        body: {
          companyId: DEMO_IDS.companyId,
          taxAccountEventId: suggestion.taxAccountEventId,
          reconciliationItemId: suggestion.reconciliationItemId,
          offsetAmount: suggestion.offsetAmount,
          offsetReasonCode: suggestion.offsetReasonCode,
          reconciliationRunId: reconciliation.reconciliationRunId
        }
      });
    }

    const publicPackages = await requestJson(
      baseUrl,
      `/v1/public/annual-reporting/packages?companyId=${DEMO_IDS.companyId}`,
      { token: publicToken.accessToken }
    );
    const publicSummary = await requestJson(
      baseUrl,
      `/v1/public/tax-account/summary?companyId=${DEMO_IDS.companyId}`,
      { token: publicToken.accessToken }
    );
    const publicReconciliations = await requestJson(
      baseUrl,
      `/v1/public/tax-account/reconciliations?companyId=${DEMO_IDS.companyId}`,
      { token: publicToken.accessToken }
    );
    const webhookEvents = await requestJson(
      baseUrl,
      `/v1/public-api/webhook-events?companyId=${DEMO_IDS.companyId}&mode=production`,
      { token: adminToken }
    );
    const deliveries = await requestJson(
      baseUrl,
      `/v1/public-api/webhook-deliveries?companyId=${DEMO_IDS.companyId}&subscriptionId=${subscription.subscriptionId}`,
      { token: adminToken }
    );

    assert.equal(publicPackages.items.some((item) => item.packageId === annualPackage.packageId), true);
    assert.equal(
      publicReconciliations.items.some((item) => item.reconciliationRunId === reconciliation.reconciliationRunId),
      true
    );
    assert.equal(publicSummary.latestReconciliationRunId, reconciliation.reconciliationRunId);
    assert.equal(publicSummary.reconciliationRunCount, initialSummary.reconciliationRunCount + 1);
    assert.equal(publicSummary.openSettlementAmount, initialSummary.openSettlementAmount + 7000);
    assert.equal(publicSummary.openCreditAmount, 0);
    assert.equal(
      webhookEvents.items.some(
        (item) => item.eventType === "annual_reporting.package.updated" && item.resourceId === annualPackage.packageId
      ),
      true
    );
    assert.equal(
      webhookEvents.items.some(
        (item) =>
          item.eventType === "tax_account.reconciliation.updated" &&
          [importResponse.importBatch.importBatchId, reconciliation.reconciliationRunId].includes(item.resourceId)
      ),
      true
    );
    assert.equal(deliveries.items.length >= 4, true);
  } finally {
    await stopServer(server);
  }
});

function prepareAccounting(platform, companyId, actorId) {
  platform.installLedgerCatalog({
    companyId,
    actorId
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId,
    fiscalYear: 2026,
    actorId
  });
  const created = platform.createJournalEntry({
    companyId,
    journalDate: "2026-01-15",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: `${actorId}-income`,
    actorId,
    idempotencyKey: `${actorId}-income`,
    lines: [
      { accountNumber: "1510", debitAmount: 7200 },
      { accountNumber: "3010", creditAmount: 7200 }
    ]
  });
  platform.validateJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId
  });
  platform.postJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId,
    approvedByActorId: "finance-approver",
    approvedByRoleCode: "finance_manager"
  });
  return period;
}
