import {
  buildProviderBaselineRef,
  buildProviderReference,
  createStatelessProvider,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const PLEO_SPEND_PROVIDER_CODE = "pleo_spend";

export function createPleoSpendProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: PLEO_SPEND_PROVIDER_CODE,
    surfaceCode: "spend",
    connectionType: "spend",
    environmentMode,
    requiredCredentialKinds: ["api_credentials"],
    sandboxSupported: true,
    trialSafe: true,
    supportsLegalEffectInProduction: true,
    profiles: [
      {
        profileCode: "expense_and_card_sync",
        baselineCode: "SE-PLEO-SPEND-API",
        operationCodes: ["expense_sync", "card_transaction_sync", "receipt_sync"]
      }
    ]
  });

  return {
    ...provider,
    prepareSpendSync
  };

  function prepareSpendSync({ companyId, cursor = null, importMode = "incremental" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: PLEO_SPEND_PROVIDER_CODE,
      baselineCode: "SE-PLEO-SPEND-API",
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        importMode,
        cursor
      }
    });
    return Object.freeze({
      operationId: buildProviderReference("pleo", [resolvedCompanyId]),
      companyId: resolvedCompanyId,
      providerCode: PLEO_SPEND_PROVIDER_CODE,
      providerMode: provider.providerMode,
      providerEnvironmentRef: provider.providerEnvironmentRef,
      providerBaselineRef,
      providerBaselineCode: providerBaselineRef.baselineCode,
      importMode,
      cursor: cursor || null,
      status: "prepared",
      createdAt: nowIso(clock)
    });
  }
}
