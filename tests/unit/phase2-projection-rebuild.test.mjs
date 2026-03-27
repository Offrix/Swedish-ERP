import test from "node:test";
import assert from "node:assert/strict";
import { createSearchEngine } from "../../packages/domain-search/src/index.mjs";

test("Phase 2.5 full projection rebuild preserves source truth and non-targeted projections", async () => {
  const sourceState = {
    contracts: [
      {
        projectionCode: "reporting.report_snapshot",
        objectType: "report_snapshot",
        displayName: "Report snapshots",
        sourceDomainCode: "reporting",
        visibilityScope: "company",
        surfaceCodes: ["desktop.search"],
        filterFieldCodes: ["reportCode"]
      },
      {
        projectionCode: "reporting.report_export_job",
        objectType: "report_export_job",
        displayName: "Report exports",
        sourceDomainCode: "reporting",
        visibilityScope: "company",
        surfaceCodes: ["desktop.search"],
        filterFieldCodes: ["status"]
      }
    ],
    documents: [
      {
        projectionCode: "reporting.report_snapshot",
        objectId: "snapshot-1",
        objectType: "report_snapshot",
        displayTitle: "Snapshot v1",
        displaySubtitle: "trial_balance",
        documentStatus: "active",
        searchText: "Snapshot v1 trial balance",
        filterPayload: { reportCode: "trial_balance" },
        sourceVersion: "snapshot-1:v1",
        sourceUpdatedAt: "2026-03-26T08:00:00Z"
      },
      {
        projectionCode: "reporting.report_export_job",
        objectId: "export-1",
        objectType: "report_export_job",
        displayTitle: "Export requested",
        displaySubtitle: "pending",
        documentStatus: "active",
        searchText: "Export requested pending",
        filterPayload: { status: "pending" },
        sourceVersion: "export-1:v1",
        sourceUpdatedAt: "2026-03-26T08:05:00Z"
      }
    ]
  };

  const engine = createSearchEngine({
    clock: () => new Date("2026-03-26T09:00:00Z"),
    reportingPlatform: {
      listSearchProjectionContracts: () => sourceState.contracts,
      listSearchProjectionDocuments: () => sourceState.documents
    }
  });

  const companyId = "company_phase2_projection_targeting";

  await engine.requestSearchReindex({
    companyId,
    actorId: "user_1"
  });

  const initialSnapshotDocument = engine.listSearchDocuments({
    companyId,
    projectionCode: "reporting.report_snapshot",
    viewerUserId: "user_1"
  })[0];
  const initialExportDocument = engine.listSearchDocuments({
    companyId,
    projectionCode: "reporting.report_export_job",
    viewerUserId: "user_1"
  })[0];

  sourceState.documents = [
    {
      projectionCode: "reporting.report_snapshot",
      objectId: "snapshot-1",
      objectType: "report_snapshot",
      displayTitle: "Snapshot v2",
      displaySubtitle: "trial_balance",
      documentStatus: "active",
      searchText: "Snapshot v2 trial balance",
      filterPayload: { reportCode: "trial_balance" },
      sourceVersion: "snapshot-1:v2",
      sourceUpdatedAt: "2026-03-26T08:30:00Z"
    },
    {
      projectionCode: "reporting.report_export_job",
      objectId: "export-1",
      objectType: "report_export_job",
      displayTitle: "Export requested",
      displaySubtitle: "pending",
      documentStatus: "active",
      searchText: "Export requested pending",
      filterPayload: { status: "pending" },
      sourceVersion: "export-1:v1",
      sourceUpdatedAt: "2026-03-26T08:05:00Z"
    }
  ];
  const sourceSnapshotBeforeRebuild = structuredClone(sourceState.documents);

  const rebuilt = await engine.requestSearchReindex({
    companyId,
    actorId: "user_1",
    projectionCode: "reporting.report_snapshot",
    rebuildMode: "full",
    reasonCode: "schema_repair"
  });

  assert.equal(rebuilt.reindexRequest.status, "completed");
  assert.equal(rebuilt.indexingSummary.projectionCount, 1);
  assert.equal(rebuilt.indexingSummary.rebuildMode, "full");
  assert.equal(rebuilt.indexingSummary.purgedCount, 1);
  assert.deepEqual(sourceState.documents, sourceSnapshotBeforeRebuild);

  const rebuiltSnapshotDocument = engine.listSearchDocuments({
    companyId,
    projectionCode: "reporting.report_snapshot",
    viewerUserId: "user_1"
  })[0];
  const untouchedExportDocument = engine.listSearchDocuments({
    companyId,
    projectionCode: "reporting.report_export_job",
    viewerUserId: "user_1"
  })[0];

  assert.equal(rebuiltSnapshotDocument.displayTitle, "Snapshot v2");
  assert.notEqual(rebuiltSnapshotDocument.searchDocumentId, initialSnapshotDocument.searchDocumentId);
  assert.equal(untouchedExportDocument.searchDocumentId, initialExportDocument.searchDocumentId);

  const snapshotCheckpoint = engine.listProjectionCheckpoints({
    companyId,
    projectionCode: "reporting.report_snapshot"
  })[0];
  const exportCheckpoint = engine.listProjectionCheckpoints({
    companyId,
    projectionCode: "reporting.report_export_job"
  })[0];

  assert.equal(snapshotCheckpoint.status, "completed");
  assert.equal(snapshotCheckpoint.checkpointSequenceNo, 2);
  assert.equal(snapshotCheckpoint.lastRebuildMode, "full");
  assert.equal(snapshotCheckpoint.lastPurgedCount, 1);
  assert.equal(snapshotCheckpoint.lastDocumentCount, 1);
  assert.equal(typeof snapshotCheckpoint.lastSourceHash, "string");
  assert.equal(snapshotCheckpoint.lastSourceHash.length > 0, true);
  assert.equal(exportCheckpoint.status, "completed");
  assert.equal(exportCheckpoint.checkpointSequenceNo, 1);
  assert.equal(exportCheckpoint.lastDocumentCount, 1);
});

