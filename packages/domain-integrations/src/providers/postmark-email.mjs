import {
  buildProviderBaselineRef,
  buildProviderReference,
  createError,
  createStatelessProvider,
  hashObject,
  normalizeEmail,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const POSTMARK_EMAIL_PROVIDER_CODE = "postmark_email";

export function createPostmarkEmailProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: POSTMARK_EMAIL_PROVIDER_CODE,
    surfaceCode: "notification_email",
    connectionType: "notification_email",
    environmentMode,
    requiredCredentialKinds: ["api_credentials"],
    sandboxSupported: true,
    trialSafe: true,
    supportsLegalEffectInProduction: true,
    profiles: [
      {
        profileCode: "transactional_template_email",
        baselineCode: "SE-POSTMARK-EMAIL-API",
        operationCodes: ["template_send", "delivery_status_sync"]
      }
    ]
  });

  return {
    ...provider,
    prepareEmailDelivery
  };

  function prepareEmailDelivery({
    companyId,
    sourceObjectId,
    recipientEmails = [],
    templateCode,
    subjectLine,
    templateModel = {}
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const recipients = [...new Set((Array.isArray(recipientEmails) ? recipientEmails : []).map((value) => normalizeEmail(value)))];
    if (recipients.length === 0) {
      throw createError(400, "notification_email_recipient_required", "At least one email recipient is required.");
    }
    const resolvedTemplateCode = requireText(templateCode, "notification_template_code_required");
    const resolvedSubjectLine = requireText(subjectLine, "notification_subject_required");
    const resolvedSourceObjectId = requireText(sourceObjectId, "source_object_id_required");
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: POSTMARK_EMAIL_PROVIDER_CODE,
      baselineCode: "SE-POSTMARK-EMAIL-API",
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        sourceObjectId: resolvedSourceObjectId,
        templateCode: resolvedTemplateCode
      }
    });
    return Object.freeze({
      deliveryId: buildProviderReference("postmark", [resolvedSourceObjectId]),
      companyId: resolvedCompanyId,
      sourceObjectId: resolvedSourceObjectId,
      providerCode: POSTMARK_EMAIL_PROVIDER_CODE,
      providerMode: provider.providerMode,
      providerEnvironmentRef: provider.providerEnvironmentRef,
      providerBaselineId: providerBaselineRef.providerBaselineId,
      providerBaselineCode: providerBaselineRef.baselineCode,
      providerBaselineVersion: providerBaselineRef.providerBaselineVersion,
      providerBaselineChecksum: providerBaselineRef.providerBaselineChecksum,
      providerBaselineRef,
      payloadType: "postmark_template_email",
      payloadVersion: "1.0",
      payloadHash: hashObject({
        recipients,
        templateCode: resolvedTemplateCode,
        subjectLine: resolvedSubjectLine,
        templateModel
      }),
      templateCode: resolvedTemplateCode,
      subjectLine: resolvedSubjectLine,
      recipients,
      templateModel,
      status: "prepared",
      createdAt: nowIso(clock)
    });
  }
}
