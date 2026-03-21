import { createOrgAuthPlatform } from "../../../packages/domain-org-auth/src/index.mjs";

export function createApiPlatform(options = {}) {
  return createOrgAuthPlatform(options);
}

export const defaultApiPlatform = createApiPlatform();
