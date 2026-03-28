import test from "node:test";
import assert from "node:assert/strict";
import { createSearchEngine } from "../../packages/domain-search/src/index.mjs";

function createPayrollProjectionSource() {
  return {
    contracts: [
      {
        projectionCode: "payroll.pay_run",
        objectType: "payRun",
        displayName: "Pay runs",
        sourceDomainCode: "reporting",
        visibilityScope: "team",
        surfaceCodes: ["desktop.payroll", "desktop.search"],
        filterFieldCodes: ["reportingPeriod", "status"]
      },
      {
        projectionCode: "payroll.agi_submission",
        objectType: "agiSubmission",
        displayName: "AGI submissions",
        sourceDomainCode: "reporting",
        visibilityScope: "company",
        surfaceCodes: ["desktop.payroll", "desktop.search"],
        filterFieldCodes: ["reportingPeriod", "status"]
      }
    ],
    documents: [
      {
        projectionCode: "payroll.pay_run",
        objectId: "pr_15_2_1",
        displayTitle: "March payroll 2026",
        displaySubtitle: "Approved",
        documentStatus: "approved",
        searchText: "March payroll 2026 approved",
        filterPayload: {
          reportingPeriod: "2026-03",
          status: "approved"
        },
        permissionScope: {
          scopeCode: "team",
          teamId: "payroll_ops"
        },
        detailPayload: {
          criticalBadges: [{ badgeCode: "review_blocked", label: "Review blocked" }],
          owner: { ownerType: "team", ownerId: "payroll_ops", displayName: "Payroll Ops" },
          snapshot: {
            financialFields: [{ fieldCode: "netPay", value: 24500 }],
            periodFields: [{ fieldCode: "reportingPeriod", value: "2026-03" }]
          },
          sections: [
            {
              sectionCode: "employees",
              title: "Employees",
              fields: [{ fieldCode: "employeeCount", value: 3 }]
            },
            {
              sectionCode: "exceptions",
              title: "Exceptions",
              warnings: [{ warningCode: "manual_review", label: "Manual review required" }]
            }
          ],
          blockers: [
            {
              blockerCode: "unresolved_agreement_exception",
              title: "Agreement exception unresolved",
              severity: "blocking",
              sectionCode: "exceptions"
            }
          ],
          allowedActions: ["payroll.approve", "payroll.submitAgi"],
          permissionSummary: {
            allowedRoleCodes: ["payroll_admin"],
            requiresStepUp: true
          },
          auditRefs: {
            correlationIds: ["corr_phase15_2"]
          }
        },
        workbenchPayload: {
          pillars: [{ pillarCode: "netPay", label: "Net pay", value: "24 500 SEK" }],
          blockerCodes: ["unresolved_agreement_exception"],
          counterTags: ["blockingExceptions"],
          owner: { ownerType: "team", ownerId: "payroll_ops", displayName: "Payroll Ops" }
        },
        sourceVersion: "pay_run:pr_15_2_1:v1",
        sourceUpdatedAt: "2026-03-28T09:00:00Z"
      },
      {
        projectionCode: "payroll.agi_submission",
        objectId: "agi_15_2_1",
        displayTitle: "AGI 2026-03",
        displaySubtitle: "Pending receipt",
        documentStatus: "pending_receipt",
        searchText: "AGI March 2026 pending receipt",
        filterPayload: {
          reportingPeriod: "2026-03",
          status: "pending_receipt"
        },
        detailPayload: {
          sections: [
            {
              sectionCode: "technicalReceipts",
              title: "Technical receipts",
              fields: [{ fieldCode: "pendingCount", value: 1 }]
            }
          ]
        },
        workbenchPayload: {
          receiptBadges: [{ badgeCode: "receipt_pending", label: "Receipt pending" }],
          counterTags: ["agiReceiptPendingCount"]
        },
        sourceVersion: "agi:agi_15_2_1:v1",
        sourceUpdatedAt: "2026-03-28T09:05:00Z"
      }
    ]
  };
}

