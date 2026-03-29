import test from "node:test";
import assert from "node:assert/strict";
import {
  CLICKUP_PROVIDER_CODE,
  createIntegrationEngine
} from "../../packages/domain-integrations/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 16.6 exposes ClickUp project adapter manifest and prepares governed project import batches", () => {
  const platform = createIntegrationEngine({
    clock: () => new Date("2026-03-29T21:40:00Z")
  });

  const manifests = platform.listAdapterCapabilityManifests({
    surfaceCode: "crm_handoff"
  });
  const manifest = manifests.find((item) => item.providerCode === CLICKUP_PROVIDER_CODE);
  assert.ok(manifest);
  assert.equal(manifest.connectionType, "crm_handoff");
  assert.equal(manifest.trialSafe, true);
  assert.equal(manifest.sandboxSupported, true);

  const connection = platform.createIntegrationConnection({
    companyId: COMPANY_ID,
    surfaceCode: "crm_handoff",
    connectionType: "crm_handoff",
    providerCode: CLICKUP_PROVIDER_CODE,
    displayName: "ClickUp Projects",
    environmentMode: "production",
    credentialsRef: "secret://clickup/prod",
    secretManagerRef: "vault://clickup/prod",
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
    providerCode: CLICKUP_PROVIDER_CODE,
    payload: {
      spaces: [
        {
          id: "clickup-space-16-6",
          name: "Customer delivery"
        }
      ],
      folders: [
        {
          id: "clickup-folder-16-6",
          name: "North region",
          spaceId: "clickup-space-16-6"
        }
      ],
      lists: [
        {
          id: "clickup-list-16-6",
          name: "Implementation backlog",
          folderId: "clickup-folder-16-6",
          customer: {
            name: "ClickUp Customer AB",
            organization_number: "5569981128"
          },
          billingModel: "fixed_price",
          contractValue: 118000,
          start_date: "2026-04-01",
          due_date: "2026-06-30",
          status: { status: "on_track" }
        }
      ],
      tasks: [
        {
          id: "clickup-task-1",
          listId: "clickup-list-16-6",
          name: "Plan scope",
          assignees: [{ id: "clickup-user-1" }],
          time_estimate_hours: 8,
          due_date: "2026-04-10"
        },
        {
          id: "clickup-task-2",
          listId: "clickup-list-16-6",
          name: "Blocked dependency",
          assignees: [{ id: "clickup-user-2" }],
          status: { status: "blocked" },
          due_date: "2026-03-18"
        },
        {
          id: "clickup-task-3",
          listId: "clickup-list-16-6",
          name: "Milestone signoff",
          assignees: [{ id: "clickup-user-2" }],
          milestone: true,
          due_date: "2026-05-31"
        }
      ],
      timeEntries: [
        {
          listId: "clickup-list-16-6",
          hours: 5
        }
      ],
      timesheets: [
        {
          listId: "clickup-list-16-6",
          approvalStatus: "pending_review"
        }
      ],
      workloadSnapshots: [
        {
          listId: "clickup-list-16-6",
          userId: "clickup-user-1",
          plannedHours: 24,
          capacityHours: 16
        }
      ],
      users: [
        { id: "clickup-user-1", username: "Alice ClickUp" },
        { id: "clickup-user-2", username: "Bob ClickUp" }
      ]
    },
    sourceExportCapturedAt: "2026-03-29T21:35:00.000Z"
  });

  assert.equal(preparedBatch.batchTypeCode, "crm_handoff");
  assert.equal(preparedBatch.adapterProviderCode, CLICKUP_PROVIDER_CODE);
  assert.equal(preparedBatch.adapterProviderBaselineCode, "SE-CLICKUP-PROJECTS");
  assert.equal(preparedBatch.integrationConnectionId, connection.connectionId);
  assert.equal(preparedBatch.sourcePayload.length, 1);
  assert.equal(preparedBatch.sourcePayload[0].sourceSystemCode, "clickup");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.folderId, "clickup-folder-16-6");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.spaceId, "clickup-space-16-6");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.blockedTaskCount, 1);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.milestoneCount, 1);
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.workloadPressureCode, "over_capacity");
  assert.equal(preparedBatch.sourcePayload[0].adapterContext.timesheetApprovalStatus, "pending_review");
  assert.equal(preparedBatch.sourcePayload[0].contractValueAmount, 118000);
});
