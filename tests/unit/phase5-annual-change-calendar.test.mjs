import test from "node:test";
import assert from "node:assert/strict";
import {
  createProviderBaselineRegistry,
  createRegulatoryChangeCalendar,
  createRulePackRegistry
} from "../../packages/rule-engine/src/index.mjs";

test("Phase 5.3 governance blocks validation without source refs and golden vectors", () => {
  const ruleRegistry = createRulePackRegistry({
    clock: () => new Date("2026-03-27T10:00:00Z")
  });
  const draftRulePack = ruleRegistry.createDraftRulePackVersion({
    rulePackId: "vat-phase5-3-missing-artifacts",
    rulePackCode: "SE-VAT-RULES",
    domain: "vat",
    jurisdiction: "SE",
    effectiveFrom: "2026-07-01",
    version: "2026.2",
    checksum: "vat-phase5-3-missing-artifacts",
    semanticChangeSummary: "Missing governance artifacts.",
    machineReadableRules: { boxMappings: [{ boxCode: "05", accountNumber: "3001" }] },
    humanReadableExplanation: ["VAT update 2026.2"],
    testVectors: []
  });
  assert.throws(
    () => ruleRegistry.validateRulePackVersion({ rulePackId: draftRulePack.rulePackId, actorId: "reviewer-1" }),
    (error) => error?.code === "rule_pack_source_refs_required"
  );

  const providerBaselineRegistry = createProviderBaselineRegistry({
    clock: () => new Date("2026-03-27T10:00:00Z")
  });
  const draftBaseline = providerBaselineRegistry.createDraftProviderBaselineVersion({
    providerBaselineId: "peppol-phase5-3-missing-vectors",
    baselineCode: "SE-PEPPOL-BIS-BILLING-3",
    providerCode: "pagero_online",
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "peppol_bis_billing_3",
    effectiveFrom: "2026-07-01",
    version: "2026.2",
    specVersion: "3.0",
    checksum: "peppol-phase5-3-missing-vectors",
    sourceSnapshotDate: "2026-03-27",
    sourceRefs: [
      {
        url: "https://example.test/peppol/2026.2",
        checksum: "peppol-source-2026.2"
      }
    ],
    semanticChangeSummary: "Missing golden vectors."
  });
  assert.throws(
    () => providerBaselineRegistry.validateProviderBaselineVersion({ providerBaselineId: draftBaseline.providerBaselineId, actorId: "reviewer-1" }),
    (error) => error?.code === "provider_baseline_golden_vectors_required"
  );
});

test("Phase 5.4 annual change calendar enforces staged publish, dual control and rollback for rule packs", () => {
  let currentTime = "2026-03-27T11:00:00Z";
  const ruleRegistry = createRulePackRegistry({
    clock: () => new Date(currentTime)
  });
  const draftRulePack = ruleRegistry.createDraftRulePackVersion({
    rulePackId: "vat-phase5-4-2026.2",
    rulePackCode: "SE-VAT-RULES",
    domain: "vat",
    jurisdiction: "SE",
    effectiveFrom: "2026-07-01",
    version: "2026.2",
    checksum: "vat-phase5-4-2026.2",
    semanticChangeSummary: "Updated VAT treatment for annual change calendar test.",
    machineReadableRules: { boxMappings: [{ boxCode: "05", accountNumber: "3001" }] },
    humanReadableExplanation: ["VAT update 2026.2"],
    sourceRefs: [
      {
        url: "https://example.test/skv/vat-2026",
        checksum: "source-checksum-2026.2"
      }
    ],
    testVectors: [{ vectorId: "golden-vat-2026-2", expectedBox: "05" }]
  });
  const calendar = createRegulatoryChangeCalendar({
    clock: () => new Date(currentTime),
    resolveRulePackTargets: () =>
      Object.freeze({
        vat: Object.freeze({
          listRulePacks: (filters = {}) => ruleRegistry.listRulePacks({ domain: "vat", jurisdiction: "SE", ...filters }),
          getRulePack: (filters) => ruleRegistry.getRulePack(filters),
          createDraftRulePackVersion: (input) => ruleRegistry.createDraftRulePackVersion(input),
          validateRulePackVersion: (input) => ruleRegistry.validateRulePackVersion(input),
          approveRulePackVersion: (input) => ruleRegistry.approveRulePackVersion(input),
          publishRulePackVersion: (input) => ruleRegistry.publishRulePackVersion(input),
          rollbackRulePackVersion: (input) => ruleRegistry.rollbackRulePackVersion(input),
          listRulePackRollbacks: (filters = {}) => ruleRegistry.listRulePackRollbacks({ domain: "vat", jurisdiction: "SE", ...filters })
        })
      })
  });

  const changeEntry = calendar.createRegulatoryChangeEntry({
    companyId: "company-phase5-4",
    targetType: "rule_pack",
    targetKey: "vat",
    targetId: draftRulePack.rulePackId,
    changeSummary: "VAT annual change 2026.2",
    reasonCode: "annual_vat_change",
    plannedPublishAt: "2026-03-27T12:00:00Z",
    stagedPublishAt: "2026-03-27T14:00:00Z",
    actorId: "domain-owner-1",
    idempotencyKey: "phase5-4-vat-change"
  });
  assert.equal(changeEntry.status, "planned");

  calendar.captureRegulatorySourceSnapshot({
    companyId: "company-phase5-4",
    regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
    actorId: "domain-owner-1",
    officialSourceUrl: "https://example.test/skv/vat-2026",
    retrievedAt: "2026-03-27T11:05:00Z",
    sourceChecksum: "source-checksum-2026.2",
    sourceSnapshotDate: "2026-03-27"
  });
  calendar.recordRegulatoryDiffReview({
    companyId: "company-phase5-4",
    regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
    actorId: "domain-owner-1",
    diffSummary: "VAT box 05 mapping updated.",
    impactSummary: "Only sales mapping changes.",
    approved: true,
    breakingChangeRefs: ["vat-box-05"]
  });
  calendar.recordRegulatorySandboxVerification({
    companyId: "company-phase5-4",
    regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
    actorId: "qa-1",
    verificationResult: "passed",
    verificationEnvironment: "sandbox_regression",
    scenarioRefs: ["golden-vat-2026-2"],
    outputChecksum: "sandbox-output-2026.2"
  });
  calendar.approveRegulatoryChange({
    companyId: "company-phase5-4",
    regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
    actorId: "domain-owner-1",
    approvalRole: "domain_owner",
    approvalRef: "domain-owner-approved"
  });
  calendar.approveRegulatoryChange({
    companyId: "company-phase5-4",
    regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
    actorId: "compliance-1",
    approvalRole: "compliance_owner",
    approvalRef: "compliance-approved"
  });

  assert.throws(
    () =>
      calendar.publishRegulatoryChange({
        companyId: "company-phase5-4",
        regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
        actorId: "release-1"
      }),
    (error) => error?.code === "regulatory_change_staged_publish_pending"
  );

  currentTime = "2026-03-27T14:15:00Z";
  const published = calendar.publishRegulatoryChange({
    companyId: "company-phase5-4",
    regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
    actorId: "release-1"
  });
  assert.equal(published.status, "published");
  assert.equal(ruleRegistry.getRulePack({ rulePackId: draftRulePack.rulePackId }).status, "published");

  const rolledBack = calendar.activateRegulatoryRollback({
    companyId: "company-phase5-4",
    regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
    actorId: "release-1",
    effectiveFrom: "2026-07-15",
    reasonCode: "post_publish_regression",
    replayRequired: true
  });
  assert.equal(rolledBack.status, "rollback_activated");
  assert.equal(ruleRegistry.listRulePackRollbacks({ rulePackCode: "SE-VAT-RULES" }).length, 1);
  assert.equal(calendar.snapshotRegulatoryChangeCalendar({ companyId: "company-phase5-4" }).rollbackCount, 1);
});

