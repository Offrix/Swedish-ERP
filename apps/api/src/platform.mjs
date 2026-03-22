import { createOrgAuthPlatform } from "../../../packages/domain-org-auth/src/index.mjs";
import { createDocumentArchivePlatform } from "../../../packages/domain-documents/src/index.mjs";
import { createLedgerPlatform } from "../../../packages/domain-ledger/src/index.mjs";
import { createReportingPlatform } from "../../../packages/domain-reporting/src/index.mjs";
import { createVatPlatform } from "../../../packages/domain-vat/src/index.mjs";
import { createArPlatform } from "../../../packages/domain-ar/src/index.mjs";
import { createApPlatform } from "../../../packages/domain-ap/src/index.mjs";
import { createBankingPlatform } from "../../../packages/domain-banking/src/index.mjs";
import { createHrPlatform } from "../../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../../packages/domain-time/src/index.mjs";
import { createPayrollPlatform } from "../../../packages/domain-payroll/src/index.mjs";
import { createBenefitsPlatform } from "../../../packages/domain-benefits/src/index.mjs";
import { createTravelPlatform } from "../../../packages/domain-travel/src/index.mjs";
import { createPensionPlatform } from "../../../packages/domain-pension/src/index.mjs";
import { createProjectsPlatform } from "../../../packages/domain-projects/src/index.mjs";
import { createFieldPlatform } from "../../../packages/domain-field/src/index.mjs";
import { createHusPlatform } from "../../../packages/domain-hus/src/index.mjs";
import { createPersonalliggarePlatform } from "../../../packages/domain-personalliggare/src/index.mjs";
import { createIntegrationPlatform } from "../../../packages/domain-integrations/src/index.mjs";
import { createCorePlatform } from "../../../packages/domain-core/src/index.mjs";

export function createApiPlatform(options = {}) {
  const orgAuthPlatform = createOrgAuthPlatform(options);
  const documentArchivePlatform = createDocumentArchivePlatform(options);
  const ledgerPlatform = createLedgerPlatform(options);
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
    vatPlatform,
    ledgerPlatform,
    documentPlatform: documentArchivePlatform,
    orgAuthPlatform
  });
  const bankingPlatform = createBankingPlatform({
    ...options,
    apPlatform
  });
  const hrPlatform = createHrPlatform({
    ...options,
    documentPlatform: documentArchivePlatform
  });
  const timePlatform = createTimePlatform({
    ...options,
    hrPlatform,
    documentPlatform: documentArchivePlatform
  });
  const benefitsPlatform = createBenefitsPlatform({
    ...options,
    hrPlatform,
    documentPlatform: documentArchivePlatform
  });
  const travelPlatform = createTravelPlatform({
    ...options,
    hrPlatform,
    documentPlatform: documentArchivePlatform
  });
  const pensionPlatform = createPensionPlatform({
    ...options,
    hrPlatform
  });
  const payrollPlatform = createPayrollPlatform({
    ...options,
    orgAuthPlatform,
    hrPlatform,
    timePlatform,
    benefitsPlatform,
    travelPlatform,
    pensionPlatform,
    ledgerPlatform,
    bankingPlatform
  });
  const projectsPlatform = createProjectsPlatform({
    ...options,
    arPlatform,
    hrPlatform,
    timePlatform,
    payrollPlatform,
    vatPlatform
  });
  const reportingPlatform = createReportingPlatform({
    ...options,
    ledgerPlatform,
    documentPlatform: documentArchivePlatform,
    arPlatform,
    apPlatform,
    projectsPlatform
  });
  const corePlatform = createCorePlatform({
    ...options,
    orgAuthPlatform,
    reportingPlatform
  });
  const husPlatform = createHusPlatform({
    ...options,
    arPlatform,
    projectsPlatform
  });
  const personalliggarePlatform = createPersonalliggarePlatform({
    ...options,
    hrPlatform,
    projectsPlatform
  });
  const fieldPlatform = createFieldPlatform({
    ...options,
    arPlatform,
    hrPlatform,
    projectsPlatform
  });

  return {
    ...orgAuthPlatform,
    ...documentArchivePlatform,
    ...ledgerPlatform,
    ...reportingPlatform,
    ...corePlatform,
    ...vatPlatform,
    ...integrationPlatform,
    ...arPlatform,
    ...apPlatform,
    ...bankingPlatform,
    ...hrPlatform,
    ...timePlatform,
    ...benefitsPlatform,
    ...travelPlatform,
    ...pensionPlatform,
    ...projectsPlatform,
    ...husPlatform,
    ...personalliggarePlatform,
    ...fieldPlatform,
    ...payrollPlatform
  };
}

export const defaultApiPlatform = createApiPlatform();
