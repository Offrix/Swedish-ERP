import { createOrgAuthPlatform } from "../../../packages/domain-org-auth/src/index.mjs";
import { createDocumentArchivePlatform } from "../../../packages/domain-documents/src/index.mjs";
import { createLedgerPlatform } from "../../../packages/domain-ledger/src/index.mjs";
import { createReportingPlatform } from "../../../packages/domain-reporting/src/index.mjs";

export function createApiPlatform(options = {}) {
  const orgAuthPlatform = createOrgAuthPlatform(options);
  const documentArchivePlatform = createDocumentArchivePlatform(options);
  const ledgerPlatform = createLedgerPlatform(options);
  const reportingPlatform = createReportingPlatform({
    ...options,
    ledgerPlatform,
    documentPlatform: documentArchivePlatform
  });

  return {
    ...orgAuthPlatform,
    ...documentArchivePlatform,
    ...ledgerPlatform,
    ...reportingPlatform
  };
}

export const defaultApiPlatform = createApiPlatform();
