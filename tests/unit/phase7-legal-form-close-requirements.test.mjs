import test from "node:test";
import assert from "node:assert/strict";
import { createLegalFormEngine } from "../../packages/domain-legal-form/src/index.mjs";
import { createFiscalYearEngine } from "../../packages/domain-fiscal-year/src/index.mjs";

test("Phase 7.1 legal-form obligations resolve year-end close requirements deterministically", () => {
  const engine = createLegalFormEngine({
    seedDemo: false,
    clock: () => new Date("2026-03-31T09:00:00Z")
  });

  const profile = engine.createLegalFormProfile({
    companyId: "company_phase7_ab",
    legalFormCode: "AKTIEBOLAG",
    effectiveFrom: "2026-01-01",
    actorId: "tester"
  });
  engine.activateLegalFormProfile({
    companyId: "company_phase7_ab",
    legalFormProfileId: profile.legalFormProfileId,
    actorId: "tester"
  });
  const obligation = engine.createReportingObligationProfile({
    companyId: "company_phase7_ab",
    legalFormProfileId: profile.legalFormProfileId,
    fiscalYearKey: "2026",
    requiresAnnualReport: true,
    requiresYearEndAccounts: true,
    requiresBolagsverketFiling: true,
    requiresTaxDeclarationPackage: true,
    actorId: "tester"
  });
  engine.approveReportingObligationProfile({
    companyId: "company_phase7_ab",
    reportingObligationProfileId: obligation.reportingObligationProfileId,
    actorId: "approver"
  });

  const closeRequirements = engine.resolveCloseRequirements({
    companyId: "company_phase7_ab",
    asOfDate: "2026-12-31",
    fiscalYearKey: "2026",
    isFiscalYearEnd: true
  });
  const stepCodes = closeRequirements.mandatoryStepBlueprints.map((step) => step.stepCode);

  assert.equal(closeRequirements.closeTemplateCode, "year_end_annual_report");
  assert.equal(closeRequirements.reportingObligationProfileId, obligation.reportingObligationProfileId);
  assert.equal(stepCodes.includes("year_end_accounts_review"), true);
  assert.equal(stepCodes.includes("income_tax_package_review"), true);
  assert.equal(stepCodes.includes("annual_report_package_review"), true);
  assert.equal(stepCodes.includes("bolagsverket_filing_readiness"), true);
});

test("Phase 7.1 fiscal-year profiles reject unsupported legal forms", () => {
  const engine = createFiscalYearEngine({
    seedDemo: false,
    clock: () => new Date("2026-03-31T09:00:00Z")
  });

  assert.throws(
    () =>
      engine.createFiscalYearProfile({
        companyId: "company_phase7_invalid",
        legalFormCode: "IDEELL_FORENING",
        actorId: "tester"
      }),
    (error) => error?.code === "legal_form_code_invalid"
  );
});
