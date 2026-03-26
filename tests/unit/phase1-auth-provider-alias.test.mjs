import test from "node:test";
import assert from "node:assert/strict";
import { BANKID_PROVIDER_CODE } from "../../packages/auth-core/src/index.mjs";
import { createOrgAuthPlatform, DEMO_IDS, DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 1 BankID stub keeps the Signicat provider alias while exposing stub mode", () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-25T08:00:00Z"),
    bootstrapScenarioCode: "test_default_demo"
  });

  const login = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const bankIdStart = platform.startBankIdAuthentication({
    sessionToken: login.sessionToken
  });
  const bankIdCollect = platform.collectBankIdAuthentication({
    sessionToken: login.sessionToken,
    orderRef: bankIdStart.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
  });

  assert.equal(BANKID_PROVIDER_CODE, "signicat-bankid");
  assert.equal(bankIdStart.providerCode, "signicat-bankid");
  assert.equal(bankIdStart.providerMode, "stub");
  assert.equal(bankIdCollect.provider.providerCode, "signicat-bankid");
  assert.equal(bankIdCollect.provider.providerMode, "stub");
});
