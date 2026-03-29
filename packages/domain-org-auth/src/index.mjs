import crypto from "node:crypto";
import {
  BANKID_PROVIDER_CODE,
  authorizeAction,
  createAuditEvent,
  createPasskeyChallenge,
  generateTotpCode,
  generateTotpEnrollment,
  hashOpaqueToken,
  issueOpaqueToken,
  permissionsForRoles,
  requiredFactorCountForRoles,
  resolveSessionTrustLevel,
  sessionIsActive,
  timestamp,
  verifyTotpCode
} from "../../auth-core/src/index.mjs";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";
import { normalizeOptionalSwedishOrganizationNumber } from "../../domain-core/src/validation.mjs";
import { createProviderBaselineRegistry } from "../../rule-engine/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";
import {
  WORKOS_FEDERATION_PROVIDER_CODE,
  createAuthBroker
} from "../../domain-integrations/src/providers/auth-broker.mjs";

export const ACTIONS = Object.freeze({
  COMPANY_READ: "company.read",
  COMPANY_MANAGE: "company.manage",
  COMPANY_USER_READ: "company_user.read",
  COMPANY_USER_WRITE: "company_user.write",
  DELEGATION_MANAGE: "delegation.manage",
  OBJECT_GRANT_MANAGE: "object_grant.manage",
  ATTEST_CHAIN_MANAGE: "attest_chain.manage",
  APPROVAL_APPROVE: "approval.approve",
  ONBOARDING_MANAGE: "onboarding.manage",
  AUTH_SESSION_REVOKE: "auth.session.revoke",
  AUTH_FACTOR_MANAGE: "auth.factor.manage"
});

export const ONBOARDING_STEP_CODES = Object.freeze([
  "company_profile",
  "registrations",
  "chart_template",
  "vat_setup",
  "fiscal_periods"
]);
export const TENANT_SETUP_STATUSES = Object.freeze(["setup_pending", "active", "suspended"]);
export const MODULE_RISK_CLASSES = Object.freeze(["low", "medium", "high"]);
export const MODULE_ACTIVATION_STATUSES = Object.freeze(["scheduled", "active", "suspended"]);

export const DEFAULT_REGISTRATION_TYPES = Object.freeze(["f_tax", "vat", "employer"]);
export const DEFAULT_VOUCHER_SERIES = Object.freeze(["A", "B", "E", "H", "I"]);
export const DEFAULT_CHART_TEMPLATE_ID = "DSAM-2026";
export const DEFAULT_VAT_SCHEME = "se_standard";
export const DEFAULT_VAT_FILING_PERIOD = "monthly";
export const AUTH_PROVIDER_BASELINES = Object.freeze([
  Object.freeze({
    providerBaselineId: "bankid-signicat-se-2026.1",
    baselineCode: "SE-BANKID-RP-API",
    providerCode: BANKID_PROVIDER_CODE,
    domain: "auth",
    jurisdiction: "SE",
    formatFamily: "bankid_rp_api",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "bankid-signicat-se-2026.1",
    sourceSnapshotDate: "2026-03-27",
    semanticChangeSummary: "BankID authentication baseline for start/collect challenge envelopes and provider response pinning."
  }),
  Object.freeze({
    providerBaselineId: "workos-federation-se-2026.1",
    baselineCode: "SE-ENTERPRISE-FEDERATION-BROKER",
    providerCode: WORKOS_FEDERATION_PROVIDER_CODE,
    domain: "auth",
    jurisdiction: "SE",
    formatFamily: "enterprise_federation_broker",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "workos-federation-se-2026.1",
    sourceSnapshotDate: "2026-03-27",
    semanticChangeSummary: "Enterprise federation broker baseline for sandbox and production WorkOS-mediated SAML/OIDC flows."
  })
]);

export const DEMO_IDS = Object.freeze({
  companyId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000011",
  companyUserId: "00000000-0000-4000-8000-000000000021"
});

export const DEMO_APPROVER_IDS = Object.freeze({
  userId: "00000000-0000-4000-8000-000000000012",
  companyUserId: "00000000-0000-4000-8000-000000000022"
});

export const DEMO_TEAM_IDS = Object.freeze({
  financeOps: "finance_ops",
  payrollOps: "payroll_ops",
  fieldOps: "field_ops"
});

const DEFAULT_OPERATIONAL_TEAMS = Object.freeze([
  Object.freeze({
    teamId: DEMO_TEAM_IDS.financeOps,
    teamCode: "finance_ops",
    label: "Finance operations"
  }),
  Object.freeze({
    teamId: DEMO_TEAM_IDS.payrollOps,
    teamCode: "payroll_ops",
    label: "Payroll operations"
  }),
  Object.freeze({
    teamId: DEMO_TEAM_IDS.fieldOps,
    teamCode: "field_ops",
    label: "Field operations"
  })
]);

export const DEMO_ADMIN_EMAIL = "admin@example.test";
export const DEMO_TOTP_SECRET = "JBSWY3DPEHPK3PXP";
export const DEMO_BANKID_SUBJECT = "197001011233";
export const DEMO_APPROVER_EMAIL = "approver@example.test";
export const DEMO_APPROVER_TOTP_SECRET = "KRSXG5DSNFXGOIDB";
export const LOCAL_TOTP_PROVIDER_CODE = "local-totp";
export const LOCAL_PASSKEY_PROVIDER_CODE = "local-passkey";
export const AUTH_RUNTIME_MODE_CODES = Object.freeze(["trial", "sandbox_internal", "test", "pilot_parallel", "production"]);
export const AUTH_IDENTITY_PROVIDER_CODES = Object.freeze([BANKID_PROVIDER_CODE, WORKOS_FEDERATION_PROVIDER_CODE]);

const AUTH_IDENTITY_MODE_DEFAULTS = Object.freeze({
  trial: Object.freeze({
    callbackRootDomain: "trial-auth.swedish-erp.example.test",
    providerEnvironmentRef: "trial_safe",
    supportsLegalEffect: false,
    testIdentities: Object.freeze({
      [BANKID_PROVIDER_CODE]: Object.freeze([
        Object.freeze({ identityType: "bankid_subject", label: "Trial BankID", value: DEMO_BANKID_SUBJECT })
      ]),
      [WORKOS_FEDERATION_PROVIDER_CODE]: Object.freeze([
        Object.freeze({ identityType: "email", label: "Trial federation user", value: DEMO_APPROVER_EMAIL })
      ])
    })
  }),
  sandbox_internal: Object.freeze({
    callbackRootDomain: "sandbox-auth.swedish-erp.example.test",
    providerEnvironmentRef: "sandbox",
    supportsLegalEffect: false,
    testIdentities: Object.freeze({
      [BANKID_PROVIDER_CODE]: Object.freeze([
        Object.freeze({ identityType: "bankid_subject", label: "Sandbox BankID", value: DEMO_BANKID_SUBJECT })
      ]),
      [WORKOS_FEDERATION_PROVIDER_CODE]: Object.freeze([
        Object.freeze({ identityType: "email", label: "Sandbox federation user", value: DEMO_APPROVER_EMAIL })
      ])
    })
  }),
  test: Object.freeze({
    callbackRootDomain: "test-auth.swedish-erp.example.test",
    providerEnvironmentRef: "test",
    supportsLegalEffect: false,
    testIdentities: Object.freeze({
      [BANKID_PROVIDER_CODE]: Object.freeze([
        Object.freeze({ identityType: "bankid_subject", label: "Test BankID", value: DEMO_BANKID_SUBJECT })
      ]),
      [WORKOS_FEDERATION_PROVIDER_CODE]: Object.freeze([
        Object.freeze({ identityType: "email", label: "Test federation user", value: DEMO_APPROVER_EMAIL })
      ])
    })
  }),
  pilot_parallel: Object.freeze({
    callbackRootDomain: "pilot-auth.swedish-erp.example.test",
    providerEnvironmentRef: "pilot_parallel",
    supportsLegalEffect: false,
    testIdentities: Object.freeze({
      [BANKID_PROVIDER_CODE]: Object.freeze([
        Object.freeze({ identityType: "bankid_subject", label: "Pilot BankID", value: DEMO_BANKID_SUBJECT })
      ]),
      [WORKOS_FEDERATION_PROVIDER_CODE]: Object.freeze([
        Object.freeze({ identityType: "email", label: "Pilot federation user", value: DEMO_APPROVER_EMAIL })
      ])
    })
  }),
  production: Object.freeze({
    callbackRootDomain: "auth.swedish-erp.example.com",
    providerEnvironmentRef: "production",
    supportsLegalEffect: true,
    testIdentities: Object.freeze({
      [BANKID_PROVIDER_CODE]: Object.freeze([]),
      [WORKOS_FEDERATION_PROVIDER_CODE]: Object.freeze([])
    })
  })
});

const AUTH_IDENTITY_PROVIDER_DEFINITIONS = Object.freeze({
  [BANKID_PROVIDER_CODE]: Object.freeze({
    providerCode: BANKID_PROVIDER_CODE,
    brokerCode: "signicat",
    callbackSubdomainPrefix: "bankid",
    callbackPath: "/v1/auth/bankid/callback",
    requiredManagedSecretTypes: Object.freeze(["oauth_client_secret", "webhook_signing_secret"])
  }),
  [WORKOS_FEDERATION_PROVIDER_CODE]: Object.freeze({
    providerCode: WORKOS_FEDERATION_PROVIDER_CODE,
    brokerCode: "workos",
    callbackSubdomainPrefix: "federation",
    callbackPath: "/v1/auth/federation/callback",
    requiredManagedSecretTypes: Object.freeze(["oauth_client_secret", "webhook_signing_secret"])
  })
});

const ACTION_CLASS_FRESHNESS_TTL_SECONDS = Object.freeze({
  identity_session_manage: 600,
  identity_device_trust_manage: 1800,
  identity_federation_complete: 900,
  org_identity_admin: 900,
  support_case_operate: 900,
  review_center_decide: 900,
  review_task_decide: 900,
  regulatory_change_publish: 900
});

const TRUST_LEVEL_FRESHNESS_TTL_SECONDS = Object.freeze({
  authenticated: 8 * 60 * 60,
  mfa: 30 * 60,
  strong_mfa: 15 * 60
});
const AUTH_GUARDRAIL_SCOPES = Object.freeze([
  "login_identifier",
  "totp_factor",
  "passkey_factor",
  "bankid_challenge",
  "federation_request"
]);
const LOGIN_IDENTIFIER_FAILURE_THRESHOLD = 5;
const LOGIN_IDENTIFIER_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_IDENTIFIER_LOCKOUT_MS = 15 * 60 * 1000;
const LOGIN_PENDING_SESSION_LIMIT = 3;
const LOGIN_PENDING_SESSION_LOCKOUT_MS = 5 * 60 * 1000;
const TOTP_FAILURE_THRESHOLD = 5;
const TOTP_FAILURE_WINDOW_MS = 10 * 60 * 1000;
const TOTP_LOCKOUT_MS = 15 * 60 * 1000;
const PASSKEY_FAILURE_THRESHOLD = 5;
const PASSKEY_FAILURE_WINDOW_MS = 10 * 60 * 1000;
const PASSKEY_LOCKOUT_MS = 15 * 60 * 1000;
const BANKID_FAILURE_THRESHOLD = 5;
const BANKID_FAILURE_WINDOW_MS = 10 * 60 * 1000;
const BANKID_LOCKOUT_MS = 15 * 60 * 1000;
const FEDERATION_FAILURE_THRESHOLD = 5;
const FEDERATION_FAILURE_WINDOW_MS = 10 * 60 * 1000;
const FEDERATION_LOCKOUT_MS = 15 * 60 * 1000;

