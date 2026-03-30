import test from "node:test";
import assert from "node:assert/strict";
import {
  bindAuthorizationContextToPrincipal,
  evaluateSurfacePolicyAccess,
  getSurfacePolicy,
  resolveReadSurfacePolicyCode
} from "../../apps/api/src/surface-policies.mjs";

test("Phase 4.5 surface policy registry maps critical read paths and carries review metadata", () => {
  assert.equal(resolveReadSurfacePolicyCode("/v1/ledger/accounts"), "finance_operations");
  assert.equal(resolveReadSurfacePolicyCode("/v1/documents/doc-1/classification-cases"), "review_center");
  assert.equal(resolveReadSurfacePolicyCode("/v1/projects"), "project_workspace");
  assert.equal(resolveReadSurfacePolicyCode("/v1/field/audit-events"), "field_control");
  assert.equal(resolveReadSurfacePolicyCode("/v1/ops/feature-flags"), "backoffice");
  assert.equal(resolveReadSurfacePolicyCode("/v1/annual-reporting/packages"), "annual_operations");
  assert.equal(resolveReadSurfacePolicyCode("/v1/migration/cockpit"), "payroll_operations");
  assert.equal(resolveReadSurfacePolicyCode("/v1/object-profiles/payRun/pr_1"), "search_workspace");
  assert.equal(resolveReadSurfacePolicyCode("/v1/workbenches/PayrollWorkbench"), "search_workspace");
  assert.equal(resolveReadSurfacePolicyCode("/v1/saved-views/compatibility-scan"), "search_workspace");

  for (const policyCode of ["finance_operations", "search_workspace", "review_center", "backoffice", "activity_backoffice_context"]) {
    const policy = getSurfacePolicy(policyCode);
    assert.equal(typeof policy.action, "string");
    assert.ok(policy.action.startsWith("surface."));
    assert.equal(typeof policy.reviewBoundaryCode, "string");
    assert.ok(policy.reviewBoundaryCode.length > 0);
    assert.equal(typeof policy.maskingPolicyCode, "string");
    assert.ok(policy.maskingPolicyCode.length > 0);
  }
});

test("Phase 4.5 surface policy evaluation supports object-scoped fallback after company-wide denial", () => {
  const checkCalls = [];
  const principal = bindAuthorizationContextToPrincipal(
    {
      userId: "user-1",
      companyUserId: "company-user-1",
      companyId: "company-a",
      roles: ["field_user"]
    },
    {
      companyId: "company-a",
      sessionToken: "session-token",
      platform: {
        checkAuthorization({ action, resource }) {
          checkCalls.push({ action, resource });
          if (resource.objectId === "review-item-1") {
            return {
              principal: {
                userId: "user-1",
                companyUserId: "company-user-1",
                companyId: "company-a",
                roles: ["field_user"]
              },
              decision: {
                allowed: true,
                reasonCode: "object_grant",
                explanation: "Granted for the specific review item."
              }
            };
          }
          return {
            principal: {
              userId: "user-1",
              companyUserId: "company-user-1",
              companyId: "company-a",
              roles: ["field_user"]
            },
            decision: {
              allowed: false,
              reasonCode: "missing_permission",
              explanation: "Denied at company scope."
            }
          };
        }
      }
    }
  );

  const evaluation = evaluateSurfacePolicyAccess({
    principal,
    policyCode: "review_center",
    objectId: "review-item-1"
  });

  assert.equal(evaluation.decision.allowed, true);
  assert.deepEqual(
    checkCalls.map((entry) => entry.resource.objectId),
    ["company-a", "review-item-1"]
  );
  assert.equal(checkCalls[0].action, "surface.review_center.read");
});
