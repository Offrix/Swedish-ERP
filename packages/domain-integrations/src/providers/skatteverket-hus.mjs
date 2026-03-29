import { createAuthorityTransportProvider } from "./skatteverket-transport-provider-base.mjs";

export const SKATTEVERKET_HUS_PROVIDER_CODE = "skatteverket_hus";

export function createSkatteverketHusProvider(options = {}) {
  return createAuthorityTransportProvider({
    ...options,
    providerCode: SKATTEVERKET_HUS_PROVIDER_CODE,
    connectionType: "hus_transport",
    baselineCode: "SE-SKATTEVERKET-HUS-API",
    officialChannelCode: "skatteverket_hus_api",
    fallbackCode: "skatteverket_hus_signed_xml_fallback",
    profileCode: "hus_transport"
  });
}
