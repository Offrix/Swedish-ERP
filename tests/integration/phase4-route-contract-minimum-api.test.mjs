import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

function envelope(data, { correlationId, idempotencyKey } = {}) {
  return {
    meta: {
      ...(correlationId ? { correlationId } : {}),
      ...(idempotencyKey ? { idempotencyKey } : {})
    },
    data
  };
}

function assertCanonicalMeta(meta, { classification, correlationId = null, idempotencyKey = null }) {
  assert.deepEqual(
    Object.keys(meta).sort(),
    ["apiVersion", "classification", "correlationId", "idempotencyKey", "mode", "requestId"].sort()
  );
  assert.equal(meta.apiVersion, "2026-03-27");
  assert.equal(meta.classification, classification);
  if (correlationId) {
    assert.equal(meta.correlationId, correlationId);
  } else {
    assert.equal(typeof meta.correlationId, "string");
  }
  assert.equal(meta.idempotencyKey ?? null, idempotencyKey);
}

test("Phase 4.5 fiscal-year routes expose canonical envelopes, denial reasons, conflict semantics and idempotent period generation", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2027-07-01T09:00:00Z")
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
      email: "phase45-fiscal-field@example.test",
      displayName: "Phase 4.5 Fiscal Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase45-fiscal-field@example.test"
    });

    const profile = await requestJson(baseUrl, "/v1/fiscal-years/profiles", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope(
        {
          companyId: DEMO_IDS.companyId,
          legalFormCode: "ENSKILD_NARINGSVERKSAMHET",
          ownerTaxationCode: "PHYSICAL_PERSON_PARTICIPANT"
        },
        {
          correlationId: "phase45-fiscal-profile",
          idempotencyKey: "phase45-fiscal-profile"
        }
      )
    });
    assertCanonicalMeta(profile.meta, {
      classification: "created",
      correlationId: "phase45-fiscal-profile",
      idempotencyKey: "phase45-fiscal-profile"
    });
    assert.equal(typeof profile.data.fiscalYearProfileId, "string");

    const brokenYear = await requestJson(baseUrl, "/v1/fiscal-years", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: envelope({
        companyId: DEMO_IDS.companyId,
        fiscalYearProfileId: profile.fiscalYearProfileId,
        startDate: "2027-07-01",
        endDate: "2028-06-30",
        approvalBasisCode: "BASELINE"
      })
    });
    assertCanonicalMeta(brokenYear.meta, { classification: "conflict" });
    assert.equal(brokenYear.error, "calendar_year_required");
    assert.equal(brokenYear.errorDetail.errorEnvelopeVersion, 1);
    assert.equal(brokenYear.errorDetail.errorCode, "calendar_year_required");
    assert.equal(brokenYear.errorDetail.code, "calendar_year_required");

    const calendarYear = await requestJson(baseUrl, "/v1/fiscal-years", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope({
        companyId: DEMO_IDS.companyId,
        fiscalYearProfileId: profile.fiscalYearProfileId,
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        approvalBasisCode: "BASELINE"
      })
    });

    const generatedPeriods = await requestJson(baseUrl, `/v1/fiscal-years/${calendarYear.fiscalYearId}/generate-periods`, {
      method: "POST",
      token: adminToken,
      body: envelope(
        { companyId: DEMO_IDS.companyId },
        {
          correlationId: "phase45-fiscal-periods",
          idempotencyKey: "phase45-fiscal-periods"
        }
      )
    });
    const replayedPeriods = await requestJson(baseUrl, `/v1/fiscal-years/${calendarYear.fiscalYearId}/generate-periods`, {
      method: "POST",
      token: adminToken,
      body: envelope(
        { companyId: DEMO_IDS.companyId },
        {
          correlationId: "phase45-fiscal-periods-replay",
          idempotencyKey: "phase45-fiscal-periods"
        }
      )
    });
    assertCanonicalMeta(generatedPeriods.meta, {
      classification: "success",
      correlationId: "phase45-fiscal-periods",
      idempotencyKey: "phase45-fiscal-periods"
    });
    assert.equal(replayedPeriods.items.length, generatedPeriods.items.length);
    assert.equal(replayedPeriods.items[0].periodId, generatedPeriods.items[0].periodId);

    const deniedHistory = await requestJson(baseUrl, `/v1/fiscal-years/history?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assertCanonicalMeta(deniedHistory.meta, { classification: "permission" });
    assert.equal(deniedHistory.error, "finance_operations_role_forbidden");
    assert.equal(deniedHistory.errorDetail.denialReasonCode, "finance_operations_role_forbidden");
  } finally {
    await stopServer(server);
  }
});

test("Phase 4.5 tax-account routes expose canonical envelopes, denial reasons, conflict semantics and idempotent offsets", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T12:00:00Z")
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
      email: "phase45-tax-field@example.test",
      displayName: "Phase 4.5 Tax Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase45-tax-field@example.test"
    });

    platform.registerExpectedTaxLiability({
      companyId: DEMO_IDS.companyId,
      liabilityTypeCode: "VAT",
      sourceDomainCode: "VAT",
      sourceObjectType: "vat_declaration_run",
      sourceObjectId: "phase45_vat_run_2026_03",
      sourceReference: "VAT-2026-03",
      periodKey: "2026-03",
      dueDate: "2026-01-05",
      amount: 9300,
      actorId: DEMO_IDS.userId
    });

    const importResponse = await requestJson(baseUrl, "/v1/tax-account/imports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope(
        {
          companyId: DEMO_IDS.companyId,
          importSource: "SKV_CSV",
          statementDate: "2026-01-05",
          events: [
            {
              eventTypeCode: "VAT_ASSESSMENT",
              eventDate: "2026-01-05",
              postingDate: "2026-01-05",
              amount: 9300,
              externalReference: "PHASE45-SKV-VAT-2026-03",
              sourceObjectType: "vat_declaration_run",
              sourceObjectId: "phase45_vat_run_2026_03",
              periodKey: "2026-03"
            },
            {
              eventTypeCode: "PAYMENT",
              eventDate: "2026-01-05",
              postingDate: "2026-01-05",
              amount: 9300,
              externalReference: "PHASE45-SKV-PAY-2026-01-05"
            }
          ]
        },
        {
          correlationId: "phase45-tax-import",
          idempotencyKey: "phase45-tax-import"
        }
      )
    });
    assertCanonicalMeta(importResponse.meta, {
      classification: "created",
      correlationId: "phase45-tax-import",
      idempotencyKey: "phase45-tax-import"
    });
    assert.equal(importResponse.importBatch.importedCount, 2);

    const deniedEvents = await requestJson(baseUrl, `/v1/tax-account/events?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assertCanonicalMeta(deniedEvents.meta, { classification: "permission" });
    assert.equal(deniedEvents.error, "finance_operations_role_forbidden");
    assert.equal(deniedEvents.errorDetail.denialReasonCode, "finance_operations_role_forbidden");

    const reconciliation = await requestJson(baseUrl, "/v1/tax-account/reconciliations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope({
        companyId: DEMO_IDS.companyId
      })
    });

    const offset = await requestJson(baseUrl, "/v1/tax-account/offsets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope(
        {
          companyId: DEMO_IDS.companyId,
          taxAccountEventId: reconciliation.suggestedOffsets[0].taxAccountEventId,
          reconciliationItemId: reconciliation.suggestedOffsets[0].reconciliationItemId,
          offsetAmount: reconciliation.suggestedOffsets[0].offsetAmount,
          offsetReasonCode: reconciliation.suggestedOffsets[0].offsetReasonCode,
          reconciliationRunId: reconciliation.reconciliationRunId
        },
        {
          correlationId: "phase45-tax-offset",
          idempotencyKey: "phase45-tax-offset"
        }
      )
    });
    const replayOffset = await requestJson(baseUrl, "/v1/tax-account/offsets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope(
        {
          companyId: DEMO_IDS.companyId,
          taxAccountEventId: reconciliation.suggestedOffsets[0].taxAccountEventId,
          reconciliationItemId: reconciliation.suggestedOffsets[0].reconciliationItemId,
          offsetAmount: reconciliation.suggestedOffsets[0].offsetAmount,
          offsetReasonCode: reconciliation.suggestedOffsets[0].offsetReasonCode,
          reconciliationRunId: reconciliation.reconciliationRunId
        },
        {
          correlationId: "phase45-tax-offset-replay",
          idempotencyKey: "phase45-tax-offset"
        }
      )
    });
    assertCanonicalMeta(offset.meta, {
      classification: "created",
      correlationId: "phase45-tax-offset",
      idempotencyKey: "phase45-tax-offset"
    });
    assert.equal(replayOffset.taxAccountOffsetId, offset.taxAccountOffsetId);

    const offsetConflict = await requestJson(baseUrl, "/v1/tax-account/offsets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: envelope({
        companyId: DEMO_IDS.companyId,
        taxAccountEventId: reconciliation.suggestedOffsets[0].taxAccountEventId,
        reconciliationItemId: reconciliation.suggestedOffsets[0].reconciliationItemId,
        offsetAmount: 1,
        offsetReasonCode: reconciliation.suggestedOffsets[0].offsetReasonCode,
        reconciliationRunId: reconciliation.reconciliationRunId
      })
    });
    assertCanonicalMeta(offsetConflict.meta, { classification: "conflict" });
    assert.equal(offsetConflict.error, "tax_account_offset_exceeds_available_event_amount");
  } finally {
    await stopServer(server);
  }
});

