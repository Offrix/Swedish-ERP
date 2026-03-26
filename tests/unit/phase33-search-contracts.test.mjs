import test from "node:test";
import assert from "node:assert/strict";
import { createSearchEngine } from "../../packages/domain-search/src/index.mjs";

test("Step 33 search registry indexes reporting projections and supports saved view repair", async () => {
  const sourceState = {
    contracts: [
      {
        projectionCode: "reporting.report_definition",
        objectType: "report_definition",
        displayName: "Report definitions",
        sourceDomainCode: "reporting",
        visibilityScope: "company",
        surfaceCodes: ["desktop.search"],
        filterFieldCodes: ["reportCode"]
      }
    ],
    documents: [
      {
        projectionCode: "reporting.report_definition",
        objectId: "trial_balance:v1",
        displayTitle: "Trial balance",
        displaySubtitle: "trial_balance v1",
        documentStatus: "active",
        searchText: "Trial balance trial_balance",
        filterPayload: { reportCode: "trial_balance" },
        sourceVersion: "trial_balance:v1",
        sourceUpdatedAt: "2026-03-25T09:00:00Z"
      }
    ]
  };

  const engine = createSearchEngine({
    clock: () => new Date("2026-03-25T09:30:00Z"),
    reportingPlatform: {
      listSearchProjectionContracts: () => sourceState.contracts,
      listSearchProjectionDocuments: () => sourceState.documents
    }
  });

  const reindex = await engine.requestSearchReindex({
    companyId: "company_search_1",
    actorId: "user_1"
  });
  assert.equal(reindex.indexingSummary.indexedCount, 1);

  const matches = engine.listSearchDocuments({
    companyId: "company_search_1",
    query: "trial",
    viewerUserId: "user_1"
  });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].projectionCode, "reporting.report_definition");

  const brokenView = engine.createSavedView({
    companyId: "company_search_1",
    ownerUserId: "user_1",
    surfaceCode: "desktop_reporting",
    title: "Broken export search",
    queryJson: {
      projectionCode: "reporting.report_export_job"
    },
    actorId: "user_1"
  });
  assert.equal(brokenView.status, "broken");

  sourceState.contracts.push({
    projectionCode: "reporting.report_export_job",
    objectType: "report_export_job",
    displayName: "Report exports",
    sourceDomainCode: "reporting",
    visibilityScope: "company",
    surfaceCodes: ["desktop.search"],
    filterFieldCodes: ["status"]
  });

  const repaired = engine.repairSavedView({
    companyId: "company_search_1",
    savedViewId: brokenView.savedViewId,
    viewerUserId: "user_1",
    actorId: "user_1"
  });
  assert.equal(repaired.status, "active");

  const shared = engine.shareSavedView({
    companyId: "company_search_1",
    savedViewId: repaired.savedViewId,
    viewerUserId: "user_1",
    visibilityCode: "company",
    actorId: "user_1"
  });
  assert.equal(shared.visibilityCode, "company");
});

