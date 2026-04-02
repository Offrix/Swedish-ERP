import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 30 migration adds egenkontroll schema", async () => {
  const migration = await readText("packages/db/migrations/20260325003000_phase14_egenkontroll.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS checklist_templates",
    "CREATE TABLE IF NOT EXISTS checklist_instances",
    "CREATE TABLE IF NOT EXISTS checklist_point_outcomes",
    "CREATE TABLE IF NOT EXISTS checklist_deviations",
    "CREATE TABLE IF NOT EXISTS checklist_signoffs"
  ]) {
    assert.match(migration, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Step 30 API creates templates, instances, deviations and sign-off chains", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T10:30:00Z")
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
      "/v1/egenkontroll/templates",
      "/v1/egenkontroll/templates/:checklistTemplateId/activate",
      "/v1/egenkontroll/instances",
      "/v1/egenkontroll/instances/:checklistInstanceId/outcomes",
      "/v1/egenkontroll/instances/:checklistInstanceId/deviations",
      "/v1/egenkontroll/deviations/:checklistDeviationId/resolve",
      "/v1/egenkontroll/instances/:checklistInstanceId/signoffs"
    ]) {
      assert.equal(root.routes.includes(route), true);
    }

    const template = await requestJson(baseUrl, "/v1/egenkontroll/templates", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        templateCode: "EK-API-001",
        displayName: "API Egenkontroll",
        sections: [
          {
            sectionCode: "prep",
            label: "FÃ¶rarbete",
            points: [
              { pointCode: "site_signage", label: "Skyltning", evidenceRequiredFlag: false },
              { pointCode: "photo_required", label: "Fotobevis", evidenceRequiredFlag: true }
            ]
          }
        ],
        requiredSignoffRoleCodes: ["site_lead", "reviewer"]
      }
    });
    assert.equal(template.status, "draft");

    const activeTemplate = await requestJson(baseUrl, `/v1/egenkontroll/templates/${template.checklistTemplateId}/activate`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(activeTemplate.status, "active");

    const project = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-EGENK-API",
        projectReferenceCode: "project-egenk-api",
        displayName: "Egenkontroll API Project",
        startsOn: "2026-03-01",
        status: "active",
        billingModelCode: "time_and_material",
        revenueRecognitionModelCode: "billing_equals_revenue",
        contractValueAmount: 120000
      }
    });
    await requestJson(baseUrl, `/v1/projects/${project.projectId}/vertical-pack-links`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        packType: "field",
        verticalRefs: {
          workModelCodes: ["work_order"]
        }
      }
    });

    const workOrder = await requestJson(baseUrl, "/v1/field/work-orders", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectId: project.projectId,
        displayName: "Kontroll arbete",
        description: "Egenkontroll fÃ¶r kabeldragning",
        serviceTypeCode: "service",
        priorityCode: "normal",
        laborRateAmount: 0
      }
    });

    const instance = await requestJson(baseUrl, "/v1/egenkontroll/instances", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        checklistTemplateId: activeTemplate.checklistTemplateId,
        projectId: project.projectId,
        workOrderId: workOrder.workOrderId,
        assignedToUserId: "field-user-1"
      }
    });
    assert.equal(instance.status, "assigned");

    const started = await requestJson(baseUrl, `/v1/egenkontroll/instances/${instance.checklistInstanceId}/start`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(started.status, "in_progress");

    await requestJson(baseUrl, `/v1/egenkontroll/instances/${instance.checklistInstanceId}/outcomes`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        pointCode: "site_signage",
        resultCode: "pass"
      }
    });

    await requestJson(baseUrl, `/v1/egenkontroll/instances/${instance.checklistInstanceId}/outcomes`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        pointCode: "photo_required",
        resultCode: "pass",
        documentIds: ["doc-photo-001"]
      }
    });

    const deviation = await requestJson(baseUrl, `/v1/egenkontroll/instances/${instance.checklistInstanceId}/deviations`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        pointCode: "photo_required",
        severityCode: "major",
        title: "Foto saknade referensmarkering",
        description: "FÃ¤ltbilden saknade mÃ¥ttsÃ¤ttning vid fÃ¶rsta genomgÃ¥ngen."
      }
    });
    assert.equal(deviation.status, "open");

    const blockedSignoff = await fetch(`${baseUrl}/v1/egenkontroll/instances/${instance.checklistInstanceId}/signoffs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sessionToken}`,        "idempotency-key": crypto.randomUUID()
      },
      body: JSON.stringify({
        companyId: COMPANY_ID,
        signoffRoleCode: "site_lead"
      })
    });
    const blockedPayload = await blockedSignoff.json();
    assert.equal(blockedSignoff.status, 409);
    assert.equal(blockedPayload.error, "egenkontroll_signoff_blocked_open_deviations");

    await requestJson(baseUrl, `/v1/egenkontroll/deviations/${deviation.checklistDeviationId}/acknowledge`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    await requestJson(baseUrl, `/v1/egenkontroll/deviations/${deviation.checklistDeviationId}/resolve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        resolutionNote: "Referensmarkering tillagd och ombild tagen."
      }
    });

    const firstSignoff = await requestJson(baseUrl, `/v1/egenkontroll/instances/${instance.checklistInstanceId}/signoffs`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        signoffRoleCode: "site_lead"
      }
    });
    assert.equal(firstSignoff.checklistInstance.status, "signed_off");

    const secondSignoff = await requestJson(baseUrl, `/v1/egenkontroll/instances/${instance.checklistInstanceId}/signoffs`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        signoffRoleCode: "reviewer"
      }
    });
    assert.equal(secondSignoff.checklistInstance.status, "closed");

    const fetchedInstance = await requestJson(baseUrl, `/v1/egenkontroll/instances/${instance.checklistInstanceId}?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(fetchedInstance.summary.completedPointCount, 2);
    assert.equal(fetchedInstance.summary.unresolvedDeviationCount, 0);
    assert.equal(fetchedInstance.signoffs.length, 2);
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