test("Phase 2.5 failed rebuild leaves source truth untouched and retry clears checkpoint failure", async () => {
  const sourceState = {
    contracts: [
      {
        projectionCode: "reporting.report_snapshot",
        objectType: "report_snapshot",
        displayName: "Report snapshots",
        sourceDomainCode: "reporting",
        visibilityScope: "company",
        surfaceCodes: ["desktop.search"],
        filterFieldCodes: ["reportCode"]
      }
    ],
    documents: [
      {
        projectionCode: "reporting.report_snapshot",
        objectId: "snapshot-1",
        objectType: "report_snapshot",
        displayTitle: "Snapshot live candidate",
        displaySubtitle: "trial_balance",
        documentStatus: "active",
        searchText: "Snapshot live candidate trial balance",
        filterPayload: { reportCode: "trial_balance" },
        sourceVersion: "snapshot-1:v1",
        sourceUpdatedAt: "2026-03-26T08:45:00Z"
      }
    ]
  };
  const sourceSnapshot = structuredClone(sourceState.documents);
  let failNextRead = true;

  const engine = createSearchEngine({
    clock: () => new Date("2026-03-26T10:15:00Z"),
    reportingPlatform: {
      listSearchProjectionContracts: () => sourceState.contracts,
      listSearchProjectionDocuments: () => {
        if (failNextRead) {
          const error = new Error("Projection source unavailable.");
          error.code = "projection_source_unavailable";
          throw error;
        }
        return sourceState.documents;
      }
    }
  });

  const companyId = "company_phase2_projection_retry";

  await assert.rejects(
    () =>
      engine.requestSearchReindex({
        companyId,
        actorId: "user_1",
        rebuildMode: "full",
        projectionCode: "reporting.report_snapshot",
        reasonCode: "manual_repair"
      }),
    {
      code: "projection_source_unavailable"
    }
  );

  assert.deepEqual(sourceState.documents, sourceSnapshot);

  const failedRequest = engine.listSearchReindexRequests({
    companyId,
    status: "failed"
  })[0];
  assert.equal(failedRequest.errorCode, "PROJECTION_SOURCE_UNAVAILABLE");
  assert.equal(failedRequest.rebuildMode, "full");

  const failedCheckpoint = engine.listProjectionCheckpoints({
    companyId,
    projectionCode: "reporting.report_snapshot"
  })[0];
  assert.equal(failedCheckpoint.status, "failed");
  assert.equal(failedCheckpoint.lastErrorCode, "PROJECTION_SOURCE_UNAVAILABLE");
  assert.equal(failedCheckpoint.lastErrorMessage, "Projection source unavailable.");
  assert.equal(failedCheckpoint.checkpointSequenceNo, 0);

  failNextRead = false;
  const recovered = await engine.requestSearchReindex({
    companyId,
    actorId: "user_1",
    rebuildMode: "full",
    projectionCode: "reporting.report_snapshot",
    reasonCode: "retry_after_failure"
  });

  assert.equal(recovered.reindexRequest.status, "completed");
  assert.equal(recovered.indexingSummary.indexedCount, 1);
  assert.equal(recovered.indexingSummary.purgedCount, 0);

  const recoveredCheckpoint = engine.listProjectionCheckpoints({
    companyId,
    projectionCode: "reporting.report_snapshot"
  })[0];
  assert.equal(recoveredCheckpoint.status, "completed");
  assert.equal(recoveredCheckpoint.lastErrorCode, null);
  assert.equal(recoveredCheckpoint.lastErrorMessage, null);
  assert.equal(recoveredCheckpoint.checkpointSequenceNo, 1);
  assert.equal(recoveredCheckpoint.lastDocumentCount, 1);
  assert.equal(
    engine.listSearchDocuments({
      companyId,
      projectionCode: "reporting.report_snapshot",
      viewerUserId: "user_1"
    }).length,
    1
  );
});
