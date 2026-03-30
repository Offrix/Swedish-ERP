import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 29 migration adds personalliggare industry-pack and identity-graph schema", async () => {
  const migration = await readText("packages/db/migrations/20260325002000_phase14_personalliggare_identity_graph.sql");
  for (const fragment of [
    "ALTER TABLE construction_sites",
    "ADD COLUMN IF NOT EXISTS industry_pack_code",
    "ADD COLUMN IF NOT EXISTS threshold_evaluation_status",
    "ALTER TABLE attendance_events",
    "ADD COLUMN IF NOT EXISTS attendance_identity_snapshot_id",
    "CREATE TABLE IF NOT EXISTS attendance_identity_snapshots",
    "CREATE TABLE IF NOT EXISTS contractor_snapshots",
    "CREATE TABLE IF NOT EXISTS kiosk_device_trust_events"
  ]) {
    assert.match(migration, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Step 29 API enforces trusted kiosk flows and exposes identity-graph read models", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T09:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true,
      phase4VatEnabled: true,
      phase5ArEnabled: true,
      phase6ApEnabled: true,
      phase7HrEnabled: true,
      phase7TimeEnabled: true,
      phase7AbsenceEnabled: true,
      phase8PayrollEnabled: true,
      phase9BenefitsEnabled: true,
      phase9TravelEnabled: true,
      phase9PensionEnabled: true,
      phase10ProjectsEnabled: true,
      phase10FieldEnabled: true,
      phase10BuildEnabled: true
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const root = await requestJson(baseUrl, "/", { token: sessionToken });
    for (const route of [
      "/v1/personalliggare/industry-packs",
      "/v1/personalliggare/sites/:constructionSiteId/identity-snapshots",
      "/v1/personalliggare/sites/:constructionSiteId/contractor-snapshots",
      "/v1/personalliggare/sites/:constructionSiteId/kiosk-devices/:kioskDeviceId/trust",
      "/v1/personalliggare/sites/:constructionSiteId/kiosk-devices/:kioskDeviceId/revoke"
    ]) {
      assert.equal(root.routes.includes(route), true);
    }

    const industryPacks = await requestJson(baseUrl, "/v1/personalliggare/industry-packs", {
      token: sessionToken
    });
    assert.equal(industryPacks.items.some((item) => item.industryPackCode === "bygg"), true);

    const site = await requestJson(baseUrl, "/v1/personalliggare/sites", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        siteCode: "SITE-29-API-001",
        siteName: "API Industry Site",
        siteAddress: "Bygggatan 29, Stockholm",
        builderOrgNo: "5561234567",
        estimatedTotalCostExVat: 450000,
        startDate: "2026-03-20",
        industryPackCode: "bygg",
        workplaceIdentifier: "ARB-29-API-001"
      }
    });
    assert.equal(site.industryPackCode, "bygg");
    assert.equal(site.thresholdEvaluationStatus, "registration_required");
    assert.equal(site.workplaceIdentifier, "ARB-29-API-001");

    const registration = await requestJson(baseUrl, `/v1/personalliggare/sites/${site.constructionSiteId}/registrations`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        registrationReference: "PL-29-API-001",
        status: "active",
        checklistItems: ["site_created", "builder_confirmed", "equipment_ready"],
        equipmentStatus: "available",
        registeredOn: "2026-03-20"
      }
    });
    assert.equal(registration.status, "active");

    const kiosk = await requestJson(baseUrl, `/v1/personalliggare/sites/${site.constructionSiteId}/kiosk-devices`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        deviceCode: "KIOSK-29-API-001",
        displayName: "Main gate kiosk"
      }
    });
    assert.equal(kiosk.trustStatus, "pending");

    const untrustedAttempt = await fetch(`${baseUrl}/v1/personalliggare/sites/${site.constructionSiteId}/attendance-events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sessionToken}`,        "idempotency-key": crypto.randomUUID()
      },
      body: JSON.stringify({
        companyId: COMPANY_ID,
        workerIdentityType: "personnummer",
        workerIdentityValue: "198902029999",
        fullNameSnapshot: "Sara Nilsson",
        employerOrgNo: "5561112227",
        contractorOrgNo: "5561234567",
        roleAtWorkplace: "installer",
        clientEventId: "pl-29-client-001",
        eventType: "check_in",
        eventTimestamp: "2026-03-24T06:10:00Z",
        sourceChannel: "kiosk",
        deviceId: kiosk.kioskDeviceId
      })
    });
    const untrustedPayload = await untrustedAttempt.json();
    assert.equal(untrustedAttempt.status, 409);
    assert.equal(untrustedPayload.error, "personalliggare_kiosk_not_trusted");

    const trusted = await requestJson(
      baseUrl,
      `/v1/personalliggare/sites/${site.constructionSiteId}/kiosk-devices/${kiosk.kioskDeviceId}/trust`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );
    assert.equal(trusted.trustStatus, "trusted");

    const firstAttendance = await requestJson(baseUrl, `/v1/personalliggare/sites/${site.constructionSiteId}/attendance-events`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        workerIdentityType: "personnummer",
        workerIdentityValue: "198902029999",
        fullNameSnapshot: "Sara Nilsson",
        employerOrgNo: "5561112227",
        contractorOrgNo: "5561234567",
        roleAtWorkplace: "installer",
        clientEventId: "pl-29-client-001",
        eventType: "check_in",
        eventTimestamp: "2026-03-24T06:10:00Z",
        sourceChannel: "kiosk",
        deviceId: kiosk.kioskDeviceId,
        offlineFlag: true
      }
    });
    assert.equal(firstAttendance.status, "captured");
    assert.equal(firstAttendance.roleAtWorkplace, "installer");

    const duplicateAttendance = await requestJson(baseUrl, `/v1/personalliggare/sites/${site.constructionSiteId}/attendance-events`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        workerIdentityType: "personnummer",
        workerIdentityValue: "198902029999",
        fullNameSnapshot: "Sara Nilsson",
        employerOrgNo: "5561112227",
        contractorOrgNo: "5561234567",
        roleAtWorkplace: "installer",
        clientEventId: "pl-29-client-001",
        eventType: "check_in",
        eventTimestamp: "2026-03-24T06:10:00Z",
        sourceChannel: "kiosk",
        deviceId: kiosk.kioskDeviceId,
        offlineFlag: true
      }
    });
    assert.equal(duplicateAttendance.attendanceEventId, firstAttendance.attendanceEventId);

    const identitySnapshots = await requestJson(
      baseUrl,
      `/v1/personalliggare/sites/${site.constructionSiteId}/identity-snapshots?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(identitySnapshots.items.length, 1);
    assert.equal(identitySnapshots.items[0].roleAtWorkplace, "installer");

    const contractorSnapshots = await requestJson(
      baseUrl,
      `/v1/personalliggare/sites/${site.constructionSiteId}/contractor-snapshots?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(contractorSnapshots.items.length, 1);
    assert.equal(contractorSnapshots.items[0].contractorOrgNo, "5561234567");

    const correction = await requestJson(
      baseUrl,
      `/v1/personalliggare/attendance-events/${firstAttendance.attendanceEventId}/corrections`,
      {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          correctedTimestamp: "2026-03-24T06:12:00Z",
          correctedEventType: "check_in",
          correctedContractorOrgNo: "5567654321",
          correctedRoleAtWorkplace: "installer",
          correctionReason: "Contractor remapped after scope review"
        }
      }
    );
    assert.equal(correction.correctedContractorOrgNo, "5567654321");
    assert.equal(correction.correctedRoleAtWorkplace, "installer");

    const contractorSnapshotsAfterCorrection = await requestJson(
      baseUrl,
      `/v1/personalliggare/sites/${site.constructionSiteId}/contractor-snapshots?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(contractorSnapshotsAfterCorrection.items.length, 2);

    const revoked = await requestJson(
      baseUrl,
      `/v1/personalliggare/sites/${site.constructionSiteId}/kiosk-devices/${kiosk.kioskDeviceId}/revoke`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );
    assert.equal(revoked.trustStatus, "revoked");

    const revokedAttempt = await fetch(`${baseUrl}/v1/personalliggare/sites/${site.constructionSiteId}/attendance-events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sessionToken}`,        "idempotency-key": crypto.randomUUID()
      },
      body: JSON.stringify({
        companyId: COMPANY_ID,
        workerIdentityType: "personnummer",
        workerIdentityValue: "198902029999",
        fullNameSnapshot: "Sara Nilsson",
        employerOrgNo: "5561112227",
        contractorOrgNo: "5561234567",
        roleAtWorkplace: "installer",
        clientEventId: "pl-29-client-002",
        eventType: "check_out",
        eventTimestamp: "2026-03-24T15:00:00Z",
        sourceChannel: "kiosk",
        deviceId: kiosk.kioskDeviceId
      })
    });
    const revokedPayload = await revokedAttempt.json();
    assert.equal(revokedAttempt.status, 409);
    assert.equal(revokedPayload.error, "personalliggare_kiosk_not_trusted");
  } finally {
    await stopServer(server);
  }
});

async function loginWithRequiredFactors({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });

  const totpCode = platform.getTotpCodeForTesting({ companyId, email });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: totpCode
    }
  });

  const bankidStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
    method: "POST",
    token: started.sessionToken
  });
  await requestJson(baseUrl, "/v1/auth/bankid/collect", {
    method: "POST",
    token: started.sessionToken,
    body: {
      orderRef: bankidStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
    }
  });

  return started.sessionToken;
}

async function requestJson(baseUrl, path, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(
    response.status,
    expectedStatus,
    `Expected ${expectedStatus} for ${method} ${path}, got ${response.status}: ${JSON.stringify(payload)}`
  );
  return payload;
}
