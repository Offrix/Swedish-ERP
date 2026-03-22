import { createOrgAuthPlatform } from "../../../packages/domain-org-auth/src/index.mjs";
import { createDocumentArchivePlatform } from "../../../packages/domain-documents/src/index.mjs";
import { createLedgerPlatform } from "../../../packages/domain-ledger/src/index.mjs";
import { createReportingPlatform } from "../../../packages/domain-reporting/src/index.mjs";
import { createVatPlatform } from "../../../packages/domain-vat/src/index.mjs";
import { createArPlatform } from "../../../packages/domain-ar/src/index.mjs";
import { createApPlatform } from "../../../packages/domain-ap/src/index.mjs";
import { createIntegrationPlatform } from "../../../packages/domain-integrations/src/index.mjs";

export function createApiPlatform(options = {}) {
  const orgAuthPlatform = createOrgAuthPlatform(options);
  const documentArchivePlatform = createDocumentArchivePlatform(options);
  const ledgerPlatform = createLedgerPlatform(options);
  const reportingPlatform = createReportingPlatform({
    ...options,
    ledgerPlatform,
    documentPlatform: documentArchivePlatform
  });
  const vatPlatform = createVatPlatform({
    ...options,
    ledgerPlatform
  });
  const integrationPlatform = createIntegrationPlatform(options);
  const arPlatform = createArPlatform({
    ...options,
    vatPlatform,
    ledgerPlatform,
    integrationPlatform
  });
  const apPlatform = createApPlatform({
    ...options,
    vatPlatform
  });

  return {
    ...orgAuthPlatform,
    ...documentArchivePlatform,
    ...ledgerPlatform,
    ...reportingPlatform,
    ...vatPlatform,
    ...integrationPlatform,
    ...arPlatform,
    ...apPlatform
  };
}

export const defaultApiPlatform = createApiPlatform();
