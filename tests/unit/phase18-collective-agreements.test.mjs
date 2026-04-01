import test from "node:test";
import assert from "node:assert/strict";
import { createCollectiveAgreementsEngine } from "../../packages/domain-collective-agreements/src/index.mjs";
import { createHrEngine } from "../../packages/domain-hr/src/index.mjs";

test("Step 18 collective agreements version and pin assignments without overlap", () => {
  const hr = createHrEngine({
    clock: () => new Date("2026-03-24T18:00:00Z"),
    seedDemo: false
  });
  const companyId = "company_agreements_1";
  const employee = hr.createEmployee({
    companyId,
    givenName: "Erik",
    familyName: "Ek",
    identityType: "other",
    actorId: "hr_admin"
  });
  const employment = hr.createEmployment({
    companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Technician",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: "hr_admin"
  });

  const engine = createCollectiveAgreementsEngine({
    clock: () => new Date("2026-03-24T18:00:00Z"),
    seedDemo: false,
    hrPlatform: hr
  });

  const family = engine.createAgreementFamily({
    companyId,
    code: "TEKNIKAVTALET",
    name: "Teknikavtalet",
    sectorCode: "PRIVATE",
    actorId: "payroll_admin"
  });

  const version = engine.publishAgreementVersion({
    companyId,
    agreementFamilyId: family.agreementFamilyId,
    versionCode: "TEKNIK_2026_01",
    effectiveFrom: "2026-01-01",
    rulepackVersion: "2026.1",
    ruleSet: {
      overtimeMultiplier: 1.5,
      obCategoryA: 32.5
    },
    actorId: "payroll_admin"
  });
  assert.equal(version.status, "active");
  const catalogEntry = engine.publishAgreementCatalogEntry({
    companyId,
    agreementVersionId: version.agreementVersionId,
    dropdownLabel: "Teknikavtalet 2026",
    actorId: "payroll_admin"
  });

  assert.throws(
    () =>
      engine.publishAgreementVersion({
        companyId,
        agreementFamilyId: family.agreementFamilyId,
        versionCode: "TEKNIK_2026_02",
        effectiveFrom: "2026-06-01",
        rulepackVersion: "2026.2",
        actorId: "payroll_admin"
      }),
    /agreement versions/i
  );

  const assignment = engine.assignAgreementToEmployment({
    companyId,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    agreementCatalogEntryId: catalogEntry.agreementCatalogEntryId,
    effectiveFrom: "2026-01-01",
    assignmentReasonCode: "ONBOARDING",
    actorId: "payroll_admin"
  });
  assert.equal(assignment.status, "active");

  const override = engine.createAgreementOverride({
    companyId,
    agreementAssignmentId: assignment.agreementAssignmentId,
    overrideTypeCode: "pay_rule",
    overridePayload: {
      overtimeMultiplier: 2
    },
    reasonCode: "CUSTOM_RATE",
    actorId: "payroll_admin"
  });
  assert.equal(override.overridePayloadJson.overtimeMultiplier, 2);

  const activeAgreement = engine.getActiveAgreementForEmployment({
    companyId,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    eventDate: "2026-03-24"
  });
  assert.equal(activeAgreement.agreementVersion.versionCode, "TEKNIK_2026_01");
  assert.equal(activeAgreement.agreementCatalogEntry.agreementCatalogEntryId, catalogEntry.agreementCatalogEntryId);
  assert.equal(activeAgreement.agreementOverrides.length, 1);

  const overlay = engine.evaluateAgreementOverlay({
    companyId,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    eventDate: "2026-03-24",
    baseRuleSet: {
      vacationSupplementRate: 0.8
    }
  });
  assert.equal(overlay.ruleSet.overtimeMultiplier, 2);
  assert.equal(overlay.ruleSet.vacationSupplementRate, 0.8);
  assert.ok(overlay.agreementOverlayId);
  assert.equal(overlay.agreementCode, "TEKNIKAVTALET");
  assert.equal(overlay.validFrom, "2026-01-01");
  assert.equal(overlay.validTo, null);
  assert.equal(overlay.rateComponents.payItemRates.OVERTIME.calculationMode, "multiplier");
  assert.equal(overlay.rateComponents.payItemRates.OVERTIME.multiplier, 2);
  assert.equal(overlay.rateComponents.payItemRates.OB.calculationMode, "unit_rate");
  assert.equal(overlay.rateComponents.payItemRates.OB.unitRate, 32.5);
  assert.equal(overlay.rateComponents.payItemRates.VACATION_SUPPLEMENT.calculationMode, "percent_of_basis");
  assert.equal(overlay.rateComponents.payItemRates.VACATION_SUPPLEMENT.percent, 0.8);
});

