import test from "node:test";
import assert from "node:assert/strict";
import { createCoreEngine } from "../../packages/domain-core/src/index.mjs";

function createOrgAuthPlatform({ companyId, sessions, objectGrants = [] }) {
  const companyUsers = [...Object.values(sessions)].map((principal) => ({
    companyId,
    companyUserId: principal.companyUserId,
    userId: principal.userId,
    roleCode: principal.roles[0],
    status: "active"
  }));
  const teams = [
    { companyId, teamId: "finance_ops", teamCode: "finance_ops", label: "Finance operations", status: "active" },
    { companyId, teamId: "payroll_ops", teamCode: "payroll_ops", label: "Payroll operations", status: "active" }
  ];
  return {
    checkAuthorization({ sessionToken, action, resource }) {
      const principal = sessions[sessionToken] || null;
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
    },
    snapshot() {
      return {
        companyUsers,
        teams,
        objectGrants
      };
    }
  };
}

test("Step 15.4 operational work items trim visibility and block cross-team actions when no queue grants exist", () => {
  const companyId = "company_ops_scope_1";
  const sessions = {
    "finance-session": {
      userId: "finance_user",
      companyId,
      companyUserId: "finance_company_user",
      teamIds: ["finance_ops"],
      permissions: ["company.read", "company.manage"],
      roles: ["company_admin"]
    },
    "payroll-session": {
      userId: "payroll_user",
      companyId,
      companyUserId: "payroll_company_user",
      teamIds: ["payroll_ops"],
      permissions: ["company.read", "company.manage"],
      roles: ["payroll_admin"]
    }
  };
  const platform = createCoreEngine({
    clock: () => new Date("2026-03-27T09:15:00Z"),
    orgAuthPlatform: createOrgAuthPlatform({ companyId, sessions })
  });

  const workItem = platform.upsertOperationalWorkItem({
    companyId,
    queueCode: "REVIEW_CENTER_SLA",
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
    sessionToken: "finance-session",
    companyId,
    sourceType: "review_center_sla_breach"
  });
  assert.equal(financeVisible.some((item) => item.workItemId === workItem.workItemId), true);

  const payrollVisible = platform.listOperationalWorkItems({
    sessionToken: "payroll-session",
    companyId,
    sourceType: "review_center_sla_breach"
  });
  assert.equal(payrollVisible.some((item) => item.workItemId === workItem.workItemId), false);

  assert.throws(
    () => platform.claimOperationalWorkItem({
      sessionToken: "payroll-session",
      companyId,
      workItemId: workItem.workItemId
    }),
    (candidate) => candidate?.code === "operational_work_item_scope_forbidden"
  );

  assert.throws(
    () => platform.resolveOperationalWorkItem({
      sessionToken: "payroll-session",
      companyId,
      workItemId: workItem.workItemId,
      resolutionCode: "handled_elsewhere"
    }),
    (candidate) => candidate?.code === "operational_work_item_scope_forbidden"
  );
});

