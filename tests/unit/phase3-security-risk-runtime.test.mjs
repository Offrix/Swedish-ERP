import test from "node:test";
import assert from "node:assert/strict";
import { createSecurityRuntimePlatform } from "../../packages/domain-core/src/index.mjs";

test("Phase 3.5 security runtime locks exhausted budgets and records alert-backed risk", () => {
  const runtime = createSecurityRuntimePlatform({
    clock: () => new Date("2026-03-30T10:00:00Z")
  });

  runtime.consumeSecurityBudget({
    companyId: "company-1",
    budgetCode: "auth_login_ip",
    subjectKey: "ip:198.51.100.42",
    subjectType: "ip_address",
    subjectId: "198.51.100.42",
    actorId: "tester",
    ipAddress: "198.51.100.42",
    limit: 2,
    windowMs: 60_000,
    lockoutMs: 300_000,
    alertCode: "auth_login_ip_spike",
    riskScore: 25
  });
  runtime.consumeSecurityBudget({
    companyId: "company-1",
    budgetCode: "auth_login_ip",
    subjectKey: "ip:198.51.100.42",
    subjectType: "ip_address",
    subjectId: "198.51.100.42",
    actorId: "tester",
    ipAddress: "198.51.100.42",
    limit: 2,
    windowMs: 60_000,
    lockoutMs: 300_000,
    alertCode: "auth_login_ip_spike",
    riskScore: 25
  });

  assert.throws(
    () =>
      runtime.consumeSecurityBudget({
        companyId: "company-1",
        budgetCode: "auth_login_ip",
        subjectKey: "ip:198.51.100.42",
        subjectType: "ip_address",
        subjectId: "198.51.100.42",
        actorId: "tester",
        ipAddress: "198.51.100.42",
        limit: 2,
        windowMs: 60_000,
        lockoutMs: 300_000,
        alertCode: "auth_login_ip_spike",
        riskScore: 25,
        errorCode: "login_ip_temporarily_locked"
      }),
    (error) => error?.code === "login_ip_temporarily_locked"
  );

  const alerts = runtime.listSecurityAlerts({
    companyId: "company-1",
    alertCode: "auth_login_ip_spike"
  });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].lastIpAddress, "198.51.100.42");
  assert.equal(alerts[0].state, "open");

  const risk = runtime.getSecurityRiskSummary({
    companyId: "company-1",
    subjectKey: "ip:198.51.100.42"
  });
  assert.ok(risk);
  assert.equal(risk.lastAlertCode, "auth_login_ip_spike");
  assert.equal(risk.totalScore, 25);
});

test("Phase 3.5 security runtime locks failure series and clears recovery state on success", () => {
  const runtime = createSecurityRuntimePlatform({
    clock: () => new Date("2026-03-30T11:00:00Z")
  });

  runtime.recordSecurityFailureSeries({
    companyId: "company-1",
    seriesCode: "auth_totp_account_failures",
    subjectKey: "company_user:user-1",
    subjectType: "company_user",
    subjectId: "user-1",
    actorId: "user-1",
    ipAddress: "203.0.113.55",
    threshold: 2,
    windowMs: 60_000,
    lockoutMs: 300_000,
    alertCode: "auth_totp_account_locked",
    riskScore: 30
  });

  const lockedSeries = runtime.recordSecurityFailureSeries({
    companyId: "company-1",
    seriesCode: "auth_totp_account_failures",
    subjectKey: "company_user:user-1",
    subjectType: "company_user",
    subjectId: "user-1",
    actorId: "user-1",
    ipAddress: "203.0.113.55",
    threshold: 2,
    windowMs: 60_000,
    lockoutMs: 300_000,
    alertCode: "auth_totp_account_locked",
    riskScore: 30
  });
  assert.equal(typeof lockedSeries.lockedUntil, "string");

  assert.throws(
    () =>
      runtime.assertSecurityFailureSeriesOpen({
        companyId: "company-1",
        seriesCode: "auth_totp_account_failures",
        subjectKey: "company_user:user-1",
        errorCode: "totp_recovery_required"
      }),
    (error) => error?.code === "totp_recovery_required"
  );

  const cleared = runtime.clearSecurityFailureSeries({
    companyId: "company-1",
    seriesCode: "auth_totp_account_failures",
    subjectKey: "company_user:user-1"
  });
  assert.equal(cleared.failureCount, 0);
  assert.equal(cleared.lockedUntil, null);
  assert.equal(typeof cleared.lastSuccessAt, "string");
});
