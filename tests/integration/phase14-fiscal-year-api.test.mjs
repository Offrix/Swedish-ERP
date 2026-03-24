import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 8 API manages fiscal-year profiles, year changes, periods and active lookup", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2027-07-01T09:00:00Z")
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

    const seededProfileList = await requestJson(baseUrl, `/v1/fiscal-years/profiles?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(seededProfileList.items.length >= 1, true);

    const soleTraderProfile = await requestJson(baseUrl, "/v1/fiscal-years/profiles", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        legalFormCode: "ENSKILD_NARINGSVERKSAMHET",
        ownerTaxationCode: "PHYSICAL_PERSON_PARTICIPANT"
      }
    });
    assert.equal(soleTraderProfile.mustUseCalendarYear, true);

    const brokenYearDeniedResponse = await fetch(`${baseUrl}/v1/fiscal-years`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        fiscalYearProfileId: soleTraderProfile.fiscalYearProfileId,
        startDate: "2027-07-01",
        endDate: "2028-06-30",
        approvalBasisCode: "BASELINE"
      })
    });
    const brokenYearDeniedPayload = await brokenYearDeniedResponse.json();
    assert.equal(brokenYearDeniedResponse.status, 409);
    assert.equal(brokenYearDeniedPayload.error, "calendar_year_required");

    const groupProfile = await requestJson(baseUrl, "/v1/fiscal-years/profiles", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        legalFormCode: "AKTIEBOLAG",
        ownerTaxationCode: "LEGAL_PERSON_ONLY",
        groupAlignmentRequired: true
      }
    });
    assert.equal(groupProfile.groupAlignmentRequired, true);

    const groupAlignmentRequest = await requestJson(baseUrl, "/v1/fiscal-years/change-requests", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        requestedStartDate: "2027-07-01",
        requestedEndDate: "2028-06-30",
        reasonCode: "GROUP_ALIGNMENT",
        groupAlignmentStartDate: "2027-07-01",
        groupAlignmentEndDate: "2028-06-30"
      }
    });
    assert.equal(groupAlignmentRequest.taxAgencyPermissionRequired, false);

    await requestJson(baseUrl, `/v1/fiscal-years/change-requests/${groupAlignmentRequest.changeRequestId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const plannedBrokenYear = await requestJson(baseUrl, "/v1/fiscal-years", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        fiscalYearProfileId: groupProfile.fiscalYearProfileId,
        startDate: "2027-07-01",
        endDate: "2028-06-30",
        approvalBasisCode: "YEAR_CHANGE",
        changeRequestId: groupAlignmentRequest.changeRequestId
      }
    });
    const activatedBrokenYear = await requestJson(baseUrl, `/v1/fiscal-years/${plannedBrokenYear.fiscalYearId}/activate`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(activatedBrokenYear.yearKind, "BROKEN");
    assert.equal(activatedBrokenYear.periods.length, 12);

    const activeFiscalYear = await requestJson(
      baseUrl,
      `/v1/fiscal-years/active?companyId=${DEMO_IDS.companyId}&accountingDate=2027-08-10`,
      { token: adminToken }
    );
    assert.equal(activeFiscalYear.fiscalYearId, plannedBrokenYear.fiscalYearId);

    const period = await requestJson(
      baseUrl,
      `/v1/fiscal-years/periods/lookup?companyId=${DEMO_IDS.companyId}&accountingDate=2027-08-10`,
      { token: adminToken }
    );
    assert.equal(period.periodCode, "202708");

    const generatedPeriods = await requestJson(baseUrl, `/v1/fiscal-years/${plannedBrokenYear.fiscalYearId}/generate-periods`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(generatedPeriods.items.length, 12);

    const reopenedPeriod = await requestJson(baseUrl, `/v1/fiscal-years/periods/${period.periodId}/reopen`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "CORRECTION_CHAIN"
      }
    });
    assert.equal(reopenedPeriod.lockState, "reopened");
  } finally {
    await stopServer(server);
  }
});
