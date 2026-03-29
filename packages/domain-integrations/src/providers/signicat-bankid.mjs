import crypto from "node:crypto";
import { BANKID_PROVIDER_CODE, issueOpaqueToken } from "../../../auth-core/src/index.mjs";
import {
  buildProviderBaselineRef,
  createStatelessProvider,
  nowIso
} from "./provider-runtime-helpers.mjs";

export function createSignicatBankIdProvider({
  clock = () => new Date(),
  providerMode = "sandbox",
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const orders = new Map();
  const provider = createStatelessProvider({
    providerCode: BANKID_PROVIDER_CODE,
    surfaceCode: "auth_identity",
    connectionType: "bankid_authentication",
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
        profileCode: "signicat_bankid_authentication_v1",
        baselineCode: "SE-SIGNICAT-BANKID-BROKER",
        operationCodes: ["challenge_start", "challenge_collect", "callback_validate"]
      }
    ]
  });

  return {
    ...provider,
    providerCode: BANKID_PROVIDER_CODE,
    providerMode,
    providerEnvironmentRef: provider.providerEnvironmentRef,
    startChallenge({ sessionId, companyId, companyUserId, providerSubject } = {}) {
      const orderRef = crypto.randomUUID();
      const completionToken = issueOpaqueToken();
      const providerBaselineRef = buildProviderBaselineRef({
        providerBaselineRegistry,
        providerCode: BANKID_PROVIDER_CODE,
        baselineCode: "SE-SIGNICAT-BANKID-BROKER",
        effectiveDate: nowIso(clock).slice(0, 10),
        metadata: {
          brokerCode: "signicat",
          providerMode
        }
      });
      const payload = {
        providerCode: BANKID_PROVIDER_CODE,
        brokerCode: "signicat",
        providerMode,
        providerEnvironmentRef: provider.providerEnvironmentRef,
        orderRef,
        providerOrderRef: `signicat:${orderRef}`,
        autoStartToken: issueOpaqueToken(),
        qrStartToken: issueOpaqueToken(),
        qrStartSecret: issueOpaqueToken().slice(0, 16),
        completionToken,
        providerBaselineRef,
        providerBaselineCode: providerBaselineRef.baselineCode
      };
      orders.set(orderRef, {
        ...payload,
        sessionId,
        companyId,
        companyUserId,
        providerSubject,
        status: "pending",
        startedAt: new Date(clock()).toISOString()
      });
      return payload;
    },
    collectChallenge({ orderRef, completionToken } = {}) {
      const order = orders.get(String(orderRef || ""));
      if (!order) {
        throw httpError(404, "bankid_order_not_found", "BankID order ref was not found.");
      }
      if (order.completionToken !== String(completionToken || "")) {
        throw httpError(403, "bankid_completion_token_invalid", "Completion token did not match the challenge.");
      }
      order.status = "complete";
      order.completedAt = new Date(clock()).toISOString();
      return {
        providerCode: BANKID_PROVIDER_CODE,
        brokerCode: "signicat",
        providerMode,
        providerEnvironmentRef: provider.providerEnvironmentRef,
        providerOrderRef: order.providerOrderRef,
        orderRef,
        status: "complete",
        providerSubject: order.providerSubject,
        providerBaselineRef: order.providerBaselineRef,
        providerBaselineCode: order.providerBaselineCode
      };
    },
    getCompletionToken(orderRef) {
      if (providerMode === "production") {
        return null;
      }
      return orders.get(String(orderRef || ""))?.completionToken || null;
    },
    snapshot() {
      return {
        orders: [...orders.entries()]
      };
    },
    restore(snapshot = {}) {
      orders.clear();
      for (const [orderRef, order] of Array.isArray(snapshot.orders) ? snapshot.orders : []) {
        orders.set(orderRef, order);
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
