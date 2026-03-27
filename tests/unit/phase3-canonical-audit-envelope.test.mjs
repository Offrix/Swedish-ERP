import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createAuditEnvelope, isAuditEnvelope } from "../../packages/events/src/index.mjs";
import { createAuditEvent } from "../../packages/auth-core/src/index.mjs";
import { createActivityEngine } from "../../packages/domain-activity/src/engine.mjs";
import { createReviewCenterEngine } from "../../packages/domain-review-center/src/engine.mjs";
import { createSearchEngine } from "../../packages/domain-search/src/index.mjs";
import { createDocumentArchiveEngine } from "../../packages/document-engine/src/index.mjs";
import { createNotificationsEngine } from "../../packages/domain-notifications/src/engine.mjs";
import { createId06Engine } from "../../packages/domain-id06/src/index.mjs";

test("Phase 3.1 canonical audit envelope carries integrity hash and legacy alias", () => {
  const audit = createAuditEnvelope({
    companyId: "company_phase3_events",
    actorId: "user_1",
    sessionId: "session_1",
    action: "demo.action",
    entityType: "demo_entity",
    entityId: "entity_1",
    explanation: "Canonical audit envelope demo.",
    correlationId: "corr_1",
    auditClass: "demo_action",
    metadata: {
      before: { status: "draft" },
      after: { status: "posted" }
    }
  });

  assert.equal(isAuditEnvelope(audit), true);
  assert.equal(audit.auditId, audit.auditEventId);
  assert.equal(audit.auditEnvelopeVersion, 2);
  assert.equal(audit.actorType, "user");
  assert.equal(audit.sessionId, "session_1");
  assert.equal(audit.auditClass, "demo_action");
  assert.equal(typeof audit.integrityHash, "string");
  assert.equal(audit.integrityHash.length, 64);
});

test("Phase 3.1 legacy audit records are coerced into canonical envelopes with metadata aliases", () => {
  const audit = createAuditEnvelope({
    companyId: "company_phase3_alias",
    actorId: "user_alias",
    action: "demo.alias",
    entityType: "demo",
    entityId: "alias_1",
    explanation: "Alias audit.",
    correlationId: "corr_alias",
    auditClass: "demo_action",
    metadata: {
      projectId: "project_123",
      employmentId: "employment_123"
    }
  });

  assert.equal(audit.projectId, "project_123");
  assert.equal(audit.employmentId, "employment_123");
  assert.equal(audit.metadata.projectId, "project_123");
  assert.equal(audit.metadata.employmentId, "employment_123");
});

test("Phase 3.1 auth audit helper emits canonical audit envelopes", () => {
  const audit = createAuditEvent({
    companyId: "company_phase3_auth",
    actorId: "system",
    action: "auth.session.revoked",
    entityType: "session",
    entityId: "session_1",
    explanation: "Revoked session.",
    correlationId: "corr_auth"
  });

  assert.equal(isAuditEnvelope(audit), true);
  assert.equal(audit.actorType, "system");
  assert.equal(audit.auditClass, "auth_action");
  assert.equal(audit.result, "success");
});

test("Phase 3.1 review-center audit uses the canonical envelope", () => {
  const engine = createReviewCenterEngine({
    clock: () => new Date("2026-03-26T11:00:00Z")
  });

  engine.createReviewQueue({
    companyId: "company_phase3_review",
    queueCode: "vat_review",
    label: "VAT review",
    actorId: "review_owner"
  });

  const audit = engine.listReviewCenterAuditEvents({
    companyId: "company_phase3_review"
  })[0];

  assert.equal(isAuditEnvelope(audit), true);
  assert.equal(audit.auditClass, "review_center_action");
  assert.equal(audit.result, "success");
  assert.equal(typeof audit.correlationId, "string");
  assert.equal(audit.correlationId.length > 0, true);
});

