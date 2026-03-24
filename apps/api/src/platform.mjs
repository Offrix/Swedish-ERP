import { createOrgAuthPlatform } from "../../../packages/domain-org-auth/src/index.mjs";
import { createDocumentArchivePlatform } from "../../../packages/domain-documents/src/index.mjs";
import { createLedgerPlatform } from "../../../packages/domain-ledger/src/index.mjs";
import { createAccountingMethodPlatform } from "../../../packages/domain-accounting-method/src/index.mjs";
import { createFiscalYearPlatform } from "../../../packages/domain-fiscal-year/src/index.mjs";
import { createReportingPlatform } from "../../../packages/domain-reporting/src/index.mjs";
import { createVatPlatform } from "../../../packages/domain-vat/src/index.mjs";
import { createArPlatform } from "../../../packages/domain-ar/src/index.mjs";
import { createApPlatform } from "../../../packages/domain-ap/src/index.mjs";
import { createBankingPlatform } from "../../../packages/domain-banking/src/index.mjs";
import { createTaxAccountPlatform } from "../../../packages/domain-tax-account/src/index.mjs";
import { createReviewCenterPlatform } from "../../../packages/domain-review-center/src/index.mjs";
import { createNotificationsPlatform } from "../../../packages/domain-notifications/src/index.mjs";
import { createActivityPlatform } from "../../../packages/domain-activity/src/index.mjs";
import { createHrPlatform } from "../../../packages/domain-hr/src/index.mjs";
import { createTimePlatform } from "../../../packages/domain-time/src/index.mjs";
import { createBalancesPlatform } from "../../../packages/domain-balances/src/index.mjs";
import { createPayrollPlatform } from "../../../packages/domain-payroll/src/index.mjs";
import { createBenefitsPlatform } from "../../../packages/domain-benefits/src/index.mjs";
import { createDocumentClassificationPlatform } from "../../../packages/domain-document-classification/src/index.mjs";
import { createImportCasesPlatform } from "../../../packages/domain-import-cases/src/index.mjs";
import { createTravelPlatform } from "../../../packages/domain-travel/src/index.mjs";
import { createPensionPlatform } from "../../../packages/domain-pension/src/index.mjs";
import { createProjectsPlatform } from "../../../packages/domain-projects/src/index.mjs";
import { createFieldPlatform } from "../../../packages/domain-field/src/index.mjs";
import { createHusPlatform } from "../../../packages/domain-hus/src/index.mjs";
import { createPersonalliggarePlatform } from "../../../packages/domain-personalliggare/src/index.mjs";
import { createIntegrationPlatform } from "../../../packages/domain-integrations/src/index.mjs";
import { createCorePlatform } from "../../../packages/domain-core/src/index.mjs";
import { createAnnualReportingPlatform } from "../../../packages/domain-annual-reporting/src/index.mjs";
import { createAutomationAiEngine } from "../../../packages/rule-engine/src/index.mjs";
import {
  AUDIT_EVENT_VERSION,
  EVENT_ENVELOPE_VERSION,
  createAuditEnvelope,
  createEventEnvelope
} from "../../../packages/events/src/index.mjs";

function createDomainDefinition({ key, label, packageName, dependsOn = [], create }) {
  return Object.freeze({
    key,
    label,
    packageName,
    dependsOn: Object.freeze([...dependsOn]),
    create
  });
}

export const API_PLATFORM_BUILD_ORDER = Object.freeze([
  "orgAuth",
  "documents",
  "accountingMethod",
  "fiscalYear",
  "ledger",
  "vat",
  "integrations",
  "automation",
  "ar",
  "ap",
  "banking",
  "taxAccount",
  "reviewCenter",
  "notifications",
  "activity",
  "hr",
  "time",
  "balances",
  "benefits",
  "documentClassification",
  "importCases",
  "travel",
  "pension",
  "payroll",
  "projects",
  "reporting",
  "core",
  "hus",
  "personalliggare",
  "field",
  "annualReporting"
]);