test("Phase 5.4 annual change calendar publishes provider baseline targets with dual approvals", () => {
  const providerBaselineRegistry = createProviderBaselineRegistry({
    clock: () => new Date("2026-03-27T15:00:00Z")
  });
  const draftBaseline = providerBaselineRegistry.createDraftProviderBaselineVersion({
    providerBaselineId: "sru-phase5-4-2026.2",
    baselineCode: "SE-SRU-FILE",
    providerCode: "skatteverket_file",
    domain: "annual_reporting",
    jurisdiction: "SE",
    formatFamily: "sru_file",
    effectiveFrom: "2026-07-01",
    version: "2026.2",
    specVersion: "2.0",
    checksum: "sru-phase5-4-2026.2",
    sourceSnapshotDate: "2026-03-27",
    sourceRefs: [
      {
        url: "https://example.test/skv/sru-2026",
        checksum: "sru-source-2026.2"
      }
    ],
    testVectors: [{ vectorId: "annual-sru-export-2026-2", expectedFieldOrder: "updated" }],
    semanticChangeSummary: "SRU baseline update for annual change calendar test."
  });
  const calendar = createRegulatoryChangeCalendar({
    clock: () => new Date("2026-03-27T15:00:00Z"),
    providerBaselineRegistry
  });

  const changeEntry = calendar.createRegulatoryChangeEntry({
    companyId: "company-phase5-4",
    targetType: "provider_baseline",
    targetId: draftBaseline.providerBaselineId,
    changeSummary: "SRU baseline update 2026.2",
    reasonCode: "annual_sru_change",
    actorId: "domain-owner-1"
  });
  calendar.captureRegulatorySourceSnapshot({
    companyId: "company-phase5-4",
    regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
    actorId: "domain-owner-1",
    officialSourceUrl: "https://example.test/skv/sru-2026",
    sourceChecksum: "sru-source-2026.2"
  });
  calendar.recordRegulatoryDiffReview({
    companyId: "company-phase5-4",
    regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
    actorId: "domain-owner-1",
    diffSummary: "Updated SRU field ordering.",
    impactSummary: "Exporter payload changes only.",
    approved: true
  });
  calendar.recordRegulatorySandboxVerification({
    companyId: "company-phase5-4",
    regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
    actorId: "qa-1",
    verificationResult: "passed",
    scenarioRefs: ["annual-sru-export-2026-2"],
    outputChecksum: "annual-sru-output-2026.2"
  });
  calendar.approveRegulatoryChange({
    companyId: "company-phase5-4",
    regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
    actorId: "domain-owner-1",
    approvalRole: "domain_owner"
  });
  calendar.approveRegulatoryChange({
    companyId: "company-phase5-4",
    regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
    actorId: "compliance-1",
    approvalRole: "compliance_owner"
  });
  const published = calendar.publishRegulatoryChange({
    companyId: "company-phase5-4",
    regulatoryChangeEntryId: changeEntry.regulatoryChangeEntryId,
    actorId: "release-1"
  });
  assert.equal(published.status, "published");
  assert.equal(
    providerBaselineRegistry.getProviderBaseline({ providerBaselineId: draftBaseline.providerBaselineId }).status,
    "published"
  );
});