test("Phase 3.1 search audit uses the canonical envelope", async () => {
  const engine = createSearchEngine({
    clock: () => new Date("2026-03-26T11:15:00Z"),
    reportingPlatform: {
      listSearchProjectionContracts: () => [
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
      listSearchProjectionDocuments: () => [
        {
          projectionCode: "reporting.report_snapshot",
          objectId: "snapshot_1",
          objectType: "report_snapshot",
          displayTitle: "Snapshot 1",
          displaySubtitle: "trial_balance",
          documentStatus: "active",
          searchText: "Snapshot 1 trial balance",
          filterPayload: { reportCode: "trial_balance" },
          sourceVersion: "snapshot_1:v1",
          sourceUpdatedAt: "2026-03-26T10:00:00Z"
        }
      ]
    }
  });

  await engine.requestSearchReindex({
    companyId: "company_phase3_search",
    actorId: "search_user",
    correlationId: "corr_search"
  });

  const audit = engine.snapshotSearch().auditEvents[0];
  assert.equal(isAuditEnvelope(audit), true);
  assert.equal(audit.auditClass, "search_action");
  assert.equal(audit.correlationId, "corr_search");
  assert.equal(audit.result, "success");
});

test("Phase 3.1 document audit uses the canonical envelope", () => {
  const engine = createDocumentArchiveEngine({
    clock: () => new Date("2026-03-26T11:30:00Z")
  });

  engine.createDocumentRecord({
    companyId: "company_phase3_docs",
    documentType: "supplier_invoice",
    sourceChannel: "manual",
    actorId: "doc_user",
    correlationId: "corr_doc"
  });

  const audit = engine.snapshotDocumentArchive().auditEvents[0];
  assert.equal(isAuditEnvelope(audit), true);
  assert.equal(audit.auditClass, "document_action");
  assert.equal(audit.correlationId, "corr_doc");
  assert.equal(audit.result, "success");
});

test("Phase 3.1 activity audit uses the canonical envelope", () => {
  const engine = createActivityEngine({
    clock: () => new Date("2026-03-26T11:35:00Z")
  });

  engine.projectActivityEntry({
    companyId: "company_phase3_activity",
    objectType: "journal_entry",
    objectId: "journal_1",
    activityType: "journal_posted",
    actorType: "user",
    actorSnapshot: { actorId: "activity_user" },
    summary: "Journal posted.",
    sourceEventId: "event_1",
    actorId: "activity_user"
  });

  const audit = engine.snapshotActivity().auditEvents[0];
  assert.equal(isAuditEnvelope(audit), true);
  assert.equal(audit.auditClass, "activity_action");
  assert.equal(audit.result, "success");
});

test("Phase 3.1 notification audit uses the canonical envelope", () => {
  const engine = createNotificationsEngine({
    clock: () => new Date("2026-03-26T11:40:00Z")
  });

  engine.createNotification({
    companyId: "company_phase3_notifications",
    recipientType: "user",
    recipientId: "user_1",
    categoryCode: "review_required",
    sourceDomainCode: "review_center",
    sourceObjectType: "review_item",
    sourceObjectId: "review_1",
    title: "Review required",
    body: "A review item is waiting.",
    actorId: "notification_user"
  });

  const audit = engine.snapshotNotifications().auditEvents[0];
  assert.equal(isAuditEnvelope(audit), true);
  assert.equal(audit.auditClass, "notification_action");
  assert.equal(audit.result, "success");
});

test("Phase 3.1 id06 audit uses the canonical envelope", () => {
  const engine = createId06Engine({
    clock: () => new Date("2026-03-26T11:45:00Z")
  });

  engine.verifyCompany({
    companyId: "company_phase3_id06",
    orgNo: "556677-8899",
    companyName: "Phase 3 ID06 AB",
    actorId: "id06_user",
    correlationId: "corr_id06"
  });

  const audit = engine.listAuditEvents({
    companyId: "company_phase3_id06"
  })[0];

  assert.equal(isAuditEnvelope(audit), true);
  assert.equal(audit.auditClass, "id06_action");
  assert.equal(audit.correlationId, "corr_id06");
  assert.equal(audit.result, "success");
});

test("Phase 3.1 canonical helper covers all remaining legacy audit writers", () => {
  const repoRoot = path.resolve("C:\\Users\\snobb\\Desktop\\Swedish ERP");
  const expectedFiles = [
    "packages/domain-accounting-method/src/index.mjs",
    "packages/domain-fiscal-year/src/index.mjs",
    "packages/domain-legal-form/src/index.mjs",
    "packages/domain-tax-account/src/helpers.mjs",
    "packages/domain-balances/src/helpers.mjs",
    "packages/domain-banking/src/index.mjs",
    "packages/domain-ledger/src/index.mjs",
    "packages/domain-vat/src/index.mjs",
    "packages/domain-reporting/src/index.mjs",
    "packages/domain-ap/src/index.mjs",
    "packages/domain-ar/src/index.mjs",
    "packages/domain-benefits/src/index.mjs",
    "packages/domain-travel/src/index.mjs",
    "packages/domain-pension/src/index.mjs",
    "packages/domain-hr/src/index.mjs",
    "packages/domain-field/src/index.mjs",
    "packages/domain-personalliggare/src/index.mjs",
    "packages/domain-egenkontroll/src/index.mjs",
    "packages/domain-projects/src/index.mjs",
    "packages/domain-kalkyl/src/index.mjs",
    "packages/domain-hus/src/index.mjs",
    "packages/domain-id06/src/index.mjs",
    "packages/domain-document-classification/src/engine.mjs",
    "packages/domain-import-cases/src/engine.mjs"
  ];

  for (const relativePath of expectedFiles) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(source, /createAuditEnvelopeFromLegacyEvent/);
  }
});
