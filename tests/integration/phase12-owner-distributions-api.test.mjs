import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_APPROVER_IDS,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly } from "../helpers/api-helpers.mjs";

test("Phase 12.5 API runs annual-to-dividend-to-KU31 and protects annual operations surface", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T12:00:00Z")
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
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "owner-distribution-field@example.test",
      displayName: "Owner Distribution Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "owner-distribution-field@example.test"
    });

    const { annualPackage, taxPackage } = prepareAnnualTaxChain(platform, "phase12-owner-api");
    assert.equal(taxPackage.currentTaxComputation.currentTaxAmount > 0, true);

    const forbidden = await fetch(`${baseUrl}/v1/owner-distributions/decisions?companyId=${DEMO_IDS.companyId}`, {
      headers: {
        authorization: `Bearer ${fieldUserToken}`
      }
    });
    assert.equal(forbidden.status, 403);
    const forbiddenPayload = await forbidden.json();
    assert.equal(forbiddenPayload.error, "annual_operations_role_forbidden");

    const shareClass = await requestJson(`${baseUrl}/v1/owner-distributions/share-classes`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        name: "API Ordinary",
        votesPerShare: 1,
        dividendPriorityCode: "ordinary"
      }
    });

    const holdings = await requestJson(`${baseUrl}/v1/owner-distributions/shareholder-holdings`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        effectiveDate: "2026-03-31",
        evidenceRef: "evidence:share-register:api",
        holders: [
          {
            holderRef: {
              holderId: "api-resident-owner",
              displayName: "API Resident Owner",
              taxProfileCode: "swedish_private_person",
              identityReference: "identity:api-resident-owner",
              identityMaskedValue: "820101-****",
              countryCode: "SE"
            },
            shareClassHoldings: [{ shareClassId: shareClass.shareClassId, shareCount: 5 }]
          },
          {
            holderRef: {
              holderId: "api-foreign-owner",
              displayName: "API Foreign Owner",
              taxProfileCode: "foreign_recipient",
              identityReference: "identity:api-foreign-owner",
              identityMaskedValue: "TAX-API-***",
              countryCode: "GB"
            },
            shareClassHoldings: [{ shareClassId: shareClass.shareClassId, shareCount: 5 }]
          }
        ]
      }
    });

    const freeEquitySnapshot = await requestJson(`${baseUrl}/v1/owner-distributions/free-equity-snapshots`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        proofSourceType: "annual_report_package",
        effectiveDate: "2026-03-31",
        freeEquityAmount: 6000,
        annualReportPackageId: annualPackage.packageId
      }
    });

    const proposed = await requestJson(`${baseUrl}/v1/owner-distributions/decisions`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        decisionDate: "2026-04-01",
        holdingSnapshotId: holdings.snapshotId,
        freeEquitySnapshotId: freeEquitySnapshot.freeEquitySnapshotId,
        boardEvidenceRef: "evidence:board-proposal:api",
        prudenceAssessmentText: "API prudence assessment.",
        liquidityAssessmentText: "API liquidity assessment.",
        perShareAmount: 200,
        journalPlan: {
          equityAccountNumber: "2030",
          liabilityAccountNumber: "2890",
          paymentAccountNumber: "1110",
          authorityLiabilityAccountNumber: "2560"
        }
      }
    });
    assert.equal(proposed.status, "board_proposed");

    const reviewPending = await requestJson(`${baseUrl}/v1/owner-distributions/decisions/${proposed.decisionId}/review`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reviewEvidenceRef: "evidence:review:api"
      }
    });
    assert.equal(reviewPending.status, "review_pending");

    const stammaReady = await requestJson(`${baseUrl}/v1/owner-distributions/decisions/${proposed.decisionId}/stamma-ready`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        stammaNoticeEvidenceRef: "evidence:stamma-notice:api"
      }
    });
    assert.equal(stammaReady.status, "stamma_ready");

    const resolved = await requestJson(`${baseUrl}/v1/owner-distributions/decisions/${proposed.decisionId}/resolve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        approvedByActorId: DEMO_APPROVER_IDS.userId,
        approvedByRoleCode: "finance_manager",
        resolutionDate: "2026-04-10",
        evidenceRef: "evidence:stamma-protocol:api"
      }
    });
    assert.equal(resolved.status, "stamma_resolved");

    const scheduled = await requestJson(`${baseUrl}/v1/owner-distributions/decisions/${proposed.decisionId}/payouts`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        approvedByActorId: DEMO_APPROVER_IDS.userId,
        approvedByRoleCode: "finance_manager",
        paymentDate: "2026-04-15"
      }
    });
    assert.equal(scheduled.status, "scheduled");
    assert.equal(scheduled.kupongskattRecords.length, 1);
    assert.equal(scheduled.kupongskattRecords[0].amount, 300);

    const paid = await requestJson(`${baseUrl}/v1/owner-distributions/decisions/${proposed.decisionId}/payouts/record`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        approvedByActorId: DEMO_APPROVER_IDS.userId,
        approvedByRoleCode: "finance_manager",
        payoutDate: "2026-04-15"
      }
    });
    assert.equal(paid.status, "paid");
    assert.equal(paid.paidGrossAmount, 2000);
    assert.equal(paid.paidWithholdingAmount, 300);
    assert.equal(paid.paymentInstructions.every((entry) => entry.status === "paid"), true);

    const ku31 = await requestJson(`${baseUrl}/v1/owner-distributions/decisions/${proposed.decisionId}/ku31`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(ku31.items.length, 1);
    assert.equal(ku31.items[0].controlStatementDueDate, "2027-01-31");

    const listedKu31 = await requestJson(`${baseUrl}/v1/owner-distributions/ku31-drafts?companyId=${DEMO_IDS.companyId}&decisionId=${proposed.decisionId}`, {
      token: adminToken
    });
    assert.equal(listedKu31.items.length, 1);

    const kupongskatt = await requestJson(`${baseUrl}/v1/owner-distributions/kupongskatt-records?companyId=${DEMO_IDS.companyId}&decisionId=${proposed.decisionId}`, {
      token: adminToken
    });
    assert.equal(kupongskatt.items.length, 1);
    assert.equal(kupongskatt.items[0].status, "paid");
    assert.equal(kupongskatt.items[0].authorityPaymentDueDate, "2026-08-15");

    const payouts = await requestJson(`${baseUrl}/v1/owner-distributions/decisions/${proposed.decisionId}/payouts?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(payouts.items.length, 2);

    const decision = await requestJson(`${baseUrl}/v1/owner-distributions/decisions/${proposed.decisionId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(decision.status, "paid");
    assert.equal(decision.ku31Drafts.length, 1);
    assert.equal(decision.kupongskattRecords.length, 1);

    const auditEvents = await requestJson(`${baseUrl}/v1/owner-distributions/audit-events?companyId=${DEMO_IDS.companyId}&resourceId=${proposed.decisionId}`, {
      token: adminToken
    });
    assert.equal(auditEvents.items.some((entry) => entry.eventCode === "dividend.payout_recorded"), true);
    assert.equal(auditEvents.items.some((entry) => entry.eventCode === "ku31.draft_built"), true);
  } finally {
    await stopServer(server);
  }
});

function prepareAnnualTaxChain(platform, actorId) {
  const annualPackage = prepareSignedAnnualPackage(platform, actorId);
  postResultTransfer(platform, actorId);
  const refreshedAnnualPackage = platform.getAnnualReportPackage({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId
  });
  const taxPackage = platform.createTaxDeclarationPackage({
    companyId: DEMO_IDS.companyId,
    packageId: refreshedAnnualPackage.packageId,
    versionId: refreshedAnnualPackage.currentVersion.versionId,
    actorId: DEMO_IDS.userId
  });
  return {
    annualPackage: refreshedAnnualPackage,
    taxPackage
  };
}

function prepareSignedAnnualPackage(platform, actorId) {
  const annualPackage = prepareUnsignedAnnualPackage(platform, actorId);
  platform.inviteAnnualReportSignatory({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    companyUserId: DEMO_IDS.companyUserId,
    signatoryRole: "ceo"
  });
  platform.inviteAnnualReportSignatory({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    companyUserId: DEMO_IDS.companyUserId,
    signatoryRole: "board_member"
  });
  return platform.signAnnualReportVersion({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    actorId: DEMO_IDS.userId,
    comment: "Signed for owner-distribution API testing"
  });
}

function prepareUnsignedAnnualPackage(platform, actorId) {
  platform.installLedgerCatalog({
    companyId: DEMO_IDS.companyId,
    actorId
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId: DEMO_IDS.companyId,
    fiscalYear: 2026,
    actorId
  });
  const incomeJournal = platform.createJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalDate: "2026-01-20",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: `${actorId}:income`,
    actorId,
    idempotencyKey: `${actorId}:income`,
    lines: [
      { accountNumber: "1510", debitAmount: 18000 },
      { accountNumber: "3010", creditAmount: 18000 }
    ]
  });
  platform.validateJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: incomeJournal.journalEntry.journalEntryId,
    actorId
  });
  platform.postJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: incomeJournal.journalEntry.journalEntryId,
    actorId,
    approvedByActorId: DEMO_APPROVER_IDS.userId,
    approvedByRoleCode: "finance_manager"
  });
  platform.lockAccountingPeriod({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId: period.accountingPeriodId,
    status: "hard_closed",
    actorId,
    reasonCode: "annual_reporting_ready",
    approvedByActorId: DEMO_IDS.userId,
    approvedByRoleCode: "company_admin"
  });
  return platform.createAnnualReportPackage({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId: period.accountingPeriodId,
    profileCode: "k3",
    actorId: DEMO_IDS.userId,
    textSections: {
      management_report: "Owner distribution API annual package",
      accounting_policies: "K3 policies",
      material_events: "No material events"
    },
    noteSections: {
      notes_bundle: "Owner distribution API notes",
      cash_flow_commentary: "Stable cash flow",
      related_party_commentary: "No related-party issues"
    }
  });
}

function postResultTransfer(platform, actorId) {
  const fiscalYearId = platform
    .listFiscalYears({ companyId: DEMO_IDS.companyId })
    .find((candidate) => candidate.startDate === "2026-01-01")?.fiscalYearId;
  return platform.createYearEndTransferBatch({
    companyId: DEMO_IDS.companyId,
    fiscalYearId,
    transferKind: "RESULT_TRANSFER",
    sourceCode: "ANNUAL_REPORTING_CLOSE",
    actorId,
    idempotencyKey: `result-transfer:${DEMO_IDS.companyId}:2026`
  });
}

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}
