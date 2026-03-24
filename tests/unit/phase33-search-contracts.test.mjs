import test from "node:test";
import assert from "node:assert/strict";
import { createSearchEngine } from "../../packages/domain-search/src/index.mjs";

test("Step 33 search registry indexes reporting projections and supports saved view repair", () => {
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

  const reindex = engine.requestSearchReindex({
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
