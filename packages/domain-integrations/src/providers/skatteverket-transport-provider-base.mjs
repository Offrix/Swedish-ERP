import {
  buildProviderBaselineRef,
  buildProviderReference,
  createStatelessProvider,
  hashObject,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export function createAuthorityTransportProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null,
  providerCode,
  connectionType,
  baselineCode,
  officialChannelCode,
  fallbackCode,
  profileCode
} = {}) {
  const provider = createStatelessProvider({
    providerCode,
    surfaceCode: "regulated_transport",
    connectionType,
    environmentMode,
    requiredCredentialKinds: ["api_credentials", "certificate_ref"],
    sandboxSupported: false,
    trialSafe: false,
    supportsLegalEffectInProduction: true,
    profiles: [
      {
        profileCode,
        baselineCode,
        operationCodes: ["transport_dispatch", "receipt_collect", "fallback_queue"]
      }
    ]
  });

  return {
    ...provider,
    prepareTransport
  };

  function prepareTransport({ companyId, submissionId, submissionType, payloadHash, routePreference = "official_api" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSubmissionId = requireText(submissionId, "submission_id_required");
    const resolvedSubmissionType = requireText(submissionType, "submission_type_required");
    const resolvedPayloadHash = requireText(payloadHash, "submission_payload_hash_required");
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode,
      baselineCode,
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        submissionType: resolvedSubmissionType,
        routePreference
      }
    });
    return Object.freeze({
      operationId: buildProviderReference(providerCode, [resolvedSubmissionId]),
      companyId: resolvedCompanyId,
      submissionId: resolvedSubmissionId,
      submissionType: resolvedSubmissionType,
      providerCode,
      providerMode: provider.providerMode,
      providerEnvironmentRef: provider.providerEnvironmentRef,
      providerBaselineRef,
      providerBaselineCode: providerBaselineRef.baselineCode,
      providerReference: `${providerCode}:${resolvedSubmissionId}:${hashObject(resolvedPayloadHash).slice(0, 12)}`,
      transportAdapterCode: `${providerCode}_adapter`,
      transportRouteCode: routePreference,
      officialChannelCode,
      fallbackCode,
      status: "prepared",
      createdAt: nowIso(clock)
    });
  }
}
