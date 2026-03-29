import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 8.3 migration and seeds add payroll posting, payout and vacation liability structures", async () => {
  const migration = await readText("packages/db/migrations/20260321220000_phase8_payroll_posting_payout.sql");
  for (const fragment of [
    "ALTER TABLE pay_run_lines",
    "CREATE TABLE IF NOT EXISTS payroll_postings",
    "CREATE TABLE IF NOT EXISTS payroll_posting_lines",
    "CREATE TABLE IF NOT EXISTS payroll_payout_batches",
    "CREATE TABLE IF NOT EXISTS payroll_payout_batch_lines",
    "CREATE TABLE IF NOT EXISTS vacation_liability_snapshots"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260321220010_phase8_payroll_posting_payout_seed.sql");
  for (const fragment of [
    "phase8-3-seed-posting-202603",
    "PAYROLL-202603-seed.csv",
    "project-demo-alpha",
    "vacation_liability_snapshots"
  ]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }

  const demoSeed = await readText("packages/db/seeds/20260321221000_phase8_payroll_posting_payout_demo_seed.sql");
  for (const fragment of [
    "phase8-3-demo-posting-202603",
    "project-demo-beta",
    "bank-demo-payroll-booked-202603-1",
    "phase8-3-demo-vacation-202604"
  ]) {
    assert.match(demoSeed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Phase 8.3 API creates payroll postings, payout batches and vacation snapshots", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T09:30:00Z")
  });
  const server = createApiServer({
    platform,
    flags: enabledFlags()
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });
    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });

    platform.createBankAccount({
      companyId: COMPANY_ID,
      bankName: "Integration Payroll Bank",
      ledgerAccountNumber: "1110",
      clearingNumber: "5000",
      accountNumber: "5566778899",
      isDefault: true,
      actorId: "integration-test"
    });

    const employee = createHourlyEmployee({
      platform,
      givenName: "Nora",
      familyName: "Posting",
      identityValue: "19800112-1238",
      hourlyRate: 210
    });
    platform.upsertEmploymentStatutoryProfile({
      companyId: COMPANY_ID,
      employmentId: employee.employment.employmentId,
      taxMode: "manual_rate",
      manualRateReasonCode: "emergency_manual_transition",
      taxRatePercent: 30,
      contributionClassCode: "full",
      actorId: "integration-test"
    });
    platform.createTimeEntry({
      companyId: COMPANY_ID,
      employmentId: employee.employment.employmentId,
      workDate: "2026-03-18",
      workedMinutes: 480,
      projectId: "project-demo-alpha",
      actorId: "integration-test"
    });

    const payCalendar = (
      await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
        token: sessionToken
      })
    ).items[0];

    const run = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        employmentIds: [employee.employment.employmentId],
        manualInputs: [
          {
            employmentId: employee.employment.employmentId,
            payItemCode: "BONUS",
            amount: 1750,
            processingStep: 4,
            dimensionJson: {
              projectId: "project-demo-beta",
              costCenterCode: "CC-200",
              businessAreaCode: "BA-FIELD"
            }
          }
        ]
      }
    });
    assert.deepEqual(
      run.rulepackRefs.map((entry) => entry.rulepackCode).sort(),
      ["SE-EMPLOYER-CONTRIBUTIONS", "SE-PAYROLL-TAX"]
    );
    assert.equal(run.decisionSnapshotRefs.length >= 2, true);
    assert.equal(typeof run.payrollInputSnapshotId, "string");
    assert.equal(typeof run.payrollInputFingerprint, "string");
    assert.equal(typeof run.payRunFingerprint, "string");
    assert.equal(run.payrollInputSnapshot?.payrollInputSnapshotId, run.payrollInputSnapshotId);
    assert.equal(run.payrollInputSnapshot?.inputFingerprint, run.payrollInputFingerprint);

    await requestJson(baseUrl, `/v1/payroll/pay-runs/${run.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const posting = await requestJson(baseUrl, "/v1/payroll/postings", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payRunId: run.payRunId
      }
    });
    assert.equal(posting.status, "posted");
    assert.equal(posting.journalLines.some((line) => line.dimensionJson.projectId === "project-demo-alpha"), true);
    assert.equal(posting.journalLines.some((line) => line.dimensionJson.costCenterCode === "CC-200"), true);
    assert.deepEqual(
      posting.rulepackRefs.map((entry) => entry.rulepackCode).sort(),
      ["SE-EMPLOYER-CONTRIBUTIONS", "SE-PAYROLL-TAX"]
    );
    assert.equal(posting.payrollInputSnapshotId, run.payrollInputSnapshotId);
    assert.equal(posting.payrollInputFingerprint, run.payrollInputFingerprint);
    assert.equal(posting.payRunFingerprint, run.payRunFingerprint);
    const postingJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: posting.journalEntryId
    });
    assert.equal(postingJournal.metadataJson.postingRecipeCode, "PAYROLL_RUN");
    assert.equal(postingJournal.metadataJson.journalType, "payroll_posting");
    assert.equal(postingJournal.metadataJson.payrollInputSnapshotId, run.payrollInputSnapshotId);
    assert.equal(postingJournal.metadataJson.payRunFingerprint, run.payRunFingerprint);

    const payoutBatch = await requestJson(baseUrl, "/v1/payroll/payout-batches", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payRunId: run.payRunId
      }
    });
    assert.match(payoutBatch.exportPayload, /5000:1234567890/);
    assert.equal(payoutBatch.decisionSnapshotRefs.length >= 2, true);
    assert.equal(payoutBatch.payrollInputSnapshotId, run.payrollInputSnapshotId);
    assert.equal(payoutBatch.payRunFingerprint, run.payRunFingerprint);

    const matchedBatch = await requestJson(
      baseUrl,
      `/v1/payroll/payout-batches/${payoutBatch.payrollPayoutBatchId}/match-bank`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          bankEventId: "bank-integration-payroll-202603"
        }
      }
    );
    assert.equal(matchedBatch.status, "matched");
    const payoutMatchJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: matchedBatch.matchedJournalEntryId
    });
    assert.equal(payoutMatchJournal.metadataJson.postingRecipeCode, "PAYROLL_PAYOUT_MATCH");
    assert.equal(payoutMatchJournal.metadataJson.journalType, "settlement_posting");
    assert.equal(payoutMatchJournal.metadataJson.payrollInputSnapshotId, run.payrollInputSnapshotId);
    assert.equal(payoutMatchJournal.metadataJson.payRunFingerprint, run.payRunFingerprint);

    const snapshot = await requestJson(baseUrl, "/v1/payroll/vacation-liability-snapshots", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603"
      }
    });
    assert.equal(snapshot.totals.liabilityAmount > 0, true);

    const listedSnapshots = await requestJson(
      baseUrl,
      `/v1/payroll/vacation-liability-snapshots?companyId=${COMPANY_ID}&reportingPeriod=202603`,
      {
        token: sessionToken
      }
    );
    assert.equal(listedSnapshots.items.length >= 1, true);
  } finally {
    await stopServer(server);
  }
});

function enabledFlags() {
  return {
    phase1AuthOnboardingEnabled: true,
    phase2DocumentArchiveEnabled: true,
    phase2CompanyInboxEnabled: true,
    phase2OcrReviewEnabled: true,
    phase3LedgerEnabled: true,
    phase4VatEnabled: true,
    phase5ArEnabled: true,
    phase6ApEnabled: true,
    phase7HrEnabled: true,
    phase7TimeEnabled: true,
    phase7AbsenceEnabled: true,
    phase8PayrollEnabled: true
  };
}

function createHourlyEmployee({ platform, givenName, familyName, identityValue, hourlyRate }) {
  const employee = platform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue,
    workEmail: `${givenName.toLowerCase()}.${familyName.toLowerCase()}@example.com`,
    actorId: "integration-test"
  });
  const employment = platform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll employee",
    payModelCode: "hourly_salary",
    startDate: "2025-01-01",
    actorId: "integration-test"
  });
  platform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "hourly_salary",
    hourlyRate,
    actorId: "integration-test"
  });
  platform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: `${givenName} ${familyName}`,
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "Integration Employee Bank",
    primaryAccount: true,
    actorId: "integration-test"
  });
  return {
    employee,
    employment
  };
}

async function loginWithRequiredFactors({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
    }
  });
  if (started.session.requiredFactorCount > 1) {
    const bankIdStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
      method: "POST",
      token: started.sessionToken
    });
    await requestJson(baseUrl, "/v1/auth/bankid/collect", {
      method: "POST",
      token: started.sessionToken,
      body: {
        orderRef: bankIdStart.orderRef,
        completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
      }
    });
  }
  return started.sessionToken;
}

async function requestJson(baseUrl, path, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(
    response.status,
    expectedStatus,
    `Expected ${expectedStatus} for ${method} ${path}, got ${response.status}: ${JSON.stringify(payload)}`
  );
  return payload;
}
