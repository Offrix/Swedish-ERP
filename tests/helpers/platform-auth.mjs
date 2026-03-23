export function loginWithStrongAuthOnPlatform({ platform, companyId, email }) {
  const started = platform.startLogin({ companyId, email });
  platform.verifyTotp({
    sessionToken: started.sessionToken,
    code: platform.getTotpCodeForTesting({ companyId, email })
  });
  const bankidStart = platform.startBankIdAuthentication({
    sessionToken: started.sessionToken
  });
  platform.collectBankIdAuthentication({
    sessionToken: started.sessionToken,
    orderRef: bankidStart.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
  });
  return started.sessionToken;
}

export function loginWithTotpOnPlatform({ platform, companyId, email }) {
  const started = platform.startLogin({ companyId, email });
  platform.verifyTotp({
    sessionToken: started.sessionToken,
    code: platform.getTotpCodeForTesting({ companyId, email })
  });
  return started.sessionToken;
}
