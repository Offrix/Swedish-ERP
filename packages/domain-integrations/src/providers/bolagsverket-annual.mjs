import { createAuthorityTransportProvider } from "./skatteverket-transport-provider-base.mjs";

export const BOLAGSVERKET_ANNUAL_PROVIDER_CODE = "bolagsverket_annual";

export function createBolagsverketAnnualProvider(options = {}) {
  return createAuthorityTransportProvider({
    ...options,
    providerCode: BOLAGSVERKET_ANNUAL_PROVIDER_CODE,
    connectionType: "annual_transport",
    baselineCode: "SE-BOLAGSVERKET-ANNUAL-API",
    officialChannelCode: "bolagsverket_ixbrl",
    fallbackCode: "signed_ixbrl_upload",
    profileCode: "annual_transport"
  });
}
