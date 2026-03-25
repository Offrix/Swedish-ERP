import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { requestJson } from "../helpers/api-helpers.mjs";

test("Step 33 API forwards active team ids to search visibility trimming", async () => {
  const calls = [];
  const platform = {
    checkAuthorization() {
      return {
        principal: {
          userId: "user_search_1",
          companyId: "company_search_1",
          companyUserId: "company_user_search_1",
          roles: ["approver"],
          permissions: ["company.read"],
          teamIds: ["finance_ops"]
        },
        decision: {
          allowed: true,
          reasonCode: "allowed",
          explanation: "Allowed."
        }
      };
    },
    listSearchDocuments(args) {
      calls.push({ kind: "list", args });
      return [
        {
          searchDocumentId: "search_doc_1",
          projectionCode: "reporting.report_definition",
          objectType: "report_definition",
          displayTitle: "Trial balance"
        }
      ];
    },
    getSearchDocument(args) {
      calls.push({ kind: "get", args });
      return {
        searchDocumentId: args.searchDocumentId,
        projectionCode: "reporting.report_definition",
        objectType: "report_definition",
        displayTitle: "Trial balance"
      };
    }
  };

  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await requestJson(
      baseUrl,
      "/v1/search/documents?companyId=company_search_1&query=trial"
    );
    await requestJson(
      baseUrl,
      "/v1/search/documents/search_doc_1?companyId=company_search_1"
    );

    assert.equal(calls.length, 2);
    assert.equal(calls[0].kind, "list");
    assert.deepEqual(calls[0].args.viewerTeamIds, ["finance_ops"]);
    assert.equal(calls[1].kind, "get");
    assert.deepEqual(calls[1].args.viewerTeamIds, ["finance_ops"]);
  } finally {
    await stopServer(server);
  }
});
