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
  assert.equal(hbDeclaration.packageFamilyCode, "partnership_ink4");
  assert.equal(enskildDeclaration.declarationProfileCode, "NE");
  assert.equal(enskildDeclaration.packageFamilyCode, "sole_trader_year_end");
  assert.deepEqual(enskildDeclaration.supplementPackageCodes, ["NEA"]);
});
