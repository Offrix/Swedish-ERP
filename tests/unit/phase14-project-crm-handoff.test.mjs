import test from "node:test";
import assert from "node:assert/strict";
import { createLedgerPlatform } from "../../packages/domain-ledger/src/index.mjs";
import { createVatPlatform } from "../../packages/domain-vat/src/index.mjs";
import { createArPlatform } from "../../packages/domain-ar/src/index.mjs";
import { createEvidencePlatform } from "../../packages/domain-evidence/src/index.mjs";
import { createProjectsPlatform } from "../../packages/domain-projects/src/index.mjs";
import { buildTestCompanyProfile } from "../helpers/company-profiles.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const AR_TEST_PLATFORM_OPTIONS = {
  companyProfilesById: {
    [COMPANY_ID]: buildTestCompanyProfile(COMPANY_ID)
  }
};

test("Phase 14.2 accepted quote handoff creates canonical project links, plans and status chain", () => {
  const { arPlatform, projectsPlatform, quote } = createQuoteHandoffFixture();

  const converted = projectsPlatform.convertQuoteToProject({
    companyId: COMPANY_ID,
    sourceQuoteId: quote.quoteId,
    projectCode: "P-14-2-UNIT",
    projectReferenceCode: "phase14-unit-handoff",
    externalSystemCode: "hubspot",
    externalOpportunityId: "deal-141",
    externalOpportunityRef: "Deal 141",
    workModelCode: "service_order",
    billingPlanFrequencyCode: "monthly",
    actorId: "unit-test"
  });

  assert.equal(converted.project.projectCode, "P-14-2-UNIT");
  assert.equal(converted.project.customerId, quote.customerId);
  assert.equal(converted.opportunityLink.externalSystemCode, "HUBSPOT");
  assert.equal(converted.quoteLink.sourceQuoteId, quote.quoteId);
  assert.equal(converted.agreement.projectQuoteLinkId, converted.quoteLink.projectQuoteLinkId);
  assert.equal(converted.agreement.customerId, quote.customerId);
  assert.equal(converted.engagement.externalQuoteRef, quote.quoteNo);
  assert.equal(converted.engagement.projectAgreementId, converted.agreement.projectAgreementId);
  assert.equal(converted.workModel.modelCode, "service_order");
  assert.equal(converted.workModel.operationalPackCode, "field_service");
  assert.equal(converted.workModel.requiresWorkOrders, true);
  assert.equal(converted.revenuePlan.status, "approved");
  assert.equal(converted.billingPlan.status, "active");
  assert.equal(converted.statusUpdate.healthCode, "green");

  const workspace = projectsPlatform.getProjectWorkspace({
    companyId: COMPANY_ID,
    projectId: converted.project.projectId,
    cutoffDate: converted.project.startsOn
  });
  assert.equal(workspace.opportunityLinkCount, 1);
  assert.equal(workspace.quoteLinkCount, 1);
  assert.equal(workspace.agreementCount, 1);
  assert.equal(workspace.signedAgreementCount, 1);
  assert.equal(workspace.billingPlanCount, 1);
  assert.equal(workspace.engagementCount, 1);
  assert.equal(workspace.currentProjectAgreementId, converted.agreement.projectAgreementId);
  assert.equal(workspace.customerContext.customerId, quote.customerId);
  assert.equal(workspace.customerContext.activeQuoteRef, quote.quoteNo);
  assert.equal(workspace.currentBillingPlan.status, "active");
  assert.equal(workspace.projectBillingPlans[0].frequencyCode, "MONTHLY");
  assert.equal(workspace.projectStatusUpdates.length, 1);
  assert.deepEqual(workspace.verticalIsolationSummary, {
    financeTruthOwner: "projects",
    generalWorkModelCount: 0,
    verticalWorkModelCount: 1,
    verticalPackCodes: ["field_service"]
  });

  const evidenceBundle = projectsPlatform.exportProjectEvidenceBundle({
    companyId: COMPANY_ID,
    projectId: converted.project.projectId,
    cutoffDate: converted.project.startsOn,
    actorId: "unit-test"
  });
  assert.equal(evidenceBundle.projectOpportunityLinks.length, 1);
  assert.equal(evidenceBundle.projectQuoteLinks.length, 1);
  assert.equal(evidenceBundle.projectAgreements.length, 1);
  assert.equal(evidenceBundle.projectBillingPlans.length, 1);
  assert.equal(evidenceBundle.projectStatusUpdates.length, 1);

  const auditActions = projectsPlatform
    .listProjectAuditEvents({
      companyId: COMPANY_ID,
      projectId: converted.project.projectId
    })
    .map((event) => event.action);
  for (const requiredAction of [
    "project.opportunity_link.created",
    "project.quote_link.created",
    "project.agreement.created",
    "project.engagement.created",
    "project.billing_plan.created",
    "project.status_update.created",
    "project.quote_handoff.completed"
  ]) {
    assert.equal(auditActions.includes(requiredAction), true, `${requiredAction} should be audited`);
  }

  const duplicate = projectsPlatform.convertQuoteToProject({
    companyId: COMPANY_ID,
    sourceQuoteId: quote.quoteId,
    actorId: "unit-test"
  });
  assert.equal(duplicate.project.projectId, converted.project.projectId);
});

