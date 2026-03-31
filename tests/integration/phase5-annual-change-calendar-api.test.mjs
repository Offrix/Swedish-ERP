import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 5.4 API drives regulatory annual change calendar with dual approvals, staged publish and rollback", async () => {
  let currentTime = "2026-03-27T12:00:00Z";
  const platform = createApiPlatform({
    clock: () => new Date(currentTime)
  });
  const providerBaseline = platform.providerBaselineRegistry.createDraftProviderBaselineVersion({
    providerBaselineId: "peppol-phase5-4-2026.2",
    baselineCode: "SE-PEPPOL-BIS-BILLING-3-STAGED",
    providerCode: "pagero_online",
    domain: "integrations",
    jurisdiction: "SE",
    formatFamily: "peppol_bis_billing_3",
    effectiveFrom: "2026-07-01",
    version: "2026.2",
    specVersion: "3.0",
    checksum: "peppol-phase5-4-2026.2",
    sourceSnapshotDate: "2026-03-27",
    sourceRefs: [
      {
        url: "https://example.test/peppol/2026.2",
        checksum: "peppol-source-2026.2"
      }
    ],
    testVectors: [{ vectorId: "peppol-outbound-2026-2", expectedEnvelope: "2026.2" }],
    semanticChangeSummary: "Peppol baseline update 2026.2."
  });
  const vatRulePack = platform.domains.vat.rulePackGovernance.createDraftRulePackVersion({
    rulePackId: "vat-phase5-4-api-2026.2",
    rulePackCode: "SE-VAT-RULES",
    domain: "vat",
    jurisdiction: "SE",
    effectiveFrom: "2026-07-01",
    version: "2026.2",
    checksum: "vat-phase5-4-api-2026.2",
    semanticChangeSummary: "VAT rulepack update 2026.2.",
    machineReadableRules: { boxMappings: [{ boxCode: "05", accountNumber: "3001" }] },
    humanReadableExplanation: ["VAT update 2026.2"],
    sourceRefs: [
      {
        url: "https://example.test/skv/vat-2026.2",
        checksum: "vat-source-2026.2"
      }
    ],
    testVectors: [{ vectorId: "golden-vat-2026-2", expectedBox: "05" }]
  });

  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase5-4-second-admin@example.test",
      displayName: "Phase 5.4 Second Admin",
      roleCode: "company_admin"
    });
    const approverToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase5-4-second-admin@example.test"
    });

    const created = await requestJson(baseUrl, "/v1/ops/rule-governance/changes", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        targetType: "provider_baseline",
        targetId: providerBaseline.providerBaselineId,
        changeSummary: "Peppol annual baseline 2026.2",
        reasonCode: "annual_peppol_change",
        stagedPublishAt: "2026-03-27T14:00:00Z",
        idempotencyKey: "phase5-4-api-peppol-change"
      }
    });
    assert.equal(created.status, "planned");

    await requestJson(baseUrl, `/v1/ops/rule-governance/changes/${created.regulatoryChangeEntryId}/source-snapshots`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        officialSourceRefs: [
          {
            sourceRefId: "release-notes",
            sourceType: "official_release_notes",
            url: "https://example.test/peppol/2026.2",
            checksum: "peppol-source-2026.2",
            retrievedAt: "2026-03-27T12:05:00Z",
            sourceSnapshotDate: "2026-03-27"
          },
          {
            sourceRefId: "schema-zip",
            sourceType: "official_schema",
            url: "https://example.test/peppol/2026.2/schema.zip",
            checksum: "peppol-schema-2026.2",
            retrievedAt: "2026-03-27T12:06:00Z",
            sourceSnapshotDate: "2026-03-27"
          }
        ]
      }
    });
    const sourced = await requestJson(baseUrl, `/v1/ops/rule-governance/changes/${created.regulatoryChangeEntryId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(sourced.sourceSnapshot.officialSourceRefs.length, 2);
    assert.deepEqual(
      sourced.sourceSnapshot.officialSourceRefs.map((item) => item.sourceType),
      ["official_release_notes", "official_schema"]
    );
    assert.equal(sourced.sourceSnapshot.sourceChecksum, "peppol-source-2026.2");
    await requestJson(baseUrl, `/v1/ops/rule-governance/changes/${created.regulatoryChangeEntryId}/diff-review`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        diffSummary: "Envelope update and stricter validation.",
        impactSummary: "Outgoing Peppol invoices need new checksum handling.",
        approved: true,
        breakingChangeRefs: ["invoice-envelope-2026.2"]
      }
    });
    await requestJson(baseUrl, `/v1/ops/rule-governance/changes/${created.regulatoryChangeEntryId}/sandbox-verification`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        verificationResult: "passed",
        verificationEnvironment: "provider_sandbox",
        scenarioRefs: ["peppol-outbound-2026-2"],
        outputChecksum: "sandbox-peppol-2026.2"
      }
    });
    await requestJson(baseUrl, `/v1/ops/rule-governance/changes/${created.regulatoryChangeEntryId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        approvalRole: "domain_owner",
        approvalRef: "domain-owner-signoff"
      }
    });
    await requestJson(baseUrl, `/v1/ops/rule-governance/changes/${created.regulatoryChangeEntryId}/approve`, {
      method: "POST",
      token: approverToken,
      body: {
        companyId: DEMO_IDS.companyId,
        approvalRole: "compliance_owner",
        approvalRef: "compliance-signoff"
      }
    });

    const earlyPublish = await requestJson(baseUrl, `/v1/ops/rule-governance/changes/${created.regulatoryChangeEntryId}/publish`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(earlyPublish.error, "regulatory_change_staged_publish_pending");

    currentTime = "2026-03-27T14:05:00Z";
    const published = await requestJson(baseUrl, `/v1/ops/rule-governance/changes/${created.regulatoryChangeEntryId}/publish`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(published.status, "published");
    assert.equal(
      platform.providerBaselineRegistry.getProviderBaseline({ providerBaselineId: providerBaseline.providerBaselineId }).status,
      "published"
    );

    const rolledBack = await requestJson(baseUrl, `/v1/ops/rule-governance/changes/${created.regulatoryChangeEntryId}/rollback`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        effectiveFrom: "2026-07-15",
        reasonCode: "provider_regression",
        replayRequired: true
      }
    });
    assert.equal(rolledBack.status, "rollback_activated");

    const listed = await requestJson(baseUrl, `/v1/ops/rule-governance/changes?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(listed.snapshot.rollbackCount, 1);
    assert.equal(listed.items.some((entry) => entry.regulatoryChangeEntryId === created.regulatoryChangeEntryId), true);

    const vatChange = await requestJson(baseUrl, "/v1/ops/rule-governance/changes", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        targetType: "rule_pack",
        targetKey: "vat",
        targetId: vatRulePack.rulePackId,
        changeSummary: "VAT annual update 2026.2",
        reasonCode: "annual_vat_change"
      }
    });
    const fetched = await requestJson(baseUrl, `/v1/ops/rule-governance/changes/${vatChange.regulatoryChangeEntryId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(fetched.targetType, "rule_pack");
    assert.equal(fetched.targetKey, "vat");
  } finally {
    await stopServer(server);
  }
});
