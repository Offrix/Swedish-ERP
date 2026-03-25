import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Step 18 API exposes collective agreement families, versions, assignments and overrides", async () => {
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

    const assignment = await requestJson(baseUrl, "/v1/collective-agreements/assignments", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employeeId: employee.employeeId,
        employmentId: employment.employmentId,
        agreementVersionId: version.agreementVersionId,
        effectiveFrom: "2026-01-01",
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
  } finally {
    await stopServer(server);
  }
});
