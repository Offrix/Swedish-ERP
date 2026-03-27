import test from "node:test";
import assert from "node:assert/strict";
import { createProviderBaselineRegistry } from "../../packages/rule-engine/src/index.mjs";
import { createExplicitDemoApiPlatform } from "../helpers/demo-platform.mjs";

test("phase 5.2 provider baseline registry resolves effective-dated provider formats by code and provider", () => {
  const registry = createProviderBaselineRegistry({
    clock: () => new Date("2026-03-27T08:00:00Z"),
    seedProviderBaselines: [
      {
        providerBaselineId: "peppol-2025",
        baselineCode: "SE-PEPPOL-BIS-BILLING-3",
        providerCode: "pagero_online",
        domain: "integrations",
        jurisdiction: "SE",
        formatFamily: "peppol_bis_billing_3",
        effectiveFrom: "2025-01-01",
        effectiveTo: "2026-01-01",
        version: "2025.1",
        specVersion: "3.0",
        checksum: "peppol-2025",
        sourceSnapshotDate: "2026-03-27",
        semanticChangeSummary: "2025 Peppol baseline."
      },
      {
        providerBaselineId: "peppol-2026",
        baselineCode: "SE-PEPPOL-BIS-BILLING-3",
        providerCode: "pagero_online",
        domain: "integrations",
        jurisdiction: "SE",
        formatFamily: "peppol_bis_billing_3",
        effectiveFrom: "2026-01-01",
        version: "2026.1",
        specVersion: "3.0",
        checksum: "peppol-2026",
        sourceSnapshotDate: "2026-03-27",
        semanticChangeSummary: "2026 Peppol baseline."
      }
    ]
  });

  assert.equal(
    registry.resolveProviderBaseline({
      domain: "integrations",
      jurisdiction: "SE",
      providerCode: "pagero_online",
      baselineCode: "SE-PEPPOL-BIS-BILLING-3",
      effectiveDate: "2025-12-31"
    }).providerBaselineId,
    "peppol-2025"
  );
  const resolved = registry.resolveProviderBaseline({
    domain: "integrations",
    jurisdiction: "SE",
    providerCode: "pagero_online",
    baselineCode: "SE-PEPPOL-BIS-BILLING-3",
    effectiveDate: "2026-01-01"
  });
  assert.equal(resolved.providerBaselineId, "peppol-2026");
  const ref = registry.buildProviderBaselineRef({
    effectiveDate: "2026-01-01",
    providerBaseline: resolved,
    metadata: { channel: "peppol" }
  });
  assert.equal(ref.providerBaselineId, "peppol-2026");
  assert.equal(ref.metadata.channel, "peppol");
});

test("phase 5.2 provider baseline registry rejects overlapping published versions and supports rollback overrides", () => {
  const registry = createProviderBaselineRegistry({
    clock: () => new Date("2026-03-27T08:15:00Z"),
    seedProviderBaselines: [
      {
        providerBaselineId: "bank-file-2026.1",
        baselineCode: "SE-BANK-FILE-FORMAT",
        providerCode: "bank_file_channel",
        domain: "integrations",
        jurisdiction: "SE",
        formatFamily: "bank_file_format",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-06-01",
        version: "2026.1",
        specVersion: "1.0",
        checksum: "bank-file-2026.1",
        sourceSnapshotDate: "2026-03-27",
        semanticChangeSummary: "Original bank file baseline."
      },
      {
        providerBaselineId: "bank-file-2026.2",
        baselineCode: "SE-BANK-FILE-FORMAT",
        providerCode: "bank_file_channel",
        domain: "integrations",
        jurisdiction: "SE",
        formatFamily: "bank_file_format",
        effectiveFrom: "2026-06-01",
        version: "2026.2",
        specVersion: "1.1",
        checksum: "bank-file-2026.2",
        sourceSnapshotDate: "2026-03-27",
        semanticChangeSummary: "Revised bank file baseline."
      }
    ]
  });

  assert.throws(
    () =>
      registry.registerProviderBaseline({
        providerBaselineId: "bank-file-overlap",
        baselineCode: "SE-BANK-FILE-FORMAT",
        providerCode: "bank_file_channel",
        domain: "integrations",
        jurisdiction: "SE",
        formatFamily: "bank_file_format",
        effectiveFrom: "2026-05-15",
        version: "2026.x",
        specVersion: "1.2",
        sourceSnapshotDate: "2026-03-27",
        semanticChangeSummary: "Invalid overlap."
      }),
    (error) => error?.code === "provider_baseline_effective_interval_overlaps"
  );

  const rollback = registry.rollbackProviderBaselineVersion({
    providerBaselineId: "bank-file-2026.1",
    effectiveFrom: "2026-06-15",
    actorId: "ops-user",
    reasonCode: "provider_regression",
    replayRequired: true
  });
  const resolved = registry.resolveProviderBaseline({
    domain: "integrations",
    jurisdiction: "SE",
    providerCode: "bank_file_channel",
    baselineCode: "SE-BANK-FILE-FORMAT",
    effectiveDate: "2026-06-16"
  });
  assert.equal(resolved.providerBaselineId, "bank-file-2026.1");
  assert.equal(resolved.selectionMode, "rollback_override");
  assert.equal(resolved.rollbackId, rollback.rollbackId);
});

test("phase 5.2 shared runtime provider baseline registry exposes annual, auth and integration baselines", () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-27T09:00:00Z")
  });

  const codes = platform.providerBaselineRegistry
    .listProviderBaselines({ jurisdiction: "SE" })
    .map((entry) => entry.baselineCode)
    .sort();

  assert.equal(codes.includes("SE-BANKID-RP-API"), true);
  assert.equal(codes.includes("SE-PEPPOL-BIS-BILLING-3"), true);
  assert.equal(codes.includes("SE-SRU-FILE"), true);
  assert.equal(codes.includes("SE-IXBRL-FILING"), true);
});
