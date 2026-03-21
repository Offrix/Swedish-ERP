import { createOrgAuthPlatform } from "../../../packages/domain-org-auth/src/index.mjs";
import { createDocumentArchivePlatform } from "../../../packages/domain-documents/src/index.mjs";
import { createLedgerPlatform } from "../../../packages/domain-ledger/src/index.mjs";

export function createApiPlatform(options = {}) {
  return {
    ...createOrgAuthPlatform(options),
    ...createDocumentArchivePlatform(options),
    ...createLedgerPlatform(options)
  };
}

export const defaultApiPlatform = createApiPlatform();
