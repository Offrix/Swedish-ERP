import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Step 18 API exposes collective agreement catalog, support-managed intake, assignments and overrides", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T18:30:00Z")
  });
  const employee = platform.createEmployee({
    companyId: DEMO_IDS.companyId,
    givenName: "Nina",
    familyName: "Nord",
    identityType: "other",
    actorId: DEMO_IDS.userId
  });
  const employment = platform.createEmployment({
    companyId: DEMO_IDS.companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Operator",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: DEMO_IDS.userId
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
      email: "agreements-field@example.test",
      displayName: "Agreements Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "agreements-field@example.test"
    });

    const family = await requestJson(baseUrl, "/v1/collective-agreements/families", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        code: "ALMEGA_IT",
        name: "Almega IT",
        sectorCode: "PRIVATE"
      }
    });
    assert.equal(family.code, "ALMEGA_IT");

    const fieldUserFamiliesForbidden = await requestJson(baseUrl, `/v1/collective-agreements/families?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assert.equal(fieldUserFamiliesForbidden.error, "payroll_operations_role_forbidden");

    const version = await requestJson(baseUrl, "/v1/collective-agreements/versions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        agreementFamilyId: family.agreementFamilyId,
        versionCode: "ALMEGA_IT_2026_01",
        effectiveFrom: "2026-01-01",
        rulepackVersion: "2026.1",
        ruleSet: {
          obCategoryA: 29.5,
          overtimeMultiplier: 1.75
        }
      }
    });
    assert.equal(version.ruleSetJson.overtimeMultiplier, 1.75);
    const catalogEntry = await requestJson(baseUrl, "/v1/collective-agreements/catalog", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        agreementVersionId: version.agreementVersionId,
        dropdownLabel: "Almega IT 2026"
      }
    });
    const fieldUserCatalog = await requestJson(
      baseUrl,
      `/v1/collective-agreements/catalog?companyId=${DEMO_IDS.companyId}`,
      {
        token: fieldUserToken
      }
    );
    assert.equal(fieldUserCatalog.items.length, 1);
    assert.equal(fieldUserCatalog.items[0].agreementCatalogEntryId, catalogEntry.agreementCatalogEntryId);

    const unpublishedFamily = await requestJson(baseUrl, "/v1/collective-agreements/families", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        code: "UNPUBLISHED_IT",
        name: "Unpublished IT"
      }
    });
    const unpublishedVersion = await requestJson(baseUrl, "/v1/collective-agreements/versions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        agreementFamilyId: unpublishedFamily.agreementFamilyId,
        versionCode: "UNPUBLISHED_IT_2026_01",
        effectiveFrom: "2026-01-01",
        rulepackVersion: "2026.1",
        ruleSet: {
          overtimeMultiplier: 1.4
        }
      }
    });
    const unpublishedAssignment = await requestJson(baseUrl, "/v1/collective-agreements/assignments", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        employeeId: employee.employeeId,
        employmentId: employment.employmentId,
        agreementVersionId: unpublishedVersion.agreementVersionId,
        effectiveFrom: "2026-01-01",
        assignmentReasonCode: "HIRING"
      }
    });
    assert.equal(unpublishedAssignment.error, "agreement_assignment_requires_published_catalog");

    const assignment = await requestJson(baseUrl, "/v1/collective-agreements/assignments", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employeeId: employee.employeeId,
        employmentId: employment.employmentId,
        agreementCatalogEntryId: catalogEntry.agreementCatalogEntryId,
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-03-31",
        assignmentReasonCode: "HIRING"
      }
    });
    assert.equal(assignment.agreementVersionId, version.agreementVersionId);

    const override = await requestJson(baseUrl, `/v1/collective-agreements/assignments/${assignment.agreementAssignmentId}/overrides`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        overrideTypeCode: "pay_rule",
        overridePayload: {
          overtimeMultiplier: 2
        },
        reasonCode: "LOCAL_AGREEMENT"
      }
    });
    assert.equal(override.overridePayloadJson.overtimeMultiplier, 2);

    const activeAgreement = await requestJson(
      baseUrl,
      `/v1/collective-agreements/active?companyId=${DEMO_IDS.companyId}&employeeId=${employee.employeeId}&employmentId=${employment.employmentId}&eventDate=2026-03-24`,
      { token: adminToken }
    );
    assert.equal(activeAgreement.agreementVersion.versionCode, "ALMEGA_IT_2026_01");
    assert.equal(activeAgreement.agreementOverrides.length, 1);

    const intakeCase = await requestJson(baseUrl, "/v1/backoffice/agreement-intake/cases", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        proposedFamilyCode: "ALMEGA_IT_LOCAL",
        proposedFamilyName: "Almega IT local supplement",
        requestedPublicationTarget: "local_supplement",
        requestedEmploymentId: employment.employmentId,
        sourceDocumentRef: "support-case-11-3"
      }
    });
    await requestJson(baseUrl, `/v1/backoffice/agreement-intake/cases/${intakeCase.agreementIntakeCaseId}/start-extraction`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    const reviewedIntake = await requestJson(baseUrl, `/v1/backoffice/agreement-intake/cases/${intakeCase.agreementIntakeCaseId}/review`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        decisionStatus: "approved_for_local_supplement",
        baseAgreementVersionId: version.agreementVersionId,
        effectiveFrom: "2026-04-01",
        supplementCode: "ALMEGA_IT_LOCAL_2026",
        supplementLabel: "Almega IT local supplement",
        targetEmploymentId: employment.employmentId,
        overlayRuleSet: {
          overtimeMultiplier: 2.2
        }
      }
    });
    const supplements = await requestJson(
      baseUrl,
      `/v1/collective-agreements/local-supplements?companyId=${DEMO_IDS.companyId}&targetEmploymentId=${employment.employmentId}`,
      {
        token: adminToken
      }
    );
    assert.equal(supplements.items.length, 1);
    assert.equal(supplements.items[0].localAgreementSupplementId, reviewedIntake.linkedLocalAgreementSupplementId);

    const supplementAssignment = await requestJson(baseUrl, "/v1/collective-agreements/assignments", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employeeId: employee.employeeId,
        employmentId: employment.employmentId,
        localAgreementSupplementId: reviewedIntake.linkedLocalAgreementSupplementId,
        effectiveFrom: "2026-04-01",
        assignmentReasonCode: "LOCAL_SUPPLEMENT"
      }
    });
    assert.equal(supplementAssignment.localAgreementSupplementId, reviewedIntake.linkedLocalAgreementSupplementId);

    const activeSupplementAgreement = await requestJson(
      baseUrl,
      `/v1/collective-agreements/active?companyId=${DEMO_IDS.companyId}&employeeId=${employee.employeeId}&employmentId=${employment.employmentId}&eventDate=2026-04-10`,
      { token: adminToken }
    );
    assert.equal(activeSupplementAgreement.localAgreementSupplement.localAgreementSupplementId, reviewedIntake.linkedLocalAgreementSupplementId);
  } finally {
    await stopServer(server);
  }
});
