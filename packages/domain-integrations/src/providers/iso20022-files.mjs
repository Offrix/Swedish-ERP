import {
  buildProviderBaselineRef,
  buildProviderReference,
  createStatelessProvider,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const ISO20022_FILES_PROVIDER_CODE = "bank_file_channel";

export function createIso20022FilesProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: ISO20022_FILES_PROVIDER_CODE,
    surfaceCode: "partner",
    connectionType: "bank",
    environmentMode,
    requiredCredentialKinds: ["file_channel_credentials"],
    sandboxSupported: true,
    trialSafe: true,
    supportsLegalEffectInProduction: true,
    profiles: [
      {
        profileCode: "iso20022_files",
        baselineCode: "SE-BANK-FILE-FORMAT",
        operationCodes: ["pain001_export", "camt053_import", "camt054_import"]
      }
    ]
  });

  return {
    ...provider,
    prepareFileExchange
  };

  function prepareFileExchange({ companyId, sourceObjectId, messageType, direction, purposeCode } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSourceObjectId = requireText(sourceObjectId, "source_object_id_required");
    const resolvedMessageType = requireText(messageType, "bank_file_message_type_required");
    const resolvedDirection = requireText(direction, "bank_file_direction_required");
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: ISO20022_FILES_PROVIDER_CODE,
      baselineCode: "SE-BANK-FILE-FORMAT",
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        sourceObjectId: resolvedSourceObjectId,
        messageType: resolvedMessageType
      }
    });
    return Object.freeze({
      operationId: buildProviderReference("iso20022", [resolvedSourceObjectId]),
      companyId: resolvedCompanyId,
      sourceObjectId: resolvedSourceObjectId,
      providerCode: ISO20022_FILES_PROVIDER_CODE,
      providerMode: provider.providerMode,
      providerEnvironmentRef: provider.providerEnvironmentRef,
      providerBaselineRef,
      providerBaselineCode: providerBaselineRef.baselineCode,
      messageType: resolvedMessageType,
      direction: resolvedDirection,
      purposeCode: purposeCode || null,
      status: "prepared",
      createdAt: nowIso(clock)
    });
  }
}
