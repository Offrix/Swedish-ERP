import { createOrgAuthPlatform } from "../../../packages/domain-org-auth/src/index.mjs";
import { createDocumentArchivePlatform } from "../../../packages/domain-documents/src/index.mjs";

export function createApiPlatform(options = {}) {
  return {
    ...createOrgAuthPlatform(options),
    ...createDocumentArchivePlatform(options)
  };
}

export const defaultApiPlatform = createApiPlatform();