function createQuoteHandoffFixture() {
  const clock = () => new Date("2026-04-12T09:00:00Z");
  const ledgerPlatform = createLedgerPlatform({ clock });
  ledgerPlatform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "unit-test"
  });
  const vatPlatform = createVatPlatform({
    clock,
    bootstrapScenarioCode: "test_default_demo",
    ledgerPlatform
  });
  const arPlatform = createArPlatform({
    clock,
    vatPlatform,
    ledgerPlatform,
    ...AR_TEST_PLATFORM_OPTIONS
  });
  const evidencePlatform = createEvidencePlatform({ clock });
  const projectsPlatform = createProjectsPlatform({
    clock,
    seedDemo: false,
    arPlatform,
    evidencePlatform
  });
  const customer = arPlatform.createCustomer({
    companyId: COMPANY_ID,
    legalName: "CRM Handoff Customer AB",
    organizationNumber: "5566778899",
    countryCode: "SE",
    languageCode: "SV",
    currencyCode: "SEK",
    paymentTermsCode: "NET30",
    invoiceDeliveryMethod: "pdf_email",
    reminderProfileCode: "standard",
    billingAddress: {
      line1: "Kundgatan 1",
      postalCode: "11157",
      city: "Stockholm",
      countryCode: "SE"
    },
    deliveryAddress: {
      line1: "Kundgatan 1",
      postalCode: "11157",
      city: "Stockholm",
      countryCode: "SE"
    }
  });
  const item = arPlatform.createItem({
    companyId: COMPANY_ID,
    description: "Managed service package",
    itemType: "service",
    unitCode: "month",
    standardPrice: 15000,
    revenueAccountNumber: "3010",
    vatCode: "VAT_SE_DOMESTIC_25",
    recurringFlag: true
  });
  const quote = arPlatform.createQuote({
    companyId: COMPANY_ID,
    customerId: customer.customerId,
    title: "Managed operations retainer",
    validUntil: "2026-05-31",
    currencyCode: "SEK",
    lines: [{ itemId: item.arItemId, quantity: 2 }]
  });
  arPlatform.transitionQuote({
    companyId: COMPANY_ID,
    quoteId: quote.quoteId,
    targetStatus: "sent"
  });
  arPlatform.transitionQuote({
    companyId: COMPANY_ID,
    quoteId: quote.quoteId,
    targetStatus: "accepted"
  });
  return {
    arPlatform,
    projectsPlatform,
    quote: arPlatform.getQuote({
      companyId: COMPANY_ID,
      quoteId: quote.quoteId
    })
  };
}
