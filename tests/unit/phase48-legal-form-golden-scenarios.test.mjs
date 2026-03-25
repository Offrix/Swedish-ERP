import test from "node:test";
import assert from "node:assert/strict";
import { createLegalFormEngine } from "../../packages/domain-legal-form/src/index.mjs";
import { createFiscalYearEngine } from "../../packages/domain-fiscal-year/src/index.mjs";

test("Step 48 golden legal-form scenarios resolve annual and declaration paths deterministically for all supported entity types", () => {
  const engine = createLegalFormEngine({
    seedDemo: false,
    clock: () => new Date("2026-03-25T06:00:00Z")
  });

  const cases = [
    {
      companyId: "company_ab",
      legalFormCode: "AKTIEBOLAG",
      fiscalYearKey: "2026",
      requiresAnnualReport: true,
      requiresYearEndAccounts: false,
      requiresBolagsverketFiling: true,
      expectedDeclarationProfileCode: "INK2",
      expectedPackageFamilyCode: "annual_report_ab",
      expectedSubmissionFamilyCode: "bolagsverket_annual_plus_tax",
      expectedSignatoryClassCode: "BOARD_OR_CEO",
      expectedRequiredPackageCodes: ["INK2", "SRU"],
      expectedSupplementPackageCodes: []
    },
    {
      companyId: "company_ef",
      legalFormCode: "EKONOMISK_FORENING",
      fiscalYearKey: "2026",
      requiresAnnualReport: true,
      requiresYearEndAccounts: false,
      requiresBolagsverketFiling: true,
      expectedDeclarationProfileCode: "INK2",
      expectedPackageFamilyCode: "annual_report_ef",
      expectedSubmissionFamilyCode: "bolagsverket_annual_plus_tax",
      expectedSignatoryClassCode: "ASSOCIATION_SIGNATORY",
      expectedRequiredPackageCodes: ["INK2", "SRU"],
      expectedSupplementPackageCodes: []
    },
    {
      companyId: "company_enk",
      legalFormCode: "ENSKILD_NARINGSVERKSAMHET",
      fiscalYearKey: "2026",
      requiresAnnualReport: false,
      requiresYearEndAccounts: true,
      requiresBolagsverketFiling: false,
      allowsSimplifiedYearEnd: true,
      expectedDeclarationProfileCode: "NE",
      expectedPackageFamilyCode: "sole_trader_year_end",
      expectedSubmissionFamilyCode: "skatteverket_tax_only",
      expectedSignatoryClassCode: "OWNER_PROPRIETOR",
      expectedRequiredPackageCodes: ["NE", "SRU"],
      expectedSupplementPackageCodes: ["NEA"]
    },
    {
      companyId: "company_hb",
      legalFormCode: "HANDELSBOLAG",
      fiscalYearKey: "2026",
      requiresAnnualReport: false,
      requiresYearEndAccounts: true,
      requiresBolagsverketFiling: false,
      expectedDeclarationProfileCode: "INK4",
      expectedPackageFamilyCode: "partnership_ink4",
      expectedSubmissionFamilyCode: "skatteverket_tax_only",
      expectedSignatoryClassCode: "PARTNER_SIGNATORY",
      expectedRequiredPackageCodes: ["INK4", "SRU"],
      expectedSupplementPackageCodes: []
    },
    {
      companyId: "company_kb",
      legalFormCode: "KOMMANDITBOLAG",
      fiscalYearKey: "2026",
      requiresAnnualReport: true,
      requiresYearEndAccounts: true,
      requiresBolagsverketFiling: true,
      expectedDeclarationProfileCode: "INK4",
      expectedPackageFamilyCode: "partnership_annual_report_and_ink4",
      expectedSubmissionFamilyCode: "bolagsverket_annual_plus_tax",
      expectedSignatoryClassCode: "PARTNER_SIGNATORY",
      expectedRequiredPackageCodes: ["INK4", "SRU"],
      expectedSupplementPackageCodes: []
    }
  ];

  for (const scenario of cases) {
    const profile = engine.createLegalFormProfile({
      companyId: scenario.companyId,
      legalFormCode: scenario.legalFormCode,
      effectiveFrom: "2026-01-01",
      actorId: "tester"
    });
    engine.activateLegalFormProfile({
      companyId: scenario.companyId,
      legalFormProfileId: profile.legalFormProfileId,
      actorId: "tester"
    });
    const obligation = engine.createReportingObligationProfile({
      companyId: scenario.companyId,
      legalFormProfileId: profile.legalFormProfileId,
      fiscalYearKey: scenario.fiscalYearKey,
      requiresAnnualReport: scenario.requiresAnnualReport,
      requiresYearEndAccounts: scenario.requiresYearEndAccounts,
      allowsSimplifiedYearEnd: scenario.allowsSimplifiedYearEnd === true,
      requiresBolagsverketFiling: scenario.requiresBolagsverketFiling,
      requiresTaxDeclarationPackage: true,
      actorId: "tester"
    });
    engine.approveReportingObligationProfile({
      companyId: scenario.companyId,
      reportingObligationProfileId: obligation.reportingObligationProfileId,
      actorId: "approver"
    });

    const declarationProfile = engine.resolveDeclarationProfile({
      companyId: scenario.companyId,
      asOfDate: "2026-06-30",
      fiscalYearKey: scenario.fiscalYearKey
    });

    assert.equal(declarationProfile.legalFormCode, scenario.legalFormCode);
    assert.equal(declarationProfile.declarationProfileCode, scenario.expectedDeclarationProfileCode);
    assert.equal(declarationProfile.packageFamilyCode, scenario.expectedPackageFamilyCode);
    assert.equal(declarationProfile.submissionFamilyCode, scenario.expectedSubmissionFamilyCode);
    assert.equal(declarationProfile.signatoryClassCode, scenario.expectedSignatoryClassCode);
    assert.deepEqual(declarationProfile.requiredPackageCodes, scenario.expectedRequiredPackageCodes);
    assert.deepEqual(declarationProfile.supplementPackageCodes, scenario.expectedSupplementPackageCodes);
  }
});

