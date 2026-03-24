import test from "node:test";
import assert from "node:assert/strict";
import { createRulePackRegistry } from "../../packages/rule-engine/src/index.mjs";

test("phase 14 rulepack registry enforces exclusive effectiveTo and keeps versions separated by code", () => {
  const registry = createRulePackRegistry({
    clock: () => new Date("2026-03-24T09:00:00Z"),
    seedRulePacks: [
      {
        rulePackId: "vat-se-2025",
        rulePackCode: "SE-VAT-CORE",
        domain: "vat",
        jurisdiction: "SE",
        effectiveFrom: "2025-01-01",
        effectiveTo: "2026-01-01",
        version: "2025.1",
        checksum: "vat-se-2025",
        sourceSnapshotDate: "2026-03-24",
        semanticChangeSummary: "2025 VAT pack.",
        machineReadableRules: {},
        humanReadableExplanation: [],
        testVectors: [],
        migrationNotes: []
      },
      {
        rulePackId: "vat-se-2026",
        rulePackCode: "SE-VAT-CORE",
        domain: "vat",
        jurisdiction: "SE",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        version: "2026.1",
        checksum: "vat-se-2026",
        sourceSnapshotDate: "2026-03-24",
        semanticChangeSummary: "2026 VAT pack.",
        machineReadableRules: {},
        humanReadableExplanation: [],
        testVectors: [],
        migrationNotes: []
      }
    ]
  });

  assert.equal(registry.resolveRulePack({ domain: "vat", jurisdiction: "SE", effectiveDate: "2025-12-31" }).rulePackId, "vat-se-2025");
  assert.equal(registry.resolveRulePack({ domain: "vat", jurisdiction: "SE", effectiveDate: "2026-01-01" }).rulePackId, "vat-se-2026");
});

test("phase 14 rulepack registry rejects ambiguous selection when multiple codes share one domain", () => {
  const registry = createRulePackRegistry({
    clock: () => new Date("2026-03-24T09:10:00Z"),
    seedRulePacks: [
      {
        rulePackId: "payroll-contrib-2026",
        rulePackCode: "SE-EMPLOYER-CONTRIBUTIONS",
        domain: "payroll",
        jurisdiction: "SE",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        version: "2026.1",
        checksum: "payroll-contrib-2026",
        sourceSnapshotDate: "2026-03-24",
        semanticChangeSummary: "Employer contributions pack.",
        machineReadableRules: {},
        humanReadableExplanation: [],
        testVectors: [],
        migrationNotes: []
      },
      {
        rulePackId: "payroll-tax-2026",
        rulePackCode: "SE-PAYROLL-TAX",
        domain: "payroll",
        jurisdiction: "SE",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        version: "2026.1",
        checksum: "payroll-tax-2026",
        sourceSnapshotDate: "2026-03-24",
        semanticChangeSummary: "Payroll tax pack.",
        machineReadableRules: {},
        humanReadableExplanation: [],
        testVectors: [],
        migrationNotes: []
      }
    ]
  });

  assert.throws(
    () => registry.resolveRulePack({ domain: "payroll", jurisdiction: "SE", effectiveDate: "2026-03-24" }),
    (error) => error?.code === "rule_pack_selection_ambiguous"
  );
  assert.equal(
    registry.resolveRulePack({
      domain: "payroll",
      jurisdiction: "SE",
      rulePackCode: "SE-PAYROLL-TAX",
      effectiveDate: "2026-03-24"
    }).rulePackId,
    "payroll-tax-2026"
  );
});

test("phase 14 rulepack registry can activate rollback overrides without rewriting historical versions", () => {
  const registry = createRulePackRegistry({
    clock: () => new Date("2026-03-24T09:20:00Z"),
    seedRulePacks: [
      {
        rulePackId: "automation-pack-v1",
        rulePackCode: "SE_AUTOMATION_CLASSIFY",
        domain: "automation",
        jurisdiction: "SE",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-02-01",
        version: "1",
        checksum: "automation-pack-v1",
        sourceSnapshotDate: "2026-03-24",
        semanticChangeSummary: "Initial automation pack.",
        machineReadableRules: {},
        humanReadableExplanation: [],
        testVectors: [],
        migrationNotes: []
      },
      {
        rulePackId: "automation-pack-v2",
        rulePackCode: "SE_AUTOMATION_CLASSIFY",
        domain: "automation",
        jurisdiction: "SE",
        effectiveFrom: "2026-02-01",
        effectiveTo: null,
        version: "2",
        checksum: "automation-pack-v2",
        sourceSnapshotDate: "2026-03-24",
        semanticChangeSummary: "Second automation pack.",
        machineReadableRules: {},
        humanReadableExplanation: [],
        testVectors: [],
        migrationNotes: []
      }
    ]
  });

  assert.equal(
    registry.resolveRulePack({ domain: "automation", jurisdiction: "SE", rulePackCode: "SE_AUTOMATION_CLASSIFY", effectiveDate: "2026-02-10" }).rulePackId,
    "automation-pack-v2"
  );

  const rollback = registry.rollbackRulePackVersion({
    rulePackId: "automation-pack-v1",
    effectiveFrom: "2026-02-15",
    actorId: "ops-user",
    reasonCode: "hotfix_revert",
    replayRequired: true
  });

  const resolved = registry.resolveRulePack({
    domain: "automation",
    jurisdiction: "SE",
    rulePackCode: "SE_AUTOMATION_CLASSIFY",
    effectiveDate: "2026-02-16"
  });
  assert.equal(resolved.rulePackId, "automation-pack-v1");
  assert.equal(resolved.selectionMode, "rollback_override");
  assert.equal(resolved.rollbackId, rollback.rollbackId);
});
