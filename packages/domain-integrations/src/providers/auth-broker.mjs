import { createSignicatBankIdProvider } from "./signicat-bankid.mjs";
import { createWorkOsFederationProvider, WORKOS_FEDERATION_PROVIDER_CODE } from "./workos-federation.mjs";

export { WORKOS_FEDERATION_PROVIDER_CODE } from "./workos-federation.mjs";

export function createAuthBroker({
  clock = () => new Date(),
  environmentMode = "test",
  bankIdProvider = null,
  federationProvider = null
} = {}) {
  const providerMode = environmentMode === "production" ? "production" : "sandbox";
  const resolvedBankIdProvider = bankIdProvider || createSignicatBankIdProvider({ clock, providerMode });
  const resolvedFederationProvider = federationProvider || createWorkOsFederationProvider({ clock, providerMode });

  return {
    providerMode,
    bankIdProviderCode: resolvedBankIdProvider.providerCode,
    federationProviderCode: WORKOS_FEDERATION_PROVIDER_CODE,
    startBankIdChallenge: (input) => resolvedBankIdProvider.startChallenge(input),
    collectBankIdChallenge: (input) => resolvedBankIdProvider.collectChallenge(input),
    getBankIdCompletionToken: (orderRef) => resolvedBankIdProvider.getCompletionToken(orderRef),
    startFederationAuthorization: (input) => resolvedFederationProvider.startAuthorization(input),
    completeFederationAuthorization: (input) => resolvedFederationProvider.completeAuthorization(input),
    getFederationAuthorizationCode: (authRequestId) => resolvedFederationProvider.getAuthorizationCode(authRequestId),
    snapshot() {
      return {
        providerMode,
        bankIdProvider: resolvedBankIdProvider.snapshot(),
        federationProvider: resolvedFederationProvider.snapshot()
      };
    },
    restore(snapshot = {}) {
      resolvedBankIdProvider.restore(snapshot.bankIdProvider || {});
      resolvedFederationProvider.restore(snapshot.federationProvider || {});
    }
  };
}