test("Step 15.4 queue grants drive closed-world access and queue operator views", () => {
  const companyId = "company_ops_scope_2";
  const sessions = {
    "finance-session": {
      userId: "finance_user",
      companyId,
      companyUserId: "finance_company_user",
      teamIds: ["finance_ops"],
      permissions: ["company.read", "company.manage"],
      roles: ["company_admin"]
    },
    "payroll-session": {
      userId: "payroll_user",
      companyId,
      companyUserId: "payroll_company_user",
      teamIds: ["payroll_ops"],
      permissions: ["company.read", "company.manage"],
      roles: ["payroll_admin"]
    }
  };
  const platform = createCoreEngine({
    clock: () => new Date("2026-03-27T12:00:00Z"),
    orgAuthPlatform: createOrgAuthPlatform({
      companyId,
      sessions,
      objectGrants: [
        {
          objectGrantId: "grant_ops_queue_1",
          companyId,
          companyUserId: "payroll_company_user",
          permissionCode: "company.manage",
          objectType: "operational_queue",
          objectId: "SUBMISSION_MONITORING",
          status: "active",
          startsAt: "2026-03-27T00:00:00Z",
          endsAt: null
        },
        {
          objectGrantId: "grant_ops_queue_2",
          companyId,
          companyUserId: "payroll_company_user",
          permissionCode: "company.read",
          objectType: "operational_queue",
          objectId: "SUBMISSION_MONITORING",
          status: "active",
          startsAt: "2026-03-27T00:00:00Z",
          endsAt: null
        }
      ]
    })
  });

  const workItem = platform.upsertOperationalWorkItem({
    companyId,
    queueCode: "SUBMISSION_MONITORING",
    ownerTeamId: "finance_ops",
    sourceType: "authoritySubmission",
    sourceId: "submission_1",
    title: "Submission requires operator handling",
    summary: "Grant-managed queue should no longer rely on team fallback.",
    priority: "critical",
    deadlineAt: "2026-03-27T10:00:00Z",
    actorId: "system"
  });

  const financeVisible = platform.listOperationalWorkItems({
    sessionToken: "finance-session",
    companyId,
    sourceType: "authoritySubmission"
  });
  assert.equal(financeVisible.some((item) => item.workItemId === workItem.workItemId), false);

  const payrollVisible = platform.listOperationalWorkItems({
    sessionToken: "payroll-session",
    companyId,
    sourceType: "authoritySubmission"
  });
  assert.equal(payrollVisible.length, 1);
  assert.equal(payrollVisible[0].queueGrantManaged, true);
  assert.deepEqual(payrollVisible[0].queueGrantCompanyUserIds, ["payroll_company_user"]);
  assert.equal(payrollVisible[0].isOverdue, true);

  const queueViews = platform.listOperationalWorkItemQueues({
    sessionToken: "payroll-session",
    companyId
  });
  assert.equal(queueViews.length, 1);
  assert.equal(queueViews[0].queueCode, "SUBMISSION_MONITORING");
  assert.equal(queueViews[0].queueGrantManaged, true);
  assert.equal(queueViews[0].openCount, 1);
  assert.equal(queueViews[0].overdueCount, 1);
  assert.equal(queueViews[0].oldestOpenAgeMinutes, 0);
});