test("Step 48 annual legal-form fixtures preserve short-year AB handling and block sole-trader short years", () => {
  const fiscalYearEngine = createFiscalYearEngine({
    seedDemo: false,
    clock: () => new Date("2026-03-25T06:30:00Z")
  });
  const legalFormEngine = createLegalFormEngine({
    seedDemo: false,
    clock: () => new Date("2026-03-25T06:30:00Z")
  });

  const abCompanyId = "company_ab_short_year";
  fiscalYearEngine.createFiscalYearProfile({
    companyId: abCompanyId,
    legalFormCode: "AKTIEBOLAG",
    actorId: "tester"
  });
  const shortYear = fiscalYearEngine.createFiscalYear({
    companyId: abCompanyId,
    startDate: "2026-01-01",
    endDate: "2026-06-30",
    approvalBasisCode: "BOOKKEEPING_ENTRY",
    actorId: "tester"
  });
  const generatedPeriods = fiscalYearEngine.generatePeriods({
    companyId: abCompanyId,
    fiscalYearId: shortYear.fiscalYearId,
    actorId: "tester"
  });

  const abProfile = legalFormEngine.createLegalFormProfile({
    companyId: abCompanyId,
    legalFormCode: "AKTIEBOLAG",
    effectiveFrom: "2026-01-01",
    actorId: "tester"
  });
  legalFormEngine.activateLegalFormProfile({
    companyId: abCompanyId,
    legalFormProfileId: abProfile.legalFormProfileId,
    actorId: "tester"
  });
  const abObligation = legalFormEngine.createReportingObligationProfile({
    companyId: abCompanyId,
    legalFormProfileId: abProfile.legalFormProfileId,
    fiscalYearKey: "2026-H1",
    fiscalYearId: shortYear.fiscalYearId,
    requiresAnnualReport: true,
    requiresYearEndAccounts: false,
    requiresBolagsverketFiling: true,
    actorId: "tester"
  });
  legalFormEngine.approveReportingObligationProfile({
    companyId: abCompanyId,
    reportingObligationProfileId: abObligation.reportingObligationProfileId,
    actorId: "approver"
  });

  const shortYearDeclaration = legalFormEngine.resolveDeclarationProfile({
    companyId: abCompanyId,
    asOfDate: "2026-06-30",
    fiscalYearKey: "2026-H1",
    fiscalYearId: shortYear.fiscalYearId
  });

  assert.equal(shortYear.yearKind, "SHORT");
  assert.equal(generatedPeriods.length, 6);
  assert.equal(shortYearDeclaration.declarationProfileCode, "INK2");
  assert.equal(shortYearDeclaration.packageFamilyCode, "annual_report_ab");
  assert.equal(shortYearDeclaration.submissionFamilyCode, "bolagsverket_annual_plus_tax");

  const soleTraderCompanyId = "company_sole_trader_short_year";
  fiscalYearEngine.createFiscalYearProfile({
    companyId: soleTraderCompanyId,
    legalFormCode: "ENSKILD_NARINGSVERKSAMHET",
    actorId: "tester"
  });

  assert.throws(
    () =>
      fiscalYearEngine.createFiscalYear({
        companyId: soleTraderCompanyId,
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        approvalBasisCode: "BOOKKEEPING_ENTRY",
        actorId: "tester"
      }),
    (error) => {
      assert.equal(error?.code, "calendar_year_required");
      return true;
    }
  );
});
