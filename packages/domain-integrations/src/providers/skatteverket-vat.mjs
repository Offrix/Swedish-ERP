import { createAuthorityTransportProvider } from "./skatteverket-transport-provider-base.mjs";

export const SKATTEVERKET_VAT_PROVIDER_CODE = "skatteverket_vat";

export function createSkatteverketVatProvider(options = {}) {
  return createAuthorityTransportProvider({
    ...options,
    providerCode: SKATTEVERKET_VAT_PROVIDER_CODE,
    connectionType: "vat_transport",
    baselineCode: "SE-SKATTEVERKET-VAT-API",
    officialChannelCode: "skatteverket_vat_api",
    fallbackCode: "skatteverket_vat_xml_upload",
    profileCode: "vat_transport"
  });
}