test("Step 18 collective agreements dedupe idempotent family, version, assignment and override mutations", () => {
  const hr = createHrEngine({
    clock: () => new Date("2026-03-24T18:30:00Z"),
    seedDemo: false
  });
  const companyId = "company_agreements_2";
  const employee = hr.createEmployee({
    companyId,
    givenName: "Lars",
    familyName: "Lind",
    identityType: "other",
    actorId: "hr_admin"
  });
  const employment = hr.createEmployment({
    companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: "hr_admin"
  });

  const engine = createCollectiveAgreementsEngine({
    clock: () => new Date("2026-03-24T18:30:00Z"),
    seedDemo: false,
    hrPlatform: hr
  });

  const family = engine.createAgreementFamily({
    companyId,
    code: "UNIONEN",
    name: "Unionen",
    actorId: "payroll_admin",
    idempotencyKey: "agreement-family-1"
  });
  const duplicateFamily = engine.createAgreementFamily({
    companyId,
    code: "UNIONEN",
    name: "Unionen duplicate ignored",
    actorId: "payroll_admin",
    idempotencyKey: "agreement-family-1"
  });
  assert.equal(duplicateFamily.agreementFamilyId, family.agreementFamilyId);

  const version = engine.publishAgreementVersion({
    companyId,
    agreementFamilyId: family.agreementFamilyId,
    versionCode: "UNIONEN_2026_01",
    effectiveFrom: "2026-01-01",
    rulepackVersion: "2026.1",
    ruleSet: {
      overtimeMultiplier: 1.5
    },
    actorId: "payroll_admin",
    idempotencyKey: "agreement-version-1"
  });
  const duplicateVersion = engine.publishAgreementVersion({
    companyId,
    agreementFamilyId: family.agreementFamilyId,
    versionCode: "UNIONEN_2026_01",
    effectiveFrom: "2026-01-01",
    rulepackVersion: "2026.1",
    ruleSet: {
      overtimeMultiplier: 1.5
    },
    actorId: "payroll_admin",
    idempotencyKey: "agreement-version-1"
  });
  assert.equal(duplicateVersion.agreementVersionId, version.agreementVersionId);
  const catalogEntry = engine.publishAgreementCatalogEntry({
    companyId,
    agreementVersionId: version.agreementVersionId,
    dropdownLabel: "Unionen 2026",
    actorId: "payroll_admin",
    idempotencyKey: "agreement-catalog-1"
  });
  const duplicateCatalogEntry = engine.publishAgreementCatalogEntry({
    companyId,
    agreementVersionId: version.agreementVersionId,
    dropdownLabel: "Unionen 2026",
    actorId: "payroll_admin",
    idempotencyKey: "agreement-catalog-1"
  });
  assert.equal(duplicateCatalogEntry.agreementCatalogEntryId, catalogEntry.agreementCatalogEntryId);

  const assignment = engine.assignAgreementToEmployment({
    companyId,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    agreementCatalogEntryId: catalogEntry.agreementCatalogEntryId,
    effectiveFrom: "2026-01-01",
    assignmentReasonCode: "HIRING",
    actorId: "payroll_admin",
    idempotencyKey: "agreement-assignment-1"
  });
  const duplicateAssignment = engine.assignAgreementToEmployment({
    companyId,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    agreementCatalogEntryId: catalogEntry.agreementCatalogEntryId,
    effectiveFrom: "2026-01-01",
    assignmentReasonCode: "HIRING",
    actorId: "payroll_admin",
    idempotencyKey: "agreement-assignment-1"
  });
  assert.equal(duplicateAssignment.agreementAssignmentId, assignment.agreementAssignmentId);

  const override = engine.createAgreementOverride({
    companyId,
    agreementAssignmentId: assignment.agreementAssignmentId,
    overrideTypeCode: "pay_rule",
    overridePayload: {
      overtimeMultiplier: 2
    },
    reasonCode: "LOCAL_AGREEMENT",
    actorId: "payroll_admin",
    idempotencyKey: "agreement-override-1"
  });
  const duplicateOverride = engine.createAgreementOverride({
    companyId,
    agreementAssignmentId: assignment.agreementAssignmentId,
    overrideTypeCode: "pay_rule",
    overridePayload: {
      overtimeMultiplier: 2
    },
    reasonCode: "LOCAL_AGREEMENT",
    actorId: "payroll_admin",
    idempotencyKey: "agreement-override-1"
  });
  assert.equal(duplicateOverride.agreementOverrideId, override.agreementOverrideId);
});

