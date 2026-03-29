import test from "node:test";
import assert from "node:assert/strict";
import {
  ASANA_PROVIDER_CODE,
  createIntegrationEngine
} from "../../packages/domain-integrations/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 16.6 exposes Asana project adapter manifest and prepares governed project import batches", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T21:00:00Z")
  });

  const manifests = platform.listAdapterCapabilityManifests({
    surfaceCode: "crm_handoff"
  });
  const manifest = manifests.find((item) => item.providerCode === ASANA_PROVIDER_CODE);
  assert.ok(manifest);
  assert.equal(manifest.connectionType, "crm_handoff");
  assert.equal(manifest.trialSafe, true);
  assert.equal(manifest.sandboxSupported, true);

  const connection = platform.createIntegrationConnection({
    companyId: COMPANY_ID,
    surfaceCode: "crm_handoff",
    connectionType: "crm_handoff",
    providerCode: ASANA_PROVIDER_CODE,
    displayName: "Asana Projects",
    environmentMode: "production",
    credentialsRef: "secret://asana/prod",
    secretManagerRef: "vault://asana/prod",
    actorId: "phase16-6-unit"
  });

  const healthCheck = platform.runIntegrationHealthCheck({
    companyId: COMPANY_ID,
    connectionId: connection.connectionId,
    actorId: "phase16-6-unit"
  });
  assert.equal(healthCheck.results.some((result) => result.status === "failed"), false);
  assert.equal(healthCheck.results.find((result) => result.checkCode === "credentials_configured")?.status, "passed");

  const preparedBatch = platform.prepareProjectImportBatchFromAdapter({
    companyId: COMPANY_ID,
    connectionId: connection.connectionId,
    providerCode: ASANA_PROVIDER_CODE,
    payload: {
      projects: [
        {
          gid: "asana-project-16-6",
          name: "Asana delivery program",
          portfolioId: "asana-portfolio-16-6",
          customer: {
            name: "Asana Customer AB",
            organization_number: "5567788990"
          },
          billingModel: "fixed_price",
          contractValue: 132000,
          start_on: "2026-04-01",
          due_on: "2026-06-30",
          current_status: "on_track"
        }
      ],
      portfolios: [
        {
          gid: "asana-portfolio-16-6",
          name: "North region portfolio"
        }
      ],
      tasks: [
        {
          gid: "asana-task-1",
          projectId: "asana-project-16-6",
          name: "Discovery",
          assignee: { gid: "asana-user-1" },
          estimated_minutes: 600,
          due_on: "2026-04-10"
        },
        {
          gid: "asana-task-2",
          projectId: "asana-project-16-6",
          name: "Migration cutover",
          assignee: { gid: "asana-user-2" },
          resource_subtype: "milestone",
          due_on: "2026-05-31"
        },
        {
          gid: "asana-task-3",
          projectId: "asana-project-16-6",
          name: "Blocked dependency",
          assignee: { gid: "asana-user-2" },
          custom_fields: { status: "blocked" },
          due_on: "2026-03-20"
        }
      ],
      timeEntries: [
        {
          projectId: "asana-project-16-6",
          duration_minutes: 180
        }
      ],
      workloadSnapshots: [
        {
          projectId: "asana-project-16-6",
          userId: "asana-user-1",
          plannedHours: 24,
          capacityHours: 16
        }
      ],
      statusUpdates: [
        {
          projectId: "asana-project-16-6",
          title: "Delivery is stable",
          severity: "medium"
        }
      ],
      users: [
        { gid: "asana-user-1", name: "Alice Asana" },
        { gid: "asana-user-2", name: "Bob Asana" }
      ]
    },
    sourceExportCapturedAt: "2026-03-29T20:55:00.000Z"
  });

  assert.equal(preparedBatch.batchTypeCode, "crm_handoff");
  assert.equal(preparedBatch.adapterProviderCode, ASANA_PROVIDER_CODE);
  assert.equal(preparedBatch.adapterProviderBaselineCode, "SE-ASANA-PROJECTS");
  assert.equal(preparedBatch.integrationConnectionId, connection.connectionId);
  assert.equal(preparedBatch.sourcePayload.length, 1);
  assert.equal(preparedBatch.sourcePayload[0].sourceSystemCode, "asana");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.portfolioId, "asana-portfolio-16-6");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.milestoneCount, 1);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.blockedTaskCount, 1);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.workloadPressureCode, "over_capacity");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.timeTrackingEnabled, true);
  assert.equal(preparedBatch.sourcePayload[0].contractValueAmount, 132000);
});