export const API_PLATFORM_FLAT_MERGE_ORDER = Object.freeze([
  "orgAuth",
  "documents",
  "accountingMethod",
  "fiscalYear",
  "ledger",
  "reporting",
  "automation",
  "core",
  "annualReporting",
  "vat",
  "integrations",
  "ar",
  "ap",
  "banking",
  "taxAccount",
  "reviewCenter",
  "notifications",
  "activity",
  "hr",
  "time",
  "balances",
  "benefits",
  "documentClassification",
  "importCases",
  "travel",
  "pension",
  "projects",
  "hus",
  "personalliggare",
  "field",
  "payroll"
]);

const API_DOMAIN_DEFINITIONS = Object.freeze([
  createDomainDefinition({
    key: "orgAuth",
    label: "Org and auth",
    packageName: "@swedish-erp/domain-org-auth",
    create: ({ options }) => createOrgAuthPlatform(options)
  }),
  createDomainDefinition({
    key: "documents",
    label: "Documents",
    packageName: "@swedish-erp/domain-documents",
    create: ({ options }) => createDocumentArchivePlatform(options)
  }),
  createDomainDefinition({
    key: "accountingMethod",
    label: "Accounting method",
    packageName: "@swedish-erp/domain-accounting-method",
    create: ({ options }) => createAccountingMethodPlatform(options)
  }),
  createDomainDefinition({
    key: "fiscalYear",
    label: "Fiscal year",
    packageName: "@swedish-erp/domain-fiscal-year",
    create: ({ options }) => createFiscalYearPlatform(options)
  }),
  createDomainDefinition({
    key: "ledger",
    label: "Ledger",
    packageName: "@swedish-erp/domain-ledger",
    dependsOn: ["accountingMethod", "fiscalYear"],
    create: ({ options, dependencies }) =>
      createLedgerPlatform({
        ...options,
        accountingMethodPlatform: dependencies.accountingMethod,
        fiscalYearPlatform: dependencies.fiscalYear
      })
  }),
  createDomainDefinition({
    key: "vat",
    label: "VAT",
    packageName: "@swedish-erp/domain-vat",
    dependsOn: ["ledger"],
    create: ({ options, dependencies }) =>
      createVatPlatform({
        ...options,
        ledgerPlatform: dependencies.ledger
      })
  }),
  createDomainDefinition({
    key: "integrations",
    label: "Integrations",
    packageName: "@swedish-erp/domain-integrations",
    create: ({ options }) => createIntegrationPlatform(options)
  }),
  createDomainDefinition({
    key: "automation",
    label: "Automation",
    packageName: "@swedish-erp/rule-engine",
    create: ({ options, getDomain }) =>
      createAutomationAiEngine({
        ...options,
        resolveRuntimeFlags: ({ companyId, companyUserId = null } = {}) => {
          const corePlatform = getDomain("core");
          if (!corePlatform || typeof corePlatform.resolveRuntimeFlags !== "function") {
            return {};
          }
          return corePlatform.resolveRuntimeFlags({ companyId, companyUserId });
        },
        getReviewCenterPlatform: () => getDomain("reviewCenter")
      })
  }),
  createDomainDefinition({
    key: "ar",
    label: "Accounts receivable",
    packageName: "@swedish-erp/domain-ar",
    dependsOn: ["vat", "ledger", "integrations"],
    create: ({ options, dependencies }) =>
      createArPlatform({
        ...options,
        vatPlatform: dependencies.vat,
        ledgerPlatform: dependencies.ledger,
        integrationPlatform: dependencies.integrations
      })
  }),
  createDomainDefinition({
    key: "ap",
    label: "Accounts payable",
    packageName: "@swedish-erp/domain-ap",
    dependsOn: ["vat", "ledger", "documents", "orgAuth"],
    create: ({ options, dependencies }) =>
      createApPlatform({
        ...options,
        vatPlatform: dependencies.vat,
        ledgerPlatform: dependencies.ledger,
        documentPlatform: dependencies.documents,
        orgAuthPlatform: dependencies.orgAuth
      })
  }),
  createDomainDefinition({
    key: "banking",
    label: "Banking",
    packageName: "@swedish-erp/domain-banking",
    dependsOn: ["ap"],
    create: ({ options, dependencies }) =>
      createBankingPlatform({
        ...options,
        apPlatform: dependencies.ap
      })
  }),
  createDomainDefinition({
    key: "taxAccount",
    label: "Tax account",
    packageName: "@swedish-erp/domain-tax-account",
    dependsOn: ["banking"],
    create: ({ options, dependencies }) =>
      createTaxAccountPlatform({
        ...options,
        bankingPlatform: dependencies.banking
      })
  }),
  createDomainDefinition({
    key: "reviewCenter",
    label: "Review center",
    packageName: "@swedish-erp/domain-review-center",
    create: ({ options }) => createReviewCenterPlatform(options)
  }),
  createDomainDefinition({
    key: "notifications",
    label: "Notifications",
    packageName: "@swedish-erp/domain-notifications",
    create: ({ options }) => createNotificationsPlatform(options)
  }),
  createDomainDefinition({
    key: "activity",
    label: "Activity",
    packageName: "@swedish-erp/domain-activity",
    create: ({ options }) => createActivityPlatform(options)
  }),
  createDomainDefinition({
    key: "hr",
    label: "HR",
    packageName: "@swedish-erp/domain-hr",
    dependsOn: ["documents"],
    create: ({ options, dependencies }) =>
      createHrPlatform({
        ...options,
        documentPlatform: dependencies.documents
      })
  }),
  createDomainDefinition({
    key: "time",
    label: "Time",
    packageName: "@swedish-erp/domain-time",
    dependsOn: ["hr", "documents"],
    create: ({ options, dependencies }) =>
      createTimePlatform({
        ...options,
        hrPlatform: dependencies.hr,
        documentPlatform: dependencies.documents
      })
  }),
  createDomainDefinition({
    key: "balances",
    label: "Balances",
    packageName: "@swedish-erp/domain-balances",
    dependsOn: ["hr"],
    create: ({ options, dependencies }) =>
      createBalancesPlatform({
        ...options,
        hrPlatform: dependencies.hr
      })
  }),
  createDomainDefinition({
    key: "benefits",
    label: "Benefits",
    packageName: "@swedish-erp/domain-benefits",
    dependsOn: ["hr", "documents"],
    create: ({ options, dependencies }) =>
      createBenefitsPlatform({
        ...options,
        hrPlatform: dependencies.hr,
        documentPlatform: dependencies.documents
      })
  }),
  createDomainDefinition({
    key: "documentClassification",
    label: "Document classification",
    packageName: "@swedish-erp/domain-document-classification",
    dependsOn: ["documents", "reviewCenter", "benefits"],
    create: ({ options, dependencies }) =>
      createDocumentClassificationPlatform({
        ...options,
        documentPlatform: dependencies.documents,
        reviewCenterPlatform: dependencies.reviewCenter,
        benefitsPlatform: dependencies.benefits
      })
  }),
  createDomainDefinition({
    key: "importCases",
    label: "Import cases",
    packageName: "@swedish-erp/domain-import-cases",
    dependsOn: ["documents", "reviewCenter", "documentClassification"],
    create: ({ options, dependencies }) =>
      createImportCasesPlatform({
        ...options,
        documentPlatform: dependencies.documents,
        reviewCenterPlatform: dependencies.reviewCenter,
        documentClassificationPlatform: dependencies.documentClassification
      })
  }),
  createDomainDefinition({
    key: "travel",
    label: "Travel",
    packageName: "@swedish-erp/domain-travel",
    dependsOn: ["hr", "documents"],
    create: ({ options, dependencies }) =>
      createTravelPlatform({
        ...options,
        hrPlatform: dependencies.hr,
        documentPlatform: dependencies.documents
      })
  }),
  createDomainDefinition({
    key: "pension",
    label: "Pension",
    packageName: "@swedish-erp/domain-pension",
    dependsOn: ["hr"],
    create: ({ options, dependencies }) =>
      createPensionPlatform({
        ...options,
        hrPlatform: dependencies.hr
      })
  }),
  createDomainDefinition({
    key: "payroll",
    label: "Payroll",
    packageName: "@swedish-erp/domain-payroll",
    dependsOn: ["orgAuth", "hr", "time", "benefits", "travel", "pension", "ledger", "banking"],
    create: ({ options, dependencies }) =>
      createPayrollPlatform({
        ...options,
        orgAuthPlatform: dependencies.orgAuth,
        hrPlatform: dependencies.hr,
        timePlatform: dependencies.time,
        benefitsPlatform: dependencies.benefits,
        travelPlatform: dependencies.travel,
        pensionPlatform: dependencies.pension,
        ledgerPlatform: dependencies.ledger,
        bankingPlatform: dependencies.banking
      })
  }),
  createDomainDefinition({
    key: "projects",
    label: "Projects",
    packageName: "@swedish-erp/domain-projects",
    dependsOn: ["ar", "hr", "time", "payroll", "vat"],
    create: ({ options, dependencies }) =>
      createProjectsPlatform({
        ...options,
        arPlatform: dependencies.ar,
        hrPlatform: dependencies.hr,
        timePlatform: dependencies.time,
        payrollPlatform: dependencies.payroll,
        vatPlatform: dependencies.vat
      })
  }),
  createDomainDefinition({
    key: "reporting",
    label: "Reporting",
    packageName: "@swedish-erp/domain-reporting",
    dependsOn: ["ledger", "documents", "ar", "ap", "projects"],
    create: ({ options, dependencies }) =>
      createReportingPlatform({
        ...options,
        ledgerPlatform: dependencies.ledger,
        documentPlatform: dependencies.documents,
        arPlatform: dependencies.ar,
        apPlatform: dependencies.ap,
        projectsPlatform: dependencies.projects
      })
  }),
  createDomainDefinition({
    key: "core",
    label: "Core operations",
    packageName: "@swedish-erp/domain-core",
    dependsOn: ["orgAuth", "reporting", "ledger", "integrations"],
    create: ({ options, dependencies }) =>
      createCorePlatform({
        ...options,
        orgAuthPlatform: dependencies.orgAuth,
        reportingPlatform: dependencies.reporting,
        ledgerPlatform: dependencies.ledger,
        integrationPlatform: dependencies.integrations
      })
  }),
  createDomainDefinition({
    key: "hus",
    label: "HUS",
    packageName: "@swedish-erp/domain-hus",
    dependsOn: ["ar", "projects"],
    create: ({ options, dependencies }) =>
      createHusPlatform({
        ...options,
        arPlatform: dependencies.ar,
        projectsPlatform: dependencies.projects
      })
  }),
  createDomainDefinition({
    key: "personalliggare",
    label: "Personalliggare",
    packageName: "@swedish-erp/domain-personalliggare",
    dependsOn: ["hr", "projects"],
    create: ({ options, dependencies }) =>
      createPersonalliggarePlatform({
        ...options,
        hrPlatform: dependencies.hr,
        projectsPlatform: dependencies.projects
      })
  }),
  createDomainDefinition({
    key: "field",
    label: "Field",
    packageName: "@swedish-erp/domain-field",
    dependsOn: ["ar", "hr", "projects"],
    create: ({ options, dependencies }) =>
      createFieldPlatform({
        ...options,
        arPlatform: dependencies.ar,
        hrPlatform: dependencies.hr,
        projectsPlatform: dependencies.projects
      })
  }),
  createDomainDefinition({
    key: "annualReporting",
    label: "Annual reporting",
    packageName: "@swedish-erp/domain-annual-reporting",
    dependsOn: ["ledger", "reporting", "orgAuth", "vat", "payroll", "hus", "pension"],
    create: ({ options, dependencies }) =>
      createAnnualReportingPlatform({
        ...options,
        ledgerPlatform: dependencies.ledger,
        reportingPlatform: dependencies.reporting,
        orgAuthPlatform: dependencies.orgAuth,
        vatPlatform: dependencies.vat,
        payrollPlatform: dependencies.payroll,
        husPlatform: dependencies.hus,
        pensionPlatform: dependencies.pension
      })
  })
]);

