import test from "node:test";
import assert from "node:assert/strict";
import { authorizeAction, generateTotpCode, verifyTotpCode } from "../../packages/auth-core/src/index.mjs";

test("TOTP helpers are deterministic for a fixed secret and timestamp", () => {
  const now = new Date("2026-03-21T10:15:00Z");
  const secret = "JBSWY3DPEHPK3PXP";

  const code = generateTotpCode({ secret, now });
  assert.match(code, /^[0-9]{6}$/);
  assert.equal(verifyTotpCode({ secret, code, now }), true);
  assert.equal(verifyTotpCode({ secret, code: "000000", now }), false);
});

test("authorization helper enforces company boundary and supports delegation/object grants", () => {
  const principal = {
    userId: "user-1",
    companyId: "company-a",
    companyUserId: "company-user-1",
    roles: ["approver"],
    permissions: []
  };

  const deniedCrossCompany = authorizeAction({
    principal,
    action: "approval.approve",
    resource: {
      companyId: "company-b",
      objectType: "customer_invoice",
      objectId: "INV-1",
      scopeCode: "customer_invoice"
    }
  });
  assert.equal(deniedCrossCompany.allowed, false);
  assert.equal(deniedCrossCompany.reasonCode, "cross_company_forbidden");

  const deniedWithoutDelegation = authorizeAction({
    principal,
    action: "approval.approve",
    resource: {
      companyId: "company-a",
      objectType: "customer_invoice",
      objectId: "INV-1",
      scopeCode: "customer_invoice"
    }
  });
  assert.equal(deniedWithoutDelegation.allowed, false);

  const grantedByDelegation = authorizeAction({
    principal,
    action: "approval.approve",
    resource: {
      companyId: "company-a",
      objectType: "customer_invoice",
      objectId: "INV-1",
      scopeCode: "customer_invoice"
    },
    delegations: [
      {
        delegationId: "delegation-1",
        companyId: "company-a",
        toCompanyUserId: "company-user-1",
        scopeCode: "customer_invoice",
        permissionCode: "approval.approve",
        resourceType: "customer_invoice",
        resourceId: "INV-1",
        status: "active",
        startsAt: "2026-03-01T00:00:00Z",
        endsAt: "2026-03-31T23:59:59Z"
      }
    ],
    now: new Date("2026-03-21T10:15:00Z")
  });
  assert.equal(grantedByDelegation.allowed, true);
  assert.equal(grantedByDelegation.reasonCode, "delegation");

  const grantedByObjectGrant = authorizeAction({
    principal: { ...principal, roles: ["field_user"] },
    action: "approval.approve",
    resource: {
      companyId: "company-a",
      objectType: "customer_invoice",
      objectId: "INV-1",
      scopeCode: "customer_invoice"
    },
    objectGrants: [
      {
        objectGrantId: "grant-1",
        companyId: "company-a",
        companyUserId: "company-user-1",
        permissionCode: "approval.approve",
        objectType: "customer_invoice",
        objectId: "INV-1",
        status: "active",
        startsAt: "2026-03-01T00:00:00Z",
        endsAt: "2026-03-31T23:59:59Z"
      }
    ],
    now: new Date("2026-03-21T10:15:00Z")
  });
  assert.equal(grantedByObjectGrant.allowed, true);
  assert.equal(grantedByObjectGrant.reasonCode, "object_grant");
});
