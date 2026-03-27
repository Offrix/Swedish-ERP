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
    agreementVersionId: version.agreementVersionId,
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

  const assignment = engine.assignAgreementToEmployment({
    companyId,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    agreementVersionId: version.agreementVersionId,
    effectiveFrom: "2026-01-01",
    assignmentReasonCode: "HIRING",
    actorId: "payroll_admin",
    idempotencyKey: "agreement-assignment-1"
  });
  const duplicateAssignment = engine.assignAgreementToEmployment({
    companyId,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    agreementVersionId: version.agreementVersionId,
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
