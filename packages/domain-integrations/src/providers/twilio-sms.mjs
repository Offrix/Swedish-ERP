import {
  buildProviderBaselineRef,
  buildProviderReference,
  createStatelessProvider,
  hashObject,
  normalizePhoneNumber,
  nowIso,
  requireText
} from "./provider-runtime-helpers.mjs";

export const TWILIO_SMS_PROVIDER_CODE = "twilio_sms";

export function createTwilioSmsProvider({
  clock = () => new Date(),
  environmentMode = "test",
  providerBaselineRegistry = null
} = {}) {
  const provider = createStatelessProvider({
    providerCode: TWILIO_SMS_PROVIDER_CODE,
    surfaceCode: "notification_sms",
    connectionType: "notification_sms",
    environmentMode,
    requiredCredentialKinds: ["api_credentials"],
    sandboxSupported: true,
    trialSafe: true,
    supportsLegalEffectInProduction: true,
    profiles: [
      {
        profileCode: "transactional_sms",
        baselineCode: "SE-TWILIO-SMS-API",
        operationCodes: ["sms_send", "delivery_status_sync"]
      }
    ]
  });

  return {
    ...provider,
    prepareSmsDelivery
  };

  function prepareSmsDelivery({ companyId, sourceObjectId, recipientPhoneNumber, textBody, senderId = "ERP" } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSourceObjectId = requireText(sourceObjectId, "source_object_id_required");
    const resolvedPhoneNumber = normalizePhoneNumber(recipientPhoneNumber);
    const resolvedTextBody = requireText(textBody, "notification_text_body_required");
    const providerBaselineRef = buildProviderBaselineRef({
      providerBaselineRegistry,
      providerCode: TWILIO_SMS_PROVIDER_CODE,
      baselineCode: "SE-TWILIO-SMS-API",
      effectiveDate: nowIso(clock).slice(0, 10),
      metadata: {
        sourceObjectId: resolvedSourceObjectId,
        senderId
      }
    });
    return Object.freeze({
      deliveryId: buildProviderReference("twilio", [resolvedSourceObjectId]),
      companyId: resolvedCompanyId,
      sourceObjectId: resolvedSourceObjectId,
      providerCode: TWILIO_SMS_PROVIDER_CODE,
      providerMode: provider.providerMode,
      providerEnvironmentRef: provider.providerEnvironmentRef,
      providerBaselineId: providerBaselineRef.providerBaselineId,
      providerBaselineCode: providerBaselineRef.baselineCode,
      providerBaselineVersion: providerBaselineRef.providerBaselineVersion,
      providerBaselineChecksum: providerBaselineRef.providerBaselineChecksum,
      providerBaselineRef,
      payloadType: "twilio_sms",
      payloadVersion: "1.0",
      payloadHash: hashObject({
        recipientPhoneNumber: resolvedPhoneNumber,
        senderId,
        textBody: resolvedTextBody
      }),
      recipientPhoneNumber: resolvedPhoneNumber,
      senderId,
      textBody: resolvedTextBody,
      status: "prepared",
      createdAt: nowIso(clock)
    });
  }
}