function requireRegisteredDomain(domains, domainKey, consumerKey) {
  const domain = domains[domainKey];
  if (!domain) {
    throw new Error(`Domain "${domainKey}" must be registered before "${consumerKey}".`);
  }
  return domain;
}

function createDomainRegistration(definition, platform, buildOrder) {
  if (!platform || typeof platform !== "object") {
    throw new TypeError(`Domain "${definition.key}" must return an object platform.`);
  }

  const capabilities = Object.freeze(Object.keys(platform).sort());

  return Object.freeze({
    domainKey: definition.key,
    label: definition.label,
    packageName: definition.packageName,
    buildOrder,
    dependsOn: definition.dependsOn,
    capabilityCount: capabilities.length,
    capabilities
  });
}

function composeFlatPlatform(domains) {
  return API_PLATFORM_FLAT_MERGE_ORDER.reduce((accumulator, domainKey) => {
    const platform = domains[domainKey];
    if (!platform) {
      throw new Error(`Flat platform merge attempted before "${domainKey}" was registered.`);
    }
    return Object.assign(accumulator, platform);
  }, {});
}

function buildRuntimeContracts() {
  return Object.freeze({
    events: Object.freeze({
      eventEnvelopeVersion: EVENT_ENVELOPE_VERSION,
      auditEnvelopeVersion: AUDIT_EVENT_VERSION,
      createEventEnvelope,
      createAuditEnvelope
    })
  });
}