export function createOrgAuthPlatform({
  clock = () => new Date(),
  environmentMode = "test",
  providerEnvironmentRef = environmentMode,
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  secretSealKey = null,
  providerBaselineRegistry = null,
  resolveIdentityModeIsolation = null,
  identityModeCatalog = null
} = {}) {
  const providerBaselines =
    providerBaselineRegistry || createProviderBaselineRegistry({ clock, seedProviderBaselines: AUTH_PROVIDER_BASELINES });
  const normalizedEnvironmentMode =
    typeof environmentMode === "string" && AUTH_RUNTIME_MODE_CODES.includes(environmentMode.trim())
      ? environmentMode.trim()
      : "test";
  const identityIsolationResolver = resolveIdentityModeIsolation;
  const identityIsolationCatalog =
    identityModeCatalog || buildDefaultIdentityModeCatalog({ providerEnvironmentRef });
  const authSecretSealer = createSecretSealer({
    secretSealKey: secretSealKey || `swedish-erp-auth-seal:${normalizedEnvironmentMode}:${providerEnvironmentRef}`,
    keyId: `org-auth:${normalizedEnvironmentMode}:${providerEnvironmentRef}`
  });
  const state = {
    companies: new Map(),
    users: new Map(),
    companyUsers: new Map(),
    teams: new Map(),
    teamIdsByCompany: new Map(),
    teamMemberships: new Map(),
    teamMembershipIdsByCompany: new Map(),
    teamMembershipIdsByTeam: new Map(),
    teamMembershipIdsByCompanyUser: new Map(),
    teamMembershipIdByKey: new Map(),
    delegations: new Map(),
    objectGrants: new Map(),
    approvalChains: new Map(),
    approvalChainSteps: new Map(),
    authSessions: new Map(),
    sessionRevisions: new Map(),
    sessionRevisionIdsBySession: new Map(),
    authFactors: new Map(),
    authGuardrails: new Map(),
    authFactorSecrets: new Map(),
    authChallenges: new Map(),
    authChallengeSecrets: new Map(),
    challengeCompletionReceipts: new Map(),
    challengeReceiptIdsByChallenge: new Map(),
    challengeReceiptIdsBySession: new Map(),
    deviceTrustRecords: new Map(),
    deviceTrustRecordIdByKey: new Map(),
    deviceTrustRecordIdsByCompanyUser: new Map(),
    identityAccounts: new Map(),
    personIdentities: new Map(),
    onboardingRuns: new Map(),
    onboardingStepStates: new Map(),
    companyRegistrations: new Map(),
    companyVatSetups: new Map(),
    accountingPeriods: new Map(),
    companySetupBlueprints: new Map(),
    tenantSetupProfiles: new Map(),
    moduleDefinitions: new Map(),
    moduleActivations: new Map(),
    auditEvents: [],
    environmentMode: normalizedEnvironmentMode,
    providerEnvironmentRef: assertNonEmpty(providerEnvironmentRef, "provider_environment_ref_required"),
    authBroker: createAuthBroker({
      clock,
      environmentMode: normalizedEnvironmentMode
    })
  };

    if (seedDemo) {
      seedDemoState(state, clock, authSecretSealer);
    }

  return {
    actions: ACTIONS,
    onboardingStepCodes: ONBOARDING_STEP_CODES,
    createCompany,
    getCompanyProfile,
    createCompanyUser,
    listCompanyUsers,
    listTeams,
    listTeamMemberships,
    listActiveTeamIds,
    listCompanyRegistrations,
    createDelegation,
    createObjectGrant,
    createApprovalChain,
    getApprovalChain,
    getApprovalChainSnapshot,
    checkAuthorization,
    startLogin,
    logout,
    revokeSession,
    revokeSessionForCompanyOperation,
    beginTotpEnrollment,
    verifyTotp,
    beginPasskeyRegistration,
    finishPasskeyRegistration,
    assertPasskey,
    startBankIdAuthentication,
    collectBankIdAuthentication,
    startFederationAuthentication,
    completeFederationAuthentication,
    getIdentityIsolationSummary,
    createChallenge,
    completeChallenge,
    listChallenges,
    listDeviceTrustRecords,
    trustDevice,
    revokeDevice,
    createOnboardingRun,
    getOnboardingRun,
    getOnboardingChecklist,
    updateOnboardingStep,
    getTenantSetupProfile,
    registerModuleDefinition,
    listModuleDefinitions,
      activateModule,
      listModuleActivations,
    suspendModuleActivation,
      snapshot,
      exportDurableState,
      importDurableState,
        inspectSession,
        listIdentityAccounts,
        listPersonIdentities,
        getTotpCodeForTesting,
        providerBaselineRegistry: providerBaselines,
        getBankIdCompletionTokenForTesting,
        getFederationAuthorizationCodeForTesting
      };

  function createCompany({ legalName, orgNumber, status = "draft", settingsJson = {} } = {}) {
    const now = nowIso();
    const company = {
      companyId: crypto.randomUUID(),
      legalName: assertNonEmpty(legalName, "legal_name_required"),
      orgNumber:
        normalizeOptionalSwedishOrganizationNumber(orgNumber, "organization_number_invalid", { errorFactory: httpError })
        || "",
      status,
      settingsJson: { ...settingsJson },
      createdAt: now,
      updatedAt: now
    };
    state.companies.set(company.companyId, company);
    ensureDefaultOperationalTeams(company.companyId);
    return copy(company);
  }

  function getCompanyProfile({ companyId } = {}) {
    return copy(requireCompany(assertNonEmpty(companyId, "company_id_required")));
  }

  function createCompanyUser({
    sessionToken,
    companyId,
    email,
    displayName,
    roleCode,
    startsAt = nowIso(),
    endsAt = null,
    status = "active",
    requiresMfa
  } = {}) {
    const auth = authorizeFromSession(sessionToken, ACTIONS.COMPANY_USER_WRITE, {
      companyId,
      objectType: "company_user",
      objectId: companyId,
      scopeCode: "company_user"
    });

    const company = requireCompany(companyId);
    const now = nowIso();
    const resolvedRoleCode = assertSupportedRole(roleCode);
    const resolvedRequiresMfa = resolvedRoleCode === "company_admin" ? true : requiresMfa === true;
    const companyUserWindow = resolveWindow({
      startsAt,
      endsAt,
      code: "company_user_window_invalid",
      message: "Company-user start must be on or before the end of the active window."
    });
    const user = findOrCreateUser({ email, displayName });
    const companyUser = {
      companyUserId: crypto.randomUUID(),
      companyId: company.companyId,
      userId: user.userId,
      roleCode: resolvedRoleCode,
      status,
      startsAt: companyUserWindow.startsAt,
      endsAt: companyUserWindow.endsAt,
      isAdmin: resolvedRoleCode === "company_admin",
      requiresMfa: resolvedRequiresMfa,
      metadataJson: {},
      createdAt: now,
      updatedAt: now
    };

    state.companyUsers.set(companyUser.companyUserId, companyUser);
    assignDefaultOperationalTeamMemberships(companyUser);
    provisionDefaultAuthFactors({
      company,
      user,
      companyUser,
      now
    });
    pushAudit({
      companyId,
      actorId: auth.principal.userId,
      action: "org.company_user.created",
      result: "success",
      entityType: "company_user",
      entityId: companyUser.companyUserId,
      explanation: `Created role ${roleCode} for ${user.email}.`
    });

    return decorateCompanyUser(companyUser);
  }

  function listCompanyUsers({ sessionToken, companyId } = {}) {
    authorizeFromSession(sessionToken, ACTIONS.COMPANY_USER_READ, {
      companyId,
      objectType: "company_user_list",
      objectId: companyId,
      scopeCode: "company_user"
    });

    return [...state.companyUsers.values()]
      .filter((companyUser) => companyUser.companyId === companyId)
      .map((companyUser) => decorateCompanyUser(companyUser));
  }

  function listTeams({ sessionToken, companyId } = {}) {
    authorizeFromSession(sessionToken, ACTIONS.COMPANY_USER_READ, {
      companyId,
      objectType: "team",
      objectId: companyId,
      scopeCode: "company_user"
    });

    return (state.teamIdsByCompany.get(assertNonEmpty(companyId, "company_id_required")) || [])
      .map((teamId) => state.teams.get(buildTeamKey(companyId, teamId)))
      .filter(Boolean)
      .map(copy);
  }

  function listTeamMemberships({ sessionToken, companyId, teamId = null, companyUserId = null, userId = null } = {}) {
    authorizeFromSession(sessionToken, ACTIONS.COMPANY_USER_READ, {
      companyId,
      objectType: "team_membership",
      objectId: teamId || companyUserId || companyId,
      scopeCode: "company_user"
    });

    const resolvedCompanyId = assertNonEmpty(companyId, "company_id_required");
    const resolvedTeamId = typeof teamId === "string" && teamId.trim().length > 0 ? teamId.trim() : null;
    const resolvedCompanyUserId = typeof companyUserId === "string" && companyUserId.trim().length > 0 ? companyUserId.trim() : null;
    const resolvedUserId = typeof userId === "string" && userId.trim().length > 0 ? userId.trim() : null;
    const now = currentDate();

    return (state.teamMembershipIdsByCompany.get(resolvedCompanyId) || [])
      .map((teamMembershipId) => state.teamMemberships.get(teamMembershipId))
      .filter(Boolean)
      .filter((membership) => (resolvedTeamId ? membership.teamId === resolvedTeamId : true))
      .filter((membership) => (resolvedCompanyUserId ? membership.companyUserId === resolvedCompanyUserId : true))
      .filter((membership) => (resolvedUserId ? membership.userId === resolvedUserId : true))
      .filter((membership) => membership.status === "active" && isWindowOpen(membership, now))
      .sort((left, right) => left.teamId.localeCompare(right.teamId) || left.companyUserId.localeCompare(right.companyUserId))
      .map((membership) => decorateTeamMembership(membership));
  }

  function listActiveTeamIds({ companyId, companyUserId = null, userId = null, at = currentDate() } = {}) {
    const resolvedCompanyId = assertNonEmpty(companyId, "company_id_required");
    const resolvedCompanyUserId =
      typeof companyUserId === "string" && companyUserId.trim().length > 0 ? companyUserId.trim() : null;
    const resolvedUserId = typeof userId === "string" && userId.trim().length > 0 ? userId.trim() : null;
    if (!resolvedCompanyUserId && !resolvedUserId) {
      return [];
    }
    const teamIds = (state.teamMembershipIdsByCompany.get(resolvedCompanyId) || [])
      .map((teamMembershipId) => state.teamMemberships.get(teamMembershipId))
      .filter(Boolean)
      .filter((membership) => membership.status === "active")
      .filter((membership) => isWindowOpen(membership, at))
      .filter((membership) => {
        if (resolvedCompanyUserId && membership.companyUserId === resolvedCompanyUserId) {
          return true;
        }
        return resolvedUserId ? membership.userId === resolvedUserId : false;
      })
      .map((membership) => membership.teamId);
    return [...new Set(teamIds)].sort();
  }

  function listCompanyRegistrations({ companyId, registrationType = null } = {}) {
    const resolvedCompanyId = assertNonEmpty(companyId, "company_id_required");
    const resolvedRegistrationType =
      typeof registrationType === "string" && registrationType.trim().length > 0 ? registrationType.trim() : null;
    return [...state.companyRegistrations.values()]
      .filter((registration) => registration.companyId === resolvedCompanyId)
      .filter((registration) => (resolvedRegistrationType ? registration.registrationType === resolvedRegistrationType : true))
      .sort((left, right) => left.registrationType.localeCompare(right.registrationType))
      .map(copy);
  }

  function createDelegation({
    sessionToken,
    companyId,
    fromCompanyUserId,
    toCompanyUserId,
    scopeCode,
    permissionCode,
    resourceType = null,
    resourceId = null,
    startsAt,
    endsAt = null,
    status = "active"
  } = {}) {
    const auth = authorizeFromSession(sessionToken, ACTIONS.DELEGATION_MANAGE, {
      companyId,
      objectType: "delegation",
      objectId: companyId,
      scopeCode: "delegation"
    });

    const fromCompanyUser = requireCompanyUser(fromCompanyUserId);
    const toCompanyUser = requireCompanyUser(toCompanyUserId);
    if (fromCompanyUser.companyId !== companyId || toCompanyUser.companyId !== companyId) {
      throw httpError(400, "delegation_company_mismatch", "Delegation actors must belong to the same company.");
    }
    const delegationWindow = resolveWindow({
      startsAt: startsAt || nowIso(),
      endsAt,
      code: "delegation_window_invalid",
      message: "Delegation start must be on or before the end of the delegated window."
    });

    const delegation = {
      delegationId: crypto.randomUUID(),
      companyId,
      fromCompanyUserId,
      toCompanyUserId,
      scopeCode: assertNonEmpty(scopeCode, "delegation_scope_required"),
      permissionCode: permissionCode || null,
      resourceType,
      resourceId,
      startsAt: delegationWindow.startsAt,
      endsAt: delegationWindow.endsAt,
      status,
      metadataJson: {},
      createdAt: nowIso()
    };

    state.delegations.set(delegation.delegationId, delegation);
    pushAudit({
      companyId,
      actorId: auth.principal.userId,
      action: "org.delegation.created",
      result: "success",
      entityType: "delegation",
      entityId: delegation.delegationId,
      explanation: `Delegated ${permissionCode || scopeCode} from ${fromCompanyUserId} to ${toCompanyUserId}.`
    });

    return copy(delegation);
  }

  function createObjectGrant({
    sessionToken,
    companyId,
    companyUserId,
    permissionCode,
    objectType,
    objectId,
    startsAt = nowIso(),
    endsAt = null,
    status = "active"
  } = {}) {
    const auth = authorizeFromSession(sessionToken, ACTIONS.OBJECT_GRANT_MANAGE, {
      companyId,
      objectType: "object_grant",
      objectId: companyId,
      scopeCode: "object_grant"
    });

    const companyUser = requireCompanyUser(companyUserId);
    if (companyUser.companyId !== companyId) {
      throw httpError(400, "object_grant_company_mismatch", "Object grants must stay inside the company boundary.");
    }
    const objectGrantWindow = resolveWindow({
      startsAt,
      endsAt,
      code: "object_grant_window_invalid",
      message: "Object-grant start must be on or before the end of the grant window."
    });

    const objectGrant = {
      objectGrantId: crypto.randomUUID(),
      companyId,
      companyUserId,
      permissionCode: assertNonEmpty(permissionCode, "permission_code_required"),
      objectType: assertNonEmpty(objectType, "object_type_required"),
      objectId: assertNonEmpty(objectId, "object_id_required"),
      startsAt: objectGrantWindow.startsAt,
      endsAt: objectGrantWindow.endsAt,
      status,
      createdAt: nowIso()
    };

    state.objectGrants.set(objectGrant.objectGrantId, objectGrant);
    pushAudit({
      companyId,
      actorId: auth.principal.userId,
      action: "org.object_grant.created",
      result: "success",
      entityType: "object_grant",
      entityId: objectGrant.objectGrantId,
      explanation: `Granted ${permissionCode} on ${objectType}:${objectId} to ${companyUserId}.`
    });

    return copy(objectGrant);
  }

  function createApprovalChain({ sessionToken, companyId, scopeCode, objectType, steps } = {}) {
    const auth = authorizeFromSession(sessionToken, ACTIONS.ATTEST_CHAIN_MANAGE, {
      companyId,
      objectType: "attest_chain",
      objectId: companyId,
      scopeCode: "attest_chain"
    });

    if (!Array.isArray(steps) || steps.length === 0) {
      throw httpError(400, "approval_chain_steps_required", "Approval chains require at least one step.");
    }

    const approvalChainId = crypto.randomUUID();
    const resolvedScopeCode = assertNonEmpty(scopeCode, "approval_chain_scope_required");
    const resolvedObjectType = assertNonEmpty(objectType, "approval_chain_object_type_required");

    const chainSteps = steps.map((step, index) => {
      if (!step.approverRoleCode && !step.approverCompanyUserId) {
        throw httpError(400, "approval_chain_step_target_required", "Each approval step needs a role or explicit company user target.");
      }
      if (step.approverRoleCode) {
        assertSupportedRole(step.approverRoleCode);
      }
      if (step.approverCompanyUserId) {
        const approverCompanyUser = requireCompanyUser(step.approverCompanyUserId);
        if (approverCompanyUser.companyId !== companyId) {
          throw httpError(
            400,
            "approval_chain_step_company_mismatch",
            "Approval-chain step assignees must belong to the same company."
          );
        }
      }
      return {
        approvalChainStepId: crypto.randomUUID(),
        approvalChainId,
        stepOrder: index + 1,
        approverRoleCode: step.approverRoleCode || null,
        approverCompanyUserId: step.approverCompanyUserId || null,
        delegationAllowed: step.delegationAllowed !== false,
        metadataJson: { label: step.label || `step_${index + 1}` }
      };
    });

    const approvalChain = {
      approvalChainId,
      companyId,
      scopeCode: resolvedScopeCode,
      objectType: resolvedObjectType,
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    state.approvalChains.set(approvalChain.approvalChainId, approvalChain);
    state.approvalChainSteps.set(approvalChain.approvalChainId, chainSteps);
    pushAudit({
      companyId,
      actorId: auth.principal.userId,
      action: "org.attest_chain.created",
      result: "success",
      entityType: "approval_chain",
      entityId: approvalChain.approvalChainId,
      explanation: `Created approval chain for ${objectType}/${scopeCode}.`
    });

    return loadApprovalChain({ approvalChainId: approvalChain.approvalChainId });
  }

  function getApprovalChain({ sessionToken, approvalChainId } = {}) {
    const approvalChain = loadApprovalChain({ approvalChainId });
    authorizeFromSession(sessionToken, ACTIONS.COMPANY_USER_READ, {
      companyId: approvalChain.companyId,
      objectType: "attest_chain",
      objectId: approvalChain.approvalChainId,
      scopeCode: "attest_chain"
    });
    return approvalChain;
  }

  function getApprovalChainSnapshot({ approvalChainId } = {}) {
    return loadApprovalChain({ approvalChainId });
  }

  function loadApprovalChain({ approvalChainId } = {}) {
    const approvalChain = state.approvalChains.get(approvalChainId);
    if (!approvalChain) {
      throw httpError(404, "approval_chain_not_found", "Approval chain was not found.");
    }
    return {
      ...copy(approvalChain),
      steps: copy(state.approvalChainSteps.get(approvalChainId) || [])
    };
  }

  function checkAuthorization({ sessionToken, action, resource } = {}) {
    const { principal } = requireSession(sessionToken, { allowPending: false });
    const decision = authorizeAction({
      principal,
      action,
      resource,
      delegations: [...state.delegations.values()],
      objectGrants: [...state.objectGrants.values()],
      now: currentDate()
    });

    return {
      principal,
      decision
    };
  }

  function startLogin({ companyId, email } = {}) {
    const resolvedCompanyId = assertNonEmpty(companyId, "company_id_required");
    const normalizedEmail = normalizeEmailAddress(email);
    const loginGuardrail = resolveAuthGuardrail({
      scope: "login_identifier",
      key: createLoginIdentifierGuardrailKey(resolvedCompanyId, normalizedEmail),
      companyId: resolvedCompanyId,
      normalizedEmail
    });
    assertAuthGuardrailOpen({
      guardrail: loginGuardrail,
      windowMs: LOGIN_IDENTIFIER_FAILURE_WINDOW_MS,
      code: "login_temporarily_locked",
      message: "Too many failed login attempts. Try again later."
    });
    let companyUser;
    try {
      companyUser = findActiveCompanyUser(resolvedCompanyId, normalizedEmail);
    } catch (error) {
      if (error?.code === "user_not_found" || error?.code === "company_user_not_found") {
        const failureGuardrail = recordAuthGuardrailFailure(loginGuardrail, {
          windowMs: LOGIN_IDENTIFIER_FAILURE_WINDOW_MS,
          threshold: LOGIN_IDENTIFIER_FAILURE_THRESHOLD,
          lockoutMs: LOGIN_IDENTIFIER_LOCKOUT_MS
        });
        pushAudit({
          companyId: resolvedCompanyId,
          actorId: `unresolved:${normalizedEmail}`,
          action: "auth.login.started",
          result: failureGuardrail.lockedUntil ? "blocked" : "denied",
          entityType: "auth_guardrail",
          entityId: failureGuardrail.guardrailId,
          explanation: failureGuardrail.lockedUntil
            ? "Login temporarily locked after repeated unresolved login attempts."
            : "Login denied because no active company user matched the supplied identifier.",
          metadata: {
            scope: failureGuardrail.scope,
            normalizedEmail,
            failureCount: failureGuardrail.failureCount,
            lockedUntil: failureGuardrail.lockedUntil,
            originalErrorCode: error.code
          }
        });
        if (failureGuardrail.lockedUntil) {
          throw httpError(429, "login_temporarily_locked", "Too many failed login attempts. Try again later.");
        }
      }
      throw error;
    }
    enforcePendingLoginSessionLimit({
      guardrail: loginGuardrail,
      companyUser,
      normalizedEmail
    });
    markAuthGuardrailSuccess(loginGuardrail, {
      windowMs: LOGIN_IDENTIFIER_FAILURE_WINDOW_MS
    });
    const now = currentDate();
    const requiredFactorCount = companyUser.requiresMfa ? 2 : requiredFactorCountForRoles([companyUser.roleCode]);
    const sessionToken = issueOpaqueToken();
    const session = {
      sessionId: crypto.randomUUID(),
      userId: companyUser.userId,
      companyId,
      companyUserId: companyUser.companyUserId,
      tokenHash: hashOpaqueToken(sessionToken),
      status: "pending",
      requiredFactorCount,
      amr: [],
      freshTrustByActionClass: {},
      freshTrustByTrustLevel: {},
      sessionRevisionId: null,
      sessionRevisionNumber: 0,
      issuedAt: timestamp(now),
      expiresAt: timestamp(new Date(now.getTime() + 8 * 60 * 60 * 1000)),
      revokedAt: null,
      lastVerifiedAt: null,
      lastUsedAt: null
    };

    state.authSessions.set(session.sessionId, session);
    createSessionRevision(session, {
      reasonCode: "login_started"
    });
    pushAudit({
      companyId: resolvedCompanyId,
      actorId: companyUser.userId,
      action: "auth.login.started",
      result: "pending",
      entityType: "auth_session",
      entityId: session.sessionId,
      explanation: `Login started for ${email}.`
    });

    return {
      sessionToken,
      session: publicSession(session),
      availableMethods: listAvailableMethods(companyUser.companyUserId)
    };
  }

  function logout({ sessionToken } = {}) {
    const { session, principal } = requireSession(sessionToken, { allowPending: true });
    session.status = "revoked";
    session.revokedAt = nowIso();
    createSessionRevision(session, {
      reasonCode: "logout"
    });
    pushAudit({
      companyId: session.companyId,
      actorId: principal.userId,
      action: "auth.logout",
      result: "success",
      entityType: "auth_session",
      entityId: session.sessionId,
      explanation: "Session revoked by logout."
    });
    return publicSession(session);
  }

  function revokeSession({ sessionToken, targetSessionId } = {}) {
    const sourceSession = requireSession(sessionToken).session;
    const auth = authorizeFromSession(sessionToken, ACTIONS.AUTH_SESSION_REVOKE, {
      companyId: sourceSession.companyId,
      objectType: "auth_session",
      objectId: targetSessionId,
      scopeCode: "auth_session"
    });
    const targetSession = state.authSessions.get(targetSessionId);
    if (!targetSession || targetSession.companyId !== auth.principal.companyId) {
      throw httpError(404, "auth_session_not_found", "Session was not found inside the current company.");
    }
    targetSession.status = "revoked";
    targetSession.revokedAt = nowIso();
    createSessionRevision(targetSession, {
      reasonCode: "session_revoked"
    });
    pushAudit({
      companyId: targetSession.companyId,
      actorId: auth.principal.userId,
      action: "auth.session.revoked",
      result: "success",
      entityType: "auth_session",
      entityId: targetSession.sessionId,
      explanation: "Session revoked by administrator."
    });
    return publicSession(targetSession);
  }

  function revokeSessionForCompanyOperation({
    companyId,
    targetSessionId,
    actorId,
    operationCode = "company_operation",
    explanation = "Session revoked by company operation."
  } = {}) {
    const resolvedCompanyId = assertNonEmpty(companyId, "company_id_required");
    const resolvedActorId = assertNonEmpty(actorId, "actor_id_required");
    const resolvedTargetSessionId = assertNonEmpty(targetSessionId, "target_session_id_required");
    const targetSession = state.authSessions.get(resolvedTargetSessionId);
    if (!targetSession || targetSession.companyId !== resolvedCompanyId) {
      throw httpError(404, "auth_session_not_found", "Session was not found inside the current company.");
    }
    targetSession.status = "revoked";
    targetSession.revokedAt = nowIso();
    createSessionRevision(targetSession, {
      reasonCode: "session_revoked"
    });
    pushAudit({
      companyId: targetSession.companyId,
      actorId: resolvedActorId,
      action: "auth.session.revoked",
      result: "success",
      entityType: "auth_session",
      entityId: targetSession.sessionId,
      explanation,
      metadata: {
        operationCode
      }
    });
    return publicSession(targetSession);
  }

  function beginTotpEnrollment({ sessionToken, label } = {}) {
    const { session, principal } = requireSession(sessionToken, { allowPending: false });
    const enrollment = generateTotpEnrollment({
      label: label || principal.userId
    });
    const factor = {
      factorId: crypto.randomUUID(),
      companyUserId: session.companyUserId,
      userId: session.userId,
      factorType: "totp",
      status: "pending_enrollment",
      secretRef: null,
      credentialId: null,
      publicKey: null,
      providerSubject: null,
      deviceName: label || "Authenticator app",
      verifiedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    writeAuthFactorSecret(factor, enrollment.secret);
    state.authFactors.set(factor.factorId, factor);
    pushAudit({
      companyId: session.companyId,
      actorId: principal.userId,
      action: "auth.mfa.totp.enrollment_started",
      result: "pending",
      entityType: "auth_factor",
      entityId: factor.factorId,
      explanation: "TOTP enrollment started."
    });
    return {
      factorId: factor.factorId,
      secret: enrollment.secret,
      otpauthUrl: enrollment.otpauthUrl
    };
  }

  function verifyTotp({ sessionToken, code, factorId = null, actionClass = null, challengeId = null, deviceFingerprint = null } = {}) {
    const { session, principal } = requireSession(sessionToken, { allowPending: true });
    const factor =
      factorId !== null ? state.authFactors.get(factorId) : findFactor(session.companyUserId, "totp", ["active"]);

    if (!factor || factor.companyUserId !== session.companyUserId || factor.factorType !== "totp") {
      throw httpError(404, "totp_factor_not_found", "No matching TOTP factor was found.");
    }
    const totpGuardrail = resolveAuthGuardrail({
      scope: "totp_factor",
      key: createTotpFactorGuardrailKey(session.companyUserId, factor.factorId),
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      factorId: factor.factorId
    });
    assertAuthGuardrailOpen({
      guardrail: totpGuardrail,
      windowMs: TOTP_FAILURE_WINDOW_MS,
      code: "totp_temporarily_locked",
      message: "Too many invalid TOTP attempts. Try again later."
    });

    if (!verifyTotpCode({ secret: readAuthFactorSecret(factor), code, now: currentDate() })) {
      const failureGuardrail = recordAuthGuardrailFailure(totpGuardrail, {
        windowMs: TOTP_FAILURE_WINDOW_MS,
        threshold: TOTP_FAILURE_THRESHOLD,
        lockoutMs: TOTP_LOCKOUT_MS
      });
      if (failureGuardrail.lockedUntil) {
        revokeSessionForSecurityLockout(session, {
          reasonCode: "totp_temporarily_locked"
        });
      }
      pushAudit({
        companyId: session.companyId,
        actorId: principal.userId,
        action: "auth.mfa.totp.verify",
        result: failureGuardrail.lockedUntil ? "blocked" : "denied",
        entityType: "auth_factor",
        entityId: factor.factorId,
        explanation: failureGuardrail.lockedUntil
          ? "TOTP verification temporarily locked after repeated invalid codes."
          : "Provided TOTP code was invalid.",
        metadata: {
          failureCount: failureGuardrail.failureCount,
          lockedUntil: failureGuardrail.lockedUntil
        }
      });
      if (failureGuardrail.lockedUntil) {
        throw httpError(429, "totp_temporarily_locked", "Too many invalid TOTP attempts. Try again later.");
      }
      throw httpError(403, "totp_code_invalid", "The provided TOTP code was invalid.");
    }
    markAuthGuardrailSuccess(totpGuardrail, {
      windowMs: TOTP_FAILURE_WINDOW_MS
    });

    if (factor.status === "pending_enrollment") {
      factor.status = "active";
      factor.verifiedAt = nowIso();
      factor.updatedAt = nowIso();
    }

    const challenge = challengeId ? consumeOwnedChallenge({ challengeId, session, allowedTypes: ["totp_step_up"] }) : null;
    const completion = completeSessionFactor(session, "totp", {
      actionClass: actionClass || challenge?.payloadJson?.actionClass || null,
      challengeId: challenge?.challengeId || null,
      challengeType: challenge?.challengeType || "totp",
      factorId: factor.factorId,
      deviceName: factor.deviceName,
      deviceFingerprint
    });
    upsertIdentityAccount({
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      providerCode: LOCAL_TOTP_PROVIDER_CODE,
      factorType: "totp",
      credentialId: factor.factorId,
      lastVerifiedAt: factor.verifiedAt || nowIso(),
      metadataJson: {
        factorId: factor.factorId,
        deviceName: factor.deviceName
      }
    });
    pushAudit({
      companyId: session.companyId,
      actorId: principal.userId,
      action: "auth.mfa.totp.verify",
      result: "success",
      entityType: "auth_factor",
      entityId: factor.factorId,
      explanation: "TOTP verified."
    });

    return {
      factor: copy(stripSecret(factor)),
      session: publicSession(session),
      receipt: completion.receipt
    };
  }

  function beginPasskeyRegistration({ sessionToken, deviceName = "Security key" } = {}) {
    const { session, principal } = requireSession(sessionToken, { allowPending: false });
    const challenge = createPasskeyChallenge();
    const challengeState = {
      challengeId: challenge.challengeId,
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      challengeType: "passkey_registration",
      status: "pending",
      challenge: challenge.challenge,
      orderRef: null,
      expiresAt: timestamp(new Date(currentDate().getTime() + 5 * 60 * 1000)),
      consumedAt: null,
      payloadJson: { deviceName }
    };
    persistAuthChallenge(challengeState, challenge.challenge);
    pushAudit({
      companyId: session.companyId,
      actorId: principal.userId,
      action: "auth.passkey.registration_started",
      result: "pending",
      entityType: "auth_challenge",
      entityId: challenge.challengeId,
      explanation: "Passkey registration challenge created."
    });
    return {
      challengeId: challenge.challengeId,
      challenge: challenge.challenge,
      rpId: "local.swedish-erp.test",
      userHandle: session.companyUserId,
      deviceName
    };
  }

  function finishPasskeyRegistration({ sessionToken, challengeId, credentialId, publicKey, deviceName } = {}) {
    const { session, principal } = requireSession(sessionToken, { allowPending: false });
    const challenge = requireChallenge(challengeId, "passkey_registration");
    if (challenge.companyUserId !== session.companyUserId) {
      throw httpError(403, "passkey_challenge_scope_mismatch", "Passkey challenge belongs to another user.");
    }
    const resolvedCredentialId = assertNonEmpty(credentialId, "passkey_credential_required");
    const resolvedPublicKey = assertNonEmpty(publicKey, "passkey_public_key_required");
    challenge.status = "consumed";
    challenge.consumedAt = nowIso();

    const factor = {
      factorId: crypto.randomUUID(),
      companyUserId: session.companyUserId,
      userId: session.userId,
      factorType: "passkey",
      status: "active",
      secretRef: null,
      credentialId: resolvedCredentialId,
      publicKey: resolvedPublicKey,
      providerSubject: null,
      deviceName: deviceName || challenge.payloadJson.deviceName || "Security key",
      verifiedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.authFactors.set(factor.factorId, factor);
    upsertIdentityAccount({
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      providerCode: LOCAL_PASSKEY_PROVIDER_CODE,
      factorType: "passkey",
      credentialId: factor.credentialId,
      lastVerifiedAt: factor.verifiedAt,
      metadataJson: {
        factorId: factor.factorId,
        deviceName: factor.deviceName
      }
    });

    pushAudit({
      companyId: session.companyId,
      actorId: principal.userId,
      action: "auth.passkey.registered",
      result: "success",
      entityType: "auth_factor",
      entityId: factor.factorId,
      explanation: "Passkey registered."
    });

    return copy(stripSecret(factor));
  }

  function assertPasskey({ sessionToken, credentialId, assertion, actionClass = null, challengeId = null, deviceFingerprint = null } = {}) {
    const { session, principal } = requireSession(sessionToken, { allowPending: true });
    const factor = [...state.authFactors.values()].find(
      (candidate) =>
        candidate.companyUserId === session.companyUserId &&
        candidate.factorType === "passkey" &&
        candidate.status === "active" &&
        candidate.credentialId === credentialId
    );

    if (!factor) {
      throw httpError(404, "passkey_not_found", "No passkey credential matched the supplied credential id.");
    }
    const passkeyGuardrail = resolveAuthGuardrail({
      scope: "passkey_factor",
      key: createPasskeyFactorGuardrailKey(session.companyUserId, factor.factorId),
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      factorId: factor.factorId
    });
    assertAuthGuardrailOpen({
      guardrail: passkeyGuardrail,
      windowMs: PASSKEY_FAILURE_WINDOW_MS,
      code: "passkey_temporarily_locked",
      message: "Too many invalid passkey assertions. Try again later."
    });

    if (assertion !== `passkey:${credentialId}`) {
      const failureGuardrail = recordAuthGuardrailFailure(passkeyGuardrail, {
        windowMs: PASSKEY_FAILURE_WINDOW_MS,
        threshold: PASSKEY_FAILURE_THRESHOLD,
        lockoutMs: PASSKEY_LOCKOUT_MS
      });
      if (failureGuardrail.lockedUntil) {
        revokeSessionForSecurityLockout(session, {
          reasonCode: "passkey_temporarily_locked"
        });
      }
      pushAudit({
        companyId: session.companyId,
        actorId: principal.userId,
        action: "auth.passkey.assertion",
        result: failureGuardrail.lockedUntil ? "blocked" : "denied",
        entityType: "auth_factor",
        entityId: factor.factorId,
        explanation: failureGuardrail.lockedUntil
          ? "Passkey assertion temporarily locked after repeated invalid payloads."
          : "Passkey assertion payload was invalid.",
        metadata: {
          failureCount: failureGuardrail.failureCount,
          lockedUntil: failureGuardrail.lockedUntil
        }
      });
      if (failureGuardrail.lockedUntil) {
        throw httpError(429, "passkey_temporarily_locked", "Too many invalid passkey assertions. Try again later.");
      }
      throw httpError(403, "passkey_assertion_invalid", "Passkey assertion was invalid.");
    }
    markAuthGuardrailSuccess(passkeyGuardrail, {
      windowMs: PASSKEY_FAILURE_WINDOW_MS
    });

    const challenge = challengeId ? consumeOwnedChallenge({ challengeId, session, allowedTypes: ["passkey_assertion"] }) : null;
    const completion = completeSessionFactor(session, "passkey", {
      actionClass: actionClass || challenge?.payloadJson?.actionClass || null,
      challengeId: challenge?.challengeId || null,
      challengeType: challenge?.challengeType || "passkey",
      factorId: factor.factorId,
      credentialId: factor.credentialId,
      deviceName: factor.deviceName,
      deviceFingerprint
    });
    pushAudit({
      companyId: session.companyId,
      actorId: principal.userId,
      action: "auth.passkey.assertion",
      result: "success",
      entityType: "auth_factor",
      entityId: factor.factorId,
      explanation: "Passkey assertion accepted."
    });

    return {
      factor: copy(stripSecret(factor)),
      session: publicSession(session),
      receipt: completion.receipt
    };
  }

  function startBankIdAuthentication({ sessionToken, actionClass = null } = {}) {
    const { session, principal } = requireSession(sessionToken, { allowPending: true });
    const factor = findFactor(session.companyUserId, "bankid", ["active"]);
    if (!factor) {
      throw httpError(404, "bankid_identity_missing", "No BankID identity is enrolled for this company user.");
    }
    const isolationSummary = evaluateIdentityModeIsolation({
      state,
      identityIsolationCatalog,
      identityIsolationResolver,
      sessionToken,
      companyId: session.companyId,
      providerCode: BANKID_PROVIDER_CODE
    });
    assertIdentityModeIsolationReady(isolationSummary, "BankID");

    const providerResult = state.authBroker.startBankIdChallenge({
      sessionId: session.sessionId,
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      providerSubject: factor.providerSubject
    });
    const providerBaselineRef = resolveBankIdProviderBaselineRef(providerBaselines, currentDate());

    const challenge = {
      challengeId: providerResult.orderRef,
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      challengeType: "bankid_auth",
      status: "pending",
      challenge: providerResult.autoStartToken,
      orderRef: providerResult.orderRef,
      expiresAt: timestamp(new Date(currentDate().getTime() + 5 * 60 * 1000)),
      consumedAt: null,
      payloadJson: {
        providerCode: BANKID_PROVIDER_CODE,
        brokerCode: providerResult.brokerCode,
        providerMode: providerResult.providerMode,
        providerOrderRef: providerResult.providerOrderRef,
        actionClass,
        providerBaselineId: providerBaselineRef.providerBaselineId,
        providerBaselineCode: providerBaselineRef.baselineCode,
        providerBaselineVersion: providerBaselineRef.providerBaselineVersion,
        providerBaselineChecksum: providerBaselineRef.providerBaselineChecksum
      }
    };
    persistAuthChallenge(challenge, providerResult.autoStartToken);

    pushAudit({
      companyId: session.companyId,
      actorId: principal.userId,
      action: "auth.bankid.started",
      result: "pending",
      entityType: "auth_challenge",
      entityId: challenge.challengeId,
      explanation: "BankID authentication started."
    });

    return {
      ...providerResult,
      identityIsolation: projectIdentityIsolationState(isolationSummary),
      providerBaselineId: providerBaselineRef.providerBaselineId,
      providerBaselineCode: providerBaselineRef.baselineCode,
      providerBaselineVersion: providerBaselineRef.providerBaselineVersion,
      providerBaselineChecksum: providerBaselineRef.providerBaselineChecksum,
      providerBaselineRef
    };
  }

  function collectBankIdAuthentication({ sessionToken, orderRef, completionToken, actionClass = null, deviceFingerprint = null } = {}) {
    const { session, principal } = requireSession(sessionToken, { allowPending: true });
    const challenge = requireChallenge(orderRef, "bankid_auth");
    if (challenge.companyUserId !== session.companyUserId) {
      throw httpError(403, "bankid_scope_mismatch", "BankID challenge belongs to another user.");
    }
    const bankIdGuardrail = resolveAuthGuardrail({
      scope: "bankid_challenge",
      key: createBankIdChallengeGuardrailKey(session.companyUserId, challenge.challengeId),
      companyId: session.companyId,
      companyUserId: session.companyUserId
    });
    assertAuthGuardrailOpen({
      guardrail: bankIdGuardrail,
      windowMs: BANKID_FAILURE_WINDOW_MS,
      code: "bankid_temporarily_locked",
      message: "Too many invalid BankID completion attempts. Try again later."
    });
    let providerResult;
    try {
      providerResult = state.authBroker.collectBankIdChallenge({
        orderRef,
        completionToken
      });
    } catch (error) {
      if (error?.code === "bankid_completion_token_invalid") {
        const failureGuardrail = recordAuthGuardrailFailure(bankIdGuardrail, {
          windowMs: BANKID_FAILURE_WINDOW_MS,
          threshold: BANKID_FAILURE_THRESHOLD,
          lockoutMs: BANKID_LOCKOUT_MS
        });
        if (failureGuardrail.lockedUntil) {
          revokeSessionForSecurityLockout(session, {
            reasonCode: "bankid_temporarily_locked"
          });
        }
        pushAudit({
          companyId: session.companyId,
          actorId: principal.userId,
          action: "auth.bankid.completed",
          result: failureGuardrail.lockedUntil ? "blocked" : "denied",
          entityType: "auth_challenge",
          entityId: orderRef,
          explanation: failureGuardrail.lockedUntil
            ? "BankID completion temporarily locked after repeated invalid completion tokens."
            : "BankID completion token was invalid.",
          metadata: {
            failureCount: failureGuardrail.failureCount,
            lockedUntil: failureGuardrail.lockedUntil
          }
        });
        if (failureGuardrail.lockedUntil) {
          throw httpError(429, "bankid_temporarily_locked", "Too many invalid BankID completion attempts. Try again later.");
        }
      }
      throw error;
    }
    markAuthGuardrailSuccess(bankIdGuardrail, {
      windowMs: BANKID_FAILURE_WINDOW_MS
    });
    const providerBaselineRef = resolveBankIdProviderBaselineRef(providerBaselines, currentDate());
    if (providerResult.status !== "complete") {
      throw httpError(409, "bankid_not_complete", "BankID flow has not completed yet.");
    }

    challenge.status = "consumed";
    challenge.consumedAt = nowIso();
    const completion = completeSessionFactor(session, "bankid", {
      actionClass: actionClass || challenge.payloadJson?.actionClass || null,
      challengeId: challenge.challengeId,
      challengeType: challenge.challengeType,
      providerSubject: providerResult.providerSubject,
      deviceName: findFactor(session.companyUserId, "bankid", ["active"])?.deviceName || "BankID",
      deviceFingerprint
    });
    upsertIdentityAccount({
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      providerCode: BANKID_PROVIDER_CODE,
      factorType: "bankid",
      providerSubject: providerResult.providerSubject,
      lastVerifiedAt: challenge.consumedAt
    });
    upsertPersonIdentity({
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      providerCode: BANKID_PROVIDER_CODE,
      providerSubject: providerResult.providerSubject,
      email: principal.email,
      displayName: principal.displayName
    });
    pushAudit({
      companyId: session.companyId,
      actorId: principal.userId,
      action: "auth.bankid.completed",
      result: "success",
      entityType: "auth_challenge",
      entityId: orderRef,
      explanation: "BankID authentication completed."
    });

    return {
      provider: {
        ...providerResult,
        providerBaselineId: providerBaselineRef.providerBaselineId,
        providerBaselineCode: providerBaselineRef.baselineCode,
        providerBaselineVersion: providerBaselineRef.providerBaselineVersion,
        providerBaselineChecksum: providerBaselineRef.providerBaselineChecksum,
        providerBaselineRef
      },
      session: publicSession(session),
      receipt: completion.receipt
    };
  }

  function startFederationAuthentication({
    sessionToken = null,
    companyId = null,
    email = null,
    connectionId = "default-enterprise-sso",
    loginHint = null,
    redirectUri = null
  } = {}) {
    let loginResult = null;
    if (sessionToken == null) {
      loginResult = startLogin({
        companyId: assertNonEmpty(companyId, "company_id_required"),
        email: assertNonEmpty(email, "email_required")
      });
      sessionToken = loginResult.sessionToken;
    }
    const { session, principal } = requireSession(sessionToken, { allowPending: true });
    const isolationSummary = evaluateIdentityModeIsolation({
      state,
      identityIsolationCatalog,
      identityIsolationResolver,
      sessionToken,
      companyId: session.companyId,
      providerCode: WORKOS_FEDERATION_PROVIDER_CODE
    });
    assertIdentityModeIsolationReady(isolationSummary, "Federation");
    const resolvedRedirectUri = normalizeOptionalKeyPart(redirectUri) || isolationSummary.activeProfile.redirectUri;
    const providerResult = state.authBroker.startFederationAuthorization({
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      connectionId,
      loginHint: loginHint || principal.email,
      redirectUri: resolvedRedirectUri
    });
    const providerBaselineRef = resolveFederationProviderBaselineRef(providerBaselines, currentDate());
    const challenge = {
      challengeId: providerResult.authRequestId,
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      challengeType: "federation_auth",
      status: "pending",
      challenge: providerResult.state,
      orderRef: providerResult.authRequestId,
      expiresAt: timestamp(new Date(currentDate().getTime() + 10 * 60 * 1000)),
      consumedAt: null,
      payloadJson: {
        providerCode: providerResult.providerCode,
        brokerCode: providerResult.brokerCode,
        providerMode: providerResult.providerMode,
        connectionId: providerResult.connectionId,
        authorizationUrl: providerResult.authorizationUrl,
        providerBaselineId: providerBaselineRef.providerBaselineId,
        providerBaselineCode: providerBaselineRef.baselineCode,
        providerBaselineVersion: providerBaselineRef.providerBaselineVersion,
        providerBaselineChecksum: providerBaselineRef.providerBaselineChecksum
      }
    };
    persistAuthChallenge(challenge, providerResult.state);
    pushAudit({
      companyId: session.companyId,
      actorId: principal.userId,
      action: "auth.federation.started",
      result: "pending",
      entityType: "auth_challenge",
      entityId: challenge.challengeId,
      explanation: "Enterprise federation authentication started."
    });
    return {
      ...providerResult,
      sessionToken,
      session: publicSession(session),
      identityIsolation: projectIdentityIsolationState(isolationSummary),
      providerBaselineId: providerBaselineRef.providerBaselineId,
      providerBaselineCode: providerBaselineRef.baselineCode,
      providerBaselineVersion: providerBaselineRef.providerBaselineVersion,
      providerBaselineChecksum: providerBaselineRef.providerBaselineChecksum,
      providerBaselineRef
    };
  }

  function completeFederationAuthentication({
    sessionToken,
    authRequestId,
    authorizationCode,
    state: providerState,
    actionClass = null,
    deviceFingerprint = null
  } = {}) {
    const { session, principal } = requireSession(sessionToken, { allowPending: true });
    const challenge = requireChallenge(authRequestId, "federation_auth");
    if (challenge.companyUserId !== session.companyUserId) {
      throw httpError(403, "federation_scope_mismatch", "Federation challenge belongs to another user.");
    }
    const federationGuardrail = resolveAuthGuardrail({
      scope: "federation_request",
      key: createFederationRequestGuardrailKey(session.companyUserId, challenge.challengeId),
      companyId: session.companyId,
      companyUserId: session.companyUserId
    });
    assertAuthGuardrailOpen({
      guardrail: federationGuardrail,
      windowMs: FEDERATION_FAILURE_WINDOW_MS,
      code: "federation_temporarily_locked",
      message: "Too many invalid federation completion attempts. Try again later."
    });
    let providerResult;
    try {
      providerResult = state.authBroker.completeFederationAuthorization({
        authRequestId,
        authorizationCode,
        state: providerState
      });
    } catch (error) {
      if (error?.code === "federation_state_invalid" || error?.code === "federation_authorization_code_invalid") {
        const failureGuardrail = recordAuthGuardrailFailure(federationGuardrail, {
          windowMs: FEDERATION_FAILURE_WINDOW_MS,
          threshold: FEDERATION_FAILURE_THRESHOLD,
          lockoutMs: FEDERATION_LOCKOUT_MS
        });
        if (failureGuardrail.lockedUntil) {
          revokeSessionForSecurityLockout(session, {
            reasonCode: "federation_temporarily_locked"
          });
        }
        pushAudit({
          companyId: session.companyId,
          actorId: principal.userId,
          action: "auth.federation.completed",
          result: failureGuardrail.lockedUntil ? "blocked" : "denied",
          entityType: "auth_challenge",
          entityId: authRequestId,
          explanation: failureGuardrail.lockedUntil
            ? "Federation callback temporarily locked after repeated invalid completion attempts."
            : "Federation callback payload was invalid.",
          metadata: {
            failureCount: failureGuardrail.failureCount,
            lockedUntil: failureGuardrail.lockedUntil
          }
        });
        if (failureGuardrail.lockedUntil) {
          throw httpError(
            429,
            "federation_temporarily_locked",
            "Too many invalid federation completion attempts. Try again later."
          );
        }
      }
      throw error;
    }
    markAuthGuardrailSuccess(federationGuardrail, {
      windowMs: FEDERATION_FAILURE_WINDOW_MS
    });
    const providerBaselineRef = resolveFederationProviderBaselineRef(providerBaselines, currentDate());
    challenge.status = "consumed";
    challenge.consumedAt = nowIso();
    const completion = completeSessionFactor(session, "federation", {
      actionClass: actionClass || challenge.payloadJson?.actionClass || null,
      challengeId: challenge.challengeId,
      challengeType: challenge.challengeType,
      providerSubject: providerResult.subject,
      deviceName: `Federation ${providerResult.connectionId}`,
      deviceFingerprint
    });
    upsertIdentityAccount({
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      providerCode: WORKOS_FEDERATION_PROVIDER_CODE,
      factorType: "federation",
      providerSubject: providerResult.subject,
      lastVerifiedAt: challenge.consumedAt,
      metadataJson: {
        connectionId: providerResult.connectionId
      }
    });
    upsertPersonIdentity({
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      providerCode: WORKOS_FEDERATION_PROVIDER_CODE,
      providerSubject: providerResult.subject,
      email: providerResult.claims?.email || principal.email,
      displayName: principal.displayName
    });
    pushAudit({
      companyId: session.companyId,
      actorId: principal.userId,
      action: "auth.federation.completed",
      result: "success",
      entityType: "auth_challenge",
      entityId: authRequestId,
      explanation: "Enterprise federation authentication completed."
    });
    return {
      provider: {
        ...providerResult,
        providerBaselineId: providerBaselineRef.providerBaselineId,
        providerBaselineCode: providerBaselineRef.baselineCode,
        providerBaselineVersion: providerBaselineRef.providerBaselineVersion,
        providerBaselineChecksum: providerBaselineRef.providerBaselineChecksum,
        providerBaselineRef
      },
      session: publicSession(session),
      receipt: completion.receipt
    };
  }

  function createChallenge({ sessionToken, factorType, actionClass = null, deviceName = "Security key" } = {}) {
    const { session, principal } = requireSession(sessionToken, { allowPending: false });
    const resolvedFactorType = assertAllowedValue(factorType, ["totp", "passkey", "bankid"], "challenge_factor_type_invalid");
    if (resolvedFactorType === "bankid") {
      return startBankIdAuthentication({
        sessionToken,
        actionClass
      });
    }

    const challengeTemplate = resolvedFactorType === "passkey" ? createPasskeyChallenge() : {
      challengeId: crypto.randomUUID(),
      challenge: issueOpaqueToken()
    };
    const challenge = {
      challengeId: challengeTemplate.challengeId,
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      challengeType: resolvedFactorType === "passkey" ? "passkey_assertion" : "totp_step_up",
      status: "pending",
      challenge: challengeTemplate.challenge,
      orderRef: null,
      expiresAt: timestamp(new Date(currentDate().getTime() + 5 * 60 * 1000)),
      consumedAt: null,
      payloadJson: {
        factorType: resolvedFactorType,
        actionClass,
        deviceName
      }
    };
    persistAuthChallenge(challenge, challengeTemplate.challenge);
    pushAudit({
      companyId: session.companyId,
      actorId: principal.userId,
      action: "auth.challenge.started",
      result: "pending",
      entityType: "auth_challenge",
      entityId: challenge.challengeId,
      explanation: `Started ${resolvedFactorType} challenge for action ${actionClass || "default"}.`
    });
    return {
      challengeId: challenge.challengeId,
      challenge: challenge.challenge,
      factorType: resolvedFactorType,
      actionClass,
      expiresAt: challenge.expiresAt,
      session: publicSession(session)
    };
  }

  function completeChallenge({
    sessionToken,
    challengeId,
    code = null,
    factorId = null,
    credentialId = null,
    assertion = null,
    completionToken = null,
    deviceFingerprint = null
  } = {}) {
    const challenge = requireChallenge(assertNonEmpty(challengeId, "challenge_id_required"), null);
    if (challenge.challengeType === "bankid_auth") {
      return collectBankIdAuthentication({
        sessionToken,
        orderRef: challenge.challengeId,
        completionToken,
        actionClass: challenge.payloadJson?.actionClass || null,
        deviceFingerprint
      });
    }
    if (challenge.challengeType === "totp_step_up") {
      return verifyTotp({
        sessionToken,
        code,
        factorId,
        actionClass: challenge.payloadJson?.actionClass || null,
        challengeId: challenge.challengeId,
        deviceFingerprint
      });
    }
    if (challenge.challengeType === "passkey_assertion") {
      return assertPasskey({
        sessionToken,
        credentialId,
        assertion,
        actionClass: challenge.payloadJson?.actionClass || null,
        challengeId: challenge.challengeId,
        deviceFingerprint
      });
    }
    throw httpError(409, "auth_challenge_type_unsupported", `Challenge type ${challenge.challengeType} cannot be completed through the challenge center.`);
  }

  function listChallenges({ sessionToken, status = null } = {}) {
    const { session } = requireSession(sessionToken, { allowPending: true });
    const resolvedStatus = typeof status === "string" && status.trim().length > 0 ? status.trim() : null;
    return [...state.authChallenges.values()]
      .filter((challenge) => challenge.companyUserId === session.companyUserId)
      .filter((challenge) => (resolvedStatus ? challenge.status === resolvedStatus : true))
      .sort((left, right) => right.expiresAt.localeCompare(left.expiresAt))
      .map((challenge) => ({
        ...copy(challenge),
        receipts: (state.challengeReceiptIdsByChallenge.get(challenge.challengeId) || [])
          .map((receiptId) => state.challengeCompletionReceipts.get(receiptId))
          .filter(Boolean)
          .map(copy)
      }));
  }

  function listDeviceTrustRecords({ sessionToken } = {}) {
    const { session } = requireSession(sessionToken, { allowPending: true });
    return (state.deviceTrustRecordIdsByCompanyUser.get(session.companyUserId) || [])
      .map((deviceTrustRecordId) => state.deviceTrustRecords.get(deviceTrustRecordId))
      .filter(Boolean)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(copy);
  }

  function trustDevice({ sessionToken, deviceTrustRecordId, trustedUntil = null } = {}) {
    const { session } = requireSession(sessionToken, { allowPending: false });
    const deviceTrustRecord = requireDeviceTrustRecord(deviceTrustRecordId);
    if (deviceTrustRecord.companyUserId !== session.companyUserId) {
      throw httpError(403, "device_trust_scope_mismatch", "Device trust record belongs to another user.");
    }
    deviceTrustRecord.status = "trusted";
    deviceTrustRecord.trustedUntil = trustedUntil || timestamp(new Date(currentDate().getTime() + 30 * 24 * 60 * 60 * 1000));
    deviceTrustRecord.updatedAt = nowIso();
    return copy(deviceTrustRecord);
  }

  function revokeDevice({ sessionToken, deviceTrustRecordId } = {}) {
    const { session } = requireSession(sessionToken, { allowPending: false });
    const deviceTrustRecord = requireDeviceTrustRecord(deviceTrustRecordId);
    if (deviceTrustRecord.companyUserId !== session.companyUserId) {
      throw httpError(403, "device_trust_scope_mismatch", "Device trust record belongs to another user.");
    }
    deviceTrustRecord.status = "revoked";
    deviceTrustRecord.trustedUntil = null;
    deviceTrustRecord.updatedAt = nowIso();
    return copy(deviceTrustRecord);
  }

  function createOnboardingRun({
    legalName,
    orgNumber,
    adminEmail,
    adminDisplayName,
    accountingYear = String(currentDate().getUTCFullYear())
  } = {}) {
    const normalizedAdminEmail = String(adminEmail || "").trim().toLowerCase();
    if (!normalizedAdminEmail) {
      throw httpError(400, "email_required", "Email is required.");
    }
    const resolvedAdminDisplayName = assertNonEmpty(adminDisplayName, "display_name_required");
    const company = createCompany({
      legalName,
      orgNumber,
      status: "setup_pending",
      settingsJson: {
        chartTemplateId: null,
        vatScheme: null,
        vatFilingPeriod: null,
        accountingYear
      }
    });
    const adminUser = findOrCreateUser({
      email: normalizedAdminEmail,
      displayName: resolvedAdminDisplayName
    });
    const companyUser = {
      companyUserId: crypto.randomUUID(),
      companyId: company.companyId,
      userId: adminUser.userId,
      roleCode: "company_admin",
      status: "active",
      startsAt: nowIso(),
      endsAt: null,
      isAdmin: true,
      requiresMfa: true,
      metadataJson: {},
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.companyUsers.set(companyUser.companyUserId, companyUser);
    assignDefaultOperationalTeamMemberships(companyUser);
    provisionDefaultAuthFactors({
      company,
      user: adminUser,
      companyUser,
      now: nowIso()
    });

    const run = {
      runId: crypto.randomUUID(),
      resumeToken: issueOpaqueToken(),
      companyId: company.companyId,
      startedByUserId: adminUser.userId,
      status: "in_progress",
      currentStep: ONBOARDING_STEP_CODES[0],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      payloadJson: {
        accountingYear
      }
    };
    state.onboardingRuns.set(run.runId, run);
    state.tenantSetupProfiles.set(company.companyId, {
      tenantSetupProfileId: crypto.randomUUID(),
      companyId: company.companyId,
      onboardingRunId: run.runId,
      status: "setup_pending",
      onboardingCompletedAt: null,
      approvedAt: null,
      suspendedAt: null,
      suspendedReasonCode: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });

    for (const stepCode of ONBOARDING_STEP_CODES) {
      state.onboardingStepStates.set(`${run.runId}:${stepCode}`, {
        stepStateId: crypto.randomUUID(),
        runId: run.runId,
        stepCode,
        status: stepCode === "company_profile" ? "completed" : "pending",
        completedAt: stepCode === "company_profile" ? nowIso() : null,
        dataJson:
          stepCode === "company_profile"
            ? {
                legalName: company.legalName,
                orgNumber: company.orgNumber,
                adminEmail: adminUser.email
              }
            : {}
      });
    }

    pushAudit({
      companyId: company.companyId,
      actorId: adminUser.userId,
      action: "onboarding.run.created",
      result: "success",
      entityType: "onboarding_run",
      entityId: run.runId,
      explanation: "Onboarding run created.",
      metadata: {
        tenantSetupStatus: "setup_pending",
        companyStatus: company.status,
        onboardingRunId: run.runId
      }
    });

    return {
      runId: run.runId,
      resumeToken: run.resumeToken,
      companyId: run.companyId,
      currentStep: run.currentStep,
      checklist: getOnboardingChecklist({ runId: run.runId, resumeToken: run.resumeToken }).checklist
    };
  }

  function getOnboardingRun({ runId, resumeToken } = {}) {
    const run = requireOnboardingRun(runId, resumeToken);
    return {
      runId: run.runId,
      companyId: run.companyId,
      status: run.status,
      currentStep: run.currentStep,
      resumeToken: run.resumeToken,
      payloadJson: copy(run.payloadJson),
      checklist: buildChecklist(run.runId)
    };
  }

  function getOnboardingChecklist({ runId, resumeToken } = {}) {
    const run = requireOnboardingRun(runId, resumeToken);
    return {
      runId: run.runId,
      companyId: run.companyId,
      status: run.status,
      currentStep: run.currentStep,
      checklist: buildChecklist(run.runId)
    };
  }

  function updateOnboardingStep({ runId, resumeToken, stepCode, payload } = {}) {
    const run = requireOnboardingRun(runId, resumeToken);
    const company = requireCompany(run.companyId);
    const stepState = requireOnboardingStep(runId, stepCode);

    switch (stepCode) {
      case "company_profile":
        company.legalName = assertNonEmpty(payload?.legalName || company.legalName, "legal_name_required");
        company.orgNumber =
          normalizeOptionalSwedishOrganizationNumber(payload?.orgNumber || company.orgNumber || null, "organization_number_invalid", {
            errorFactory: httpError
          })
          || "";
        company.updatedAt = nowIso();
        stepState.dataJson = {
          legalName: company.legalName,
          orgNumber: company.orgNumber
        };
        break;
      case "registrations":
        applyRegistrations(company.companyId, payload);
        stepState.dataJson = copy(payload || {});
        break;
      case "chart_template":
        applyChartTemplate(company.companyId, payload);
        stepState.dataJson = copy(payload || {});
        break;
      case "vat_setup":
        applyVatSetup(company.companyId, payload);
        stepState.dataJson = copy(payload || {});
        break;
      case "fiscal_periods":
        applyFiscalPeriods(company.companyId, payload, company.settingsJson.accountingYear);
        stepState.dataJson = copy(payload || {});
        break;
      default:
        throw httpError(400, "onboarding_step_unknown", `Unsupported onboarding step ${stepCode}.`);
    }

    stepState.status = "completed";
    stepState.completedAt = nowIso();
    run.updatedAt = nowIso();
    run.currentStep = nextPendingStep(run.runId) || stepCode;

    if (!nextPendingStep(run.runId)) {
      finalizeOnboardingRun(run, company);
    }

    pushAudit({
      companyId: company.companyId,
      actorId: run.startedByUserId,
      action: "onboarding.step.completed",
      result: "success",
      entityType: "onboarding_step",
      entityId: `${run.runId}:${stepCode}`,
      explanation: `Onboarding step ${stepCode} completed.`,
      metadata: {
        onboardingRunId: run.runId,
        tenantSetupStatus: requireTenantSetupProfile(company.companyId).status
      }
    });

    return getOnboardingRun({ runId, resumeToken });
  }

  function getTenantSetupProfile({ sessionToken, companyId } = {}) {
    authorizeFromSession(sessionToken, ACTIONS.COMPANY_READ, {
      companyId,
      objectType: "tenant_setup",
      objectId: companyId,
      scopeCode: "tenant_setup"
    });
    return copy(requireTenantSetupProfile(companyId));
  }

  function registerModuleDefinition({
    sessionToken,
    companyId,
    moduleCode,
    label,
    riskClass = "low",
    coreModule = false,
    dependencyModuleCodes = [],
    requiredPolicyCodes = [],
    requiredRulepackCodes = [],
    requiresCompletedTenantSetup = true,
    allowSuspend = true
  } = {}) {
    const auth = authorizeFromSession(sessionToken, ACTIONS.COMPANY_MANAGE, {
      companyId,
      objectType: "module_definition",
      objectId: companyId,
      scopeCode: "module_activation"
    });
    const definitionKey = buildModuleDefinitionKey(companyId, moduleCode);
    const existing = state.moduleDefinitions.get(definitionKey);
    const definition = {
      moduleDefinitionId: existing?.moduleDefinitionId || crypto.randomUUID(),
      companyId,
      moduleCode: assertNonEmpty(moduleCode, "module_code_required"),
      label: assertNonEmpty(label || moduleCode, "module_label_required"),
      riskClass: assertAllowedValue(riskClass, MODULE_RISK_CLASSES, "module_risk_class_invalid"),
      coreModule: coreModule === true,
      dependencyModuleCodes: normalizeStringList(dependencyModuleCodes, "module_dependencies_invalid"),
      requiredPolicyCodes: normalizeStringList(requiredPolicyCodes, "module_required_policies_invalid"),
      requiredRulepackCodes: normalizeStringList(requiredRulepackCodes, "module_required_rulepacks_invalid"),
      requiresCompletedTenantSetup: requiresCompletedTenantSetup !== false,
      allowSuspend: allowSuspend !== false,
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso(),
      updatedByUserId: auth.principal.userId
    };
    state.moduleDefinitions.set(definitionKey, definition);
    pushAudit({
      companyId,
      actorId: auth.principal.userId,
      action: "tenant_setup.module_definition.upserted",
      result: "success",
      entityType: "module_definition",
      entityId: definition.moduleDefinitionId,
      explanation: `Registered module definition ${definition.moduleCode}.`,
      metadata: {
        moduleCode: definition.moduleCode,
        riskClass: definition.riskClass,
        dependencyModuleCodes: definition.dependencyModuleCodes,
        requiredPolicyCodes: definition.requiredPolicyCodes,
        requiredRulepackCodes: definition.requiredRulepackCodes,
        coreModule: definition.coreModule,
        requiresCompletedTenantSetup: definition.requiresCompletedTenantSetup,
        allowSuspend: definition.allowSuspend
      }
    });
    return copy(definition);
  }

  function listModuleDefinitions({ sessionToken, companyId } = {}) {
    authorizeFromSession(sessionToken, ACTIONS.COMPANY_READ, {
      companyId,
      objectType: "module_definition_list",
      objectId: companyId,
      scopeCode: "module_activation"
    });
    return [...state.moduleDefinitions.values()]
      .filter((definition) => definition.companyId === assertNonEmpty(companyId, "company_id_required"))
      .sort((left, right) => left.moduleCode.localeCompare(right.moduleCode))
      .map(copy);
  }

  function activateModule({
    sessionToken,
    companyId,
    moduleCode,
    effectiveFrom = nowIso().slice(0, 10),
    activationReason,
    approvalActorIds = []
  } = {}) {
    const auth = authorizeFromSession(sessionToken, ACTIONS.COMPANY_MANAGE, {
      companyId,
      objectType: "module_activation",
      objectId: companyId,
      scopeCode: "module_activation"
    });
    const tenantSetupProfile = requireTenantSetupProfile(companyId);
    const definition = requireModuleDefinition(companyId, moduleCode);
    if (tenantSetupProfile.status === "suspended") {
      throw httpError(409, "tenant_setup_suspended", "Module activation is blocked while the tenant setup profile is suspended.");
    }
    if (definition.requiresCompletedTenantSetup && tenantSetupProfile.status !== "active") {
      throw httpError(409, "tenant_setup_not_ready", "Tenant setup must be active before this module can be activated.");
    }
    const missingDependencies = definition.dependencyModuleCodes.filter(
      (dependencyModuleCode) => resolveModuleActivation(companyId, dependencyModuleCode)?.status !== "active"
    );
    if (missingDependencies.length > 0) {
      throw httpError(
        409,
        "module_activation_dependency_missing",
        `Module ${definition.moduleCode} requires active dependencies: ${missingDependencies.join(", ")}.`
      );
    }
    const normalizedApprovalActorIds = normalizeStringList(approvalActorIds, "module_activation_approval_actor_ids_invalid");
    if (["medium", "high"].includes(definition.riskClass)) {
      if (normalizedApprovalActorIds.length === 0) {
        throw httpError(409, "module_activation_approval_required", "Medium- and high-risk modules require a separate approver.");
      }
      if (normalizedApprovalActorIds.includes(auth.principal.userId)) {
        throw httpError(409, "module_activation_self_approval_forbidden", "Module activation requires a separate approver.");
      }
      validateApprovalActors({
        companyId,
        actorUserIds: normalizedApprovalActorIds,
        scopeCode: "module_activation",
        objectType: "module_activation",
        objectId: companyId
      });
    }
    const activationKey = buildModuleDefinitionKey(companyId, definition.moduleCode);
    const currentDateKey = nowIso().slice(0, 10);
    const resolvedEffectiveFrom = normalizeDateOnly(effectiveFrom, "module_activation_effective_from_invalid");
    const status = resolvedEffectiveFrom > currentDateKey ? "scheduled" : "active";
    const existing = state.moduleActivations.get(activationKey);
    const activation = {
      moduleActivationId: existing?.moduleActivationId || crypto.randomUUID(),
      companyId,
      moduleCode: definition.moduleCode,
      status,
      effectiveFrom: resolvedEffectiveFrom,
      activationReason: assertNonEmpty(activationReason, "module_activation_reason_required"),
      approvalActorIds: normalizedApprovalActorIds,
      requestedByUserId: auth.principal.userId,
      activatedAt: status === "active" ? nowIso() : null,
      suspendedAt: null,
      suspendedReasonCode: null,
      validationSnapshot: {
        dependencyModuleCodes: definition.dependencyModuleCodes,
        requiredPolicyCodes: definition.requiredPolicyCodes,
        requiredRulepackCodes: definition.requiredRulepackCodes
      },
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso()
    };
    state.moduleActivations.set(activationKey, activation);
    pushAudit({
      companyId,
      actorId: auth.principal.userId,
      action: "tenant_setup.module_activation.activated",
      result: "success",
      entityType: "module_activation",
      entityId: activation.moduleActivationId,
      explanation: `Activated module ${definition.moduleCode} with status ${activation.status}.`,
      metadata: {
        moduleCode: activation.moduleCode,
        status: activation.status,
        effectiveFrom: activation.effectiveFrom,
        activationReason: activation.activationReason,
        approvalActorIds: activation.approvalActorIds,
        dependencyModuleCodes: activation.validationSnapshot.dependencyModuleCodes,
        requiredPolicyCodes: activation.validationSnapshot.requiredPolicyCodes,
        requiredRulepackCodes: activation.validationSnapshot.requiredRulepackCodes
      }
    });
    return copy(activation);
  }

  function listModuleActivations({ sessionToken, companyId } = {}) {
    authorizeFromSession(sessionToken, ACTIONS.COMPANY_READ, {
      companyId,
      objectType: "module_activation_list",
      objectId: companyId,
      scopeCode: "module_activation"
    });
    return [...state.moduleActivations.values()]
      .filter((activation) => activation.companyId === assertNonEmpty(companyId, "company_id_required"))
      .sort((left, right) => left.moduleCode.localeCompare(right.moduleCode))
      .map(copy);
  }

  function suspendModuleActivation({
    sessionToken,
    companyId,
    moduleCode,
    reasonCode
  } = {}) {
    const auth = authorizeFromSession(sessionToken, ACTIONS.COMPANY_MANAGE, {
      companyId,
      objectType: "module_activation",
      objectId: companyId,
      scopeCode: "module_activation"
    });
    const definition = requireModuleDefinition(companyId, moduleCode);
    if (!definition.allowSuspend) {
      throw httpError(409, "module_activation_suspend_forbidden", `Module ${definition.moduleCode} cannot be suspended by policy.`);
    }
    const activation = resolveModuleActivation(companyId, moduleCode);
    if (!activation) {
      throw httpError(404, "module_activation_not_found", "Module activation was not found.");
    }
    activation.status = "suspended";
    activation.suspendedAt = nowIso();
    activation.suspendedReasonCode = assertNonEmpty(reasonCode, "module_activation_suspend_reason_required");
    activation.updatedAt = activation.suspendedAt;
    pushAudit({
      companyId,
      actorId: auth.principal.userId,
      action: "tenant_setup.module_activation.suspended",
      result: "success",
      entityType: "module_activation",
      entityId: activation.moduleActivationId,
      explanation: `Suspended module ${definition.moduleCode}.`,
      metadata: {
        moduleCode: activation.moduleCode,
        reasonCode: activation.suspendedReasonCode,
        suspendedAt: activation.suspendedAt
      }
    });
    return copy(activation);
  }

    function snapshot() {
      return copy({
      companies: [...state.companies.values()],
      users: [...state.users.values()],
      companyUsers: [...state.companyUsers.values()],
      teams: [...state.teams.values()],
      teamMemberships: [...state.teamMemberships.values()].map((membership) => decorateTeamMembership(membership)),
      delegations: [...state.delegations.values()],
      objectGrants: [...state.objectGrants.values()],
      approvalChains: [...state.approvalChains.values()].map((chain) => ({
        ...chain,
        steps: state.approvalChainSteps.get(chain.approvalChainId) || []
      })),
      authSessions: [...state.authSessions.values()].map(publicSession),
      sessionRevisions: [...state.sessionRevisions.values()].map(copy),
      authFactors: [...state.authFactors.values()].map(stripSecret),
      authGuardrails: [...state.authGuardrails.values()].map(copy),
      challengeCompletionReceipts: [...state.challengeCompletionReceipts.values()].map(copy),
      deviceTrustRecords: [...state.deviceTrustRecords.values()].map(copy),
      identityAccounts: listIdentityAccounts(),
      personIdentities: listPersonIdentities(),
      onboardingRuns: [...state.onboardingRuns.values()],
      onboardingStepStates: [...state.onboardingStepStates.values()],
      companyRegistrations: [...state.companyRegistrations.values()],
      companyVatSetups: [...state.companyVatSetups.values()],
        accountingPeriods: [...state.accountingPeriods.values()],
        companySetupBlueprints: [...state.companySetupBlueprints.values()],
        tenantSetupProfiles: [...state.tenantSetupProfiles.values()],
        moduleDefinitions: [...state.moduleDefinitions.values()],
        moduleActivations: [...state.moduleActivations.values()],
        auditEvents: state.auditEvents
      });
    }

    function exportDurableState() {
      const authBrokerSnapshot = state.authBroker.snapshot();
      return {
        ...serializeDurableState(state, {
          excludeKeys: ["authBroker"],
          customSerializers: {
            authFactors: (authFactors) =>
              new Map(
                [...authFactors.entries()].map(([factorId, factor]) => [factorId, sanitizeAuthFactorForPersistence(factor)])
              ),
            authChallenges: (authChallenges) =>
              new Map(
                [...authChallenges.entries()].map(([challengeId, challenge]) => [
                  challengeId,
                  sanitizeAuthChallengeForPersistence(challenge)
                ])
              )
          }
        }),
        authBrokerEnvelope: {
          keyId: authSecretSealer.keyId,
          algorithm: "aes-256-gcm",
          envelope: authSecretSealer.seal(JSON.stringify(authBrokerSnapshot))
        }
      };
    }

    function importDurableState(snapshot) {
      const brokerSnapshot = readBrokerSnapshotFromDurableState(snapshot, authSecretSealer);
      applyDurableStateSnapshot(state, snapshot, {
        preserveKeys: ["authBroker", "authBrokerEnvelope"]
      });
      migrateLegacyAuthFactorSecrets();
      migrateLegacyAuthChallengeSecrets();
      normalizeDeviceTrustRecordStorage();
      state.authBroker.restore(brokerSnapshot);
    }

  function getTotpCodeForTesting({ companyId = DEMO_IDS.companyId, email = DEMO_ADMIN_EMAIL, now = currentDate() } = {}) {
    const companyUser = findActiveCompanyUser(companyId, email);
    const factor = findFactor(companyUser.companyUserId, "totp", ["active", "pending_enrollment"]);
    if (!factor) {
      throw httpError(404, "totp_factor_missing", "No TOTP factor is available for test generation.");
    }
    return generateTotpCode({ secret: readAuthFactorSecret(factor), now });
  }

  function getBankIdCompletionTokenForTesting(orderRef) {
    return state.authBroker.getBankIdCompletionToken(orderRef);
  }

  function getFederationAuthorizationCodeForTesting(authRequestId) {
    return state.authBroker.getFederationAuthorizationCode(authRequestId);
  }

  function getIdentityIsolationSummary({ sessionToken, companyId } = {}) {
    authorizeFromSession(sessionToken, ACTIONS.COMPANY_READ, {
      companyId,
      objectType: "auth_provider_isolation",
      objectId: companyId,
      scopeCode: "auth"
    });
    const providerSummaries = AUTH_IDENTITY_PROVIDER_CODES.map((providerCode) =>
      evaluateIdentityModeIsolation({ state, identityIsolationCatalog, identityIsolationResolver, sessionToken, companyId, providerCode })
    );
    return {
      companyId: assertNonEmpty(companyId, "company_id_required"),
      environmentMode: state.environmentMode,
      providerEnvironmentRef: state.providerEnvironmentRef,
      generatedAt: nowIso(clock),
      ready: providerSummaries.every((summary) => summary.ready),
      providerCount: providerSummaries.length,
      activeProfiles: providerSummaries.map(projectIdentityIsolationSummary),
      modeCatalog: identityIsolationCatalog.map(projectIdentityModeCatalogEntry),
      violations: providerSummaries.flatMap((summary) => summary.violations)
    };
  }

  function authorizeFromSession(sessionToken, action, resource) {
    const { session, principal } = requireSession(sessionToken, { allowPending: false });
    const decision = authorizeAction({
      principal,
      action,
      resource,
      delegations: [...state.delegations.values()],
      objectGrants: [...state.objectGrants.values()],
      now: currentDate()
    });
    if (!decision.allowed) {
      throw httpError(403, decision.reasonCode, decision.explanation);
    }
    return {
      session,
      principal,
      decision
    };
  }

  function inspectSession({ sessionToken, allowPending = false } = {}) {
    const { session, principal } = requireSession(sessionToken, { allowPending });
    return {
      session: publicSession(session),
      principal: copy(principal),
      sessionRevisions: (state.sessionRevisionIdsBySession.get(session.sessionId) || [])
        .map((sessionRevisionId) => state.sessionRevisions.get(sessionRevisionId))
        .filter(Boolean)
        .map(copy),
      deviceTrustRecords: (state.deviceTrustRecordIdsByCompanyUser.get(session.companyUserId) || [])
        .map((deviceTrustRecordId) => state.deviceTrustRecords.get(deviceTrustRecordId))
        .filter(Boolean)
        .map(copy)
    };
  }

  function requireSession(sessionToken, { allowPending = false } = {}) {
    const tokenHash = hashOpaqueToken(assertNonEmpty(sessionToken, "session_token_required"));
    const session = [...state.authSessions.values()].find((candidate) => candidate.tokenHash === tokenHash);
    if (!session) {
      throw httpError(401, "session_not_found", "Session token is unknown.");
    }
    if (session.revokedAt || session.status === "revoked") {
      throw httpError(401, "session_revoked", "Session has been revoked.");
    }
    if (!sessionIsNotExpired(session, currentDate())) {
      throw httpError(401, "session_expired", "Session has expired.");
    }
    if (!allowPending && !sessionIsActive(session, currentDate())) {
      throw httpError(403, "mfa_pending", "Session is pending additional authentication factors.");
    }

    const companyUser = requireCompanyUser(session.companyUserId);
    const principal = buildPrincipalFromCompanyUser(companyUser);
    session.lastUsedAt = nowIso();
    return {
      session,
      principal
    };
  }

  function completeSessionFactor(
    session,
    factorType,
    {
      actionClass = null,
      challengeId = null,
      challengeType = null,
      factorId = null,
      credentialId = null,
      providerSubject = null,
      deviceName = null,
      deviceFingerprint = null
    } = {}
  ) {
    const existing = new Set(session.amr);
    existing.add(factorType);
    session.amr = [...existing];
    session.lastVerifiedAt = nowIso();
    session.status = session.amr.length >= session.requiredFactorCount ? "active" : "pending";
    const trustLevel = resolveSessionTrustLevel(session);
    grantFreshTrust({
      session,
      actionClass,
      trustLevel
    });
    const deviceTrustRecord = upsertDeviceTrustRecord({
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      factorId,
      factorType,
      credentialId,
      providerSubject,
      deviceName,
      deviceFingerprint,
      trustLevel,
      lastVerifiedAt: session.lastVerifiedAt
    });
    const sessionRevision = createSessionRevision(session, {
      reasonCode: "factor_completed",
      factorType,
      actionClass,
      challengeId
    });
    const receipt = createChallengeCompletionReceipt({
      session,
      sessionRevision,
      challengeId,
      challengeType,
      factorType,
      actionClass,
      deviceTrustRecordId: deviceTrustRecord.deviceTrustRecordId
    });
    return {
      sessionRevision,
      receipt,
      deviceTrustRecord
    };
  }

  function listAvailableMethods(companyUserId) {
    return [...new Set([...state.authFactors.values()].filter((factor) => factor.companyUserId === companyUserId && factor.status === "active").map((factor) => factor.factorType))];
  }

  function provisionDefaultAuthFactors({ company, user, companyUser, now = nowIso() } = {}) {
    const enrollment = generateTotpEnrollment({
      label: `${company.companyId}:${user.email}`
    });
    const factorTimestamp = timestamp(now);
    const totpFactorId = crypto.randomUUID();
    state.authFactors.set(totpFactorId, {
      factorId: totpFactorId,
      companyUserId: companyUser.companyUserId,
      userId: user.userId,
      factorType: "totp",
      status: "active",
      secretRef: null,
      credentialId: null,
      publicKey: null,
      providerSubject: null,
      deviceName: "Provisioned authenticator",
      verifiedAt: factorTimestamp,
      createdAt: factorTimestamp,
      updatedAt: factorTimestamp
    });
    writeAuthFactorSecret(state.authFactors.get(totpFactorId), enrollment.secret);
    upsertIdentityAccount({
      companyId: company.companyId,
      companyUserId: companyUser.companyUserId,
      userId: user.userId,
      providerCode: LOCAL_TOTP_PROVIDER_CODE,
      factorType: "totp",
      credentialId: totpFactorId,
      lastVerifiedAt: factorTimestamp,
      metadataJson: {
        factorId: totpFactorId,
        deviceName: "Provisioned authenticator"
      }
    });

    if (!companyUser.requiresMfa) {
      return;
    }

    const bankIdFactorId = crypto.randomUUID();
    state.authFactors.set(bankIdFactorId, {
      factorId: bankIdFactorId,
      companyUserId: companyUser.companyUserId,
      userId: user.userId,
      factorType: "bankid",
      status: "active",
      secretRef: null,
      credentialId: null,
      publicKey: null,
      providerSubject: `bankid:${company.companyId}:${companyUser.companyUserId}`,
      deviceName: "Provisioned BankID",
      verifiedAt: factorTimestamp,
      createdAt: factorTimestamp,
      updatedAt: factorTimestamp
    });
    upsertIdentityAccount({
      companyId: company.companyId,
      companyUserId: companyUser.companyUserId,
      userId: user.userId,
      providerCode: BANKID_PROVIDER_CODE,
      factorType: "bankid",
      providerSubject: `bankid:${company.companyId}:${companyUser.companyUserId}`,
      credentialId: bankIdFactorId,
      lastVerifiedAt: factorTimestamp,
      metadataJson: {
        factorId: bankIdFactorId,
        deviceName: "Provisioned BankID"
      }
    });
    upsertPersonIdentity({
      companyId: company.companyId,
      companyUserId: companyUser.companyUserId,
      userId: user.userId,
      providerCode: BANKID_PROVIDER_CODE,
      providerSubject: `bankid:${company.companyId}:${companyUser.companyUserId}`,
      email: user.email,
      displayName: user.displayName
    });
  }

  function findActiveCompanyUser(companyId, email) {
    const user = [...state.users.values()].find((candidate) => candidate.email.toLowerCase() === String(email || "").trim().toLowerCase());
    if (!user) {
      throw httpError(404, "user_not_found", "No user matched the supplied identifier.");
    }

    const companyUser = [...state.companyUsers.values()].find(
      (candidate) =>
        candidate.companyId === companyId &&
        candidate.userId === user.userId &&
        candidate.status === "active" &&
        isWindowOpen(candidate, currentDate())
    );

    if (!companyUser) {
      throw httpError(404, "company_user_not_found", "No active company user matched the supplied company and user.");
    }
    return companyUser;
  }

  function createLoginIdentifierGuardrailKey(companyId, normalizedEmail) {
    return `login_identifier:${companyId}:${normalizedEmail}`;
  }

  function createTotpFactorGuardrailKey(companyUserId, factorId) {
    return `totp_factor:${companyUserId}:${factorId}`;
  }

  function createPasskeyFactorGuardrailKey(companyUserId, factorId) {
    return `passkey_factor:${companyUserId}:${factorId}`;
  }

  function createBankIdChallengeGuardrailKey(companyUserId, challengeId) {
    return `bankid_challenge:${companyUserId}:${challengeId}`;
  }

  function createFederationRequestGuardrailKey(companyUserId, challengeId) {
    return `federation_request:${companyUserId}:${challengeId}`;
  }

  function resolveAuthGuardrail({ scope, key, companyId = null, normalizedEmail = null, companyUserId = null, factorId = null } = {}) {
    const resolvedScope = assertAllowedValue(scope, AUTH_GUARDRAIL_SCOPES, "auth_guardrail_scope_invalid");
    const resolvedKey = assertNonEmpty(key, "auth_guardrail_key_required");
    const existing = state.authGuardrails.get(resolvedKey);
    if (existing) {
      return existing;
    }
    const guardrail = {
      guardrailId: crypto.randomUUID(),
      scope: resolvedScope,
      key: resolvedKey,
      companyId: companyId || null,
      normalizedEmail: normalizedEmail || null,
      companyUserId: companyUserId || null,
      factorId: factorId || null,
      failureCount: 0,
      windowStartedAt: null,
      lastFailureAt: null,
      lastSuccessAt: null,
      lockedUntil: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.authGuardrails.set(resolvedKey, guardrail);
    return guardrail;
  }

  function refreshAuthGuardrailWindow(guardrail, { windowMs } = {}) {
    const resolvedWindowMs = Number(windowMs || 0);
    const now = currentDate();
    if (guardrail.lockedUntil && new Date(guardrail.lockedUntil) <= now) {
      guardrail.lockedUntil = null;
    }
    if (!guardrail.windowStartedAt) {
      guardrail.windowStartedAt = timestamp(now);
    }
    if (resolvedWindowMs > 0 && new Date(guardrail.windowStartedAt).getTime() + resolvedWindowMs <= now.getTime()) {
      guardrail.failureCount = 0;
      guardrail.windowStartedAt = timestamp(now);
      guardrail.lastFailureAt = null;
    }
    guardrail.updatedAt = timestamp(now);
    return guardrail;
  }

  function assertAuthGuardrailOpen({ guardrail, windowMs, code, message } = {}) {
    refreshAuthGuardrailWindow(guardrail, { windowMs });
    if (guardrail.lockedUntil && new Date(guardrail.lockedUntil) > currentDate()) {
      throw httpError(429, code, message);
    }
  }

  function recordAuthGuardrailFailure(guardrail, { windowMs, threshold, lockoutMs } = {}) {
    const now = currentDate();
    refreshAuthGuardrailWindow(guardrail, { windowMs });
    guardrail.failureCount += 1;
    guardrail.lastFailureAt = timestamp(now);
    guardrail.updatedAt = timestamp(now);
    if (guardrail.failureCount >= Number(threshold || 0)) {
      guardrail.lockedUntil = timestamp(new Date(now.getTime() + Number(lockoutMs || 0)));
    }
    return guardrail;
  }

  function markAuthGuardrailSuccess(guardrail, { windowMs } = {}) {
    const now = currentDate();
    refreshAuthGuardrailWindow(guardrail, { windowMs });
    guardrail.failureCount = 0;
    guardrail.windowStartedAt = timestamp(now);
    guardrail.lastFailureAt = null;
    guardrail.lastSuccessAt = timestamp(now);
    guardrail.lockedUntil = null;
    guardrail.updatedAt = timestamp(now);
    return guardrail;
  }

  function countPendingLoginSessions(companyUserId) {
    return [...state.authSessions.values()].filter(
      (session) =>
        session.companyUserId === companyUserId &&
        session.status === "pending" &&
        !session.revokedAt &&
        sessionIsNotExpired(session, currentDate())
    ).length;
  }

  function enforcePendingLoginSessionLimit({ guardrail, companyUser, normalizedEmail } = {}) {
    const pendingSessionCount = countPendingLoginSessions(companyUser.companyUserId);
    if (pendingSessionCount < LOGIN_PENDING_SESSION_LIMIT) {
      return;
    }
    const now = currentDate();
    guardrail.failureCount = Math.max(guardrail.failureCount, LOGIN_IDENTIFIER_FAILURE_THRESHOLD);
    guardrail.windowStartedAt = guardrail.windowStartedAt || timestamp(now);
    guardrail.lockedUntil = timestamp(new Date(now.getTime() + LOGIN_PENDING_SESSION_LOCKOUT_MS));
    guardrail.updatedAt = timestamp(now);
    pushAudit({
      companyId: companyUser.companyId,
      actorId: companyUser.userId,
      action: "auth.login.started",
      result: "blocked",
      entityType: "auth_guardrail",
      entityId: guardrail.guardrailId,
      explanation: "Login temporarily blocked because too many pending login sessions already exist.",
      metadata: {
        scope: guardrail.scope,
        normalizedEmail,
        pendingSessionCount,
        lockedUntil: guardrail.lockedUntil
      }
    });
    throw httpError(
      429,
      "login_rate_limited",
      "Too many pending login sessions already exist for this account. Complete or revoke an existing login and try again."
    );
  }

  function revokeSessionForSecurityLockout(session, { reasonCode } = {}) {
    if (!session || session.status === "revoked") {
      return;
    }
    session.status = "revoked";
    session.revokedAt = nowIso();
    createSessionRevision(session, {
      reasonCode: assertNonEmpty(reasonCode, "security_lockout_reason_required")
    });
  }

  function writeAuthFactorSecret(factor, secret) {
    const resolvedSecret = assertNonEmpty(secret, "auth_factor_secret_required");
    const secretRef = factor.secretRef || factor.factorId;
    factor.secretRef = secretRef;
    delete factor.secret;
    state.authFactorSecrets.set(secretRef, {
      secretRef,
      factorId: factor.factorId,
      companyUserId: factor.companyUserId,
      factorType: factor.factorType,
      keyId: authSecretSealer.keyId,
      algorithm: "aes-256-gcm",
      createdAt: state.authFactorSecrets.get(secretRef)?.createdAt || nowIso(),
      updatedAt: nowIso(),
      envelope: authSecretSealer.seal(resolvedSecret)
    });
    factor.updatedAt = nowIso();
    return secretRef;
  }

  function persistAuthChallenge(challenge, secret) {
    const challengeRef = writeAuthChallengeSecret(challenge, secret);
    challenge.challengeRef = challengeRef;
    delete challenge.challenge;
    state.authChallenges.set(challenge.challengeId, challenge);
    return challengeRef;
  }

  function writeAuthChallengeSecret(challenge, secret) {
    const resolvedSecret = assertNonEmpty(secret, "auth_challenge_secret_required");
    const challengeRef = challenge.challengeRef || challenge.challengeId;
    challenge.challengeRef = challengeRef;
    delete challenge.challenge;
    state.authChallengeSecrets.set(challengeRef, {
      challengeRef,
      challengeId: challenge.challengeId,
      challengeType: challenge.challengeType,
      companyUserId: challenge.companyUserId,
      keyId: authSecretSealer.keyId,
      algorithm: "aes-256-gcm",
      createdAt: state.authChallengeSecrets.get(challengeRef)?.createdAt || nowIso(),
      updatedAt: nowIso(),
      envelope: authSecretSealer.seal(resolvedSecret)
    });
    return challengeRef;
  }

  function readAuthChallengeSecret(challenge) {
    if (challenge.challengeRef) {
      const storedSecret = state.authChallengeSecrets.get(challenge.challengeRef);
      if (!storedSecret?.envelope) {
        throw httpError(500, "auth_challenge_secret_missing", "Auth challenge secret envelope was missing.");
      }
      return authSecretSealer.open(storedSecret.envelope);
    }
    if (challenge.challenge) {
      const legacySecret = challenge.challenge;
      writeAuthChallengeSecret(challenge, legacySecret);
      return legacySecret;
    }
    throw httpError(500, "auth_challenge_secret_missing", "Auth challenge secret was missing.");
  }

  function readAuthFactorSecret(factor) {
    if (factor.secretRef) {
      const storedSecret = state.authFactorSecrets.get(factor.secretRef);
      if (!storedSecret?.envelope) {
        throw httpError(500, "auth_factor_secret_missing", "Auth factor secret envelope was missing.");
      }
      return authSecretSealer.open(storedSecret.envelope);
    }
    if (factor.secret) {
      const legacySecret = factor.secret;
      writeAuthFactorSecret(factor, legacySecret);
      return legacySecret;
    }
    throw httpError(500, "auth_factor_secret_missing", "Auth factor secret was missing.");
  }

  function sanitizeAuthFactorForPersistence(factor) {
    const sanitized = copy(factor);
    delete sanitized.secret;
    return sanitized;
  }

  function sanitizeAuthChallengeForPersistence(challenge) {
    const sanitized = copy(challenge);
    delete sanitized.challenge;
    if (sanitized.challengeType === "federation_auth" && sanitized.payloadJson?.authorizationUrl) {
      sanitized.payloadJson.authorizationUrl = redactFederationAuthorizationUrlForPersistence(
        sanitized.payloadJson.authorizationUrl
      );
    }
    return sanitized;
  }

  function migrateLegacyAuthFactorSecrets() {
    for (const factor of state.authFactors.values()) {
      if (factor.factorType !== "totp") {
        delete factor.secret;
        if (!Object.prototype.hasOwnProperty.call(factor, "secretRef")) {
          factor.secretRef = null;
        }
        continue;
      }
      if (factor.secretRef) {
        delete factor.secret;
        continue;
      }
      if (factor.secret) {
        writeAuthFactorSecret(factor, factor.secret);
        continue;
      }
      throw httpError(500, "auth_factor_secret_missing", `Missing TOTP secret for factor ${factor.factorId}.`);
    }
  }

  function migrateLegacyAuthChallengeSecrets() {
    for (const challenge of state.authChallenges.values()) {
      if (challenge.challengeRef) {
        delete challenge.challenge;
        continue;
      }
      if (challenge.challenge) {
        writeAuthChallengeSecret(challenge, challenge.challenge);
        continue;
      }
      throw httpError(500, "auth_challenge_secret_missing", `Missing auth challenge secret for challenge ${challenge.challengeId}.`);
    }
  }

  function findOrCreateUser({ email, displayName } = {}) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      throw httpError(400, "email_required", "Email is required.");
    }

    const existing = [...state.users.values()].find((candidate) => candidate.email === normalizedEmail);
    if (existing) {
      return existing;
    }

    const user = {
      userId: crypto.randomUUID(),
      email: normalizedEmail,
      displayName: assertNonEmpty(displayName, "display_name_required"),
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.users.set(user.userId, user);
    return user;
  }

  function resolveWindow({ startsAt, endsAt = null, code, message } = {}) {
    const resolvedStartsAt = timestamp(startsAt || nowIso());
    const resolvedEndsAt = endsAt ? timestamp(endsAt) : null;
    if (resolvedEndsAt && new Date(resolvedEndsAt) < new Date(resolvedStartsAt)) {
      throw httpError(400, code, message);
    }
    return {
      startsAt: resolvedStartsAt,
      endsAt: resolvedEndsAt
    };
  }

  function requireCompany(companyId) {
    const company = state.companies.get(companyId);
    if (!company) {
      throw httpError(404, "company_not_found", "Company was not found.");
    }
    return company;
  }

  function requireCompanyUser(companyUserId) {
    const companyUser = state.companyUsers.get(companyUserId);
    if (!companyUser) {
      throw httpError(404, "company_user_not_found", "Company user was not found.");
    }
    return companyUser;
  }

  function decorateCompanyUser(companyUser) {
    const user = state.users.get(companyUser.userId);
    return {
      ...copy(companyUser),
      user: copy(user),
      teamIds: listActiveTeamIds({
        companyId: companyUser.companyId,
        companyUserId: companyUser.companyUserId,
        userId: companyUser.userId
      })
    };
  }

  function decorateTeamMembership(membership) {
    const companyUser = state.companyUsers.get(membership.companyUserId) || null;
    const team = state.teams.get(buildTeamKey(membership.companyId, membership.teamId)) || null;
    return {
      ...copy(membership),
      companyUser: companyUser ? decorateCompanyUser(companyUser) : null,
      team: team ? copy(team) : null
    };
  }

  function ensureDefaultOperationalTeams(companyId) {
    ensureDefaultOperationalTeamsForState(state, companyId, nowIso());
  }

  function assignDefaultOperationalTeamMemberships(companyUser) {
    ensureDefaultOperationalTeams(companyUser.companyId);
    const defaultTeams = defaultTeamAssignmentsForRole(companyUser.roleCode);
    for (const defaultTeamId of defaultTeams) {
      ensureTeamMembershipRecord(state, {
        companyId: companyUser.companyId,
        teamId: defaultTeamId,
        companyUserId: companyUser.companyUserId,
        userId: companyUser.userId,
        membershipRoleCode:
          companyUser.roleCode === "company_admin" && defaultTeamId === DEMO_TEAM_IDS.financeOps ? "lead" : "member",
        status: "active",
        startsAt: companyUser.startsAt,
        endsAt: companyUser.endsAt,
        createdAt: companyUser.createdAt,
        updatedAt: companyUser.updatedAt
      });
    }
  }

  function buildPrincipalFromCompanyUser(companyUser) {
    const user = state.users.get(companyUser.userId);
    return {
      userId: companyUser.userId,
      companyId: companyUser.companyId,
      companyUserId: companyUser.companyUserId,
      roles: [companyUser.roleCode],
      permissions: [...permissionsForRoles([companyUser.roleCode])],
      teamIds: listActiveTeamIds({
        companyId: companyUser.companyId,
        companyUserId: companyUser.companyUserId,
        userId: companyUser.userId
      }),
      email: user?.email || null,
      displayName: user?.displayName || null
    };
  }

  function listIdentityAccounts({ companyId = null, companyUserId = null, userId = null } = {}) {
    return [...state.identityAccounts.values()]
      .filter((identityAccount) => (companyId ? identityAccount.companyId === companyId : true))
      .filter((identityAccount) => (companyUserId ? identityAccount.companyUserId === companyUserId : true))
      .filter((identityAccount) => (userId ? identityAccount.userId === userId : true))
      .sort(
        (left, right) =>
          left.companyId.localeCompare(right.companyId)
          || left.companyUserId.localeCompare(right.companyUserId)
          || left.providerCode.localeCompare(right.providerCode)
          || left.factorType.localeCompare(right.factorType)
      )
      .map(copy);
  }

  function listPersonIdentities({ companyId = null, companyUserId = null, userId = null } = {}) {
    return [...state.personIdentities.values()]
      .filter((personIdentity) => (companyId ? personIdentity.companyId === companyId : true))
      .filter((personIdentity) => (companyUserId ? personIdentity.companyUserId === companyUserId : true))
      .filter((personIdentity) => (userId ? personIdentity.userId === userId : true))
      .sort(
        (left, right) =>
          left.companyId.localeCompare(right.companyId)
          || left.providerCode.localeCompare(right.providerCode)
          || left.providerSubject.localeCompare(right.providerSubject)
      )
      .map(copy);
  }

  function upsertIdentityAccount({
    companyId,
    companyUserId,
    userId,
    providerCode,
    factorType,
    providerSubject = null,
    credentialId = null,
    lastVerifiedAt = nowIso(),
    metadataJson = {}
  } = {}) {
    const identityAccountKey = buildIdentityAccountKey({
      companyId,
      companyUserId,
      providerCode,
      factorType,
      providerSubject,
      credentialId
    });
    const existingIdentityAccount = state.identityAccounts.get(identityAccountKey);
    const identityAccount = existingIdentityAccount || {
      identityAccountId: crypto.randomUUID(),
      companyId: assertNonEmpty(companyId, "company_id_required"),
      companyUserId: assertNonEmpty(companyUserId, "company_user_id_required"),
      userId: assertNonEmpty(userId, "user_id_required"),
      providerCode: assertNonEmpty(providerCode, "provider_code_required"),
      factorType: assertNonEmpty(factorType, "factor_type_required"),
      providerSubject: normalizeOptionalKeyPart(providerSubject),
      credentialId: normalizeOptionalKeyPart(credentialId),
      status: "active",
      linkedAt: nowIso(),
      createdAt: nowIso()
    };
    identityAccount.providerSubject = normalizeOptionalKeyPart(providerSubject);
    identityAccount.credentialId = normalizeOptionalKeyPart(credentialId);
    identityAccount.status = "active";
    identityAccount.lastVerifiedAt = lastVerifiedAt || nowIso();
    identityAccount.updatedAt = nowIso();
    identityAccount.metadataJson = {
      ...(identityAccount.metadataJson || {}),
      ...copy(metadataJson || {})
    };
    state.identityAccounts.set(identityAccountKey, identityAccount);
    return identityAccount;
  }

  function upsertPersonIdentity({
    companyId,
    companyUserId,
    userId,
    providerCode,
    providerSubject,
    email = null,
    displayName = null,
    metadataJson = {}
  } = {}) {
    const personIdentityKey = buildPersonIdentityKey({
      companyId,
      providerCode,
      providerSubject
    });
    const existingPersonIdentity = state.personIdentities.get(personIdentityKey);
    const personIdentity = existingPersonIdentity || {
      personIdentityId: crypto.randomUUID(),
      companyId: assertNonEmpty(companyId, "company_id_required"),
      companyUserId: assertNonEmpty(companyUserId, "company_user_id_required"),
      userId: assertNonEmpty(userId, "user_id_required"),
      providerCode: assertNonEmpty(providerCode, "provider_code_required"),
      providerSubject: assertNonEmpty(providerSubject, "provider_subject_required"),
      status: "linked",
      linkedAt: nowIso(),
      createdAt: nowIso()
    };
    personIdentity.companyUserId = assertNonEmpty(companyUserId, "company_user_id_required");
    personIdentity.userId = assertNonEmpty(userId, "user_id_required");
    personIdentity.email = normalizeOptionalKeyPart(email);
    personIdentity.displayName = normalizeOptionalKeyPart(displayName);
    personIdentity.updatedAt = nowIso();
    personIdentity.metadataJson = {
      ...(personIdentity.metadataJson || {}),
      ...copy(metadataJson || {})
    };
    state.personIdentities.set(personIdentityKey, personIdentity);
    return personIdentity;
  }

  function upsertDeviceTrustRecord({
    companyId,
    companyUserId,
    userId,
    factorId = null,
    factorType,
    credentialId = null,
    providerSubject = null,
    deviceName = null,
    deviceFingerprint = null,
    trustLevel = "authenticated",
    lastVerifiedAt = nowIso()
  } = {}) {
    const deviceTrustRecordKey = buildDeviceTrustRecordKey({
      companyId,
      companyUserId,
      factorType,
      credentialId,
      providerSubject,
      deviceFingerprint,
      factorId
    });
    const existingDeviceTrustRecordId = state.deviceTrustRecordIdByKey.get(deviceTrustRecordKey);
    const existingDeviceTrustRecord = existingDeviceTrustRecordId
      ? state.deviceTrustRecords.get(existingDeviceTrustRecordId)
      : null;
    const deviceTrustRecord = existingDeviceTrustRecord || {
      deviceTrustRecordId: crypto.randomUUID(),
      companyId: assertNonEmpty(companyId, "company_id_required"),
      companyUserId: assertNonEmpty(companyUserId, "company_user_id_required"),
      userId: assertNonEmpty(userId, "user_id_required"),
      factorType: assertNonEmpty(factorType, "factor_type_required"),
      createdAt: nowIso()
    };
    deviceTrustRecord.factorId = normalizeOptionalKeyPart(factorId);
    deviceTrustRecord.credentialId = normalizeOptionalKeyPart(credentialId);
    deviceTrustRecord.providerSubject = normalizeOptionalKeyPart(providerSubject);
    deviceTrustRecord.deviceFingerprint = normalizeOptionalKeyPart(deviceFingerprint);
    deviceTrustRecord.deviceName = normalizeOptionalKeyPart(deviceName) || `${factorType} device`;
    deviceTrustRecord.status = "trusted";
    deviceTrustRecord.trustLevel = trustLevel;
    deviceTrustRecord.firstSeenAt = deviceTrustRecord.firstSeenAt || lastVerifiedAt;
    deviceTrustRecord.lastSeenAt = lastVerifiedAt;
    deviceTrustRecord.lastVerifiedAt = lastVerifiedAt;
    deviceTrustRecord.updatedAt = nowIso();
    state.deviceTrustRecords.set(deviceTrustRecord.deviceTrustRecordId, deviceTrustRecord);
    state.deviceTrustRecordIdByKey.set(deviceTrustRecordKey, deviceTrustRecord.deviceTrustRecordId);
    appendToIndex(state.deviceTrustRecordIdsByCompanyUser, deviceTrustRecord.companyUserId, deviceTrustRecord.deviceTrustRecordId);
    return deviceTrustRecord;
  }

  function createSessionRevision(session, { reasonCode, factorType = null, actionClass = null, challengeId = null } = {}) {
    const sessionRevisionIds = state.sessionRevisionIdsBySession.get(session.sessionId) || [];
    const sessionRevision = {
      sessionRevisionId: crypto.randomUUID(),
      sessionId: session.sessionId,
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      revisionNumber: sessionRevisionIds.length + 1,
      reasonCode: assertNonEmpty(reasonCode, "session_revision_reason_required"),
      factorType: normalizeOptionalKeyPart(factorType),
      actionClass: normalizeOptionalKeyPart(actionClass),
      challengeId: normalizeOptionalKeyPart(challengeId),
      sessionStatus: session.status,
      trustLevel: resolveSessionTrustLevel(session),
      amr: [...session.amr],
      freshTrustByActionClass: copy(session.freshTrustByActionClass || {}),
      freshTrustByTrustLevel: copy(session.freshTrustByTrustLevel || {}),
      createdAt: nowIso()
    };
    state.sessionRevisions.set(sessionRevision.sessionRevisionId, sessionRevision);
    appendToIndex(state.sessionRevisionIdsBySession, session.sessionId, sessionRevision.sessionRevisionId);
    session.sessionRevisionId = sessionRevision.sessionRevisionId;
    session.sessionRevisionNumber = sessionRevision.revisionNumber;
    return sessionRevision;
  }

  function grantFreshTrust({ session, actionClass = null, trustLevel }) {
    const resolvedTrustLevel = trustLevel || resolveSessionTrustLevel(session);
    if (!session.freshTrustByActionClass || typeof session.freshTrustByActionClass !== "object") {
      session.freshTrustByActionClass = {};
    }
    if (!session.freshTrustByTrustLevel || typeof session.freshTrustByTrustLevel !== "object") {
      session.freshTrustByTrustLevel = {};
    }
    const trustLevelTtlSeconds = TRUST_LEVEL_FRESHNESS_TTL_SECONDS[resolvedTrustLevel] || TRUST_LEVEL_FRESHNESS_TTL_SECONDS.authenticated;
    session.freshTrustByTrustLevel[resolvedTrustLevel] = timestamp(new Date(currentDate().getTime() + trustLevelTtlSeconds * 1000));
    if (actionClass) {
      const actionClassTtlSeconds = ACTION_CLASS_FRESHNESS_TTL_SECONDS[actionClass] || trustLevelTtlSeconds;
      session.freshTrustByActionClass[actionClass] = timestamp(new Date(currentDate().getTime() + actionClassTtlSeconds * 1000));
    }
  }

  function createChallengeCompletionReceipt({
    session,
    sessionRevision,
    challengeId = null,
    challengeType = null,
    factorType,
    actionClass = null,
    deviceTrustRecordId = null
  } = {}) {
    const challengeCompletionReceipt = {
      challengeCompletionReceiptId: crypto.randomUUID(),
      companyId: session.companyId,
      companyUserId: session.companyUserId,
      userId: session.userId,
      sessionId: session.sessionId,
      sessionRevisionId: sessionRevision.sessionRevisionId,
      challengeId: normalizeOptionalKeyPart(challengeId),
      challengeType: normalizeOptionalKeyPart(challengeType) || assertNonEmpty(factorType, "factor_type_required"),
      factorType: assertNonEmpty(factorType, "factor_type_required"),
      actionClass: normalizeOptionalKeyPart(actionClass),
      trustLevel: resolveSessionTrustLevel(session),
      freshTrustByActionClass: copy(session.freshTrustByActionClass || {}),
      freshTrustByTrustLevel: copy(session.freshTrustByTrustLevel || {}),
      deviceTrustRecordId: normalizeOptionalKeyPart(deviceTrustRecordId),
      completedAt: nowIso()
    };
    state.challengeCompletionReceipts.set(
      challengeCompletionReceipt.challengeCompletionReceiptId,
      challengeCompletionReceipt
    );
    if (challengeCompletionReceipt.challengeId) {
      appendToIndex(
        state.challengeReceiptIdsByChallenge,
        challengeCompletionReceipt.challengeId,
        challengeCompletionReceipt.challengeCompletionReceiptId
      );
    }
    appendToIndex(
      state.challengeReceiptIdsBySession,
      challengeCompletionReceipt.sessionId,
      challengeCompletionReceipt.challengeCompletionReceiptId
    );
    return challengeCompletionReceipt;
  }

  function requireDeviceTrustRecord(deviceTrustRecordId) {
    const deviceTrustRecord = state.deviceTrustRecords.get(
      assertNonEmpty(deviceTrustRecordId, "device_trust_record_id_required")
    );
    if (!deviceTrustRecord) {
      throw httpError(404, "device_trust_record_not_found", "Device trust record was not found.");
    }
    return deviceTrustRecord;
  }

  function normalizeDeviceTrustRecordStorage() {
    const normalizedRecords = new Map();
    state.deviceTrustRecordIdByKey.clear();
    state.deviceTrustRecordIdsByCompanyUser.clear();
    for (const deviceTrustRecord of state.deviceTrustRecords.values()) {
      if (!deviceTrustRecord?.deviceTrustRecordId) {
        continue;
      }
      const deviceTrustRecordKey = buildDeviceTrustRecordKey({
        companyId: deviceTrustRecord.companyId,
        companyUserId: deviceTrustRecord.companyUserId,
        factorType: deviceTrustRecord.factorType,
        credentialId: deviceTrustRecord.credentialId,
        providerSubject: deviceTrustRecord.providerSubject,
        deviceFingerprint: deviceTrustRecord.deviceFingerprint,
        factorId: deviceTrustRecord.factorId
      });
      normalizedRecords.set(deviceTrustRecord.deviceTrustRecordId, deviceTrustRecord);
      state.deviceTrustRecordIdByKey.set(deviceTrustRecordKey, deviceTrustRecord.deviceTrustRecordId);
      appendToIndex(state.deviceTrustRecordIdsByCompanyUser, deviceTrustRecord.companyUserId, deviceTrustRecord.deviceTrustRecordId);
    }
    state.deviceTrustRecords.clear();
    for (const [deviceTrustRecordId, deviceTrustRecord] of normalizedRecords.entries()) {
      state.deviceTrustRecords.set(deviceTrustRecordId, deviceTrustRecord);
    }
  }

  function findFactor(companyUserId, factorType, statuses = ["active"]) {
    return [...state.authFactors.values()].find(
      (candidate) =>
        candidate.companyUserId === companyUserId &&
        candidate.factorType === factorType &&
        statuses.includes(candidate.status)
    );
  }

  function requireChallenge(challengeId, challengeType = null) {
    const challenge = state.authChallenges.get(challengeId);
    if (!challenge || (challengeType && challenge.challengeType !== challengeType)) {
      throw httpError(404, "auth_challenge_not_found", "Authentication challenge was not found.");
    }
    if (challenge.status !== "pending") {
      throw httpError(409, "auth_challenge_not_pending", "Authentication challenge is no longer pending.");
    }
    if (challenge.expiresAt && new Date(challenge.expiresAt) < currentDate()) {
      challenge.status = "expired";
      throw httpError(409, "auth_challenge_expired", "Authentication challenge has expired.");
    }
    return challenge;
  }

  function consumeOwnedChallenge({ challengeId, session, allowedTypes = [] } = {}) {
    const challenge = requireChallenge(assertNonEmpty(challengeId, "challenge_id_required"), null);
    if (challenge.companyUserId !== session.companyUserId) {
      throw httpError(403, "auth_challenge_scope_mismatch", "Authentication challenge belongs to another user.");
    }
    if (allowedTypes.length > 0 && !allowedTypes.includes(challenge.challengeType)) {
      throw httpError(409, "auth_challenge_type_invalid", `Challenge type ${challenge.challengeType} is not supported for this completion flow.`);
    }
    challenge.status = "consumed";
    challenge.consumedAt = nowIso();
    return challenge;
  }

  function requireOnboardingRun(runId, resumeToken) {
    const run = state.onboardingRuns.get(runId);
    if (!run || run.resumeToken !== resumeToken) {
      throw httpError(404, "onboarding_run_not_found", "Onboarding run or resume token was invalid.");
    }
    return run;
  }

  function requireOnboardingStep(runId, stepCode) {
    const step = state.onboardingStepStates.get(`${runId}:${stepCode}`);
    if (!step) {
      throw httpError(404, "onboarding_step_not_found", "Onboarding step was not found.");
    }
    return step;
  }

  function buildChecklist(runId) {
    return ONBOARDING_STEP_CODES.map((stepCode) => {
      const step = requireOnboardingStep(runId, stepCode);
      return {
        stepCode,
        status: step.status,
        completedAt: step.completedAt
      };
    });
  }

  function nextPendingStep(runId) {
    return buildChecklist(runId).find((step) => step.status !== "completed")?.stepCode || null;
  }

  function applyRegistrations(companyId, payload = {}) {
    const registrations = Array.isArray(payload?.registrations)
      ? payload.registrations
      : DEFAULT_REGISTRATION_TYPES.map((registrationType) => ({
          registrationType,
          registrationValue: payload?.[registrationType] || `${registrationType}_pending`,
          status: "configured"
        }));

    for (const registration of registrations) {
      const key = `${companyId}:${registration.registrationType}`;
      state.companyRegistrations.set(key, {
        companyRegistrationId: state.companyRegistrations.get(key)?.companyRegistrationId || crypto.randomUUID(),
        companyId,
        registrationType: registration.registrationType,
        registrationValue: registration.registrationValue || "",
        status: registration.status || "configured",
        effectiveFrom: registration.effectiveFrom || nowIso(),
        updatedAt: nowIso()
      });
    }
  }

  function applyChartTemplate(companyId, payload = {}) {
    const company = requireCompany(companyId);
    state.companySetupBlueprints.set(companyId, {
      companyId,
      chartTemplateId: payload.chartTemplateId || DEFAULT_CHART_TEMPLATE_ID,
      voucherSeriesCodes: payload.voucherSeriesCodes || [...DEFAULT_VOUCHER_SERIES],
      configuredAt: nowIso()
    });
    company.settingsJson.chartTemplateId = payload.chartTemplateId || DEFAULT_CHART_TEMPLATE_ID;
    company.settingsJson.voucherSeriesCodes = payload.voucherSeriesCodes || [...DEFAULT_VOUCHER_SERIES];
    company.updatedAt = nowIso();
  }

  function applyVatSetup(companyId, payload = {}) {
    const company = requireCompany(companyId);
    state.companyVatSetups.set(companyId, {
      companyVatSetupId: state.companyVatSetups.get(companyId)?.companyVatSetupId || crypto.randomUUID(),
      companyId,
      vatScheme: payload.vatScheme || DEFAULT_VAT_SCHEME,
      filingPeriod: payload.filingPeriod || DEFAULT_VAT_FILING_PERIOD,
      status: payload.status || "configured",
      updatedAt: nowIso()
    });
    company.settingsJson.vatScheme = payload.vatScheme || DEFAULT_VAT_SCHEME;
    company.settingsJson.vatFilingPeriod = payload.filingPeriod || DEFAULT_VAT_FILING_PERIOD;
    company.updatedAt = nowIso();
  }

  function applyFiscalPeriods(companyId, payload = {}, accountingYear) {
    const year = Number(payload.year || accountingYear || currentDate().getUTCFullYear());
    for (let month = 0; month < 12; month += 1) {
      const startsOn = new Date(Date.UTC(year, month, 1));
      const endsOn = new Date(Date.UTC(year, month + 1, 0));
      const key = `${companyId}:${startsOn.toISOString().slice(0, 10)}`;
      state.accountingPeriods.set(key, {
        accountingPeriodId: state.accountingPeriods.get(key)?.accountingPeriodId || crypto.randomUUID(),
        companyId,
        startsOn: startsOn.toISOString().slice(0, 10),
        endsOn: endsOn.toISOString().slice(0, 10),
        status: "open",
        createdAt: nowIso()
      });
    }
  }

  function finalizeOnboardingRun(run, company) {
    const tenantSetupProfile = requireTenantSetupProfile(company.companyId);
    run.status = "completed";
    run.currentStep = "completed";
    run.updatedAt = nowIso();
    company.status = "active";
    company.settingsJson.onboardingCompletedAt = nowIso();
    company.updatedAt = nowIso();
    tenantSetupProfile.status = "active";
    tenantSetupProfile.onboardingCompletedAt = nowIso();
    tenantSetupProfile.approvedAt = tenantSetupProfile.onboardingCompletedAt;
    tenantSetupProfile.updatedAt = tenantSetupProfile.onboardingCompletedAt;
  }

  function requireTenantSetupProfile(companyId) {
    const profile = state.tenantSetupProfiles.get(assertNonEmpty(companyId, "company_id_required"));
    if (!profile) {
      throw httpError(404, "tenant_setup_profile_not_found", "Tenant setup profile was not found.");
    }
    return profile;
  }

  function buildModuleDefinitionKey(companyId, moduleCode) {
    return `${assertNonEmpty(companyId, "company_id_required")}:${assertNonEmpty(moduleCode, "module_code_required")}`;
  }

  function requireModuleDefinition(companyId, moduleCode) {
    const definition = state.moduleDefinitions.get(buildModuleDefinitionKey(companyId, moduleCode));
    if (!definition) {
      throw httpError(404, "module_definition_not_found", "Module definition was not found.");
    }
    return definition;
  }

  function resolveModuleActivation(companyId, moduleCode) {
    return state.moduleActivations.get(buildModuleDefinitionKey(companyId, moduleCode)) || null;
  }

  function validateApprovalActors({ companyId, actorUserIds, scopeCode, objectType, objectId }) {
    for (const actorUserId of actorUserIds) {
      const companyUser = [...state.companyUsers.values()].find(
        (candidate) =>
          candidate.companyId === companyId
          && candidate.userId === actorUserId
          && candidate.status === "active"
          && isWindowOpen(candidate, currentDate())
      );
      if (!companyUser) {
        throw httpError(409, "module_activation_approver_not_found", `Approver ${actorUserId} is not active in the company.`);
      }
      const decision = authorizeAction({
        principal: buildPrincipalFromCompanyUser(companyUser),
        action: ACTIONS.COMPANY_MANAGE,
        resource: {
          companyId,
          objectType,
          objectId,
          scopeCode
        },
        delegations: [...state.delegations.values()],
        objectGrants: [...state.objectGrants.values()],
        now: currentDate()
      });
      if (!decision.allowed) {
        throw httpError(409, "module_activation_approver_unauthorized", `Approver ${actorUserId} is not authorized for module activation.`);
      }
    }
  }

  function pushAudit({ companyId, actorId, action, result, entityType, entityId, explanation, metadata = {} }) {
    state.auditEvents.push(
      createAuditEvent({
        companyId,
        actorId,
        action,
        result,
        entityType,
        entityId,
        explanation,
        correlationId: crypto.randomUUID(),
        recordedAt: currentDate(),
        metadata
      })
    );
  }

  function nowIso() {
    return timestamp(currentDate());
  }

  function currentDate() {
    return new Date(clock());
  }
}

function seedDemoState(state, clock, authSecretSealer) {
  const now = timestamp(new Date(clock()));
  state.companies.set(DEMO_IDS.companyId, {
    companyId: DEMO_IDS.companyId,
    legalName: "Swedish ERP Demo AB",
    orgNumber: "5599000006",
    status: "active",
    settingsJson: {
      chartTemplateId: DEFAULT_CHART_TEMPLATE_ID,
      vatScheme: DEFAULT_VAT_SCHEME,
      vatFilingPeriod: DEFAULT_VAT_FILING_PERIOD,
      accountingYear: "2026"
    },
    createdAt: now,
    updatedAt: now
  });
  ensureDefaultOperationalTeamsForState(state, DEMO_IDS.companyId, now);
  state.users.set(DEMO_IDS.userId, {
    userId: DEMO_IDS.userId,
    email: DEMO_ADMIN_EMAIL,
    displayName: "Phase 1 Admin",
    status: "active",
    createdAt: now,
    updatedAt: now
  });
  state.users.set(DEMO_APPROVER_IDS.userId, {
    userId: DEMO_APPROVER_IDS.userId,
    email: DEMO_APPROVER_EMAIL,
    displayName: "Phase 1 Approver",
    status: "active",
    createdAt: now,
    updatedAt: now
  });
  state.companyUsers.set(DEMO_IDS.companyUserId, {
    companyUserId: DEMO_IDS.companyUserId,
    companyId: DEMO_IDS.companyId,
    userId: DEMO_IDS.userId,
    roleCode: "company_admin",
    status: "active",
    startsAt: now,
    endsAt: null,
    isAdmin: true,
    requiresMfa: true,
    metadataJson: {},
    createdAt: now,
    updatedAt: now
  });
  state.companyUsers.set(DEMO_APPROVER_IDS.companyUserId, {
    companyUserId: DEMO_APPROVER_IDS.companyUserId,
    companyId: DEMO_IDS.companyId,
    userId: DEMO_APPROVER_IDS.userId,
    roleCode: "approver",
    status: "active",
    startsAt: now,
    endsAt: null,
    isAdmin: false,
    requiresMfa: false,
    metadataJson: {},
    createdAt: now,
    updatedAt: now
  });
  ensureTeamMembershipRecord(state, {
    companyId: DEMO_IDS.companyId,
    teamId: DEMO_TEAM_IDS.financeOps,
    companyUserId: DEMO_IDS.companyUserId,
    userId: DEMO_IDS.userId,
    membershipRoleCode: "lead",
    status: "active",
    startsAt: now,
    endsAt: null,
    createdAt: now,
    updatedAt: now
  });
  ensureTeamMembershipRecord(state, {
    companyId: DEMO_IDS.companyId,
    teamId: DEMO_TEAM_IDS.financeOps,
    companyUserId: DEMO_APPROVER_IDS.companyUserId,
    userId: DEMO_APPROVER_IDS.userId,
    membershipRoleCode: "member",
    status: "active",
    startsAt: now,
    endsAt: null,
    createdAt: now,
    updatedAt: now
  });
  state.authFactors.set("demo-totp-factor", {
    factorId: "demo-totp-factor",
    companyUserId: DEMO_IDS.companyUserId,
    userId: DEMO_IDS.userId,
    factorType: "totp",
    status: "active",
    secretRef: null,
    credentialId: null,
    publicKey: null,
    providerSubject: null,
    deviceName: "Demo authenticator",
    verifiedAt: now,
    createdAt: now,
    updatedAt: now
  });
  state.authFactors.set("demo-bankid-factor", {
    factorId: "demo-bankid-factor",
    companyUserId: DEMO_IDS.companyUserId,
    userId: DEMO_IDS.userId,
    factorType: "bankid",
    status: "active",
    secretRef: null,
    credentialId: null,
    publicKey: null,
    providerSubject: DEMO_BANKID_SUBJECT,
    deviceName: "Demo BankID",
    verifiedAt: now,
    createdAt: now,
    updatedAt: now
  });
  state.authFactors.set("demo-approver-totp-factor", {
    factorId: "demo-approver-totp-factor",
    companyUserId: DEMO_APPROVER_IDS.companyUserId,
    userId: DEMO_APPROVER_IDS.userId,
    factorType: "totp",
    status: "active",
    secretRef: null,
    credentialId: null,
    publicKey: null,
    providerSubject: null,
    deviceName: "Approver authenticator",
    verifiedAt: now,
    createdAt: now,
    updatedAt: now
  });
  writeSeededAuthFactorSecret(state, authSecretSealer, "demo-totp-factor", DEMO_TOTP_SECRET, now);
  writeSeededAuthFactorSecret(state, authSecretSealer, "demo-approver-totp-factor", DEMO_APPROVER_TOTP_SECRET, now);
  state.identityAccounts.set(
    buildIdentityAccountKey({
      companyId: DEMO_IDS.companyId,
      companyUserId: DEMO_IDS.companyUserId,
      providerCode: LOCAL_TOTP_PROVIDER_CODE,
      factorType: "totp",
      credentialId: "demo-totp-factor"
    }),
    {
      identityAccountId: crypto.randomUUID(),
      companyId: DEMO_IDS.companyId,
      companyUserId: DEMO_IDS.companyUserId,
      userId: DEMO_IDS.userId,
      providerCode: LOCAL_TOTP_PROVIDER_CODE,
      factorType: "totp",
      providerSubject: null,
      credentialId: "demo-totp-factor",
      status: "active",
      linkedAt: now,
      createdAt: now,
      updatedAt: now,
      lastVerifiedAt: now,
      metadataJson: {
        factorId: "demo-totp-factor",
        deviceName: "Demo authenticator"
      }
    }
  );
  state.identityAccounts.set(
    buildIdentityAccountKey({
      companyId: DEMO_IDS.companyId,
      companyUserId: DEMO_IDS.companyUserId,
      providerCode: BANKID_PROVIDER_CODE,
      factorType: "bankid",
      providerSubject: DEMO_BANKID_SUBJECT,
      credentialId: "demo-bankid-factor"
    }),
    {
      identityAccountId: crypto.randomUUID(),
      companyId: DEMO_IDS.companyId,
      companyUserId: DEMO_IDS.companyUserId,
      userId: DEMO_IDS.userId,
      providerCode: BANKID_PROVIDER_CODE,
      factorType: "bankid",
      providerSubject: DEMO_BANKID_SUBJECT,
      credentialId: "demo-bankid-factor",
      status: "active",
      linkedAt: now,
      createdAt: now,
      updatedAt: now,
      lastVerifiedAt: now,
      metadataJson: {
        factorId: "demo-bankid-factor",
        deviceName: "Demo BankID"
      }
    }
  );
  state.identityAccounts.set(
    buildIdentityAccountKey({
      companyId: DEMO_IDS.companyId,
      companyUserId: DEMO_APPROVER_IDS.companyUserId,
      providerCode: LOCAL_TOTP_PROVIDER_CODE,
      factorType: "totp",
      credentialId: "demo-approver-totp-factor"
    }),
    {
      identityAccountId: crypto.randomUUID(),
      companyId: DEMO_IDS.companyId,
      companyUserId: DEMO_APPROVER_IDS.companyUserId,
      userId: DEMO_APPROVER_IDS.userId,
      providerCode: LOCAL_TOTP_PROVIDER_CODE,
      factorType: "totp",
      providerSubject: null,
      credentialId: "demo-approver-totp-factor",
      status: "active",
      linkedAt: now,
      createdAt: now,
      updatedAt: now,
      lastVerifiedAt: now,
      metadataJson: {
        factorId: "demo-approver-totp-factor",
        deviceName: "Approver authenticator"
      }
    }
  );
  state.personIdentities.set(
    buildPersonIdentityKey({
      companyId: DEMO_IDS.companyId,
      providerCode: BANKID_PROVIDER_CODE,
      providerSubject: DEMO_BANKID_SUBJECT
    }),
    {
      personIdentityId: crypto.randomUUID(),
      companyId: DEMO_IDS.companyId,
      companyUserId: DEMO_IDS.companyUserId,
      userId: DEMO_IDS.userId,
      providerCode: BANKID_PROVIDER_CODE,
      providerSubject: DEMO_BANKID_SUBJECT,
      email: DEMO_ADMIN_EMAIL,
      displayName: "Phase 1 Admin",
      status: "linked",
      linkedAt: now,
      createdAt: now,
      updatedAt: now,
      metadataJson: {}
    }
  );
  state.companySetupBlueprints.set(DEMO_IDS.companyId, {
    companyId: DEMO_IDS.companyId,
    chartTemplateId: DEFAULT_CHART_TEMPLATE_ID,
    voucherSeriesCodes: [...DEFAULT_VOUCHER_SERIES],
    configuredAt: now
  });
  state.tenantSetupProfiles.set(DEMO_IDS.companyId, {
    tenantSetupProfileId: crypto.randomUUID(),
    companyId: DEMO_IDS.companyId,
    onboardingRunId: null,
    status: "active",
    onboardingCompletedAt: now,
    approvedAt: now,
    suspendedAt: null,
    suspendedReasonCode: null,
    createdAt: now,
    updatedAt: now
  });
  for (const registrationType of DEFAULT_REGISTRATION_TYPES) {
    state.companyRegistrations.set(`${DEMO_IDS.companyId}:${registrationType}`, {
      companyRegistrationId: crypto.randomUUID(),
      companyId: DEMO_IDS.companyId,
      registrationType,
      registrationValue: `${registrationType}-demo`,
      status: "configured",
      effectiveFrom: now,
      updatedAt: now
    });
  }
  state.companyVatSetups.set(DEMO_IDS.companyId, {
    companyVatSetupId: crypto.randomUUID(),
    companyId: DEMO_IDS.companyId,
    vatScheme: DEFAULT_VAT_SCHEME,
    filingPeriod: DEFAULT_VAT_FILING_PERIOD,
    status: "configured",
    updatedAt: now
  });
  for (let month = 0; month < 12; month += 1) {
    const startsOn = new Date(Date.UTC(2026, month, 1));
    const endsOn = new Date(Date.UTC(2026, month + 1, 0));
    state.accountingPeriods.set(`${DEMO_IDS.companyId}:${startsOn.toISOString().slice(0, 10)}`, {
      accountingPeriodId: crypto.randomUUID(),
      companyId: DEMO_IDS.companyId,
      startsOn: startsOn.toISOString().slice(0, 10),
      endsOn: endsOn.toISOString().slice(0, 10),
      status: "open",
      createdAt: now
    });
  }
}

function resolveBankIdProviderBaselineRef(providerBaselines, now) {
  const effectiveDate = timestamp(now).slice(0, 10);
  const providerBaseline = providerBaselines.resolveProviderBaseline({
    domain: "auth",
    jurisdiction: "SE",
    providerCode: BANKID_PROVIDER_CODE,
    baselineCode: "SE-BANKID-RP-API",
    effectiveDate
  });
  return providerBaselines.buildProviderBaselineRef({
    effectiveDate,
    providerBaseline,
    metadata: {
      factorType: "bankid"
    }
  });
}

function resolveFederationProviderBaselineRef(providerBaselines, now) {
  const effectiveDate = timestamp(now).slice(0, 10);
  const providerBaseline = providerBaselines.resolveProviderBaseline({
    domain: "auth",
    jurisdiction: "SE",
    providerCode: WORKOS_FEDERATION_PROVIDER_CODE,
    baselineCode: "SE-ENTERPRISE-FEDERATION-BROKER",
    effectiveDate
  });
  return providerBaselines.buildProviderBaselineRef({
    effectiveDate,
    providerBaseline,
    metadata: {
      factorType: "federation"
    }
  });
}

function buildDefaultIdentityModeCatalog({ providerEnvironmentRef } = {}) {
  const resolvedProviderEnvironmentRef = assertNonEmpty(providerEnvironmentRef, "provider_environment_ref_required");
  return Object.freeze(
    AUTH_RUNTIME_MODE_CODES.flatMap((runtimeMode) => {
      const modeDefaults = AUTH_IDENTITY_MODE_DEFAULTS[runtimeMode];
      return AUTH_IDENTITY_PROVIDER_CODES.map((providerCode) => {
        const definition = AUTH_IDENTITY_PROVIDER_DEFINITIONS[providerCode];
        const callbackDomain = `${definition.callbackSubdomainPrefix}.${modeDefaults.callbackRootDomain}`;
        const redirectUri =
          providerCode === WORKOS_FEDERATION_PROVIDER_CODE ? `https://${callbackDomain}${definition.callbackPath}` : null;
        return Object.freeze({
          runtimeMode,
          providerEnvironmentRef: runtimeMode === "production" ? "production" : modeDefaults.providerEnvironmentRef || resolvedProviderEnvironmentRef,
          supportsLegalEffect: modeDefaults.supportsLegalEffect,
          providerCode,
          brokerCode: definition.brokerCode,
          credentialSecretRef: `vault://${runtimeMode}/${providerCode}/oauth-client-secret`,
          webhookSecretRef: `vault://${runtimeMode}/${providerCode}/webhook-signing-secret`,
          requiredManagedSecretTypes: [...definition.requiredManagedSecretTypes],
          callbackDomain,
          callbackPath: definition.callbackPath,
          redirectUri,
          allowsTestIdentities: runtimeMode !== "production",
          testIdentities: [...(modeDefaults.testIdentities[providerCode] || [])]
        });
      });
    })
  );
}

function evaluateIdentityModeIsolation({
  state,
  identityIsolationCatalog,
  identityIsolationResolver = null,
  sessionToken,
  companyId,
  providerCode
} = {}) {
  const activeProfile = requireIdentityIsolationProfile({
    identityIsolationCatalog,
    runtimeMode: state.environmentMode,
    providerCode
  });
  const modeCatalog = identityIsolationCatalog
    .filter((entry) => entry.providerCode === providerCode)
    .map(projectIdentityModeCatalogEntry);
  const externalResolution =
    typeof identityIsolationResolver === "function"
      ? identityIsolationResolver({
        sessionToken,
        companyId,
        runtimeMode: state.environmentMode,
        providerEnvironmentRef: state.providerEnvironmentRef,
        providerCode,
        activeProfile: projectIdentityModeCatalogEntry(activeProfile),
        modeCatalog
      })
      : null;
  const violations = normalizeIdentityIsolationViolations(
    externalResolution?.violations,
    state.environmentMode
  );
  const ready = violations.every((violation) => violation.severity !== "blocking");
  return {
    providerCode,
    runtimeMode: state.environmentMode,
    providerEnvironmentRef: state.providerEnvironmentRef,
    activeProfile,
    modeCatalog,
    inventory: normalizeIdentityIsolationInventory(externalResolution?.inventory),
    violations,
    ready
  };
}

function requireIdentityIsolationProfile({ identityIsolationCatalog, runtimeMode, providerCode } = {}) {
  const profile = identityIsolationCatalog.find(
    (entry) => entry.runtimeMode === runtimeMode && entry.providerCode === providerCode
  );
  if (!profile) {
    throw httpError(500, "auth_identity_mode_profile_missing", `No auth isolation profile is configured for ${providerCode}/${runtimeMode}.`);
  }
  return profile;
}

function normalizeIdentityIsolationInventory(inventory = {}) {
  return {
    managedSecretCount: Number.isInteger(inventory?.managedSecretCount) ? inventory.managedSecretCount : 0,
    callbackSecretCount: Number.isInteger(inventory?.callbackSecretCount) ? inventory.callbackSecretCount : 0,
    matchingCallbackCount: Number.isInteger(inventory?.matchingCallbackCount) ? inventory.matchingCallbackCount : 0,
    certificateChainCount: Number.isInteger(inventory?.certificateChainCount) ? inventory.certificateChainCount : 0,
    requiredManagedSecretTypes: Array.isArray(inventory?.requiredManagedSecretTypes) ? [...inventory.requiredManagedSecretTypes] : [],
    configuredManagedSecretTypes: Array.isArray(inventory?.configuredManagedSecretTypes) ? [...inventory.configuredManagedSecretTypes] : []
  };
}

function normalizeIdentityIsolationViolations(violations, runtimeMode) {
  if (!Array.isArray(violations)) {
    return [];
  }
  return violations.map((violation) => ({
    providerCode: normalizeOptionalKeyPart(violation?.providerCode),
    code: assertNonEmpty(violation?.code, "identity_isolation_violation_code_required"),
    severity: normalizeIdentityIsolationSeverity(violation?.severity, runtimeMode),
    detail: assertNonEmpty(violation?.detail, "identity_isolation_violation_detail_required")
  }));
}

function normalizeIdentityIsolationSeverity(value, runtimeMode) {
  if (value === "blocking" || value === "warning") {
    return value;
  }
  return runtimeMode === "production" ? "blocking" : "warning";
}

function projectIdentityModeCatalogEntry(entry) {
  return {
    runtimeMode: entry.runtimeMode,
    providerEnvironmentRef: entry.providerEnvironmentRef,
    supportsLegalEffect: entry.supportsLegalEffect,
    providerCode: entry.providerCode,
    brokerCode: entry.brokerCode,
    credentialSecretRef: entry.credentialSecretRef,
    webhookSecretRef: entry.webhookSecretRef,
    requiredManagedSecretTypes: [...entry.requiredManagedSecretTypes],
    callbackDomain: entry.callbackDomain,
    callbackPath: entry.callbackPath,
    redirectUri: entry.redirectUri,
    allowsTestIdentities: entry.allowsTestIdentities,
    testIdentities: entry.testIdentities.map((identity) => ({ ...identity }))
  };
}

function projectIdentityIsolationState(summary) {
  return {
    runtimeMode: summary.runtimeMode,
    ready: summary.ready,
    blockingViolationCount: summary.violations.filter((violation) => violation.severity === "blocking").length,
    warningCount: summary.violations.filter((violation) => violation.severity !== "blocking").length,
    activeProfile: projectIdentityModeCatalogEntry(summary.activeProfile),
    violations: summary.violations.map((violation) => ({ ...violation }))
  };
}

function projectIdentityIsolationSummary(summary) {
  return {
    providerCode: summary.providerCode,
    runtimeMode: summary.runtimeMode,
    providerEnvironmentRef: summary.providerEnvironmentRef,
    ready: summary.ready,
    activeProfile: projectIdentityModeCatalogEntry(summary.activeProfile),
    inventory: { ...summary.inventory },
    violations: summary.violations.map((violation) => ({ ...violation }))
  };
}

function assertIdentityModeIsolationReady(summary, providerLabel) {
  const blockingViolations = summary.violations.filter((violation) => violation.severity === "blocking");
  if (blockingViolations.length === 0) {
    return;
  }
  throw httpError(
    409,
    "auth_identity_mode_isolation_incomplete",
    `${providerLabel} cannot start until identity mode isolation is complete.`,
    {
      details: {
        providerCode: summary.providerCode,
        runtimeMode: summary.runtimeMode,
        violationCodes: blockingViolations.map((violation) => violation.code)
      }
    }
  );
}

function buildIdentityAccountKey({ companyId, companyUserId, providerCode, factorType, providerSubject = null, credentialId = null }) {
  const resolvedProviderSubject = normalizeOptionalKeyPart(providerSubject);
  const resolvedCredentialId = normalizeOptionalKeyPart(credentialId);
  return [
    assertNonEmpty(companyId, "company_id_required"),
    assertNonEmpty(companyUserId, "company_user_id_required"),
    assertNonEmpty(providerCode, "provider_code_required"),
    assertNonEmpty(factorType, "factor_type_required"),
    resolvedProviderSubject || resolvedCredentialId || "local"
  ].join(":");
}

function buildPersonIdentityKey({ companyId, providerCode, providerSubject }) {
  return [
    assertNonEmpty(companyId, "company_id_required"),
    assertNonEmpty(providerCode, "provider_code_required"),
    assertNonEmpty(providerSubject, "provider_subject_required")
  ].join(":");
}

function buildDeviceTrustRecordKey({
  companyId,
  companyUserId,
  factorType,
  credentialId = null,
  providerSubject = null,
  deviceFingerprint = null,
  factorId = null
}) {
  return [
    assertNonEmpty(companyId, "company_id_required"),
    assertNonEmpty(companyUserId, "company_user_id_required"),
    assertNonEmpty(factorType, "factor_type_required"),
    normalizeOptionalKeyPart(deviceFingerprint)
      || normalizeOptionalKeyPart(credentialId)
      || normalizeOptionalKeyPart(providerSubject)
      || normalizeOptionalKeyPart(factorId)
      || "device"
  ].join(":");
}

function normalizeOptionalKeyPart(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringList(values, code) {
  if (values == null) {
    return [];
  }
  if (!Array.isArray(values)) {
    throw httpError(400, code, `${code} must be an array.`);
  }
  const result = [];
  for (const value of values) {
    const resolved = assertNonEmpty(value, code);
    if (!result.includes(resolved)) {
      result.push(resolved);
    }
  }
  return result;
}

function buildTeamKey(companyId, teamId) {
  return `${assertNonEmpty(companyId, "company_id_required")}:${assertNonEmpty(teamId, "team_id_required")}`;
}

function buildTeamMembershipKey(companyId, teamId, companyUserId) {
  return `${assertNonEmpty(companyId, "company_id_required")}:${assertNonEmpty(teamId, "team_id_required")}:${assertNonEmpty(companyUserId, "company_user_id_required")}`;
}

function defaultTeamAssignmentsForRole(roleCode) {
  switch (roleCode) {
    case "company_admin":
    case "approver":
      return [DEMO_TEAM_IDS.financeOps];
    case "payroll_admin":
      return [DEMO_TEAM_IDS.payrollOps];
    case "field_user":
      return [DEMO_TEAM_IDS.fieldOps];
    default:
      return [];
  }
}

function ensureDefaultOperationalTeamsForState(state, companyId, now) {
  for (const team of DEFAULT_OPERATIONAL_TEAMS) {
    const key = buildTeamKey(companyId, team.teamId);
    if (state.teams.has(key)) {
      continue;
    }
    state.teams.set(key, {
      teamId: team.teamId,
      companyId,
      teamCode: team.teamCode,
      label: team.label,
      status: "active",
      createdAt: now,
      updatedAt: now
    });
    appendToIndex(state.teamIdsByCompany, companyId, team.teamId);
  }
}

function ensureTeamMembershipRecord(state, {
  companyId,
  teamId,
  companyUserId,
  userId,
  membershipRoleCode = "member",
  status = "active",
  startsAt,
  endsAt = null,
  createdAt,
  updatedAt
}) {
  const key = buildTeamMembershipKey(companyId, teamId, companyUserId);
  const existingId = state.teamMembershipIdByKey.get(key);
  if (existingId) {
    return state.teamMemberships.get(existingId) || null;
  }
  const membership = {
    teamMembershipId: crypto.randomUUID(),
    companyId,
    teamId,
    companyUserId,
    userId,
    membershipRoleCode,
    status,
    startsAt,
    endsAt,
    createdAt,
    updatedAt
  };
  state.teamMemberships.set(membership.teamMembershipId, membership);
  state.teamMembershipIdByKey.set(key, membership.teamMembershipId);
  appendToIndex(state.teamMembershipIdsByCompany, companyId, membership.teamMembershipId);
  appendToIndex(state.teamMembershipIdsByTeam, buildTeamKey(companyId, teamId), membership.teamMembershipId);
  appendToIndex(state.teamMembershipIdsByCompanyUser, companyUserId, membership.teamMembershipId);
  return membership;
}

function appendToIndex(index, key, value) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  const items = index.get(key);
  if (!items.includes(value)) {
    items.push(value);
  }
}

function normalizeDateOnly(value, code) {
  const resolved = assertNonEmpty(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    throw httpError(400, code, `${code} must be an ISO date.`);
  }
  return resolved;
}

function assertAllowedValue(value, allowedValues, code) {
  const resolved = assertNonEmpty(value, code);
  if (!allowedValues.includes(resolved)) {
    throw httpError(400, code, `${code} does not allow ${resolved}.`);
  }
  return resolved;
}

function stripSecret(factor) {
  const clone = copy(factor);
  delete clone.secret;
  delete clone.secretRef;
  return clone;
}

function publicSession(session) {
  return {
    sessionId: session.sessionId,
    userId: session.userId,
    companyId: session.companyId,
    companyUserId: session.companyUserId,
    status: session.status,
    requiredFactorCount: session.requiredFactorCount,
    sessionRevisionId: session.sessionRevisionId || null,
    sessionRevisionNumber: session.sessionRevisionNumber || 0,
    amr: [...session.amr],
    trustLevel: resolveSessionTrustLevel(session),
    freshTrustByActionClass: copy(session.freshTrustByActionClass || {}),
    freshTrustByTrustLevel: copy(session.freshTrustByTrustLevel || {}),
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt
  };
}

function sessionIsNotExpired(session, now = new Date()) {
  return new Date(session.expiresAt) >= new Date(now);
}

function isWindowOpen(companyUser, now = new Date()) {
  const startsAt = companyUser.startsAt ? new Date(companyUser.startsAt) : null;
  const endsAt = companyUser.endsAt ? new Date(companyUser.endsAt) : null;
  if (startsAt && now < startsAt) {
    return false;
  }
  if (endsAt && now > endsAt) {
    return false;
  }
  return true;
}

function assertSupportedRole(roleCode) {
  const supportedRoles = ["company_admin", "approver", "payroll_admin", "field_user", "bureau_user"];
  if (!supportedRoles.includes(roleCode)) {
    throw httpError(400, "role_code_invalid", `Unsupported role ${roleCode}.`);
  }
  return roleCode;
}

function assertNonEmpty(value, code) {
  if (!String(value || "").trim()) {
    throw httpError(400, code, `${code} is required.`);
  }
  return String(value).trim();
}

function normalizeEmailAddress(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw httpError(400, "email_required", "Email is required.");
  }
  return normalizedEmail;
}

function createSecretSealer({ secretSealKey, keyId } = {}) {
  const resolvedKeyId = assertNonEmpty(keyId, "secret_sealer_key_id_required");
  const keyMaterial = crypto.createHash("sha256").update(assertNonEmpty(secretSealKey, "secret_sealer_key_required")).digest();
  return {
    keyId: resolvedKeyId,
    seal(secret) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", keyMaterial, iv);
      const ciphertext = Buffer.concat([cipher.update(assertNonEmpty(secret, "secret_plaintext_required"), "utf8"), cipher.final()]);
      return {
        keyId: resolvedKeyId,
        iv: iv.toString("base64"),
        authTag: cipher.getAuthTag().toString("base64"),
        ciphertext: ciphertext.toString("base64")
      };
    },
    open(envelope) {
      if (!envelope || envelope.keyId !== resolvedKeyId) {
        throw httpError(500, "secret_envelope_key_mismatch", "Secret envelope key id did not match the active auth sealer.");
      }
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        keyMaterial,
        Buffer.from(assertNonEmpty(envelope.iv, "secret_envelope_iv_required"), "base64")
      );
      decipher.setAuthTag(Buffer.from(assertNonEmpty(envelope.authTag, "secret_envelope_auth_tag_required"), "base64"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(assertNonEmpty(envelope.ciphertext, "secret_envelope_ciphertext_required"), "base64")),
        decipher.final()
      ]).toString("utf8");
      return plaintext;
    }
  };
}

