import test from "node:test";
import assert from "node:assert/strict";
import { createCoreEngine } from "../../packages/domain-core/src/index.mjs";

test("Step 6.3 operational work items trim list visibility and block cross-team actions", () => {
  const companyId = "company_ops_scope_1";
  const financeSession = "finance-session";
  const payrollSession = "payroll-session";
  const platform = createCoreEngine({
    clock: () => new Date("2026-03-27T09:15:00Z"),
    orgAuthPlatform: {
      checkAuthorization({ sessionToken, action, resource }) {
        const principal = sessionToken === financeSession
          ? {
            userId: "finance_user",
            companyId,
            companyUserId: "finance_company_user",
            teamIds: ["finance_ops"],
            permissions: ["company.read", "company.manage"],
            roles: ["company_admin"]
          }
          : sessionToken === payrollSession
            ? {
              userId: "payroll_user",
              companyId,
              companyUserId: "payroll_company_user",
              teamIds: ["payroll_ops"],
              permissions: ["company.read", "company.manage"],
              roles: ["payroll_admin"]
            }
            : null;
        if (!principal || resource?.companyId !== companyId || !principal.permissions.includes(action)) {
          return {
            principal,
            decision: {
              allowed: false,
              reasonCode: "missing_permission",
              explanation: "Permission denied."
            }
          };
        }
        return {
          principal,
          decision: {
            allowed: true,
            reasonCode: "allowed",
            explanation: "Permission granted."
          }
        };
      }
    }
  });

  const workItem = platform.upsertOperationalWorkItem({
    companyId,
    queueCode: "review_center_sla",
    ownerTeamId: "finance_ops",
    sourceType: "review_center_sla_breach",
    sourceId: "review_scope_source_1",
    title: "Finance SLA breach",
    summary: "Finance queue work item.",
    priority: "high",
    deadlineAt: "2026-03-27T10:00:00Z",
    actorId: "system"
  });

  const financeVisible = platform.listOperationalWorkItems({
    sessionToken: financeSession,
    companyId,
    sourceType: "review_center_sla_breach"
  });
  assert.equal(financeVisible.some((item) => item.workItemId === workItem.workItemId), true);

  const payrollVisible = platform.listOperationalWorkItems({
    sessionToken: payrollSession,
    companyId,
    sourceType: "review_center_sla_breach"
  });
  assert.equal(payrollVisible.some((item) => item.workItemId === workItem.workItemId), false);

  assert.throws(
    () => platform.claimOperationalWorkItem({
      sessionToken: payrollSession,
      companyId,
      workItemId: workItem.workItemId
    }),
    (candidate) => candidate?.code === "operational_work_item_scope_forbidden"
  );

  assert.throws(
    () => platform.resolveOperationalWorkItem({
      sessionToken: payrollSession,
      companyId,
      workItemId: workItem.workItemId,
      resolutionCode: "handled_elsewhere"
    }),
    (candidate) => candidate?.code === "operational_work_item_scope_forbidden"
  );
});
