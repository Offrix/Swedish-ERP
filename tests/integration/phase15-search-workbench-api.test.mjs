import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createSearchEngine } from "../../packages/domain-search/src/index.mjs";
import { requestJson } from "../helpers/api-helpers.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

function createSearchApiPlatform() {
  const sourceState = {
    contracts: [
      {
        projectionCode: "payroll.pay_run",
        objectType: "payRun",
        displayName: "Pay runs",
        sourceDomainCode: "reporting",
        visibilityScope: "team",
        surfaceCodes: ["desktop.payroll", "desktop.search"],
        filterFieldCodes: ["reportingPeriod", "status"]
      }
    ],
    documents: [
      {
        projectionCode: "payroll.pay_run",
        objectId: "pr_api_15_2_1",
        displayTitle: "April payroll 2026",
        displaySubtitle: "Approved",
        documentStatus: "approved",
        searchText: "April payroll 2026 approved",
        filterPayload: {
          reportingPeriod: "2026-04",
          status: "approved"
        },
        permissionScope: {
          scopeCode: "team",
          teamId: "payroll_ops"
        },
        detailPayload: {
          sections: [
            {
              sectionCode: "employees",
              title: "Employees",
              fields: [{ fieldCode: "employeeCount", value: 5 }]
            }
          ],
          blockers: [
            {
              blockerCode: "unresolved_agreement_exception",
              title: "Agreement exception unresolved",
              severity: "blocking",
              sectionCode: "exceptions"
            }
          ],
          allowedActions: ["payroll.approve", "payroll.submitAgi"]
        },
        workbenchPayload: {
          blockerCodes: ["unresolved_agreement_exception"],
          counterTags: ["blockingExceptions"]
        },
        sourceVersion: "pay_run:pr_api_15_2_1:v1",
        sourceUpdatedAt: "2026-03-28T10:00:00Z"
      }
    ]
  };

  const engine = createSearchEngine({
    clock: () => new Date("2026-03-28T10:05:00Z"),
    reportingPlatform: {
      listSearchProjectionContracts: () => sourceState.contracts,
      listSearchProjectionDocuments: () => sourceState.documents
    }
  });

  const principals = new Map([
    [
      "token_admin",
      {
        userId: "user_admin",
        companyId: "company_phase15_2_api",
        companyUserId: "company_user_admin",
        roles: ["company_admin"],
        permissions: ["company.read", "company.manage", "surface.search.read"],
        teamIds: ["payroll_ops"]
      }
    ],
    [
      "token_reader",
      {
        userId: "user_reader",
        companyId: "company_phase15_2_api",
        companyUserId: "company_user_reader",
        roles: ["company_admin"],
        permissions: ["company.read", "company.manage", "surface.search.read"],
        teamIds: ["finance_ops"]
      }
    ]
  ]);

  return {
    ...engine,
    checkAuthorization({ sessionToken, action, resource }) {
      const normalizedSessionToken = String(sessionToken || "").replace(/^Bearer\s+/i, "");
      const principal = principals.get(normalizedSessionToken);
      const companyId = resource?.companyId || null;
      if (!principal || principal.companyId !== companyId || !principal.permissions.includes(action)) {
        return {
          principal: {
            userId: "anonymous",
            companyId,
            companyUserId: null,
            roles: [],
            permissions: [],
            teamIds: []
          },
          decision: {
            allowed: false,
            reasonCode: "forbidden",
            explanation: "Forbidden."
          }
        };
      }
      return {
        principal,
        decision: {
          allowed: true,
          reasonCode: "allowed",
          explanation: "Allowed."
        }
      };
    }
  };
}

test("Phase 15.2 API enforces object-profile visibility and exposes workbench compatibility scan", async () => {
  const platform = createSearchApiPlatform();
  await platform.requestSearchReindex({
    companyId: "company_phase15_2_api",
    actorId: "seed"
  });

  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/", {
      token: "token_admin"
    });
    assert.equal(root.routes.includes("/v1/saved-views/compatibility-scan"), true);

    const profile = await requestJson(baseUrl, "/v1/object-profiles/payRun/pr_api_15_2_1?companyId=company_phase15_2_api", {
      token: "token_admin"
    });
    assert.equal(profile.sections.find((section) => section.sectionCode === "employees")?.fields[0].value, 5);

    const denied = await requestJson(baseUrl, "/v1/object-profiles/payRun/pr_api_15_2_1?companyId=company_phase15_2_api", {
      token: "token_reader",
      expectedStatus: 403
    });
    assert.equal(denied.error, "object_profile_forbidden");

    const savedView = await requestJson(baseUrl, "/v1/saved-views", {
      method: "POST",
      token: "token_admin",
      expectedStatus: 201,
      body: {
        companyId: "company_phase15_2_api",
        surfaceCode: "desktop_payroll",
        title: "Approved pay runs",
        queryJson: {
          workbenchCode: "PayrollWorkbench",
          filters: {
            status: "approved"
          }
        },
        sortJson: {
          sortCode: "primaryLabelAsc",
          direction: "asc"
        }
      }
    });
    assert.equal(savedView.status, "active");

    const workbench = await requestJson(baseUrl, `/v1/workbenches/PayrollWorkbench?companyId=company_phase15_2_api&savedViewId=${savedView.savedViewId}`, {
      token: "token_admin"
    });
    assert.equal(workbench.rows.length, 1);
    assert.equal(workbench.activeSavedViewId, savedView.savedViewId);
    assert.equal(workbench.counters.blockingExceptions, 1);

    const brokenView = await requestJson(baseUrl, "/v1/saved-views", {
      method: "POST",
      token: "token_admin",
      expectedStatus: 201,
      body: {
        companyId: "company_phase15_2_api",
        surfaceCode: "desktop_payroll",
        title: "Broken payroll view",
        queryJson: {
          workbenchCode: "PayrollWorkbench",
          filters: {
            unsupportedFilter: "x"
          }
        }
      }
    });
    assert.equal(brokenView.status, "broken");

    const scan = await requestJson(baseUrl, "/v1/saved-views/compatibility-scan", {
      method: "POST",
      token: "token_admin",
      body: {
        companyId: "company_phase15_2_api",
        surfaceCode: "desktop_payroll"
      }
    });
    assert.equal(scan.scannedCount, 2);
    assert.equal(scan.items.find((item) => item.savedViewId === brokenView.savedViewId)?.brokenReasonCode, "saved_view_filter_invalid");
  } finally {
    await stopServer(server);
  }
});
