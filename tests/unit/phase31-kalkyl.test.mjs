import test from "node:test";
import assert from "node:assert/strict";
import { createKalkylPlatform } from "../../packages/domain-kalkyl/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const CUSTOMER_ID = "customer-31";
const PROJECT_ID = "project-31";

test("Step 31 kalkyl revisions, quote conversion and project budget conversion stay deterministic", () => {
  const createdBudgetPayloads = [];
  const kalkyl = createKalkylPlatform({
    clock: () => new Date("2026-03-25T08:00:00Z"),
    arPlatform: {
      getCustomer: ({ customerId }) => ({ customerId, legalName: "Demo Customer" })
    },
    projectsPlatform: {
      getProject: ({ projectId }) => ({ projectId, displayName: "Demo Project" }),
      createProjectBudgetVersion: (payload) => {
        createdBudgetPayloads.push(payload);
        return {
          projectBudgetVersionId: "budget-version-31",
          ...payload
        };
      }
    }
  });

  const estimate = kalkyl.createEstimateVersion({
    companyId: COMPANY_ID,
    customerId: CUSTOMER_ID,
    projectId: PROJECT_ID,
    title: "Kabeldragning etapp 1",
    validFrom: "2026-03-25",
    validTo: "2026-04-25",
    actorId: "step31-unit"
  });
  assert.equal(estimate.status, "draft");
  assert.equal(estimate.versionNo, 1);

  const line = kalkyl.addEstimateLine({
    companyId: COMPANY_ID,
    estimateVersionId: estimate.estimateVersionId,
    lineTypeCode: "labor",
    description: "Montage och kabeldragning",
    quantity: 16,
    unitCode: "hour",
    costAmount: 8000,
    salesAmount: 16000,
    projectPhaseCode: "INSTALL",
    actorId: "step31-unit"
  });
  assert.equal(line.lineTypeCode, "labor");

  const assumption = kalkyl.addEstimateAssumption({
    companyId: COMPANY_ID,
    estimateVersionId: estimate.estimateVersionId,
    assumptionCode: "RISK_BUFFER",
    description: "Riskbuffert för åtkomst till undertak",
    impactAmount: 1500,
    actorId: "step31-unit"
  });
  assert.equal(assumption.assumptionCode, "RISK_BUFFER");

  const reviewed = kalkyl.reviewEstimateVersion({
    companyId: COMPANY_ID,
    estimateVersionId: estimate.estimateVersionId,
    actorId: "reviewer-31"
  });
  assert.equal(reviewed.status, "reviewed");
  assert.equal(reviewed.totals.totalSalesAmount, 17500);

  const approved = kalkyl.approveEstimateVersion({
    companyId: COMPANY_ID,
    estimateVersionId: estimate.estimateVersionId,
    actorId: "approver-31"
  });
  assert.equal(approved.status, "approved");

  const quoted = kalkyl.convertEstimateToQuote({
    companyId: COMPANY_ID,
    estimateVersionId: estimate.estimateVersionId,
    quoteTitle: "Offert Kabeldragning etapp 1",
    validUntil: "2026-04-30",
    actorId: "sales-31"
  });
  assert.equal(quoted.status, "quoted");
  assert.equal(quoted.quoteConversion.payload.lines.length, 1);
  assert.equal(quoted.quoteConversion.payload.lines[0].unitPrice, 1000);

  const converted = kalkyl.convertEstimateToProjectBudget({
    companyId: COMPANY_ID,
    estimateVersionId: estimate.estimateVersionId,
    projectId: PROJECT_ID,
    budgetName: "Installationsbudget etapp 1",
    validFrom: "2026-03-25",
    actorId: "controller-31"
  });
  assert.equal(converted.status, "converted");
  assert.equal(converted.projectBudgetConversion.projectBudgetVersionId, "budget-version-31");
  assert.equal(createdBudgetPayloads.length, 1);
  assert.equal(createdBudgetPayloads[0].lines.length, 3);
  assert.deepEqual(
    createdBudgetPayloads[0].lines.map((lineItem) => lineItem.lineKind),
    ["cost", "revenue", "revenue"]
  );

  const revised = kalkyl.createEstimateVersion({
    companyId: COMPANY_ID,
    supersedesEstimateVersionId: estimate.estimateVersionId,
    customerId: CUSTOMER_ID,
    projectId: PROJECT_ID,
    validFrom: "2026-04-01",
    actorId: "step31-unit"
  });
  assert.equal(revised.versionNo, 2);
  assert.equal(revised.lines.length, 1);
  assert.equal(revised.assumptions.length, 1);

  const fetchedOriginal = kalkyl.getEstimateVersion({
    companyId: COMPANY_ID,
    estimateVersionId: estimate.estimateVersionId
  });
  assert.equal(fetchedOriginal.status, "superseded");
  assert.equal(fetchedOriginal.supersededByEstimateVersionId, revised.estimateVersionId);

  const snapshot = kalkyl.snapshotKalkyl({ companyId: COMPANY_ID });
  assert.equal(snapshot.estimates.length, 2);
  assert.equal(snapshot.auditEvents.length >= 7, true);
});

test("Step 31 kalkyl blocks approval review when estimate lacks commercial lines", () => {
  const kalkyl = createKalkylPlatform({
    arPlatform: {
      getCustomer: ({ customerId }) => ({ customerId })
    }
  });

  const estimate = kalkyl.createEstimateVersion({
    companyId: COMPANY_ID,
    customerId: CUSTOMER_ID,
    title: "Tom kalkyl",
    validFrom: "2026-03-25",
    actorId: "step31-unit"
  });

  assert.throws(
    () =>
      kalkyl.reviewEstimateVersion({
        companyId: COMPANY_ID,
        estimateVersionId: estimate.estimateVersionId,
        actorId: "reviewer-31"
      }),
    (error) => error?.error === "estimate_lines_required"
  );
});