test("Phase 4.5 balances routes expose canonical envelopes, denial reasons, conflict semantics and idempotent transactions", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T17:00:00Z")
  });
  const employee = platform.createEmployee({
    companyId: DEMO_IDS.companyId,
    givenName: "Lina",
    familyName: "Lund",
    identityType: "other",
    actorId: DEMO_IDS.userId
  });
  const employment = platform.createEmployment({
    companyId: DEMO_IDS.companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Analyst",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: DEMO_IDS.userId
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
      email: "phase45-balances-field@example.test",
      displayName: "Phase 4.5 Balances Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase45-balances-field@example.test"
    });

    const balanceType = await requestJson(baseUrl, "/v1/balances/types", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope(
        {
          companyId: DEMO_IDS.companyId,
          balanceTypeCode: "PHASE45_FLEX_MINUTES",
          label: "Phase 4.5 flex minutes",
          unitCode: "minutes",
          negativeAllowed: true,
          carryForwardModeCode: "full",
          expiryModeCode: "none"
        },
        {
          correlationId: "phase45-balances-type",
          idempotencyKey: "phase45-balances-type"
        }
      )
    });
    assertCanonicalMeta(balanceType.meta, {
      classification: "created",
      correlationId: "phase45-balances-type",
      idempotencyKey: "phase45-balances-type"
    });

    const deniedTypes = await requestJson(baseUrl, `/v1/balances/types?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assertCanonicalMeta(deniedTypes.meta, { classification: "permission" });
    assert.equal(deniedTypes.error, "payroll_operations_role_forbidden");
    assert.equal(deniedTypes.errorDetail.denialReasonCode, "payroll_operations_role_forbidden");

    const duplicateType = await requestJson(baseUrl, "/v1/balances/types", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: envelope({
        companyId: DEMO_IDS.companyId,
        balanceTypeCode: "PHASE45_FLEX_MINUTES",
        label: "Phase 4.5 flex minutes duplicate",
        unitCode: "minutes",
        negativeAllowed: true,
        carryForwardModeCode: "full",
        expiryModeCode: "none"
      })
    });
    assertCanonicalMeta(duplicateType.meta, { classification: "conflict" });
    assert.equal(duplicateType.error, "balance_type_code_exists");

    const account = await requestJson(baseUrl, "/v1/balances/accounts", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope({
        companyId: DEMO_IDS.companyId,
        balanceTypeCode: "PHASE45_FLEX_MINUTES",
        ownerTypeCode: "employment",
        employeeId: employee.employeeId,
        employmentId: employment.employmentId
      })
    });

    const transaction = await requestJson(baseUrl, `/v1/balances/accounts/${account.balanceAccountId}/transactions`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope(
        {
          companyId: DEMO_IDS.companyId,
          effectiveDate: "2026-03-20",
          transactionTypeCode: "earn",
          quantityDelta: 180,
          sourceDomainCode: "TIME",
          sourceObjectType: "time_entry",
          sourceObjectId: "phase45-entry-1"
        },
        {
          correlationId: "phase45-balances-transaction",
          idempotencyKey: "phase45-balances-transaction"
        }
      )
    });
    const replayTransaction = await requestJson(baseUrl, `/v1/balances/accounts/${account.balanceAccountId}/transactions`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope(
        {
          companyId: DEMO_IDS.companyId,
          effectiveDate: "2026-03-20",
          transactionTypeCode: "earn",
          quantityDelta: 180,
          sourceDomainCode: "TIME",
          sourceObjectType: "time_entry",
          sourceObjectId: "phase45-entry-1"
        },
        {
          correlationId: "phase45-balances-transaction-replay",
          idempotencyKey: "phase45-balances-transaction"
        }
      )
    });
    assertCanonicalMeta(transaction.meta, {
      classification: "created",
      correlationId: "phase45-balances-transaction",
      idempotencyKey: "phase45-balances-transaction"
    });
    assert.equal(replayTransaction.balanceTransactionId, transaction.balanceTransactionId);
  } finally {
    await stopServer(server);
  }
});

test("Phase 4.5 collective-agreement routes expose canonical envelopes, denial reasons, conflict semantics and idempotent mutation paths", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T18:30:00Z")
  });
  const employee = platform.createEmployee({
    companyId: DEMO_IDS.companyId,
    givenName: "Nina",
    familyName: "Nord",
    identityType: "other",
    actorId: DEMO_IDS.userId
  });
  const employment = platform.createEmployment({
    companyId: DEMO_IDS.companyId,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Operator",
    payModelCode: "monthly_salary",
    startDate: "2026-01-01",
    actorId: DEMO_IDS.userId
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
      email: "phase45-agreements-field@example.test",
      displayName: "Phase 4.5 Agreements Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase45-agreements-field@example.test"
    });

    const family = await requestJson(baseUrl, "/v1/collective-agreements/families", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope(
        {
          companyId: DEMO_IDS.companyId,
          code: "PHASE45_UNIONEN",
          name: "Phase 4.5 Unionen",
          sectorCode: "PRIVATE"
        },
        {
          correlationId: "phase45-agreement-family",
          idempotencyKey: "phase45-agreement-family"
        }
      )
    });
    assertCanonicalMeta(family.meta, {
      classification: "created",
      correlationId: "phase45-agreement-family",
      idempotencyKey: "phase45-agreement-family"
    });

    const replayedFamily = await requestJson(baseUrl, "/v1/collective-agreements/families", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope(
        {
          companyId: DEMO_IDS.companyId,
          code: "PHASE45_UNIONEN",
          name: "Phase 4.5 Unionen replay",
          sectorCode: "PRIVATE"
        },
        {
          correlationId: "phase45-agreement-family-replay",
          idempotencyKey: "phase45-agreement-family"
        }
      )
    });
    assert.equal(replayedFamily.agreementFamilyId, family.agreementFamilyId);
    assert.equal(replayedFamily.name, family.name);

    const deniedFamilies = await requestJson(baseUrl, `/v1/collective-agreements/families?companyId=${DEMO_IDS.companyId}`, {
      token: fieldUserToken,
      expectedStatus: 403
    });
    assertCanonicalMeta(deniedFamilies.meta, { classification: "permission" });
    assert.equal(deniedFamilies.error, "payroll_operations_role_forbidden");
    assert.equal(deniedFamilies.errorDetail.denialReasonCode, "payroll_operations_role_forbidden");

    const version = await requestJson(baseUrl, "/v1/collective-agreements/versions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope({
        companyId: DEMO_IDS.companyId,
        agreementFamilyId: family.agreementFamilyId,
        versionCode: "PHASE45_UNIONEN_2026_01",
        effectiveFrom: "2026-01-01",
        rulepackVersion: "2026.1",
        ruleSet: {
          overtimeMultiplier: 1.5
        }
      })
    });
    assert.equal(version.agreementFamilyId, family.agreementFamilyId);
    const catalogEntry = await requestJson(baseUrl, "/v1/collective-agreements/catalog", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope({
        companyId: DEMO_IDS.companyId,
        agreementVersionId: version.agreementVersionId,
        dropdownLabel: "Unionen 2026"
      })
    });

    const overlappingVersion = await requestJson(baseUrl, "/v1/collective-agreements/versions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: envelope({
        companyId: DEMO_IDS.companyId,
        agreementFamilyId: family.agreementFamilyId,
        versionCode: "PHASE45_UNIONEN_2026_06",
        effectiveFrom: "2026-06-01",
        rulepackVersion: "2026.2",
        ruleSet: {
          overtimeMultiplier: 1.75
        }
      })
    });
    assertCanonicalMeta(overlappingVersion.meta, { classification: "conflict" });
    assert.equal(overlappingVersion.error, "agreement_version_overlap");

    const assignment = await requestJson(baseUrl, "/v1/collective-agreements/assignments", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope({
        companyId: DEMO_IDS.companyId,
        employeeId: employee.employeeId,
        employmentId: employment.employmentId,
        agreementCatalogEntryId: catalogEntry.agreementCatalogEntryId,
        effectiveFrom: "2026-01-01",
        assignmentReasonCode: "HIRING"
      })
    });

    const override = await requestJson(baseUrl, `/v1/collective-agreements/assignments/${assignment.agreementAssignmentId}/overrides`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope(
        {
          companyId: DEMO_IDS.companyId,
          overrideTypeCode: "pay_rule",
          overridePayload: {
            overtimeMultiplier: 2
          },
          reasonCode: "LOCAL_AGREEMENT"
        },
        {
          correlationId: "phase45-agreement-override",
          idempotencyKey: "phase45-agreement-override"
        }
      )
    });
    const replayedOverride = await requestJson(baseUrl, `/v1/collective-agreements/assignments/${assignment.agreementAssignmentId}/overrides`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: envelope(
        {
          companyId: DEMO_IDS.companyId,
          overrideTypeCode: "pay_rule",
          overridePayload: {
            overtimeMultiplier: 2
          },
          reasonCode: "LOCAL_AGREEMENT"
        },
        {
          correlationId: "phase45-agreement-override-replay",
          idempotencyKey: "phase45-agreement-override"
        }
      )
    });
    assertCanonicalMeta(override.meta, {
      classification: "created",
      correlationId: "phase45-agreement-override",
      idempotencyKey: "phase45-agreement-override"
    });
    assert.equal(replayedOverride.agreementOverrideId, override.agreementOverrideId);
  } finally {
    await stopServer(server);
  }
});