export function createApiPlatform(options = {}) {
  const domains = {};
  const domainRegistry = [];
  const domainRegistryByKey = {};

  for (const definition of API_DOMAIN_DEFINITIONS) {
    const dependencies = Object.fromEntries(
      definition.dependsOn.map((domainKey) => [domainKey, requireRegisteredDomain(domains, domainKey, definition.key)])
    );
    const platform = definition.create({
      options,
      dependencies: Object.freeze(dependencies),
      domains: Object.freeze({ ...domains }),
      getDomain: (domainKey) => domains[domainKey] || null
    });
    domains[definition.key] = platform;

    const registration = createDomainRegistration(definition, platform, domainRegistry.length + 1);
    domainRegistry.push(registration);
    domainRegistryByKey[definition.key] = registration;
  }

  const flatPlatform = composeFlatPlatform(domains);
  const runtimeContracts = buildRuntimeContracts();
  const registeredDomains = Object.freeze({ ...domains });
  const registrations = Object.freeze([...domainRegistry]);
  const registrationsByKey = Object.freeze({ ...domainRegistryByKey });
  const contractVersions = Object.freeze({
    eventEnvelopeVersion: EVENT_ENVELOPE_VERSION,
    auditEnvelopeVersion: AUDIT_EVENT_VERSION
  });
  const platform = {
    ...flatPlatform
  };

  Object.defineProperties(platform, {
    domains: {
      value: registeredDomains,
      enumerable: false
    },
    domainRegistry: {
      value: registrations,
      enumerable: false
    },
    domainRegistryByKey: {
      value: registrationsByKey,
      enumerable: false
    },
    domainOrder: {
      value: API_PLATFORM_BUILD_ORDER,
      enumerable: false
    },
    runtimeContracts: {
      value: runtimeContracts,
      enumerable: false
    },
    platformContractVersions: {
      value: contractVersions,
      enumerable: false
    },
    getDomain: {
      value: (domainKey) => registeredDomains[domainKey] || null,
      enumerable: false
    },
    getDomainRegistration: {
      value: (domainKey) => registrationsByKey[domainKey] || null,
      enumerable: false
    },
    listRegisteredDomains: {
      value: () => registrations,
      enumerable: false
    },
    createEventEnvelope: {
      value: (input) => createEventEnvelope(input),
      enumerable: false
    },
    createAuditEnvelope: {
      value: (input) => createAuditEnvelope(input),
      enumerable: false
    }
  });

  return platform;
}

export const defaultApiPlatform = createApiPlatform();
