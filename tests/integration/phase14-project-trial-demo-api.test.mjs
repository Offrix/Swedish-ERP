import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.7 API exposes project trial scenarios, imports, invoice simulation and live conversion", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-06-01T09:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: enabledFlags()
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
      "/v1/projects/trial-scenarios",
      "/v1/projects/trial-scenarios/:scenarioCode/materialize",
      "/v1/projects/import-batches",
      "/v1/projects/import-batches/:projectImportBatchId/commit",
      "/v1/projects/:projectId/invoice-simulations",
      "/v1/projects/:projectId/live-conversion-plans"
    ]) {
      assert.equal(root.routes.includes(route), true, `${route} should be published`);
    }

    const scenarios = await requestJson(baseUrl, `/v1/projects/trial-scenarios?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(scenarios.items.some((scenario) => scenario.scenarioCode === "consulting_time_and_milestone"), true);

    const scenarioRun = await requestJson(baseUrl, "/v1/projects/trial-scenarios/consulting_time_and_milestone/materialize", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        startsOn: "2026-06-01",
        trialEnvironmentProfileId: "trial-env-api-147"
      }
    });

    assert.equal(scenarioRun.status, "materialized");
    assert.equal(scenarioRun.project.displayName, "Consulting delivery demo");

    const simulation = await requestJson(
      baseUrl,
      `/v1/projects/${scenarioRun.project.projectId}/invoice-simulations`,
      {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          cutoffDate: "2026-06-20"
        }
      }
    );

    assert.equal(simulation.legalEffectFlag, false);
    assert.equal(simulation.totals.totalAmount, 85000);

    const liveConversionPlan = await requestJson(
      baseUrl,
      `/v1/projects/${scenarioRun.project.projectId}/live-conversion-plans`,
      {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          trialEnvironmentProfileId: "trial-env-api-147",
          projectTrialScenarioRunId: scenarioRun.projectTrialScenarioRunId,
          projectInvoiceSimulationId: simulation.projectInvoiceSimulationId
        }
      }
    );

    assert.equal(liveConversionPlan.status, "ready");
    assert.equal(liveConversionPlan.requiresTrialPromotion, true);

    const invoiceSimulations = await requestJson(
      baseUrl,
      `/v1/projects/${scenarioRun.project.projectId}/invoice-simulations?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    const liveConversionPlans = await requestJson(
      baseUrl,
      `/v1/projects/${scenarioRun.project.projectId}/live-conversion-plans?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );

    assert.equal(invoiceSimulations.items.length, 1);
    assert.equal(liveConversionPlans.items.length, 1);

    const importBatch = await requestJson(baseUrl, "/v1/projects/import-batches", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        sourceSystemCode: "hubspot",
        sourcePayload: [
          {
            sourceSystemCode: "hubspot",
            externalProjectId: "deal-api-147",
            displayName: "Imported API CRM project",
            customerLegalName: "Imported API Customer AB",
            workModelCode: "time_only",
            billingModelCode: "time_and_material",
            revenueRecognitionModelCode: "billing_equals_revenue",
            startsOn: "2026-06-10",
            contractValueAmount: 32000,
            billingPlanLines: [
              {
                plannedInvoiceDate: "2026-06-30",
                amount: 32000,
                triggerCode: "manual",
                note: "Imported API invoice"
              }
            ]
          }
        ]
      }
    });

    const committedBatch = await requestJson(
      baseUrl,
      `/v1/projects/import-batches/${importBatch.projectImportBatchId}/commit`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );

    assert.equal(committedBatch.status, "committed");
    assert.equal(committedBatch.importedProjectIds.length, 1);

    const importedProject = await requestJson(
      baseUrl,
      `/v1/projects/${committedBatch.importedProjectIds[0]}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(importedProject.displayName, "Imported API CRM project");

    const workspace = await requestJson(
      baseUrl,
      `/v1/projects/${scenarioRun.project.projectId}/workspace?companyId=${COMPANY_ID}&cutoffDate=2026-06-20`,
      { token: sessionToken }
    );
    assert.equal(workspace.trialScenarioRunCount, 1);
    assert.equal(workspace.invoiceSimulationCount, 1);
    assert.equal(workspace.liveConversionPlanCount, 1);
  } finally {
    await stopServer(server);
  }
});

function enabledFlags() {
  return {
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
  };
}

async function loginWithRequiredFactors({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
    }
  });
  if (started.session.requiredFactorCount > 1) {
    const bankIdStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
      method: "POST",
      token: started.sessionToken
    });
    await requestJson(baseUrl, "/v1/auth/bankid/collect", {
      method: "POST",
      token: started.sessionToken,
      body: {
        orderRef: bankIdStart.orderRef,
        completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
      }
    });
  }
  return started.sessionToken;
}

async function requestJson(baseUrl, route, { method = "GET", token = null, body = undefined, expectedStatus = 200 } = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(payload));
  return payload;
}
