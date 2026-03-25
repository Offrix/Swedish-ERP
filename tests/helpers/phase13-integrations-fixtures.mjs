import { PARTNER_CONNECTION_TYPES } from "../../packages/domain-integrations/src/partners.mjs";

export function createSentWebhookDeliveryExecutor(httpStatus = 202) {
  return async () => ({
    outcome: "sent",
    httpStatus
  });
}

export function createPassingPartnerContractTestExecutors() {
  return Object.fromEntries(
    PARTNER_CONNECTION_TYPES.map((connectionType) => [
      connectionType,
      async ({ assertions }) => ({
        result: "passed",
        assertions,
        diagnostics: {
          executorType: connectionType
        }
      })
    ])
  );
}

export function createSuccessfulPartnerOperationExecutors() {
  return Object.fromEntries(
    PARTNER_CONNECTION_TYPES.map((connectionType) => [
      connectionType,
      async ({ connection, operation }) => ({
        outcome: "succeeded",
        providerReference: `${connection.partnerCode}:${operation.operationCode}:${operation.operationId}`,
        responseSummary: {
          connectionType,
          operationCode: operation.operationCode
        }
      })
    ])
  );
}
