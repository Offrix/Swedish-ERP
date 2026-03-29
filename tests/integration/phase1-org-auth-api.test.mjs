import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_APPROVER_EMAIL,
  DEMO_TEAM_IDS,
  createOrgAuthPlatform
} from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer, readText } from "../../scripts/lib/repo.mjs";

test("Phase 1 migration adds the auth and onboarding table set", async () => {
  const migration = await readText("packages/db/migrations/20260321010000_phase1_org_auth_onboarding.sql");
  for (const tableName of [
    "roles",
    "permissions",
    "role_permissions",
    "object_grants",
    "approval_chains",
    "approval_chain_steps",
    "auth_identities",
    "auth_sessions",
    "auth_factors",
    "auth_challenges",
    "auth_providers",
    "company_setup_blueprints",
    "company_registrations",
    "company_vat_setups",
    "onboarding_runs",
    "onboarding_step_states"
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName.replaceAll("_", "\\_")}`));
  }
});

test("Phase 1 API enforces company boundaries, delegation windows, MFA and onboarding state", async () => {
  const now = new Date("2026-03-21T10:15:00Z");
  const platform = createOrgAuthPlatform({
    clock: () => now,
    bootstrapScenarioCode: "test_default_demo"
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true
    }
  });

  await new Promise((resolve) => {
    server.listen(0, resolve);
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const adminSession = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: "00000000-0000-4000-8000-000000000001",
      email: DEMO_ADMIN_EMAIL
    });

    const companyCountBeforeInvalidOnboarding = platform.snapshot().companies.length;
    const onboardingRunCountBeforeInvalidOnboarding = platform.snapshot().onboardingRuns.length;
    const invalidOnboardingRun = await requestJson(`${baseUrl}/v1/onboarding/runs`, {
      method: "POST",
      expectedStatus: 400,
      body: {
        legalName: "Broken Company AB",
        orgNumber: "559901-0005",
        adminEmail: "",
        adminDisplayName: "Broken Owner"
      }
    });
    assert.equal(invalidOnboardingRun.error, "email_required");
    assert.equal(platform.snapshot().companies.length, companyCountBeforeInvalidOnboarding);
    assert.equal(platform.snapshot().onboardingRuns.length, onboardingRunCountBeforeInvalidOnboarding);

    const onboardingRun = await requestJson(`${baseUrl}/v1/onboarding/runs`, {
      method: "POST",
      expectedStatus: 201,
      body: {
        legalName: "Other Company AB",
        orgNumber: "559900-9999",
        adminEmail: "owner@example.test",
        adminDisplayName: "Owner Example"
      }
    });

    const forbiddenCrossCompany = await requestJson(
      `${baseUrl}/v1/org/companies/${onboardingRun.companyId}/users`,
      {
        token: adminSession.sessionToken,
        expectedStatus: 403
      }
    );
    assert.equal(forbiddenCrossCompany.error, "cross_company_forbidden");

    const userCountBeforeInvalidCompanyUser = platform.snapshot().users.length;
    const invalidCompanyUserWindow = await requestJson(
      `${baseUrl}/v1/org/companies/00000000-0000-4000-8000-000000000001/users`,
      {
        method: "POST",
        token: adminSession.sessionToken,
        expectedStatus: 400,
        body: {
          email: "invalid-window@example.test",
          displayName: "Invalid Window",
          roleCode: "approver",
          startsAt: "2026-04-01T00:00:00Z",
          endsAt: "2026-03-01T00:00:00Z"
        }
      }
    );
    assert.equal(invalidCompanyUserWindow.error, "company_user_window_invalid");
    assert.equal(platform.snapshot().users.length, userCountBeforeInvalidCompanyUser);

    const invalidObjectGrantWindow = await requestJson(`${baseUrl}/v1/org/object-grants`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 400,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        companyUserId: "00000000-0000-4000-8000-000000000022",
        permissionCode: "company.read",
        objectType: "module_activation",
        objectId: "00000000-0000-4000-8000-000000000001",
        startsAt: "2026-04-01T00:00:00Z",
        endsAt: "2026-03-01T00:00:00Z"
      }
    });
    assert.equal(invalidObjectGrantWindow.error, "object_grant_window_invalid");

    const invalidDelegationWindow = await requestJson(`${baseUrl}/v1/org/delegations`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 400,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        fromCompanyUserId: "00000000-0000-4000-8000-000000000021",
        toCompanyUserId: "00000000-0000-4000-8000-000000000022",
        scopeCode: "customer_invoice",
        permissionCode: "approval.approve",
        startsAt: "2026-04-01T00:00:00Z",
        endsAt: "2026-03-01T00:00:00Z"
      }
    });
    assert.equal(invalidDelegationWindow.error, "delegation_window_invalid");

    const crossCompanyApprovalTarget =
      platform
        .snapshot()
        .companyUsers.find((candidate) => candidate.companyId === onboardingRun.companyId)?.companyUserId || null;
    assert.ok(crossCompanyApprovalTarget);

    const approvalChainCountBeforeInvalidCreate = platform.snapshot().approvalChains.length;

    const crossCompanyApprovalChain = await requestJson(`${baseUrl}/v1/org/attest-chains`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 400,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        scopeCode: "customer_invoice",
        objectType: "customer_invoice",
        steps: [
          {
            approverCompanyUserId: crossCompanyApprovalTarget,
            label: "cross_company_target"
          }
        ]
      }
    });
    assert.equal(crossCompanyApprovalChain.error, "approval_chain_step_company_mismatch");
    assert.equal(platform.snapshot().approvalChains.length, approvalChainCountBeforeInvalidCreate);

    const adminCreatesDelegation = await requestJson(
      `${baseUrl}/v1/org/delegations`,
      {
        method: "POST",
        token: adminSession.sessionToken,
        expectedStatus: 201,
        body: {
          companyId: "00000000-0000-4000-8000-000000000001",
          fromCompanyUserId: "00000000-0000-4000-8000-000000000021",
          toCompanyUserId: "00000000-0000-4000-8000-000000000022",
          scopeCode: "customer_invoice",
          permissionCode: "approval.approve",
          resourceType: "customer_invoice",
          resourceId: "INV-10001",
          startsAt: "2026-03-01T00:00:00Z",
          endsAt: "2026-03-31T23:59:59Z"
        }
      }
    );
    assert.equal(adminCreatesDelegation.resourceId, "INV-10001");

    const approvalChain = await requestJson(`${baseUrl}/v1/org/attest-chains`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        scopeCode: "customer_invoice",
        objectType: "customer_invoice",
        steps: [
          {
            approverCompanyUserId: "00000000-0000-4000-8000-000000000021",
            label: "prepare"
          },
          {
            approverCompanyUserId: "00000000-0000-4000-8000-000000000022",
            label: "approve"
          }
        ]
      }
    });
    assert.equal(approvalChain.steps.length, 2);

    const missingApprovalChainToken = await requestJson(
      `${baseUrl}/v1/org/attest-chains/${approvalChain.approvalChainId}`,
      {
        expectedStatus: 400
      }
    );
    assert.equal(missingApprovalChainToken.error, "session_token_required");

    const approverLogin = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: "00000000-0000-4000-8000-000000000001",
      email: DEMO_APPROVER_EMAIL
    });

    const forbiddenMutation = await requestJson(`${baseUrl}/v1/org/delegations`, {
      method: "POST",
      token: approverLogin.sessionToken,
      expectedStatus: 403,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        fromCompanyUserId: "00000000-0000-4000-8000-000000000022",
        toCompanyUserId: "00000000-0000-4000-8000-000000000021",
        scopeCode: "customer_invoice",
        permissionCode: "approval.approve"
      }
    });
    assert.equal(forbiddenMutation.error, "missing_permission");

    const approvalChainRead = await requestJson(
      `${baseUrl}/v1/org/attest-chains/${approvalChain.approvalChainId}`,
      {
        token: approverLogin.sessionToken
      }
    );
    assert.equal(approvalChainRead.approvalChainId, approvalChain.approvalChainId);
    assert.equal(approvalChainRead.steps.length, 2);

    const passkeyRegistration = await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/register-options`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: {
        deviceName: "Finance laptop key"
      }
    });
    const invalidPasskeyVerify = await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/register-verify`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 400,
      body: {
        challengeId: passkeyRegistration.challengeId,
        credentialId: "",
        publicKey: "pk-demo"
      }
    });
    assert.equal(invalidPasskeyVerify.error, "passkey_credential_required");
    const completedPasskeyVerify = await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/register-verify`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: {
        challengeId: passkeyRegistration.challengeId,
        credentialId: "cred-finance-laptop",
        publicKey: "pk-demo",
        deviceName: "Finance laptop key"
      }
    });
    assert.equal(completedPasskeyVerify.credentialId, "cred-finance-laptop");
    const replayedPasskeyVerify = await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/register-verify`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 409,
      body: {
        challengeId: passkeyRegistration.challengeId,
        credentialId: "cred-finance-laptop-replay",
        publicKey: "pk-demo-replay",
        deviceName: "Finance laptop key"
      }
    });
    assert.equal(replayedPasskeyVerify.error, "auth_challenge_not_pending");

    const financeAdmin = await requestJson(
      `${baseUrl}/v1/org/companies/00000000-0000-4000-8000-000000000001/users`,
      {
        method: "POST",
        token: adminSession.sessionToken,
        expectedStatus: 201,
        body: {
          email: "finance-admin@example.test",
          displayName: "Finance Admin",
          roleCode: "company_admin",
          requiresMfa: false
        }
      }
    );
    assert.equal(financeAdmin.roleCode, "company_admin");
    assert.equal(financeAdmin.requiresMfa, true);

    const financeAdminSession = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: "00000000-0000-4000-8000-000000000001",
      email: "finance-admin@example.test"
    });
    assert.ok(financeAdminSession);

    const delegatedDecision = await requestJson(`${baseUrl}/v1/authz/check`, {
      method: "POST",
      token: approverLogin.sessionToken,
      body: {
        action: "approval.approve",
        resource: {
          companyId: "00000000-0000-4000-8000-000000000001",
          objectType: "customer_invoice",
          objectId: "INV-10001",
          scopeCode: "customer_invoice"
        }
      }
    });
    assert.equal(delegatedDecision.decision.allowed, true);

    const routeContractDecision = await requestJson(`${baseUrl}/v1/authz/check`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: {
        route: {
          method: "POST",
          path: "/v1/org/delegations"
        },
        resource: {
          companyId: "00000000-0000-4000-8000-000000000001"
        }
      }
    });
    assert.equal(routeContractDecision.decision.allowed, true);
    assert.equal(routeContractDecision.contract.requiredActionClass, "org_identity_admin");
    assert.equal(routeContractDecision.permissionResolution.currentTrustLevel, "strong_mfa");
    assert.equal(routeContractDecision.permissionResolution.requiredTrustLevel, "strong_mfa");

    const routeContractDenied = await requestJson(`${baseUrl}/v1/authz/check`, {
      method: "POST",
      token: approverLogin.sessionToken,
      body: {
        route: {
          method: "POST",
          path: "/v1/org/delegations"
        },
        resource: {
          companyId: "00000000-0000-4000-8000-000000000001"
        }
      }
    });
    assert.equal(routeContractDenied.decision.allowed, false);
    assert.equal(routeContractDenied.decision.reasonCode, "trust_level_insufficient");

    const publicRouteContractDecision = await requestJson(`${baseUrl}/v1/authz/check`, {
      method: "POST",
      body: {
        route: {
          method: "POST",
          path: "/v1/onboarding/runs"
        }
      }
    });
    assert.equal(publicRouteContractDecision.decision.allowed, true);
    assert.equal(publicRouteContractDecision.permissionResolution.resolutionMode, "public_route");
    assert.equal(publicRouteContractDecision.permissionResolution.currentTrustLevel, "public");

    const selfRouteContractDecision = await requestJson(`${baseUrl}/v1/authz/check`, {
      method: "POST",
      token: adminSession.sessionToken,
      body: {
        route: {
          method: "POST",
          path: "/v1/auth/logout"
        }
      }
    });
    assert.equal(selfRouteContractDecision.decision.allowed, true);
    assert.equal(selfRouteContractDecision.permissionResolution.resolutionMode, "trust_scoped");
    assert.equal(selfRouteContractDecision.contract.requiredScopeType, "self");

    const futureDelegation = await requestJson(`${baseUrl}/v1/org/delegations`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        fromCompanyUserId: "00000000-0000-4000-8000-000000000021",
        toCompanyUserId: "00000000-0000-4000-8000-000000000022",
        scopeCode: "customer_invoice",
        permissionCode: "approval.approve",
        resourceType: "customer_invoice",
        resourceId: "INV-20002",
        startsAt: "2026-04-01T00:00:00Z",
        endsAt: "2026-04-30T23:59:59Z"
      }
    });
    assert.equal(futureDelegation.resourceId, "INV-20002");

    const futureDelegationDecision = await requestJson(`${baseUrl}/v1/authz/check`, {
      method: "POST",
      token: approverLogin.sessionToken,
      body: {
        action: "approval.approve",
        resource: {
          companyId: "00000000-0000-4000-8000-000000000001",
          objectType: "customer_invoice",
          objectId: "INV-20002",
          scopeCode: "customer_invoice"
        }
      }
    });
    assert.equal(futureDelegationDecision.decision.allowed, false);

    const revokedSession = await requestJson(
      `${baseUrl}/v1/auth/sessions/${approverLogin.session.sessionId}/revoke`,
      {
        method: "POST",
        token: adminSession.sessionToken
      }
    );
    assert.equal(revokedSession.session.status, "revoked");

    const revokedUse = await requestJson(`${baseUrl}/v1/authz/check`, {
      method: "POST",
      token: approverLogin.sessionToken,
      expectedStatus: 401,
      body: {
        action: "approval.approve",
        resource: {
          companyId: "00000000-0000-4000-8000-000000000001",
          objectType: "customer_invoice",
          objectId: "INV-10001",
          scopeCode: "customer_invoice"
        }
      }
    });
    assert.equal(revokedUse.error, "session_revoked");

    const initialChecklist = await requestJson(
      `${baseUrl}/v1/onboarding/runs/${onboardingRun.runId}/checklist?resumeToken=${onboardingRun.resumeToken}`
    );
    assert.equal(initialChecklist.checklist.find((step) => step.stepCode === "registrations").status, "pending");

    await requestJson(`${baseUrl}/v1/onboarding/runs/${onboardingRun.runId}/steps/registrations`, {
      method: "POST",
      body: {
        resumeToken: onboardingRun.resumeToken,
        registrations: [
          { registrationType: "f_tax", registrationValue: "configured-f-tax", status: "configured" },
          { registrationType: "vat", registrationValue: "configured-vat", status: "configured" },
          { registrationType: "employer", registrationValue: "configured-employer", status: "configured" }
        ]
      }
    });
    await requestJson(`${baseUrl}/v1/onboarding/runs/${onboardingRun.runId}/steps/chart`, {
      method: "POST",
      body: {
        resumeToken: onboardingRun.resumeToken,
        chartTemplateId: "DSAM-2026",
        voucherSeriesCodes: ["A", "B", "E", "H", "I"]
      }
    });
    await requestJson(`${baseUrl}/v1/onboarding/runs/${onboardingRun.runId}/steps/vat`, {
      method: "POST",
      body: {
        resumeToken: onboardingRun.resumeToken,
        vatScheme: "se_standard",
        filingPeriod: "monthly"
      }
    });
    const completedOnboarding = await requestJson(`${baseUrl}/v1/onboarding/runs/${onboardingRun.runId}/steps/periods`, {
      method: "POST",
      body: {
        resumeToken: onboardingRun.resumeToken,
        year: 2026
      }
    });
    assert.equal(completedOnboarding.status, "completed");
    assert.equal(completedOnboarding.checklist.every((step) => step.status === "completed"), true);

    const onboardedAdminSession = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: onboardingRun.companyId,
      email: "owner@example.test"
    });
    assert.ok(onboardedAdminSession);

    const snapshot = platform.snapshot();
    const createdCompany = snapshot.companies.find((company) => company.companyId === onboardingRun.companyId);
    assert.equal(createdCompany.status, "active");
    assert.equal(snapshot.companyRegistrations.filter((registration) => registration.companyId === onboardingRun.companyId).length, 3);
    assert.equal(snapshot.companyVatSetups.some((setup) => setup.companyId === onboardingRun.companyId), true);
    assert.equal(snapshot.accountingPeriods.filter((period) => period.companyId === onboardingRun.companyId).length, 12);

    const authAuditActions = snapshot.auditEvents.map((event) => event.action);
    assert.equal(authAuditActions.includes("auth.login.started"), true);
    assert.equal(authAuditActions.includes("auth.mfa.totp.verify"), true);
    assert.equal(authAuditActions.includes("auth.bankid.completed"), true);
  } finally {
    await stopServer(server);
  }
});

test("Phase 1 API exposes operational teams and active memberships", async () => {
  const now = new Date("2026-03-21T11:30:00Z");
  const platform = createOrgAuthPlatform({
    clock: () => now,
    bootstrapScenarioCode: "test_default_demo"
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true
    }
  });

  await new Promise((resolve) => {
    server.listen(0, resolve);
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const adminSession = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: "00000000-0000-4000-8000-000000000001",
      email: DEMO_ADMIN_EMAIL
    });

    const teams = await requestJson(
      `${baseUrl}/v1/org/teams?companyId=00000000-0000-4000-8000-000000000001`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(teams.items.some((team) => team.teamId === DEMO_TEAM_IDS.financeOps), true);
    assert.equal(teams.items.some((team) => team.teamId === DEMO_TEAM_IDS.payrollOps), true);

    const financeMemberships = await requestJson(
      `${baseUrl}/v1/org/teams/${DEMO_TEAM_IDS.financeOps}/memberships?companyId=00000000-0000-4000-8000-000000000001`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(financeMemberships.items.some((membership) => membership.userId === "00000000-0000-4000-8000-000000000011"), true);
    assert.equal(financeMemberships.items.some((membership) => membership.userId === "00000000-0000-4000-8000-000000000012"), true);

    await requestJson(`${baseUrl}/v1/org/companies/00000000-0000-4000-8000-000000000001/users`, {
      method: "POST",
      token: adminSession.sessionToken,
      expectedStatus: 201,
      body: {
        email: "phase1-payroll-admin@example.test",
        displayName: "Phase 1 Payroll Admin",
        roleCode: "payroll_admin"
      }
    });

    const payrollMemberships = await requestJson(
      `${baseUrl}/v1/org/teams/${DEMO_TEAM_IDS.payrollOps}/memberships?companyId=00000000-0000-4000-8000-000000000001`,
      {
        token: adminSession.sessionToken
      }
    );
    assert.equal(payrollMemberships.items.some((membership) => membership.userId === "00000000-0000-4000-8000-000000000011"), false);
    assert.equal(payrollMemberships.items.some((membership) => membership.companyUser.user.email === "phase1-payroll-admin@example.test"), true);
  } finally {
    await stopServer(server);
  }
});

async function loginWithStrongAuth({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    body: {
      companyId,
      email
    }
  });

  const totpCode = platform.getTotpCodeForTesting({ companyId, email });
  const afterTotp = await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: totpCode
    }
  });
  assert.equal(afterTotp.session.status, "pending");

  const bankidStart = await requestJson(`${baseUrl}/v1/auth/bankid/start`, {
    method: "POST",
    token: started.sessionToken
  });
  const bankidComplete = await requestJson(`${baseUrl}/v1/auth/bankid/collect`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      orderRef: bankidStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
    }
  });
  assert.equal(bankidComplete.session.status, "active");

  return {
    sessionToken: started.sessionToken,
    session: bankidComplete.session
  };
}

async function loginWithTotpOnly({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  const totpCode = platform.getTotpCodeForTesting({ companyId, email });
  const verified = await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: totpCode
    }
  });
  assert.equal(verified.session.status, "active");
  return {
    sessionToken: started.sessionToken,
    session: verified.session
  };
}

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}