test("Step 15.4 assignment and dual-control blockers are enforced on operational work items", () => {
  const companyId = "company_ops_scope_3";
  const sessions = {
    "finance-session": {
      userId: "finance_user",
      companyId,
      companyUserId: "finance_company_user",
      teamIds: ["finance_ops"],
      permissions: ["company.read", "company.manage"],
      roles: ["company_admin"]
    },
    "approver-session": {
      userId: "approver_user",
      companyId,
      companyUserId: "approver_company_user",
      teamIds: ["finance_ops"],
      permissions: ["company.read", "company.manage"],
      roles: ["approver"]
    },
    "payroll-session": {
      userId: "payroll_user",
      companyId,
      companyUserId: "payroll_company_user",
      teamIds: ["payroll_ops"],
      permissions: ["company.read", "company.manage"],
      roles: ["payroll_admin"]
    }
  };
  const platform = createCoreEngine({
    clock: () => new Date("2026-03-27T14:00:00Z"),
    orgAuthPlatform: createOrgAuthPlatform({
      companyId,
      sessions,
      objectGrants: [
        {
          objectGrantId: "grant_finance_assign_read",
          companyId,
          companyUserId: "finance_company_user",
          permissionCode: "company.read",
          objectType: "operational_queue",
          objectId: "SUBMISSION_MONITORING",
          status: "active",
          startsAt: "2026-03-27T00:00:00Z",
          endsAt: null
        },
        {
          objectGrantId: "grant_finance_assign_manage",
          companyId,
          companyUserId: "finance_company_user",
          permissionCode: "company.manage",
          objectType: "operational_queue",
          objectId: "SUBMISSION_MONITORING",
          status: "active",
          startsAt: "2026-03-27T00:00:00Z",
          endsAt: null
        },
        {
          objectGrantId: "grant_ops_assign_read",
          companyId,
          companyUserId: "payroll_company_user",
          permissionCode: "company.read",
          objectType: "operational_queue",
          objectId: "SUBMISSION_MONITORING",
          status: "active",
          startsAt: "2026-03-27T00:00:00Z",
          endsAt: null
        },
        {
          objectGrantId: "grant_ops_assign_manage",
          companyId,
          companyUserId: "payroll_company_user",
          permissionCode: "company.manage",
          objectType: "operational_queue",
          objectId: "SUBMISSION_MONITORING",
          status: "active",
          startsAt: "2026-03-27T00:00:00Z",
          endsAt: null
        }
      ]
    })
  });

  const grantManagedItem = platform.upsertOperationalWorkItem({
    companyId,
    queueCode: "SUBMISSION_MONITORING",
    ownerTeamId: "finance_ops",
    sourceType: "authoritySubmission",
    sourceId: "submission_assign_1",
    title: "Submission assignment gate",
    priority: "high",
    deadlineAt: "2026-03-27T18:00:00Z",
    actorId: "system"
  });

  assert.throws(
    () => platform.assignOperationalWorkItem({
      sessionToken: "finance-session",
      companyId,
      workItemId: grantManagedItem.workItemId,
      ownerCompanyUserId: "approver_company_user"
    }),
    (candidate) => candidate?.code === "operational_work_item_queue_grant_required"
  );

  const reassigned = platform.assignOperationalWorkItem({
    sessionToken: "finance-session",
    companyId,
    workItemId: grantManagedItem.workItemId,
    ownerCompanyUserId: "payroll_company_user",
    reasonCode: "queue_grant_assignment"
  });
  assert.equal(reassigned.ownerCompanyUserId, "payroll_company_user");
  assert.equal(reassigned.status, "open");

  const dualControlItem = platform.upsertOperationalWorkItem({
    companyId,
    queueCode: "CUTOVER_OPERATIONS",
    ownerTeamId: "finance_ops",
    ownerCompanyUserId: "finance_company_user",
    sourceType: "cutover",
    sourceId: "cutover_approval_1",
    title: "Cutover requires dual control",
    priority: "critical",
    deadlineAt: "2026-03-27T18:30:00Z",
    blockerScope: "dual_control",
    actorId: "system"
  });

  const claimed = platform.claimOperationalWorkItem({
    sessionToken: "finance-session",
    companyId,
    workItemId: dualControlItem.workItemId
  });
  assert.equal(claimed.status, "acknowledged");
  assert.equal(claimed.dualControlBlocked, true);

  assert.throws(
    () => platform.approveOperationalWorkItemDualControl({
      sessionToken: "finance-session",
      companyId,
      workItemId: dualControlItem.workItemId
    }),
    (candidate) => candidate?.code === "operational_work_item_dual_control_self_approval_forbidden"
  );

  assert.throws(
    () => platform.resolveOperationalWorkItem({
      sessionToken: "finance-session",
      companyId,
      workItemId: dualControlItem.workItemId,
      resolutionCode: "ready_to_close"
    }),
    (candidate) => candidate?.code === "operational_work_item_dual_control_required"
  );

  const dualApproved = platform.approveOperationalWorkItemDualControl({
    sessionToken: "approver-session",
    companyId,
    workItemId: dualControlItem.workItemId,
    note: "Independent approval recorded."
  });
  assert.equal(dualApproved.dualControlStatus, "approved");
  assert.equal(dualApproved.dualApprovedByCompanyUserId, "approver_company_user");

  const resolved = platform.resolveOperationalWorkItem({
    sessionToken: "finance-session",
    companyId,
    workItemId: dualControlItem.workItemId,
    resolutionCode: "ready_to_close"
  });
  assert.equal(resolved.status, "resolved");
});