function writeSeededAuthFactorSecret(state, authSecretSealer, factorId, secret, nowIsoTimestamp) {
  const factor = state.authFactors.get(assertNonEmpty(factorId, "seeded_factor_id_required"));
  if (!factor) {
    throw httpError(500, "seeded_auth_factor_missing", `Seeded auth factor ${factorId} was not found.`);
  }
  factor.secretRef = factor.factorId;
  delete factor.secret;
  state.authFactorSecrets.set(factor.secretRef, {
    secretRef: factor.secretRef,
    factorId: factor.factorId,
    companyUserId: factor.companyUserId,
    factorType: factor.factorType,
    keyId: authSecretSealer.keyId,
    algorithm: "aes-256-gcm",
    createdAt: nowIsoTimestamp,
    updatedAt: nowIsoTimestamp,
    envelope: authSecretSealer.seal(secret)
  });
}

function readBrokerSnapshotFromDurableState(snapshot, authSecretSealer) {
  if (snapshot?.authBrokerEnvelope?.envelope) {
    return JSON.parse(authSecretSealer.open(snapshot.authBrokerEnvelope.envelope));
  }
  return snapshot?.authBroker || {};
}

function redactFederationAuthorizationUrlForPersistence(authorizationUrl) {
  const resolvedAuthorizationUrl = assertNonEmpty(authorizationUrl, "federation_authorization_url_required");
  try {
    const url = new URL(resolvedAuthorizationUrl);
    url.searchParams.delete("state");
    return url.toString();
  } catch {
    return resolvedAuthorizationUrl.replace(/([?&])state=[^&]+(&|$)/, "$1redacted_state=1$2").replace(/[?&]$/, "");
  }
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
