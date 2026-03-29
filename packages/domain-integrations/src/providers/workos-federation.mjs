import crypto from "node:crypto";
import { issueOpaqueToken } from "../../../auth-core/src/index.mjs";
import {
  buildProviderBaselineRef,
  createStatelessProvider,
  nowIso
} from "./provider-runtime-helpers.mjs";

export const WORKOS_FEDERATION_PROVIDER_CODE = "workos-federation";

export function createWorkOsFederationProvider({
  clock = () => new Date(),
  providerMode = "sandbox",
  issuerBaseUrl = "https://api.workos.com",
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const authorizations = new Map();
  const provider = createStatelessProvider({
    providerCode: WORKOS_FEDERATION_PROVIDER_CODE,
    surfaceCode: "enterprise_federation",
    connectionType: "enterprise_sso",
    environmentMode,
    requiredCredentialKinds: ["client_secret"],
    sandboxSupported: true,
    trialSafe: true,
    productionSupported: true,
    supportsLegalEffectInProduction: false,
    supportsAsyncCallback: true,
    requiresCallbackRegistration: true,
    profiles: [
      {
        profileCode: "workos_enterprise_federation_v1",
        baselineCode: "SE-WORKOS-FEDERATION-BROKER",
        operationCodes: ["authorization_start", "authorization_complete", "callback_validate"]
      }
    ]
  });

  return {
    ...provider,
    providerCode: WORKOS_FEDERATION_PROVIDER_CODE,
    providerMode,
    providerEnvironmentRef: provider.providerEnvironmentRef,
    startAuthorization({
      companyId,
      companyUserId,
      userId,
      connectionId = "default-enterprise-sso",
      loginHint = null,
      redirectUri = "https://app.example.test/auth/federation/callback"
    } = {}) {
      const authRequestId = crypto.randomUUID();
      const state = issueOpaqueToken();
      const authorizationCode = issueOpaqueToken();
      const providerBaselineRef = buildProviderBaselineRef({
        providerBaselineRegistry,
        providerCode: WORKOS_FEDERATION_PROVIDER_CODE,
        baselineCode: "SE-WORKOS-FEDERATION-BROKER",
        effectiveDate: nowIso(clock).slice(0, 10),
        metadata: {
          brokerCode: "workos",
          connectionId,
          providerMode
        }
      });
      const profile = {
        subject: `${connectionId}:${companyUserId}`,
        email: typeof loginHint === "string" && loginHint.trim().length > 0 ? loginHint.trim().toLowerCase() : null,
        connectionId
      };
      authorizations.set(authRequestId, {
        authRequestId,
        companyId,
        companyUserId,
        userId,
        connectionId,
        state,
        authorizationCode,
        redirectUri,
        profile,
        status: "pending",
        startedAt: new Date(clock()).toISOString()
      });
      const params = new URLSearchParams({
        connection: connectionId,
        redirect_uri: redirectUri,
        state
      });
      if (profile.email) {
        params.set("login_hint", profile.email);
      }
      return {
        authRequestId,
        providerCode: WORKOS_FEDERATION_PROVIDER_CODE,
        brokerCode: "workos",
        providerMode,
        providerEnvironmentRef: provider.providerEnvironmentRef,
        connectionId,
        state,
        providerBaselineRef,
        providerBaselineCode: providerBaselineRef.baselineCode,
        authorizationUrl: `${issuerBaseUrl}/sso/authorize?${params.toString()}`
      };
    },
    completeAuthorization({ authRequestId, authorizationCode, state } = {}) {
      const authorization = authorizations.get(String(authRequestId || ""));
      if (!authorization) {
        throw httpError(404, "federation_auth_request_not_found", "Federation authorization request was not found.");
      }
      if (authorization.state !== String(state || "")) {
        throw httpError(403, "federation_state_invalid", "Federation state did not match the authorization request.");
      }
      if (authorization.authorizationCode !== String(authorizationCode || "")) {
        throw httpError(403, "federation_authorization_code_invalid", "Federation authorization code was invalid.");
      }
      authorization.status = "complete";
      authorization.completedAt = new Date(clock()).toISOString();
      return {
        providerCode: WORKOS_FEDERATION_PROVIDER_CODE,
        brokerCode: "workos",
        providerMode,
        providerEnvironmentRef: provider.providerEnvironmentRef,
        status: "complete",
        connectionId: authorization.connectionId,
        subject: authorization.profile.subject,
        providerBaselineRef: authorization.providerBaselineRef,
        providerBaselineCode: authorization.providerBaselineCode,
        claims: {
          email: authorization.profile.email,
          connectionId: authorization.connectionId
        }
      };
    },
    getAuthorizationCode(authRequestId) {
      if (providerMode === "production") {
        return null;
      }
      return authorizations.get(String(authRequestId || ""))?.authorizationCode || null;
    },
    snapshot() {
      return {
        authorizations: [...authorizations.entries()]
      };
    },
    restore(snapshot = {}) {
      authorizations.clear();
      for (const [authRequestId, authorization] of Array.isArray(snapshot.authorizations) ? snapshot.authorizations : []) {
        authorizations.set(authRequestId, authorization);
      }
    }
  };
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.error = code;
  return error;
}