test("Step 18 collective agreement intake publishes dropdown catalog and approves local supplements", () => {
  const hr = createHrEngine({
    clock: () => new Date("2026-03-24T19:00:00Z"),
    seedDemo: false
  });
  const companyId = "company_agreements_3";
  const employee = hr.createEmployee({
    companyId,
    givenName: "Sara",
    familyName: "Support",
    identityType: "other",
    actorId: "hr_admin"
  });
  const employment = hr.createEmployment({
    companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Consultant",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: "hr_admin"
  });
  const engine = createCollectiveAgreementsEngine({
    clock: () => new Date("2026-03-24T19:00:00Z"),
    seedDemo: false,
    hrPlatform: hr
  });

  const catalogIntake = engine.submitAgreementIntakeCase({
    companyId,
    proposedFamilyCode: "ALMEGA_IT",
    proposedFamilyName: "Almega IT",
    requestedPublicationTarget: "catalog",
    sourceDocumentRef: "support-case-11-3",
    actorId: "backoffice_operator"
  });
  engine.startAgreementIntakeExtraction({
    companyId,
    agreementIntakeCaseId: catalogIntake.agreementIntakeCaseId,
    actorId: "backoffice_operator"
  });
  const reviewedCatalogIntake = engine.reviewAgreementIntakeCase({
    companyId,
    agreementIntakeCaseId: catalogIntake.agreementIntakeCaseId,
    decisionStatus: "approved_for_publication",
    effectiveFrom: "2026-01-01",
    rulepackVersion: "2026.1",
    ruleSet: {
      overtimeMultiplier: 1.75
    },
    dropdownLabel: "Almega IT 2026",
    actorId: "payroll_compliance"
  });
  assert.equal(reviewedCatalogIntake.linkedCatalogEntryId != null, true);
  assert.equal(engine.listAgreementCatalogEntries({ companyId }).length, 1);

  const supplementIntake = engine.submitAgreementIntakeCase({
    companyId,
    proposedFamilyCode: "ALMEGA_IT_LOCAL",
    proposedFamilyName: "Almega IT local overlay",
    requestedPublicationTarget: "local_supplement",
    requestedEmploymentId: employment.employmentId,
    actorId: "backoffice_operator"
  });
  engine.startAgreementIntakeExtraction({
    companyId,
    agreementIntakeCaseId: supplementIntake.agreementIntakeCaseId,
    actorId: "backoffice_operator"
  });
  const reviewedSupplementIntake = engine.reviewAgreementIntakeCase({
    companyId,
    agreementIntakeCaseId: supplementIntake.agreementIntakeCaseId,
    decisionStatus: "approved_for_local_supplement",
    baseAgreementVersionId: reviewedCatalogIntake.linkedAgreementVersionId,
    effectiveFrom: "2026-04-01",
    supplementCode: "ALMEGA_IT_LOCAL_2026",
    supplementLabel: "Almega IT local overlay",
    targetEmploymentId: employment.employmentId,
    overlayRuleSet: {
      overtimeMultiplier: 2
    },
    actorId: "payroll_compliance"
  });
  assert.equal(reviewedSupplementIntake.linkedLocalAgreementSupplementId != null, true);
  assert.equal(engine.listLocalAgreementSupplements({ companyId, targetEmploymentId: employment.employmentId }).length, 1);
});
