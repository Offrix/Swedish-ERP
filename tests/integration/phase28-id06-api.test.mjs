import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Step 28 migration adds ID06 schema", async () => {
  const migration = await readText("packages/db/migrations/20260325034000_phase14_id06_domain.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS id06_company_verifications",
    "CREATE TABLE IF NOT EXISTS id06_person_verifications",
    "CREATE TABLE IF NOT EXISTS id06_employer_links",
    "CREATE TABLE IF NOT EXISTS id06_card_statuses",
    "CREATE TABLE IF NOT EXISTS id06_workplace_bindings",
    "CREATE TABLE IF NOT EXISTS id06_work_passes",
    "CREATE TABLE IF NOT EXISTS id06_evidence_bundles"
  ]) {
    assert.match(migration, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Step 28 API exposes ID06 verification, binding, work-pass and evidence flows", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T09:00:00Z")
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
      email: "id06-field@example.test",
      displayName: "ID06 Field User",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "id06-field@example.test"
    });

    const root = await requestJson(baseUrl, "/", { token: adminToken });
    for (const route of [
      "/v1/id06/companies/verify",
      "/v1/id06/companies/verifications",
      "/v1/id06/persons/verify",
      "/v1/id06/persons/verifications",
      "/v1/id06/cards/validate",
      "/v1/id06/cards/statuses",
      "/v1/id06/workplaces/:workplaceId/bindings",
      "/v1/id06/workplaces/:workplaceId/work-passes",
      "/v1/id06/workplaces/:workplaceId/exports",
      "/v1/id06/audit-events"
    ]) {
      assert.equal(root.routes.includes(route), true);
    }

    const site = await requestJson(baseUrl, "/v1/personalliggare/sites", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        siteCode: "ID06-API-SITE-001",
        siteName: "ID06 API Site",
        siteAddress: "Arbetsplatsgatan 1, Stockholm",
        builderOrgNo: "5561234567",
        estimatedTotalCostExVat: 425000,
        startDate: "2026-03-24",
        workplaceIdentifier: "ID06-API-WP-001"
      }
    });
    await requestJson(baseUrl, `/v1/personalliggare/sites/${site.constructionSiteId}/registrations`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        registrationReference: "ID06-API-PL-001",
        status: "active",
        checklistItems: ["site_created"],
        equipmentStatus: "available",
        registeredOn: "2026-03-24"
      }
    });

    const companyVerification = await requestJson(baseUrl, "/v1/id06/companies/verify", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        orgNo: "5561112222",
        companyName: "Employer Verified AB"
      }
    });
    assert.equal(companyVerification.status, "verified");

    const personVerification = await requestJson(baseUrl, "/v1/id06/persons/verify", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        workerIdentityValue: "198902029999",
        fullNameSnapshot: "Sara Nilsson"
      }
    });
    assert.equal(personVerification.status, "verified");

    const cardStatus = await requestJson(baseUrl, "/v1/id06/cards/validate", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employerOrgNo: "5561112222",
        workerIdentityValue: "198902029999",
        cardReference: "ID06-CARD-API-001",
        maskedCardNumber: "****1111"
      }
    });
    assert.equal(cardStatus.status, "active");

    const binding = await requestJson(baseUrl, `/v1/id06/workplaces/${site.workplaceId}/bindings`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employerOrgNo: "5561112222",
        workerIdentityValue: "198902029999",
        cardReference: "ID06-CARD-API-001"
      }
    });
    assert.equal(binding.status, "active");
    assert.equal(binding.workplaceId, site.workplaceId);

    await requestJson(baseUrl, `/v1/personalliggare/sites/${site.constructionSiteId}/attendance-events`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        workerIdentityType: "personnummer",
        workerIdentityValue: "198902029999",
        fullNameSnapshot: "Sara Nilsson",
        employerOrgNo: "5561112222",
        contractorOrgNo: "5561234567",
        roleAtWorkplace: "worker",
        clientEventId: "id06-api-attendance-1",
        eventType: "check_in",
        eventTimestamp: "2026-03-25T09:10:00Z",
        sourceChannel: "mobile"
      }
    });

    const bindingsResponse = await requestJson(
      baseUrl,
      `/v1/id06/workplaces/${site.workplaceId}/bindings?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(bindingsResponse.items.length, 1);

    const fieldUserForbidden = await requestJson(
      baseUrl,
      `/v1/id06/workplaces/${site.workplaceId}/bindings?companyId=${DEMO_IDS.companyId}`,
      { token: fieldUserToken, expectedStatus: 403 }
    );
    assert.equal(fieldUserForbidden.error, "id06_control_role_forbidden");

    const workPasses = await requestJson(
      baseUrl,
      `/v1/id06/workplaces/${site.workplaceId}/work-passes?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(workPasses.items.length, 1);
    assert.equal(workPasses.items[0].status, "issued");

    const evidenceBundle = await requestJson(baseUrl, `/v1/id06/workplaces/${site.workplaceId}/exports`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(evidenceBundle.bindingCount, 1);
    assert.equal(evidenceBundle.workPassCount, 1);
    assert.equal(evidenceBundle.attendanceMirrorCount, 1);

    const auditEvents = await requestJson(
      baseUrl,
      `/v1/id06/audit-events?companyId=${DEMO_IDS.companyId}&workplaceId=${site.workplaceId}`,
      { token: adminToken }
    );
    assert.equal(auditEvents.items.some((item) => item.action === "id06.binding.activated"), true);
    assert.equal(auditEvents.items.some((item) => item.action === "id06.export.created"), true);
  } finally {
    await stopServer(server);
  }
});
