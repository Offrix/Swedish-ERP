import crypto from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Step 7 API manages accounting methods, change requests and cash-method year-end catch-up", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2027-01-05T09:00:00Z")
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
    platform.installVatCatalog({
      companyId: DEMO_IDS.companyId,
      actorId: "tester"
    });
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "accounting-method-field@example.test",
      displayName: "Accounting Method Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "accounting-method-field@example.test"
    });

    const seededActive = await requestJson(
      baseUrl,
      `/v1/accounting-method/active?companyId=${DEMO_IDS.companyId}&accountingDate=2026-03-01`,
      { token: adminToken }
    );
    assert.equal(seededActive.methodCode, "FAKTURERINGSMETOD");

    const ineligibleAssessment = await requestJson(baseUrl, "/v1/accounting-method/eligibility-assessments", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        annualNetTurnoverSek: 4_100_000,
        legalFormCode: "AB"
      }
    });
    assert.equal(ineligibleAssessment.eligibleForCashMethod, false);

    const eligibleAssessment = await requestJson(baseUrl, "/v1/accounting-method/eligibility-assessments", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        annualNetTurnoverSek: 950_000,
        legalFormCode: "AB"
      }
    });
    assert.equal(eligibleAssessment.eligibleForCashMethod, true);

    const disallowedCashProfileResponse = await fetch(`${baseUrl}/v1/accounting-method/profiles`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminToken}`,        "idempotency-key": crypto.randomUUID(),
        "content-type": "application/json"
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        methodCode: "KONTANTMETOD",
        effectiveFrom: "2025-01-01",
        fiscalYearStartDate: "2025-01-01",
        eligibilityAssessmentId: ineligibleAssessment.assessmentId,
        onboardingOverride: true
      })
    });
    const disallowedCashProfilePayload = await disallowedCashProfileResponse.json();
    assert.equal(disallowedCashProfileResponse.status, 409);
    assert.equal(disallowedCashProfilePayload.error, "cash_method_not_eligible");

    const changeRequest = await requestJson(baseUrl, "/v1/accounting-method/change-requests", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        requestedMethodCode: "KONTANTMETOD",
        requestedEffectiveFrom: "2027-01-01",
        fiscalYearStartDate: "2027-01-01",
        reasonCode: "METHOD_CHANGE"
      }
    });
    const approvedChangeRequest = await requestJson(
      baseUrl,
      `/v1/accounting-method/change-requests/${changeRequest.methodChangeRequestId}/approve`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId,
          decisionNote: "Approved for the new fiscal year."
        }
      }
    );
    assert.equal(approvedChangeRequest.status, "approved");

    const plannedCashProfile = await requestJson(baseUrl, "/v1/accounting-method/profiles", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        methodCode: "KONTANTMETOD",
        effectiveFrom: "2027-01-01",
        fiscalYearStartDate: "2027-01-01",
        eligibilityAssessmentId: eligibleAssessment.assessmentId,
        methodChangeRequestId: changeRequest.methodChangeRequestId
      }
    });
    const activatedCashProfile = await requestJson(
      baseUrl,
      `/v1/accounting-method/profiles/${plannedCashProfile.methodProfileId}/activate`,
      {
        method: "POST",
        token: adminToken,
        body: { companyId: DEMO_IDS.companyId }
      }
    );
    assert.equal(activatedCashProfile.status, "active");

    const currentActive = await requestJson(
      baseUrl,
      `/v1/accounting-method/active?companyId=${DEMO_IDS.companyId}&accountingDate=2027-01-05`,
      { token: adminToken }
    );
    assert.equal(currentActive.methodCode, "KONTANTMETOD");

    const fiscalYearProfile = platform.createFiscalYearProfile({
      companyId: DEMO_IDS.companyId,
      legalFormCode: "AKTIEBOLAG",
      actorId: "tester"
    });
    const fiscalYear = platform.createFiscalYear({
      companyId: DEMO_IDS.companyId,
      fiscalYearProfileId: fiscalYearProfile.fiscalYearProfileId,
      startDate: "2027-01-01",
      endDate: "2027-12-31",
      approvalBasisCode: "BASELINE",
      actorId: "tester"
    });
    platform.activateFiscalYear({
      companyId: DEMO_IDS.companyId,
      fiscalYearId: fiscalYear.fiscalYearId,
      actorId: "tester"
    });

    const catchUpRun = await requestJson(baseUrl, "/v1/accounting-method/year-end-catch-up-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        fiscalYearEndDate: "2027-12-31",
        openItems: [
          {
            openItemType: "customer_invoice",
            sourceId: "inv_2027_1",
            unpaidAmount: 1000,
            recognitionDate: "2027-12-20",
            openItemAccountNumber: "1210",
            vatTransactionLine: buildYearEndCatchUpVatTransactionLine({
              supply_type: "sale",
              goods_or_services: "goods",
              invoice_date: "2027-12-20",
              line_amount_ex_vat: 800,
              vat_rate: 25,
              tax_rate_candidate: 25,
              vat_code_candidate: "VAT_SE_DOMESTIC_25",
              report_box_code: "05"
            }),
            postingLines: [
              {
                accountNumber: "3010",
                creditAmount: 800
              },
              {
                accountNumber: "2610",
                creditAmount: 200
              }
            ]
          },
          {
            openItemType: "supplier_invoice",
            sourceId: "sup_2027_1",
            unpaidAmount: 400,
            recognitionDate: "2027-12-21",
            openItemAccountNumber: "2410",
            vatTransactionLine: buildYearEndCatchUpVatTransactionLine({
              supply_type: "purchase",
              goods_or_services: "services",
              invoice_date: "2027-12-21",
              line_amount_ex_vat: 320,
              vat_rate: 25,
              tax_rate_candidate: 25,
              vat_code_candidate: "VAT_SE_DOMESTIC_PURCHASE_25",
              report_box_code: "48"
            }),
            postingLines: [
              {
                accountNumber: "5410",
                debitAmount: 320
              },
              {
                accountNumber: "2640",
                debitAmount: 80
              }
            ]
          }
        ]
      }
    });
    const replayCatchUpRun = await requestJson(baseUrl, "/v1/accounting-method/year-end-catch-up-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        fiscalYearEndDate: "2027-12-31",
        openItems: [
          {
            openItemType: "customer_invoice",
            sourceId: "inv_2027_1",
            unpaidAmount: 1000,
            recognitionDate: "2027-12-20",
            openItemAccountNumber: "1210",
            vatTransactionLine: buildYearEndCatchUpVatTransactionLine({
              supply_type: "sale",
              goods_or_services: "goods",
              invoice_date: "2027-12-20",
              line_amount_ex_vat: 800,
              vat_rate: 25,
              tax_rate_candidate: 25,
              vat_code_candidate: "VAT_SE_DOMESTIC_25",
              report_box_code: "05"
            }),
            postingLines: [
              {
                accountNumber: "3010",
                creditAmount: 800
              },
              {
                accountNumber: "2610",
                creditAmount: 200
              }
            ]
          },
          {
            openItemType: "supplier_invoice",
            sourceId: "sup_2027_1",
            unpaidAmount: 400,
            recognitionDate: "2027-12-21",
            openItemAccountNumber: "2410",
            vatTransactionLine: buildYearEndCatchUpVatTransactionLine({
              supply_type: "purchase",
              goods_or_services: "services",
              invoice_date: "2027-12-21",
              line_amount_ex_vat: 320,
              vat_rate: 25,
              tax_rate_candidate: 25,
              vat_code_candidate: "VAT_SE_DOMESTIC_PURCHASE_25",
              report_box_code: "48"
            }),
            postingLines: [
              {
                accountNumber: "5410",
                debitAmount: 320
              },
              {
                accountNumber: "2640",
                debitAmount: 80
              }
            ]
          }
        ]
      }
    });
    assert.equal(catchUpRun.yearEndCatchUpRunId, replayCatchUpRun.yearEndCatchUpRunId);
    assert.equal(typeof catchUpRun.journalEntryId, "string");
    assert.equal(catchUpRun.vatDecisionIds.length, 2);
    assert.equal(catchUpRun.items[0].vatDecisionIds.length, 1);
    assert.equal(catchUpRun.items[1].vatDecisionIds.length, 1);
    const decemberBasisAfterCatchUp = platform.getVatDeclarationBasis({
      companyId: DEMO_IDS.companyId,
      fromDate: "2027-12-01",
      toDate: "2027-12-31"
    });

    const reversedCatchUpRun = await requestJson(
      baseUrl,
      `/v1/accounting-method/year-end-catch-up-runs/${catchUpRun.yearEndCatchUpRunId}/reverse`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId,
          reasonCode: "year_end_adjustment_reversal",
          approvedByActorId: "finance-approver",
          approvedByRoleCode: "finance_manager"
        }
      }
    );
    assert.equal(reversedCatchUpRun.status, "reversed");
    assert.equal(typeof reversedCatchUpRun.reversalJournalEntryId, "string");
    assert.equal(reversedCatchUpRun.reversalVatDecisionIds.length, 2);
    const decemberBasisAfterReversal = platform.getVatDeclarationBasis({
      companyId: DEMO_IDS.companyId,
      fromDate: "2027-12-01",
      toDate: "2027-12-31"
    });
    assert.equal(decemberBasisAfterCatchUp.decisionCount, 2);
    assert.equal(decemberBasisAfterCatchUp.declarationEligibleDecisionCount, 2);
    assert.deepEqual(decemberBasisAfterCatchUp.declarationBoxSummary, [
      { boxCode: "05", amount: 800, amountType: "taxable_base" },
      { boxCode: "10", amount: 200, amountType: "output_vat" },
      { boxCode: "48", amount: 80, amountType: "input_vat" }
    ]);
    assert.equal(decemberBasisAfterReversal.decisionCount, 4);
    assert.equal(decemberBasisAfterReversal.declarationEligibleDecisionCount, 4);
    assert.deepEqual(decemberBasisAfterReversal.declarationBoxSummary, [
      { boxCode: "05", amount: 0, amountType: "taxable_base" },
      { boxCode: "10", amount: 0, amountType: "output_vat" },
      { boxCode: "48", amount: 0, amountType: "input_vat" }
    ]);

    const history = await requestJson(baseUrl, `/v1/accounting-method/history?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(history.profiles.length >= 2, true);
    assert.equal(history.changeRequests.some((item) => item.status === "implemented"), true);

    const forbiddenHistory = await fetch(`${baseUrl}/v1/accounting-method/history?companyId=${DEMO_IDS.companyId}`, {
      headers: {
        authorization: `Bearer ${fieldUserToken}`
      }
    });
    assert.equal(forbiddenHistory.status, 403);
    await forbiddenHistory.json();
  } finally {
    await stopServer(server);
  }
});

