import {
  buildProviderBaselineRef,
  buildProviderReference,
  createStatelessProvider,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const ENABLE_BANKING_PROVIDER_CODE = "enable_banking";

export function createEnableBankingProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: ENABLE_BANKING_PROVIDER_CODE,
    surfaceCode: "partner",
    connectionType: "bank",
    environmentMode,
    requiredCredentialKinds: ["api_credentials", "consent_grant"],
    sandboxSupported: true,
    trialSafe: true,
    supportsLegalEffectInProduction: true,
    profiles: [
      {
        profileCode: "open_banking_core",
        baselineCode: "SE-OPEN-BANKING-CORE",
        operationCodes: ["statement_sync", "payment_export", "tax_account_sync"]
      }
    ]
  });

  return {
    ...provider,
    prepareStatementSync,
    preparePaymentExport,
    prepareTaxAccountSync
  };

  function prepareStatementSync({ companyId, bankAccountId, windowStart, windowEnd } = {}) {
    return prepareBankOperation({
      companyId,
      sourceObjectId: bankAccountId,
      operationCode: "statement_sync",
      metadata: {
        windowStart,
        windowEnd
      }
    });
  }

  function preparePaymentExport({ companyId, paymentBatchId, paymentCount = 0 } = {}) {
    return prepareBankOperation({
      companyId,
      sourceObjectId: paymentBatchId,
      operationCode: "payment_export",
      metadata: {
        paymentCount: Number(paymentCount || 0)
      }
    });
  }

  function prepareTaxAccountSync({ companyId, taxAccountId, periodId = null } = {}) {
    return prepareBankOperation({
      companyId,
      sourceObjectId: taxAccountId,
      operationCode: "tax_account_sync",
      metadata: {
        periodId
      }
    });
  }

  function prepareBankOperation({ companyId, sourceObjectId, operationCode, metadata = {} }) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSourceObjectId = requireText(sourceObjectId, "source_object_id_required");
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: ENABLE_BANKING_PROVIDER_CODE,
      baselineCode: "SE-OPEN-BANKING-CORE",
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        sourceObjectId: resolvedSourceObjectId,
        operationCode
      }
    });
    return Object.freeze({
      operationId: buildProviderReference("enable-banking", [resolvedSourceObjectId]),
      companyId: resolvedCompanyId,
      sourceObjectId: resolvedSourceObjectId,
      operationCode,
      providerCode: ENABLE_BANKING_PROVIDER_CODE,
      providerMode: provider.providerMode,
      providerEnvironmentRef: provider.providerEnvironmentRef,
      providerBaselineRef,
      providerBaselineCode: providerBaselineRef.baselineCode,
      status: "prepared",
      metadata,
      createdAt: nowIso(clock)
    });
  }
}
