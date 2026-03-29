import { createStatelessProvider } from "./provider-runtime-helpers.mjs";

export const LOCAL_TOTP_PROVIDER_CODE = "local-totp";

export function createLocalTotpProvider({
  environmentMode = "test"
} = {}) {
  return createStatelessProvider({
    providerCode: LOCAL_TOTP_PROVIDER_CODE,
    surfaceCode: "auth_local_factor",
    connectionType: "totp",
    environmentMode,
    requiredCredentialKinds: [],
    sandboxSupported: true,
    trialSafe: true,
    productionSupported: true,
    supportsLegalEffectInProduction: false,
    profiles: [
      {
        profileCode: "rfc6238_totp_v1",
        baselineCode: "SE-TOTP-RFC6238",
        operationCodes: ["enrollment_begin", "enrollment_verify", "challenge_verify"]
      }
    ]
  });
}
