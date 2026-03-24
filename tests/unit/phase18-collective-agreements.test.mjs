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
