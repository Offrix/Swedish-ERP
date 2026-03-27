import crypto from "node:crypto";
import { BANKID_PROVIDER_CODE, issueOpaqueToken } from "../../../auth-core/src/index.mjs";

export function createSignicatBankIdProvider({
  clock = () => new Date(),
  providerMode = "sandbox"
} = {}) {
  const orders = new Map();

  return {
    providerCode: BANKID_PROVIDER_CODE,
    providerMode,
    startChallenge({ sessionId, companyId, companyUserId, providerSubject } = {}) {
      const orderRef = crypto.randomUUID();
      const completionToken = issueOpaqueToken();
      const payload = {
        providerCode: BANKID_PROVIDER_CODE,
        brokerCode: "signicat",
        providerMode,
        orderRef,
        providerOrderRef: `signicat:${orderRef}`,
        autoStartToken: issueOpaqueToken(),
        qrStartToken: issueOpaqueToken(),
        qrStartSecret: issueOpaqueToken().slice(0, 16),
        completionToken
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
        providerOrderRef: order.providerOrderRef,
        orderRef,
        status: "complete",
        providerSubject: order.providerSubject
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
