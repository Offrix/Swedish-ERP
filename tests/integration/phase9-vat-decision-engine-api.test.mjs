import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000041";

test("Phase 9.3 API resolves VAT review blockers, materializes declaration basis and enforces period locks", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T10:10:00Z")
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

    const domestic = await requestJson(baseUrl, "/v1/vat/decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase9-3-api-domestic"
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
        sourceId: "phase9-3-api-domestic",
        idempotencyKey: "phase9-3-api-domestic",
        description: "Phase 9.3 VAT basis",
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
          source_id: "phase9-3-api-review",
          line_quantity: null
        })
      }
    });
    assert.equal(review.vatDecision.status, "review_required");
    assert.equal(review.vatDecision.lifecycleStatus, "pending_review");

    const blockedBasis = await requestJson(
      baseUrl,
      `/v1/vat/declaration-basis?companyId=${COMPANY_ID}&fromDate=2026-03-01&toDate=2026-03-31`,
      {
        token: sessionToken
      }
    );
    assert.equal(blockedBasis.readyForDeclaration, false);
    assert.equal(blockedBasis.blockerCodes.includes("open_review_queue_items"), true);

    const resolved = await requestJson(
      baseUrl,
      `/v1/vat/review-queue/${review.reviewQueueItem.vatReviewQueueItemId}/resolve`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          vatCode: "VAT_SE_DOMESTIC_25",
          resolutionCode: "manual_domestic_resolution",
          resolutionNote: "Verified by operator"
        }
      }
    );
    assert.equal(resolved.reviewQueueItem.status, "resolved");
    assert.equal(resolved.vatDecision.status, "decided");
    assert.equal(resolved.vatDecision.lifecycleStatus, "approved");

    const resolvedLedgerEntry = await requestJson(baseUrl, "/v1/ledger/journal-entries", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        journalDate: "2026-03-21",
        voucherSeriesCode: "B",
        sourceType: "AR_INVOICE",
        sourceId: "phase9-3-api-review",
        idempotencyKey: "phase9-3-api-review",
        description: "Phase 9.3 resolved VAT basis",
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
      {
        token: sessionToken
      }
    );
    assert.deepEqual(readyBasis.blockerCodes, []);
    assert.equal(readyBasis.readyForLock, true);
    assert.equal(readyBasis.approvedDecisionCount, 2);
    assert.equal(readyBasis.pendingReviewDecisionCount, 0);

    const lock = await requestJson(baseUrl, "/v1/vat/period-locks", {
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
    assert.equal(lock.status, "locked");

    const listedLocks = await requestJson(baseUrl, `/v1/vat/period-locks?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(listedLocks.items.length, 1);

    const lockedAttempt = await requestJson(baseUrl, "/v1/vat/decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 409,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase9-3-api-locked",
          tax_date: "2026-03-22",
          invoice_date: "2026-03-22",
          delivery_date: "2026-03-22"
        })
      }
    });
    assert.equal(lockedAttempt.error, "vat_period_locked");

    const declarationRun = await requestJson(baseUrl, "/v1/vat/declaration-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
        signer: "finance-signer"
      }
    });
    assert.equal(declarationRun.periodLockId, lock.vatPeriodLockId);
    const declaredDomestic = await requestJson(
      baseUrl,
      `/v1/vat/decisions/${domestic.vatDecision.vatDecisionId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    const declaredResolved = await requestJson(
      baseUrl,
      `/v1/vat/decisions/${resolved.vatDecision.vatDecisionId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    assert.equal(declaredDomestic.lifecycleStatus, "declared");
    assert.equal(declaredResolved.lifecycleStatus, "declared");
    assert.equal(declaredDomestic.vatDeclarationRunIds.includes(declarationRun.vatDeclarationRunId), true);
    assert.equal(declaredResolved.vatDeclarationRunIds.includes(declarationRun.vatDeclarationRunId), true);

    const unlocked = await requestJson(baseUrl, `/v1/vat/period-locks/${lock.vatPeriodLockId}/unlock`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        reasonCode: "post_filing_correction"
      }
    });
    assert.equal(unlocked.status, "unlocked");

    const afterUnlock = await requestJson(baseUrl, "/v1/vat/decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase9-3-api-after-unlock",
          tax_date: "2026-03-22",
          invoice_date: "2026-03-22",
          delivery_date: "2026-03-22"
        })
      }
    });
    assert.equal(afterUnlock.vatDecision.status, "decided");
    assert.equal(afterUnlock.vatDecision.lifecycleStatus, "approved");
  } finally {
    await stopServer(server);
  }
});

test("Phase 9.5 API resolves VAT manual review directly through review center decisions", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T11:15:00Z")
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

    const review = await requestJson(baseUrl, "/v1/vat/decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transactionLine: buildTransactionLine({
          source_id: "phase9-5-api-review-center",
          line_quantity: null
        })
      }
    });
    assert.equal(review.vatDecision.lifecycleStatus, "pending_review");

    const reviewCenterItems = await requestJson(
      baseUrl,
      `/v1/review-center/items?companyId=${COMPANY_ID}&queueCode=VAT_REVIEW&status=open`,
      { token: sessionToken }
    );
    const vatReviewItem = reviewCenterItems.items.find(
      (item) => item.reviewItemId === review.reviewQueueItem.vatReviewQueueItemId
    );
    assert.ok(vatReviewItem);

    const claimed = await requestJson(baseUrl, `/v1/review-center/items/${vatReviewItem.reviewItemId}/claim`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 200,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(claimed.status, "claimed");

    const decided = await requestJson(baseUrl, `/v1/review-center/items/${vatReviewItem.reviewItemId}/decide`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 200,
      body: {
        companyId: COMPANY_ID,
        decisionCode: "approve",
        decisionPayload: {
          vatCode: "VAT_SE_DOMESTIC_25",
          resolutionCode: "manual_domestic_resolution",
          resolutionNote: "Resolved directly in review center."
        }
      }
    });
    assert.equal(decided.status, "approved");
    assert.equal(decided.latestDecision.decisionCode, "approve");
    assert.equal(decided.sourceObjectSnapshot.vatDecision.lifecycleStatus, "approved");
    assert.equal(decided.sourceObjectSnapshot.vatDecision.vatCode, "VAT_SE_DOMESTIC_25");
    assert.equal(decided.sourceObjectSnapshot.reviewQueueItem.status, "resolved");

    const vatDecision = await requestJson(
      baseUrl,
      `/v1/vat/decisions/${review.vatDecision.vatDecisionId}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(vatDecision.lifecycleStatus, "approved");
    assert.equal(vatDecision.vatCode, "VAT_SE_DOMESTIC_25");
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
    source_id: "phase9-3-api-default",
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
