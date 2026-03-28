import test from "node:test";
import assert from "node:assert/strict";
import { createLegalFormEngine } from "../../packages/domain-legal-form/src/index.mjs";

test("Step 34 legal-form engine resolves declaration profiles deterministically by entity form", () => {
  const engine = createLegalFormEngine({
    seedDemo: false,
    clock: () => new Date("2026-03-24T10:00:00Z")
  });

  const partnershipProfile = engine.createLegalFormProfile({
    companyId: "company_hb",
    legalFormCode: "HANDELSBOLAG",
    effectiveFrom: "2026-01-01",
    actorId: "tester"
  });
  engine.activateLegalFormProfile({
    companyId: "company_hb",
    legalFormProfileId: partnershipProfile.legalFormProfileId,
    actorId: "tester"
  });
  const partnershipObligation = engine.createReportingObligationProfile({
    companyId: "company_hb",
    legalFormProfileId: partnershipProfile.legalFormProfileId,
    fiscalYearKey: "2026",
    requiresAnnualReport: false,
    requiresYearEndAccounts: true,
    requiresBolagsverketFiling: false,
    requiresTaxDeclarationPackage: true,
    actorId: "tester"
  });
  engine.approveReportingObligationProfile({
    companyId: "company_hb",
    reportingObligationProfileId: partnershipObligation.reportingObligationProfileId,
    actorId: "approver"
  });

  const soleTraderProfile = engine.createLegalFormProfile({
    companyId: "company_enk",
    legalFormCode: "ENSKILD_NARINGSVERKSAMHET",
    effectiveFrom: "2026-01-01",
    actorId: "tester"
  });
  engine.activateLegalFormProfile({
    companyId: "company_enk",
    legalFormProfileId: soleTraderProfile.legalFormProfileId,
    actorId: "tester"
  });
  const soleTraderObligation = engine.createReportingObligationProfile({
    companyId: "company_enk",
    legalFormProfileId: soleTraderProfile.legalFormProfileId,
    fiscalYearKey: "2026",
    requiresAnnualReport: false,
    requiresYearEndAccounts: true,
    allowsSimplifiedYearEnd: true,
    requiresBolagsverketFiling: false,
    requiresTaxDeclarationPackage: true,
    actorId: "tester"
  });
  engine.approveReportingObligationProfile({
    companyId: "company_enk",
    reportingObligationProfileId: soleTraderObligation.reportingObligationProfileId,
    actorId: "approver"
  });

  const hbDeclaration = engine.resolveDeclarationProfile({
    companyId: "company_hb",
    asOfDate: "2026-06-30",
    fiscalYearKey: "2026"
  });
  const enskildDeclaration = engine.resolveDeclarationProfile({
    companyId: "company_enk",
    asOfDate: "2026-06-30",
    fiscalYearKey: "2026"
  });

  assert.equal(hbDeclaration.declarationProfileCode, "INK4");
  assert.equal(hbDeclaration.filingProfileCode, "PARTNERSHIP_INK4");
  assert.equal(hbDeclaration.packageFamilyCode, "partnership_ink4");
  assert.equal(enskildDeclaration.declarationProfileCode, "NE");
  assert.equal(enskildDeclaration.packageFamilyCode, "sole_trader_year_end");
  assert.deepEqual(enskildDeclaration.supplementPackageCodes, ["NEA"]);
});

test("Step 34 legal-form engine uses approved reporting obligation filing profile for partnership annual reports", () => {
  const engine = createLegalFormEngine({
    seedDemo: false,
    clock: () => new Date("2026-03-24T10:00:00Z")
  });

  const profile = engine.createLegalFormProfile({
    companyId: "company_kb",
    legalFormCode: "KOMMANDITBOLAG",
    effectiveFrom: "2026-01-01",
    actorId: "tester"
  });
  engine.activateLegalFormProfile({
    companyId: "company_kb",
    legalFormProfileId: profile.legalFormProfileId,
    actorId: "tester"
  });
  const obligation = engine.createReportingObligationProfile({
    companyId: "company_kb",
    legalFormProfileId: profile.legalFormProfileId,
    fiscalYearKey: "2026",
    requiresAnnualReport: true,
    requiresYearEndAccounts: true,
    requiresBolagsverketFiling: true,
    requiresTaxDeclarationPackage: true,
    actorId: "tester"
  });
  engine.approveReportingObligationProfile({
    companyId: "company_kb",
    reportingObligationProfileId: obligation.reportingObligationProfileId,
    actorId: "approver"
  });

  const declaration = engine.resolveDeclarationProfile({
    companyId: "company_kb",
    asOfDate: "2026-06-30",
    fiscalYearKey: "2026"
  });

  assert.equal(profile.filingProfileCode, "PARTNERSHIP_INK4");
  assert.equal(obligation.filingProfileCode, "PARTNERSHIP_ANNUAL_REPORT_AND_INK4");
  assert.equal(declaration.filingProfileCode, "PARTNERSHIP_ANNUAL_REPORT_AND_INK4");
  assert.equal(declaration.packageFamilyCode, "partnership_annual_report_and_ink4");
  assert.equal(declaration.submissionFamilyCode, "bolagsverket_annual_plus_tax");
});

