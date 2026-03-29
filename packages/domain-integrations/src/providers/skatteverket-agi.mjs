import { createAuthorityTransportProvider } from "./skatteverket-transport-provider-base.mjs";

export const SKATTEVERKET_AGI_PROVIDER_CODE = "skatteverket_agi";

export function createSkatteverketAgiProvider(options = {}) {
  return createAuthorityTransportProvider({
    ...options,
    providerCode: SKATTEVERKET_AGI_PROVIDER_CODE,
    connectionType: "agi_transport",
    baselineCode: "SE-SKATTEVERKET-AGI-API",
    officialChannelCode: "skatteverket_agi_api",
    fallbackCode: "skatteverket_agi_file_upload",
    profileCode: "agi_transport"
  });
}
