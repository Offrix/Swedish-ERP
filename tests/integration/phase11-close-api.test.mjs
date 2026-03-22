import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 11.3 API exposes close workbench, blocker handling, sign-off and reopen", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T13:15:00Z")
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
    const preparer = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "close-api-preparer@example.test",
      displayName: "Close API Preparer",
      roleCode: "bureau_user",
      requiresMfa: false
    });
    const preparerToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: preparer.user.email
    });

    const { clientCompany, period, reportSnapshotId, reconciliationRuns } = seedClientCloseSetup(platform, adminToken, preparer.companyUserId);

    const checklist = await requestJson(`${baseUrl}/v1/close/checklists`, {
      method: "POST",
      token: preparerToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        clientCompanyId: clientCompany.companyId,
        accountingPeriodId: period.accountingPeriodId,
        reportSnapshotId,
        signoffChain: [
          { companyUserId: preparer.companyUserId, roleCode: "close_preparer" },
          { companyUserId: DEMO_IDS.companyUserId, roleCode: "close_signatory" }
        ]
      }
    });

    const workbenchList = await requestJson(`${baseUrl}/v1/close/workbench?bureauOrgId=${DEMO_IDS.companyId}&clientCompanyId=${clientCompany.companyId}`, {
      token: preparerToken
    });
    assert.equal(workbenchList.items.length, 1);

    for (const step of checklist.steps) {
      const body = step.reconciliationAreaCode
        ? { bureauOrgId: DEMO_IDS.companyId, reconciliationRunId: reconciliationRuns[step.reconciliationAreaCode] }
        : step.evidenceType === "report_snapshot"
          ? { bureauOrgId: DEMO_IDS.companyId, evidenceRefs: [{ reportSnapshotId }] }
          : { bureauOrgId: DEMO_IDS.companyId, evidenceRefs: [{ note: `${step.stepCode} complete` }] };
      await requestJson(`${baseUrl}/v1/close/checklists/${checklist.checklistId}/steps/${step.stepCode}/complete`, {
        method: "POST",
        token: preparerToken,
        body
      });
    }

    const blocker = await requestJson(`${baseUrl}/v1/close/checklists/${checklist.checklistId}/blockers`, {
      method: "POST",
      token: preparerToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        stepCode: "document_queue_review",
        severity: "hard_stop",
        reasonCode: "attachment_gap",
        comment: "Missing evidence attachment."
      }
    });
    assert.equal(blocker.status, "open");

    const blockedSignoff = await requestJson(`${baseUrl}/v1/close/checklists/${checklist.checklistId}/signoff`, {
      method: "POST",
      token: preparerToken,
      expectedStatus: 400,
      body: {
        bureauOrgId: DEMO_IDS.companyId
      }
    });
    assert.equal(blockedSignoff.error, "close_blocker_open");

    const override = await requestJson(`${baseUrl}/v1/close/blockers/${blocker.blockerId}/override`, {
      method: "POST",
      token: adminToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        waiverUntil: "2026-04-30",
        comment: "Waiver accepted."
      }
    });
    assert.equal(override.status, "waived");

    const pendingSignoff = await requestJson(`${baseUrl}/v1/close/checklists/${checklist.checklistId}/signoff`, {
      method: "POST",
      token: preparerToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        comment: "Prepared."
      }
    });
    assert.equal(pendingSignoff.status, "signoff_pending");

    const closed = await requestJson(`${baseUrl}/v1/close/checklists/${checklist.checklistId}/signoff`, {
      method: "POST",
      token: adminToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        comment: "Approved."
      }
    });
    assert.equal(closed.status, "closed");
    assert.equal(closed.closeState, "hard_closed");

    const reopened = await requestJson(`${baseUrl}/v1/close/checklists/${checklist.checklistId}/reopen`, {
      method: "POST",
      token: preparerToken,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        reasonCode: "external_reporting_change",
        impactSummary: "Close package must be rerun.",
        approvedByCompanyUserId: DEMO_IDS.companyUserId
      }
    });
    assert.equal(reopened.successorChecklist.checklistVersion, 2);
  } finally {
    await stopServer(server);
  }
});

function seedClientCloseSetup(platform, adminToken, responsibleConsultantId) {
  const clientCompany = platform.createCompany({
    legalName: "Close API Client AB",
    orgNumber: "559900-4302",
    settingsJson: {
      bureauDelivery: {
        closeLeadBusinessDays: 3,
        reportingLeadBusinessDays: 2,
        submissionLeadBusinessDays: 2,
        generalLeadBusinessDays: 1,
        approvalLeadBusinessDays: 2,
        reminderProfile: "standard"
      }
    }
  });
  platform.createPortfolioMembership({
    sessionToken: adminToken,
    bureauOrgId: DEMO_IDS.companyId,
    clientCompanyId: clientCompany.companyId,
    responsibleConsultantId,
    activeFrom: "2026-01-01"
  });
  platform.installLedgerCatalog({
    companyId: clientCompany.companyId,
    actorId: "phase11-close-api"
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId: clientCompany.companyId,
    fiscalYear: 2026,
    actorId: "phase11-close-api"
  });
  const created = platform.createJournalEntry({
    companyId: clientCompany.companyId,
    journalDate: "2026-01-11",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase11-close-api-income",
    actorId: "phase11-close-api",
    idempotencyKey: "phase11-close-api-income",
    lines: [
      { accountNumber: "1510", debitAmount: 4800 },
      { accountNumber: "3010", creditAmount: 4800 }
    ]
  });
  platform.validateJournalEntry({
    companyId: clientCompany.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase11-close-api"
  });
  platform.postJournalEntry({
    companyId: clientCompany.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase11-close-api"
  });
  const reportSnapshot = platform.runReportSnapshot({
    companyId: clientCompany.companyId,
    reportCode: "income_statement",
    fromDate: "2026-01-01",
    toDate: "2026-01-31",
    actorId: "phase11-close-api"
  });
  const reconciliationRuns = {};
  for (const areaCode of ["bank", "ar", "ap", "vat"]) {
    const run = platform.createReconciliationRun({
      companyId: clientCompany.companyId,
      accountingPeriodId: period.accountingPeriodId,
      areaCode,
      cutoffDate: "2026-12-31",
      differenceItems: [],
      actorId: "phase11-close-api"
    });
    platform.signOffReconciliationRun({
      companyId: clientCompany.companyId,
      reconciliationRunId: run.reconciliationRun.reconciliationRunId,
      actorId: "phase11-close-api",
      signatoryRole: "close_signatory"
    });
    reconciliationRuns[areaCode] = run.reconciliationRun.reconciliationRunId;
  }
  return {
    clientCompany,
    period,
    reportSnapshotId: reportSnapshot.reportSnapshotId,
    reconciliationRuns
  };
}

async function loginWithStrongAuth({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
    }
  });
  const bankidStart = await requestJson(`${baseUrl}/v1/auth/bankid/start`, {
    method: "POST",
    token: started.sessionToken
  });
  await requestJson(`${baseUrl}/v1/auth/bankid/collect`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      orderRef: bankidStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
    }
  });
  return started.sessionToken;
}

async function loginWithTotpOnly({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
    }
  });
  return started.sessionToken;
}

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}