test("Step 7 API requires fiscal-year boundary metadata and supersedes earlier method change requests", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2027-01-05T09:00:00Z")
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

    const missingBoundaryResponse = await fetch(`${baseUrl}/v1/accounting-method/change-requests`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminToken}`,        "idempotency-key": crypto.randomUUID(),
        "content-type": "application/json"
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        requestedMethodCode: "KONTANTMETOD",
        requestedEffectiveFrom: "2027-01-01",
        reasonCode: "METHOD_CHANGE"
      })
    });
    const missingBoundaryPayload = await missingBoundaryResponse.json();
    assert.equal(missingBoundaryResponse.status, 409);
    assert.equal(missingBoundaryPayload.error, "method_change_request_fiscal_year_start_required");

    const firstRequest = await requestJson(baseUrl, "/v1/accounting-method/change-requests", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        requestedMethodCode: "KONTANTMETOD",
        requestedEffectiveFrom: "2027-01-01",
        fiscalYearStartDate: "2027-01-01",
        reasonCode: "METHOD_CHANGE"
      }
    });
    const secondRequest = await requestJson(baseUrl, "/v1/accounting-method/change-requests", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        requestedMethodCode: "KONTANTMETOD",
        requestedEffectiveFrom: "2027-01-01",
        fiscalYearStartDate: "2027-01-01",
        reasonCode: "METHOD_CHANGE_REVISED"
      }
    });
    const history = await requestJson(baseUrl, `/v1/accounting-method/history?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const superseded = history.changeRequests.find((request) => request.methodChangeRequestId === firstRequest.methodChangeRequestId);
    const active = history.changeRequests.find((request) => request.methodChangeRequestId === secondRequest.methodChangeRequestId);

    assert.equal(superseded.status, "superseded");
    assert.equal(superseded.supersededByMethodChangeRequestId, secondRequest.methodChangeRequestId);
    assert.equal(active.status, "submitted");
  } finally {
    await stopServer(server);
  }
});

function buildYearEndCatchUpVatTransactionLine(overrides = {}) {
  return {
    seller_country: "SE",
    seller_vat_registration_country: "SE",
    buyer_country: "SE",
    buyer_type: "business",
    buyer_vat_no: "SE556677889901",
    buyer_is_taxable_person: true,
    buyer_vat_number: "SE556677889901",
    buyer_vat_number_status: "valid",
    supply_type: "sale",
    goods_or_services: "goods",
    supply_subtype: "standard",
    property_related_flag: false,
    construction_service_flag: false,
    transport_end_country: "SE",
    import_flag: false,
    export_flag: false,
    reverse_charge_flag: false,
    oss_flag: false,
    ioss_flag: false,
    currency: "SEK",
    tax_date: "2027-12-31",
    invoice_date: "2027-12-31",
    delivery_date: "2027-12-31",
    prepayment_date: null,
    line_amount_ex_vat: 800,
    line_discount: 0,
    line_quantity: 1,
    line_uom: "ea",
    vat_rate: 25,
    tax_rate_candidate: 25,
    vat_code_candidate: "VAT_SE_DOMESTIC_25",
    exemption_reason: "not_applicable",
    invoice_text_code: "domestic_standard",
    report_box_code: "05",
    ...overrides
  };
}
