import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly } from "../helpers/api-helpers.mjs";

test("Phase 7.1 API exposes close requirements and close workbench adopts year-end obligation template", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-31T10:00:00Z")
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
      email: "phase7-close-preparer@example.test",
      displayName: "Phase 7 Close Preparer",
      roleCode: "bureau_user",
      requiresMfa: false
    });
    const preparerToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: preparer.user.email
    });

    const clientCompany = platform.createCompany({
      legalName: "Phase 7 Client AB",
      orgNumber: "559900-4412",
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
      responsibleConsultantId: preparer.companyUserId,
      activeFrom: "2026-01-01"
    });

    const legalFormProfile = platform.createLegalFormProfile({
      companyId: clientCompany.companyId,
      legalFormCode: "AKTIEBOLAG",
      effectiveFrom: "2026-01-01",
      actorId: "phase7-api"
    });
    platform.activateLegalFormProfile({
      companyId: clientCompany.companyId,
      legalFormProfileId: legalFormProfile.legalFormProfileId,
      actorId: "phase7-api"
    });
    const reportingObligation = platform.createReportingObligationProfile({
      companyId: clientCompany.companyId,
      legalFormProfileId: legalFormProfile.legalFormProfileId,
      fiscalYearKey: "2026",
      requiresAnnualReport: true,
      requiresYearEndAccounts: true,
      requiresBolagsverketFiling: true,
      requiresTaxDeclarationPackage: true,
      actorId: "phase7-api"
    });
    platform.approveReportingObligationProfile({
      companyId: clientCompany.companyId,
      reportingObligationProfileId: reportingObligation.reportingObligationProfileId,
      actorId: "phase7-approver"
    });

    const fiscalYearProfile = platform.createFiscalYearProfile({
      companyId: clientCompany.companyId,
      legalFormCode: "AKTIEBOLAG",
      actorId: "phase7-api"
    });
    const fiscalYear = platform.createFiscalYear({
      companyId: clientCompany.companyId,
      fiscalYearProfileId: fiscalYearProfile.fiscalYearProfileId,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      approvalBasisCode: "BASELINE",
      actorId: "phase7-api"
    });
    platform.activateFiscalYear({
      companyId: clientCompany.companyId,
      fiscalYearId: fiscalYear.fiscalYearId,
      actorId: "phase7-api"
    });
    platform.installLedgerCatalog({
      companyId: clientCompany.companyId,
      actorId: "phase7-api"
    });
    const period = platform.ensureAccountingYearPeriod({
      companyId: clientCompany.companyId,
      fiscalYear: 2026,
      actorId: "phase7-api"
    });

    const closeRequirements = await requestJson(
      `${baseUrl}/v1/legal-forms/close-requirements?companyId=${DEMO_IDS.companyId}&asOfDate=2026-12-31&fiscalYearKey=2026&isFiscalYearEnd=true`,
      { token: adminToken }
    );
    const stepCodes = closeRequirements.mandatoryStepBlueprints.map((step) => step.stepCode);
    assert.equal(closeRequirements.closeTemplateCode, "year_end_annual_report");
    assert.equal(stepCodes.includes("income_tax_package_review"), true);
    assert.equal(stepCodes.includes("annual_report_package_review"), true);
    assert.equal(stepCodes.includes("bolagsverket_filing_readiness"), true);

    const checklist = await requestJson(`${baseUrl}/v1/close/checklists`, {
      method: "POST",
      token: preparerToken,
      expectedStatus: 201,
      body: {
        bureauOrgId: DEMO_IDS.companyId,
        clientCompanyId: clientCompany.companyId,
        accountingPeriodId: period.accountingPeriodId,
        signoffChain: [
          { companyUserId: preparer.companyUserId, roleCode: "close_preparer" },
          { companyUserId: DEMO_IDS.companyUserId, roleCode: "close_signatory" }
        ]
      }
    });
    const checklistStepCodes = checklist.steps.map((step) => step.stepCode);
    assert.equal(checklist.checklistTemplateCode, "year_end_annual_report");
    assert.equal(checklist.closeRequirementSnapshot.reportingObligationProfileId, reportingObligation.reportingObligationProfileId);
    assert.equal(checklistStepCodes.includes("year_end_accounts_review"), true);
    assert.equal(checklistStepCodes.includes("income_tax_package_review"), true);
    assert.equal(checklistStepCodes.includes("annual_report_package_review"), true);
    assert.equal(checklistStepCodes.includes("bolagsverket_filing_readiness"), true);
  } finally {
    await stopServer(server);
  }
});

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(["POST", "PUT", "PATCH", "DELETE"].includes(String(method).toUpperCase()) ? { "idempotency-key": crypto.randomUUID() } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(payload));
  return payload;
}
