import { createStatelessProvider } from "./provider-runtime-helpers.mjs";

export const LOCAL_PASSKEY_PROVIDER_CODE = "local-passkey";

export function createLocalPasskeyProvider({
  environmentMode = "test"
} = {}) {
  return createStatelessProvider({
    providerCode: LOCAL_PASSKEY_PROVIDER_CODE,
    surfaceCode: "auth_local_factor",
    connectionType: "passkey",
    environmentMode,
    requiredCredentialKinds: [],
    sandboxSupported: true,
    trialSafe: true,
    productionSupported: true,
    supportsLegalEffectInProduction: false,
    profiles: [
      {
        profileCode: "webauthn_passkey_v1",
        baselineCode: "SE-PASSKEY-WEBAUTHN",
        operationCodes: ["registration_begin", "registration_complete", "assertion_verify"]
      }
    ]
  });
}
