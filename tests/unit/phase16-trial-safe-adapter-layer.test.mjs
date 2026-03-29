import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import {
  HUBSPOT_CRM_PROVIDER_CODE,
  SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE,
  STRIPE_PAYMENT_LINKS_PROVIDER_CODE
} from "../../packages/domain-integrations/src/index.mjs";

test("Phase 16.7 manifests and connections carry explicit receipt modes across trial and production", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-30T00:10:00Z"),
    runtimeMode: "trial"
  });

  const paymentManifests = platform.listAdapterCapabilityManifests({ surfaceCode: "payment_link" });
  const stripeManifest = paymentManifests.find((item) => item.providerCode === STRIPE_PAYMENT_LINKS_PROVIDER_CODE);
  assert.ok(stripeManifest);
  assert.equal(stripeManifest.receiptModePolicy.trial, "trial_simulated");
  assert.equal(stripeManifest.receiptModePolicy.production, "provider_receipt_required");

  const crmManifests = platform.listAdapterCapabilityManifests({ surfaceCode: "crm_handoff" });
  const hubspotManifest = crmManifests.find((item) => item.providerCode === HUBSPOT_CRM_PROVIDER_CODE);
  assert.ok(hubspotManifest);
  assert.equal(hubspotManifest.receiptModePolicy.trial, "trial_simulated");
  assert.equal(hubspotManifest.receiptModePolicy.production, "internal_audit_only");

  const partnerManifests = platform.listAdapterCapabilityManifests({ surfaceCode: "partner" });
  const bankingManifest = partnerManifests.find((item) => item.providerCode === "enable_banking");
  assert.ok(bankingManifest);
  assert.equal(bankingManifest.receiptModePolicy.trial, "trial_simulated");
  assert.equal(bankingManifest.receiptModePolicy.production, "provider_receipt_required");

  const trialStripeConnection = platform.createIntegrationConnection({
    companyId: DEMO_IDS.companyId,
    surfaceCode: "payment_link",
    connectionType: "payment_link",
    providerCode: STRIPE_PAYMENT_LINKS_PROVIDER_CODE,
    displayName: "Trial Stripe",
    environmentMode: "trial",
    credentialsRef: "secret://stripe/trial",
    secretManagerRef: "vault://stripe/trial",
    actorId: "phase16-7-unit"
  });
  assert.equal(trialStripeConnection.receiptMode, "trial_simulated");
  assert.equal(trialStripeConnection.supportsLegalEffect, false);
  assert.equal(trialStripeConnection.providerEnvironmentRef, "trial_safe");

  const trialStripeHealth = platform.runIntegrationHealthCheck({
    companyId: DEMO_IDS.companyId,
    connectionId: trialStripeConnection.connectionId,
    actorId: "phase16-7-unit"
  });
  assert.equal(
    trialStripeHealth.results.some((result) => result.checkCode === "trial_receipt_mode" && result.status === "passed"),
    true
  );

  const productionStripeConnection = platform.createIntegrationConnection({
    companyId: DEMO_IDS.companyId,
    surfaceCode: "payment_link",
    connectionType: "payment_link",
    providerCode: STRIPE_PAYMENT_LINKS_PROVIDER_CODE,
    displayName: "Production Stripe",
    environmentMode: "production",
    credentialsRef: "secret://stripe/prod",
    secretManagerRef: "vault://stripe/prod",
    actorId: "phase16-7-unit"
  });
  assert.equal(productionStripeConnection.receiptMode, "provider_receipt_required");
  assert.equal(productionStripeConnection.supportsLegalEffect, true);

  const productionHubspotConnection = platform.createIntegrationConnection({
    companyId: DEMO_IDS.companyId,
    surfaceCode: "crm_handoff",
    connectionType: "crm_handoff",
    providerCode: HUBSPOT_CRM_PROVIDER_CODE,
    displayName: "Production HubSpot",
    environmentMode: "production",
    credentialsRef: "secret://hubspot/prod",
    secretManagerRef: "vault://hubspot/prod",
    actorId: "phase16-7-unit"
  });
  assert.equal(productionHubspotConnection.receiptMode, "internal_audit_only");
  assert.equal(productionHubspotConnection.supportsLegalEffect, false);

  assert.throws(
    () =>
      platform.createIntegrationConnection({
        companyId: DEMO_IDS.companyId,
        surfaceCode: "evidence_archive",
        connectionType: "signing_evidence_archive",
        providerCode: SIGNICAT_SIGNING_ARCHIVE_PROVIDER_CODE,
        displayName: "Trial signing archive",
        environmentMode: "trial",
        credentialsRef: "secret://signing-archive/trial",
        secretManagerRef: "vault://signing-archive/trial",
        actorId: "phase16-7-unit"
      }),
    (error) => error?.code === "integration_environment_mode_not_supported"
  );
});