test("Step 34 legal-form engine blocks invalid reporting obligation combinations for legal forms", () => {
  const engine = createLegalFormEngine({
    seedDemo: false,
    clock: () => new Date("2026-03-24T10:00:00Z")
  });

  const soleTraderProfile = engine.createLegalFormProfile({
    companyId: "company_invalid_enskild",
    legalFormCode: "ENSKILD_NARINGSVERKSAMHET",
    effectiveFrom: "2026-01-01",
    actorId: "tester"
  });
  const abProfile = engine.createLegalFormProfile({
    companyId: "company_invalid_ab",
    legalFormCode: "AKTIEBOLAG",
    effectiveFrom: "2026-01-01",
    actorId: "tester"
  });
  const hbProfile = engine.createLegalFormProfile({
    companyId: "company_invalid_hb",
    legalFormCode: "HANDELSBOLAG",
    effectiveFrom: "2026-01-01",
    actorId: "tester"
  });

  assert.throws(
    () =>
      engine.createReportingObligationProfile({
        companyId: "company_invalid_enskild",
        legalFormProfileId: soleTraderProfile.legalFormProfileId,
        fiscalYearKey: "2026",
        requiresAnnualReport: false,
        requiresYearEndAccounts: true,
        requiresBolagsverketFiling: true,
        actorId: "tester"
      }),
    (error) => error?.code === "sole_trader_bolagsverket_filing_not_supported"
  );

  assert.throws(
    () =>
      engine.createReportingObligationProfile({
        companyId: "company_invalid_ab",
        legalFormProfileId: abProfile.legalFormProfileId,
        fiscalYearKey: "2026",
        requiresAnnualReport: false,
        requiresYearEndAccounts: false,
        requiresBolagsverketFiling: true,
        actorId: "tester"
      }),
    (error) => error?.code === "annual_report_required_for_legal_person"
  );

  assert.throws(
    () =>
      engine.createReportingObligationProfile({
        companyId: "company_invalid_hb",
        legalFormProfileId: hbProfile.legalFormProfileId,
        fiscalYearKey: "2026",
        requiresAnnualReport: false,
        requiresYearEndAccounts: true,
        requiresBolagsverketFiling: true,
        actorId: "tester"
      }),
    (error) => error?.code === "partnership_bolagsverket_requires_annual_report"
  );
});

test("Step 34 legal-form engine allows revised reporting obligations and supersedes prior approved version", () => {
  const engine = createLegalFormEngine({
    seedDemo: false,
    clock: () => new Date("2026-03-24T10:00:00Z")
  });

  const profile = engine.createLegalFormProfile({
    companyId: "company_revision_hb",
    legalFormCode: "HANDELSBOLAG",
    effectiveFrom: "2026-01-01",
    actorId: "tester"
  });
  engine.activateLegalFormProfile({
    companyId: "company_revision_hb",
    legalFormProfileId: profile.legalFormProfileId,
    actorId: "tester"
  });

  const firstDraft = engine.createReportingObligationProfile({
    companyId: "company_revision_hb",
    legalFormProfileId: profile.legalFormProfileId,
    fiscalYearKey: "2026",
    requiresAnnualReport: false,
    requiresYearEndAccounts: true,
    requiresBolagsverketFiling: false,
    actorId: "tester"
  });
  const firstApproved = engine.approveReportingObligationProfile({
    companyId: "company_revision_hb",
    reportingObligationProfileId: firstDraft.reportingObligationProfileId,
    actorId: "approver"
  });

  const revisedDraft = engine.createReportingObligationProfile({
    companyId: "company_revision_hb",
    legalFormProfileId: profile.legalFormProfileId,
    fiscalYearKey: "2026",
    requiresAnnualReport: true,
    requiresYearEndAccounts: true,
    requiresBolagsverketFiling: true,
    actorId: "tester"
  });
  const revisedApproved = engine.approveReportingObligationProfile({
    companyId: "company_revision_hb",
    reportingObligationProfileId: revisedDraft.reportingObligationProfileId,
    actorId: "approver"
  });

  const superseded = engine.getReportingObligationProfile({
    companyId: "company_revision_hb",
    reportingObligationProfileId: firstApproved.reportingObligationProfileId
  });
  const declaration = engine.resolveDeclarationProfile({
    companyId: "company_revision_hb",
    asOfDate: "2026-06-30",
    fiscalYearKey: "2026"
  });

  assert.equal(superseded.status, "superseded");
  assert.equal(superseded.supersededByReportingObligationProfileId, revisedApproved.reportingObligationProfileId);
  assert.equal(revisedApproved.status, "approved");
  assert.equal(declaration.reportingObligationProfileId, revisedApproved.reportingObligationProfileId);
  assert.equal(declaration.filingProfileCode, "PARTNERSHIP_ANNUAL_REPORT_AND_INK4");
});