test("Step 33 saved view compatibility scan repairs and re-breaks views deterministically", () => {
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
    documents: []
  };

  const engine = createSearchEngine({
    clock: () => new Date("2026-03-25T10:00:00Z"),
    reportingPlatform: {
      listSearchProjectionContracts: () => sourceState.contracts,
      listSearchProjectionDocuments: () => sourceState.documents
    }
  });

  const activeView = engine.createSavedView({
    companyId: "company_search_compat_1",
    ownerUserId: "user_1",
    surfaceCode: "desktop_reporting",
    title: "Snapshots",
    queryJson: {
      projectionCode: "reporting.report_snapshot"
    },
    actorId: "user_1"
  });
  const brokenView = engine.createSavedView({
    companyId: "company_search_compat_1",
    ownerUserId: "user_1",
    surfaceCode: "desktop_reporting",
    title: "Exports",
    queryJson: {
      projectionCode: "reporting.report_export_job"
    },
    actorId: "user_1"
  });
  assert.equal(activeView.status, "active");
  assert.equal(brokenView.status, "broken");

  sourceState.contracts.push({
    projectionCode: "reporting.report_export_job",
    objectType: "report_export_job",
    displayName: "Report exports",
    sourceDomainCode: "reporting",
    visibilityScope: "company",
    surfaceCodes: ["desktop.search"],
    filterFieldCodes: ["status"]
  });

  const repairedScan = engine.runSavedViewCompatibilityScan({
    companyId: "company_search_compat_1",
    actorId: "worker_scheduler"
  });
  assert.equal(repairedScan.scannedCount, 2);
  assert.equal(repairedScan.changedCount, 1);
  assert.equal(repairedScan.repairedCount, 1);
  assert.equal(
    repairedScan.items.find((item) => item.savedViewId === brokenView.savedViewId)?.status,
    "active"
  );

  sourceState.contracts = sourceState.contracts.filter((contract) => contract.projectionCode !== "reporting.report_snapshot");
  const brokenScan = engine.runSavedViewCompatibilityScan({
    companyId: "company_search_compat_1",
    actorId: "worker_scheduler"
  });
  assert.equal(brokenScan.changedCount, 1);
  assert.equal(brokenScan.brokenCount, 1);
  assert.equal(
    brokenScan.items.find((item) => item.savedViewId === activeView.savedViewId)?.brokenReasonCode,
    "projection_contract_missing"
  );
});

test("Phase 2.5 search full rebuild purges projection documents and records checkpoints", async () => {
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
        displayTitle: "Snapshot v1",
        displaySubtitle: "trial_balance",
        documentStatus: "active",
        searchText: "Snapshot v1 trial balance",
        filterPayload: { reportCode: "trial_balance" },
        sourceVersion: "snapshot-1:v1",
        sourceUpdatedAt: "2026-03-25T11:00:00Z"
      }
    ]
  };

  const engine = createSearchEngine({
    clock: () => new Date("2026-03-25T12:30:00Z"),
    reportingPlatform: {
      listSearchProjectionContracts: () => sourceState.contracts,
      listSearchProjectionDocuments: () => sourceState.documents
    }
  });

  const companyId = "company_projection_rebuild_1";
  const first = await engine.requestSearchReindex({
    companyId,
    actorId: "user_1"
  });
  assert.equal(first.indexingSummary.indexedCount, 1);

  const firstDocumentId = engine.listSearchDocuments({
    companyId,
    query: "snapshot",
    viewerUserId: "user_1"
  })[0].searchDocumentId;

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
      sourceUpdatedAt: "2026-03-25T12:00:00Z"
    }
  ];

  const rebuilt = await engine.requestSearchReindex({
    companyId,
    actorId: "user_1",
    rebuildMode: "full",
    projectionCode: "reporting.report_snapshot"
  });
  assert.equal(rebuilt.reindexRequest.status, "completed");
  assert.equal(rebuilt.indexingSummary.rebuildMode, "full");
  assert.equal(rebuilt.indexingSummary.purgedCount, 1);

  const rebuiltDocument = engine.listSearchDocuments({
    companyId,
    query: "v2",
    viewerUserId: "user_1"
  })[0];
  assert.equal(rebuiltDocument.displayTitle, "Snapshot v2");
  assert.notEqual(rebuiltDocument.searchDocumentId, firstDocumentId);

  const checkpoint = engine.listProjectionCheckpoints({
    companyId,
    projectionCode: "reporting.report_snapshot"
  })[0];
  assert.equal(checkpoint.status, "completed");
  assert.equal(checkpoint.lastRebuildMode, "full");
  assert.equal(checkpoint.lastPurgedCount, 1);
  assert.equal(checkpoint.lastIndexedCount, 1);
  assert.equal(checkpoint.lastDocumentCount, 1);
  assert.equal(checkpoint.checkpointSequenceNo, 2);
});
