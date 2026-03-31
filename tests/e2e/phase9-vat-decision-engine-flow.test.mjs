import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000041";

test("Phase 9.3 e2e flow resolves VAT review blockers, locks the declaration period and reopens it for corrections", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T10:20:00Z")
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true,
      phase4VatEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: { companyId: COMPANY_ID }
    });

    await requestJson(baseUrl, "/v1/vat/decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase9-3-e2e-domestic"
        })
      }
    });

    const ledgerEntry = await requestJson(baseUrl, "/v1/ledger/journal-entries", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        journalDate: "2026-03-21",
        voucherSeriesCode: "B",
        sourceType: "AR_INVOICE",
        sourceId: "phase9-3-e2e-domestic",
        idempotencyKey: "phase9-3-e2e-domestic",
        description: "Phase 9.3 e2e VAT basis",
        lines: [
          { accountNumber: "1510", debitAmount: 1250 },
          { accountNumber: "3010", creditAmount: 1000 },
          { accountNumber: "2610", creditAmount: 250 }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/ledger/journal-entries/${ledgerEntry.journalEntry.journalEntryId}/validate`, {
      method: "POST",
      token: sessionToken,
      body: { companyId: COMPANY_ID }
    });
    await requestJson(baseUrl, `/v1/ledger/journal-entries/${ledgerEntry.journalEntry.journalEntryId}/post`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        approvedByActorId: "finance-approver",
        approvedByRoleCode: "finance_manager"
      }
    });

    const review = await requestJson(baseUrl, "/v1/vat/decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase9-3-e2e-review",
          line_quantity: null
        })
      }
    });

    const blockedBasis = await requestJson(
      baseUrl,
      `/v1/vat/declaration-basis?companyId=${COMPANY_ID}&fromDate=2026-03-01&toDate=2026-03-31`,
      { token: sessionToken }
    );
    assert.equal(blockedBasis.readyForDeclaration, false);

    await requestJson(baseUrl, `/v1/vat/review-queue/${review.reviewQueueItem.vatReviewQueueItemId}/resolve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        vatCode: "VAT_SE_DOMESTIC_25",
        resolutionCode: "manual_domestic_resolution"
      }
    });

    const resolvedLedgerEntry = await requestJson(baseUrl, "/v1/ledger/journal-entries", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        journalDate: "2026-03-21",
        voucherSeriesCode: "B",
        sourceType: "AR_INVOICE",
        sourceId: "phase9-3-e2e-review",
        idempotencyKey: "phase9-3-e2e-review",
        description: "Phase 9.3 e2e resolved VAT basis",
        lines: [
          { accountNumber: "1510", debitAmount: 1250 },
          { accountNumber: "3010", creditAmount: 1000 },
          { accountNumber: "2610", creditAmount: 250 }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/ledger/journal-entries/${resolvedLedgerEntry.journalEntry.journalEntryId}/validate`, {
      method: "POST",
      token: sessionToken,
      body: { companyId: COMPANY_ID }
    });
    await requestJson(baseUrl, `/v1/ledger/journal-entries/${resolvedLedgerEntry.journalEntry.journalEntryId}/post`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        approvedByActorId: "finance-approver",
        approvedByRoleCode: "finance_manager"
      }
    });

    const readyBasis = await requestJson(
      baseUrl,
      `/v1/vat/declaration-basis?companyId=${COMPANY_ID}&fromDate=2026-03-01&toDate=2026-03-31`,
      { token: sessionToken }
    );
    assert.deepEqual(readyBasis.blockerCodes, []);

    const periodLock = await requestJson(baseUrl, "/v1/vat/period-locks", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
        reasonCode: "vat_return_signoff",
        basisSnapshotHash: readyBasis.sourceSnapshotHash
      }
    });

    const declarationRun = await requestJson(baseUrl, "/v1/vat/declaration-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
        signer: "e2e-vat-signer"
      }
    });
    assert.equal(declarationRun.periodLockId, periodLock.vatPeriodLockId);

    const lockedAttempt = await requestJson(baseUrl, "/v1/vat/decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 409,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase9-3-e2e-locked",
          tax_date: "2026-03-22",
          invoice_date: "2026-03-22",
          delivery_date: "2026-03-22"
        })
      }
    });
    assert.equal(lockedAttempt.error, "vat_period_locked");

    await requestJson(baseUrl, `/v1/vat/period-locks/${periodLock.vatPeriodLockId}/unlock`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        reasonCode: "late_invoice"
      }
    });

    const afterUnlock = await requestJson(baseUrl, "/v1/vat/decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase9-3-e2e-after-unlock",
          tax_date: "2026-03-22",
          invoice_date: "2026-03-22",
          delivery_date: "2026-03-22"
        })
      }
    });
    assert.equal(afterUnlock.vatDecision.status, "decided");
  } finally {
    await stopServer(server);
  }
});

async function loginWithStrongAuth({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });

  const totpCode = platform.getTotpCodeForTesting({ companyId, email });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: totpCode
    }
  });

  const bankidStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
    method: "POST",
    token: started.sessionToken
  });
  await requestJson(baseUrl, "/v1/auth/bankid/collect", {
    method: "POST",
    token: started.sessionToken,
    body: {
      orderRef: bankidStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
    }
  });

  return started.sessionToken;
}

function buildTransactionLine(overrides = {}) {
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
    tax_date: "2026-03-21",
    invoice_date: "2026-03-21",
    delivery_date: "2026-03-21",
    prepayment_date: "2026-03-21",
    line_amount_ex_vat: 1000,
    line_discount: 0,
    line_quantity: 1,
    line_uom: "ea",
    vat_rate: 25,
    tax_rate_candidate: 25,
    vat_code_candidate: "VAT_SE_DOMESTIC_25",
    exemption_reason: "not_applicable",
    invoice_text_code: "domestic_standard",
    report_box_code: "05",
    project_id: PROJECT_ID,
    source_type: "AR_INVOICE",
    source_id: "phase9-3-e2e-default",
    ...overrides
  };
}

async function requestJson(baseUrl, path, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}