test("Phase 15.2 object profiles are permission trimmed and carry projection-backed blockers and sections", async () => {
  const sourceState = createPayrollProjectionSource();
  const engine = createSearchEngine({
    clock: () => new Date("2026-03-28T09:15:00Z"),
    reportingPlatform: {
      listSearchProjectionContracts: () => sourceState.contracts,
      listSearchProjectionDocuments: () => sourceState.documents
    }
  });

  const companyId = "company_phase15_2";
  const result = await engine.requestSearchReindex({
    companyId,
    actorId: "user_payroll_admin"
  });
  assert.equal(result.reindexRequest.status, "completed");

  const profile = engine.getObjectProfile({
    companyId,
    objectType: "pay_run",
    objectId: "pr_15_2_1",
    viewerUserId: "user_payroll_admin",
    viewerTeamIds: ["payroll_ops"],
    actorId: "user_payroll_admin",
    correlationId: "corr_phase15_2_profile"
  });
  assert.equal(profile.header.title, "March payroll 2026");
  assert.equal(profile.permissionSummary.requiresStepUp, true);
  assert.equal(profile.sections.find((section) => section.sectionCode === "employees")?.fields[0].value, 3);
  assert.equal(profile.blockers.some((blocker) => blocker.blockerCode === "unresolved_agreement_exception"), true);
  assert.equal(profile.allowedActions.some((action) => action.actionCode === "payroll.submitAgi"), true);

  assert.throws(
    () =>
      engine.getObjectProfile({
        companyId,
        objectType: "payRun",
        objectId: "pr_15_2_1",
        viewerUserId: "user_finance_reader",
        viewerTeamIds: ["finance_ops"],
        actorId: "user_finance_reader",
        correlationId: "corr_phase15_2_denied"
      }),
    /object profile is not visible/i
  );

  const snapshot = engine.snapshotSearch();
  assert.equal(snapshot.auditEvents.some((event) => event.action === "search.visibility.denied"), true);
});

test("Phase 15.2 workbenches compose rows, counters and saved view compatibility deterministically", async () => {
  const sourceState = createPayrollProjectionSource();
  const engine = createSearchEngine({
    clock: () => new Date("2026-03-28T09:30:00Z"),
    reportingPlatform: {
      listSearchProjectionContracts: () => sourceState.contracts,
      listSearchProjectionDocuments: () => sourceState.documents
    }
  });

  const companyId = "company_phase15_2_workbench";
  await engine.requestSearchReindex({
    companyId,
    actorId: "user_payroll_admin"
  });

  const savedView = engine.createSavedView({
    companyId,
    ownerUserId: "user_payroll_admin",
    surfaceCode: "desktop_payroll",
    title: "Approved runs",
    queryJson: {
      workbenchCode: "PayrollWorkbench",
      filters: {
        status: "approved"
      }
    },
    sortJson: {
      sortCode: "primaryLabelAsc",
      direction: "asc"
    },
    actorId: "user_payroll_admin"
  });
  assert.equal(savedView.status, "active");

  const brokenView = engine.createSavedView({
    companyId,
    ownerUserId: "user_payroll_admin",
    surfaceCode: "desktop_payroll",
    title: "Broken payroll view",
    queryJson: {
      workbenchCode: "PayrollWorkbench",
      filters: {
        unknownFilter: "x"
      }
    },
    actorId: "user_payroll_admin"
  });
  assert.equal(brokenView.status, "broken");
  assert.equal(brokenView.brokenReasonCode, "saved_view_filter_invalid");

  const workbench = engine.getWorkbench({
    companyId,
    workbenchCode: "PayrollWorkbench",
    viewerUserId: "user_payroll_admin",
    viewerTeamIds: ["payroll_ops"],
    savedViewId: savedView.savedViewId
  });
  assert.equal(workbench.rows.length, 1);
  assert.equal(workbench.rows[0].objectId, "pr_15_2_1");
  assert.equal(workbench.counters.blockingExceptions, 1);
  assert.equal(workbench.counters.agiReceiptPendingCount, 1);
  assert.equal(workbench.savedViews.some((view) => view.savedViewId === savedView.savedViewId), true);
  assert.equal(workbench.compatibilitySummary.targetType, "workbench");

  const scan = engine.runSavedViewCompatibilityScan({
    companyId,
    actorId: "worker_scheduler"
  });
  assert.equal(scan.scannedCount, 2);
  assert.equal(scan.items.find((item) => item.savedViewId === brokenView.savedViewId)?.brokenReasonCode, "saved_view_filter_invalid");
});
