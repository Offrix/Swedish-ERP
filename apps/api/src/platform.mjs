import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { createOrgAuthPlatform } from "../../../packages/domain-org-auth/src/index.mjs";
import { createDocumentArchivePlatform } from "../../../packages/domain-documents/src/index.mjs";
import { createLedgerPlatform } from "../../../packages/domain-ledger/src/index.mjs";
import { createAccountingMethodPlatform } from "../../../packages/domain-accounting-method/src/index.mjs";
import { createFiscalYearPlatform } from "../../../packages/domain-fiscal-year/src/index.mjs";
import { createLegalFormPlatform } from "../../../packages/domain-legal-form/src/index.mjs";
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
import { createCollectiveAgreementsPlatform } from "../../../packages/domain-collective-agreements/src/index.mjs";
import { createPayrollPlatform } from "../../../packages/domain-payroll/src/index.mjs";
import { createBenefitsPlatform } from "../../../packages/domain-benefits/src/index.mjs";
import { createDocumentClassificationPlatform } from "../../../packages/domain-document-classification/src/index.mjs";
import { createImportCasesPlatform } from "../../../packages/domain-import-cases/src/index.mjs";
import { createTravelPlatform } from "../../../packages/domain-travel/src/index.mjs";
import { createPensionPlatform } from "../../../packages/domain-pension/src/index.mjs";
import { createProjectsPlatform } from "../../../packages/domain-projects/src/index.mjs";
import { createKalkylPlatform } from "../../../packages/domain-kalkyl/src/index.mjs";
import { createFieldPlatform } from "../../../packages/domain-field/src/index.mjs";
import { createHusPlatform } from "../../../packages/domain-hus/src/index.mjs";
import { createPersonalliggarePlatform } from "../../../packages/domain-personalliggare/src/index.mjs";
import { createId06Platform } from "../../../packages/domain-id06/src/index.mjs";
import { createEgenkontrollPlatform } from "../../../packages/domain-egenkontroll/src/index.mjs";
import { createSearchPlatform } from "../../../packages/domain-search/src/index.mjs";
import { createIntegrationPlatform } from "../../../packages/domain-integrations/src/index.mjs";
import {
  createCorePlatform,
  createInMemoryCriticalDomainStateStore,
  createSqliteCriticalDomainStateStore
} from "../../../packages/domain-core/src/index.mjs";
import { createAnnualReportingPlatform } from "../../../packages/domain-annual-reporting/src/index.mjs";
import { createAutomationAiEngine } from "../../../packages/rule-engine/src/index.mjs";
import {
  AUDIT_EVENT_VERSION,
  EVENT_ENVELOPE_VERSION,
  createAuditEnvelope,
  createEventEnvelope
} from "../../../packages/events/src/index.mjs";
import {
  createBootstrapModePolicy,
  resolveBootstrapSeeding,
  resolveRuntimeModeProfile
} from "../../../scripts/lib/runtime-mode.mjs";
import {
  resolveRuntimeStoreKind,
  scanRuntimeInvariants
} from "../../../scripts/lib/runtime-diagnostics.mjs";

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
  "legalForm",
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
  "balances",
  "collectiveAgreements",
  "time",
  "benefits",
  "travel",
  "pension",
  "payroll",
  "documentClassification",
  "importCases",
  "projects",
  "kalkyl",
  "reporting",
  "search",
  "core",
  "hus",
  "personalliggare",
  "id06",
  "field",
  "egenkontroll",
  "annualReporting"
]);

export const API_PLATFORM_FLAT_MERGE_ORDER = Object.freeze([
  "orgAuth",
  "documents",
  "accountingMethod",
  "fiscalYear",
  "legalForm",
  "ledger",
  "reporting",
  "search",
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
  "balances",
  "collectiveAgreements",
  "time",
  "benefits",
  "documentClassification",
  "importCases",
  "travel",
  "pension",
  "projects",
  "kalkyl",
  "hus",
  "personalliggare",
  "id06",
  "field",
  "egenkontroll",
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
    key: "legalForm",
    label: "Legal form",
    packageName: "@swedish-erp/domain-legal-form",
    create: ({ options }) => createLegalFormPlatform(options)
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
    create: ({ options, getDomain }) =>
      createIntegrationPlatform({
        ...options,
        getCorePlatform: () => getDomain("core")
      })
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
    create: ({ options, dependencies, getDomain }) =>
      createApPlatform({
        ...options,
        vatPlatform: dependencies.vat,
        ledgerPlatform: dependencies.ledger,
        documentPlatform: dependencies.documents,
        orgAuthPlatform: dependencies.orgAuth,
        getDocumentClassificationPlatform: () => getDomain("documentClassification"),
        getImportCasesPlatform: () => getDomain("importCases")
      })
  }),
  createDomainDefinition({
    key: "banking",
    label: "Banking",
    packageName: "@swedish-erp/domain-banking",
    dependsOn: ["ap"],
    create: ({ options, dependencies, getDomain }) =>
      createBankingPlatform({
        ...options,
        apPlatform: dependencies.ap,
        getTaxAccountPlatform: () => getDomain("taxAccount")
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
    key: "collectiveAgreements",
    label: "Collective agreements",
    packageName: "@swedish-erp/domain-collective-agreements",
    dependsOn: ["hr", "balances"],
    create: ({ options, dependencies }) =>
      createCollectiveAgreementsPlatform({
        ...options,
        hrPlatform: dependencies.hr,
        balancesPlatform: dependencies.balances
      })
  }),
  createDomainDefinition({
    key: "time",
    label: "Time",
    packageName: "@swedish-erp/domain-time",
    dependsOn: ["hr", "documents", "balances", "collectiveAgreements"],
    create: ({ options, dependencies }) =>
      createTimePlatform({
        ...options,
        hrPlatform: dependencies.hr,
        documentPlatform: dependencies.documents,
        balancesPlatform: dependencies.balances,
        collectiveAgreementsPlatform: dependencies.collectiveAgreements
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
    dependsOn: ["orgAuth", "hr", "time", "balances", "collectiveAgreements", "benefits", "travel", "pension", "ledger", "banking"],
    create: ({ options, dependencies, getDomain }) =>
      createPayrollPlatform({
        ...options,
        orgAuthPlatform: dependencies.orgAuth,
        hrPlatform: dependencies.hr,
        timePlatform: dependencies.time,
        balancesPlatform: dependencies.balances,
        collectiveAgreementsPlatform: dependencies.collectiveAgreements,
        benefitsPlatform: dependencies.benefits,
        travelPlatform: dependencies.travel,
        pensionPlatform: dependencies.pension,
        ledgerPlatform: dependencies.ledger,
        bankingPlatform: dependencies.banking,
        getCorePlatform: () => getDomain("core")
      })
  }),
  createDomainDefinition({
    key: "documentClassification",
    label: "Document classification",
    packageName: "@swedish-erp/domain-document-classification",
    dependsOn: ["documents", "reviewCenter", "benefits", "payroll"],
    create: ({ options, dependencies }) =>
      createDocumentClassificationPlatform({
        ...options,
        documentPlatform: dependencies.documents,
        reviewCenterPlatform: dependencies.reviewCenter,
        benefitsPlatform: dependencies.benefits,
        payrollPlatform: dependencies.payroll
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
    key: "projects",
    label: "Projects",
    packageName: "@swedish-erp/domain-projects",
    dependsOn: ["ar", "hr", "time", "payroll", "vat"],
    create: ({ options, dependencies, getDomain }) =>
      createProjectsPlatform({
        ...options,
        arPlatform: dependencies.ar,
        hrPlatform: dependencies.hr,
        timePlatform: dependencies.time,
        payrollPlatform: dependencies.payroll,
        vatPlatform: dependencies.vat,
        getFieldPlatform: () => getDomain("field"),
        getHusPlatform: () => getDomain("hus"),
        getPersonalliggarePlatform: () => getDomain("personalliggare"),
        getId06Platform: () => getDomain("id06"),
        getEgenkontrollPlatform: () => getDomain("egenkontroll"),
        getKalkylPlatform: () => getDomain("kalkyl")
      })
  }),
  createDomainDefinition({
    key: "kalkyl",
    label: "Kalkyl",
    packageName: "@swedish-erp/domain-kalkyl",
    dependsOn: ["ar", "projects"],
    create: ({ options, dependencies }) =>
      createKalkylPlatform({
        ...options,
        arPlatform: dependencies.ar,
        projectsPlatform: dependencies.projects
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
    key: "search",
    label: "Search",
    packageName: "@swedish-erp/domain-search",
    dependsOn: ["reporting"],
    create: ({ options, dependencies, getDomain }) =>
      createSearchPlatform({
        ...options,
        reportingPlatform: dependencies.reporting,
        getLedgerPlatform: () => getDomain("ledger"),
        getVatPlatform: () => getDomain("vat"),
        getTaxAccountPlatform: () => getDomain("taxAccount"),
        getPayrollPlatform: () => getDomain("payroll"),
        getHusPlatform: () => getDomain("hus"),
        getAnnualReportingPlatform: () => getDomain("annualReporting"),
        getReviewCenterPlatform: () => getDomain("reviewCenter"),
        getNotificationsPlatform: () => getDomain("notifications"),
        getActivityPlatform: () => getDomain("activity"),
        getProjectsPlatform: () => getDomain("projects"),
        getFieldPlatform: () => getDomain("field"),
        getPersonalliggarePlatform: () => getDomain("personalliggare"),
        getId06Platform: () => getDomain("id06"),
        getCorePlatform: () => getDomain("core"),
        getArPlatform: () => getDomain("ar"),
        getApPlatform: () => getDomain("ap"),
        getBankingPlatform: () => getDomain("banking"),
        getImportCasesPlatform: () => getDomain("importCases"),
        getLegalFormPlatform: () => getDomain("legalForm"),
        getIntegrationsPlatform: () => getDomain("integrations")
      })
  }),
  createDomainDefinition({
    key: "core",
    label: "Core operations",
    packageName: "@swedish-erp/domain-core",
    dependsOn: ["orgAuth", "reporting", "ledger", "integrations", "hr", "balances", "collectiveAgreements"],
    create: ({ options, dependencies }) =>
      createCorePlatform({
        ...options,
        orgAuthPlatform: dependencies.orgAuth,
        reportingPlatform: dependencies.reporting,
        ledgerPlatform: dependencies.ledger,
        integrationPlatform: dependencies.integrations,
        hrPlatform: dependencies.hr,
        balancesPlatform: dependencies.balances,
        collectiveAgreementsPlatform: dependencies.collectiveAgreements
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
    key: "id06",
    label: "ID06",
    packageName: "@swedish-erp/domain-id06",
    dependsOn: ["personalliggare"],
    create: ({ options, dependencies }) =>
      createId06Platform({
        ...options,
        personalliggarePlatform: dependencies.personalliggare
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
    key: "egenkontroll",
    label: "Egenkontroll",
    packageName: "@swedish-erp/domain-egenkontroll",
    dependsOn: ["projects", "field"],
    create: ({ options, dependencies }) =>
      createEgenkontrollPlatform({
        ...options,
        projectsPlatform: dependencies.projects,
        fieldPlatform: dependencies.field
      })
  }),
  createDomainDefinition({
    key: "annualReporting",
    label: "Annual reporting",
    packageName: "@swedish-erp/domain-annual-reporting",
    dependsOn: ["ledger", "reporting", "orgAuth", "vat", "payroll", "hus", "pension", "fiscalYear", "legalForm", "integrations"],
    create: ({ options, dependencies }) =>
      createAnnualReportingPlatform({
        ...options,
        ledgerPlatform: dependencies.ledger,
        reportingPlatform: dependencies.reporting,
        orgAuthPlatform: dependencies.orgAuth,
        vatPlatform: dependencies.vat,
        payrollPlatform: dependencies.payroll,
        husPlatform: dependencies.hus,
        pensionPlatform: dependencies.pension,
        fiscalYearPlatform: dependencies.fiscalYear,
        legalFormPlatform: dependencies.legalForm,
        integrationPlatform: dependencies.integrations
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

function buildRuntimeContracts(runtimeModeProfile, bootstrapModePolicy) {
  return Object.freeze({
    runtime: Object.freeze({
      ...runtimeModeProfile,
      bootstrapModePolicy
    }),
    events: Object.freeze({
      eventEnvelopeVersion: EVENT_ENVELOPE_VERSION,
      auditEnvelopeVersion: AUDIT_EVENT_VERSION,
      createEventEnvelope,
      createAuditEnvelope
    })
  });
}

export function createApiPlatform(options = {}) {
  const env = options.env || process.env;
  const runtimeModeResolutionOptions = {
    runtimeMode: options.runtimeMode,
    env,
    starter: "api-platform",
    requireExplicit: options.enforceExplicitRuntimeMode === true
  };
  if (options.enforceExplicitRuntimeMode !== true) {
    runtimeModeResolutionOptions.fallbackMode = "test";
  }
  const runtimeModeProfile =
    options.runtimeModeProfile ||
    resolveRuntimeModeProfile(runtimeModeResolutionOptions);
  const bootstrapModePolicy =
    options.bootstrapModePolicy || createBootstrapModePolicy(runtimeModeProfile);
  const bootstrapSeeding = resolveBootstrapSeeding({
    bootstrapMode:
      options.bootstrapMode ||
      (runtimeModeProfile.environmentMode === "test" && !options.bootstrapScenarioCode && options.seedDemo !== false
        ? "scenario_seed"
        : bootstrapModePolicy.defaultBootstrapMode),
    bootstrapScenarioCode:
      options.bootstrapScenarioCode ||
      (runtimeModeProfile.environmentMode === "test" && options.seedDemo !== false ? "test_default_demo" : null),
    seedDemo: options.seedDemo
  });
  const platformOptions = Object.freeze({
    ...options,
    runtimeMode: runtimeModeProfile.environmentMode,
    environmentMode: runtimeModeProfile.environmentMode,
    runtimeModeProfile,
    bootstrapModePolicy,
    bootstrapMode: bootstrapSeeding.bootstrapMode,
    bootstrapScenarioCode: bootstrapSeeding.bootstrapScenarioCode,
    seedDemo: bootstrapSeeding.shouldSeedDemo,
    supportsLegalEffect: runtimeModeProfile.supportsLegalEffect,
    modeWatermarkCode: runtimeModeProfile.modeWatermarkCode,
    sequenceSpace: runtimeModeProfile.sequenceSpace,
    providerEnvironmentRef: runtimeModeProfile.providerEnvironmentRef,
    dataRetentionClass: runtimeModeProfile.dataRetentionClass
  });
  const criticalDomainStateStore = resolveCriticalDomainStateStore({
    options,
    env,
    runtimeModeProfile
  });
  const domains = {};
  const domainRegistry = [];
  const domainRegistryByKey = {};

  for (const definition of API_DOMAIN_DEFINITIONS) {
    const dependencies = Object.fromEntries(
      definition.dependsOn.map((domainKey) => [domainKey, requireRegisteredDomain(domains, domainKey, definition.key)])
    );
      const platform = definition.create({
        options: platformOptions,
        dependencies: Object.freeze(dependencies),
        domains: Object.freeze({ ...domains }),
        getDomain: (domainKey) => domains[domainKey] || null
      });
      const persistedPlatform = decorateCriticalDomainPersistence({
        domainKey: definition.key,
        platform,
        store: criticalDomainStateStore
      });
      domains[definition.key] = persistedPlatform;

      const registration = createDomainRegistration(definition, persistedPlatform, domainRegistry.length + 1);
      domainRegistry.push(registration);
      domainRegistryByKey[definition.key] = registration;
    }

  const flatPlatform = composeFlatPlatform(domains);
  const runtimeContracts = buildRuntimeContracts(runtimeModeProfile, bootstrapModePolicy);
  const registeredDomains = Object.freeze({ ...domains });
  const registrations = Object.freeze([...domainRegistry]);
  const registrationsByKey = Object.freeze({ ...domainRegistryByKey });
  const defaultRuntimeDiagnostics = buildRuntimeDiagnostics({
    startupSurface: options.startupSurface || "api",
    runtimeModeProfile,
    bootstrapModePolicy,
    bootstrapSeeding,
    domains: registeredDomains,
    domainRegistry: registrations,
    env,
    options
  });
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
    runtimeStartupDiagnostics: {
      value: defaultRuntimeDiagnostics,
      enumerable: false
    },
    runtimeInvariantFindings: {
      value: defaultRuntimeDiagnostics.findings,
      enumerable: false
    },
    runtimeModeProfile: {
      value: runtimeModeProfile,
      enumerable: false
    },
    bootstrapModePolicy: {
      value: bootstrapModePolicy,
      enumerable: false
    },
    environmentMode: {
      value: runtimeModeProfile.environmentMode,
      enumerable: false
    },
    supportsLegalEffect: {
      value: runtimeModeProfile.supportsLegalEffect,
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
    getRuntimeModeProfile: {
      value: () => runtimeModeProfile,
      enumerable: false
    },
    getRuntimeStartupDiagnostics: {
      value: () => defaultRuntimeDiagnostics,
      enumerable: false
    },
    criticalDomainStateStore: {
      value: criticalDomainStateStore,
      enumerable: false
    },
    flushCriticalDomainState: {
      value: ({ domainKeys = CRITICAL_DOMAIN_KEYS } = {}) =>
        domainKeys
          .map((domainKey) => registeredDomains[domainKey])
          .filter(Boolean)
          .map((domain) =>
            typeof domain.flushDurableState === "function" ? domain.flushDurableState() : null
          )
          .filter(Boolean),
      enumerable: false
    },
    closeCriticalDomainStateStore: {
      value: () => {
        if (typeof criticalDomainStateStore?.close === "function") {
          criticalDomainStateStore.close();
        }
      },
      enumerable: false
    },
    listRuntimeInvariantFindings: {
      value: () => defaultRuntimeDiagnostics.findings,
      enumerable: false
    },
    scanRuntimeInvariants: {
      value: (overrides = {}) =>
        buildRuntimeDiagnostics({
          startupSurface: overrides.startupSurface || options.startupSurface || "api",
          runtimeModeProfile,
          bootstrapModePolicy,
          bootstrapSeeding: {
            ...bootstrapSeeding,
            bootstrapMode: overrides.bootstrapMode || bootstrapSeeding.bootstrapMode,
            bootstrapScenarioCode:
              overrides.bootstrapScenarioCode === undefined
                ? bootstrapSeeding.bootstrapScenarioCode
                : overrides.bootstrapScenarioCode,
            shouldSeedDemo:
              overrides.seedDemo === undefined ? bootstrapSeeding.shouldSeedDemo : overrides.seedDemo === true
          },
          domains: registeredDomains,
          domainRegistry: registrations,
          env,
          options: {
            ...options,
            disabledAdapters:
              overrides.disabledAdapters === undefined ? options.disabledAdapters : overrides.disabledAdapters,
            versionRef: overrides.versionRef === undefined ? options.versionRef : overrides.versionRef,
            runtimeStoreKind:
              overrides.activeStoreKind ||
              overrides.runtimeStoreKind ||
              options.runtimeStoreKind ||
              options.asyncJobStoreKind ||
              options.asyncJobStore?.kind ||
              null
          }
        }),
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

export function createDefaultApiPlatform({
  env = process.env,
  runtimeMode = null,
  enforceExplicitRuntimeMode = false,
  ...options
} = {}) {
  return createApiPlatform({
    ...options,
    env,
    runtimeMode,
    enforceExplicitRuntimeMode
  });
}

const CRITICAL_DOMAIN_KEYS = Object.freeze([
  "orgAuth",
  "ledger",
  "vat",
  "ar",
  "ap",
  "payroll",
  "taxAccount",
  "reviewCenter",
  "projects",
  "integrations"
]);

const CRITICAL_DOMAIN_READ_METHOD_PREFIXES = Object.freeze([
  "get",
  "list",
  "snapshot",
  "check"
]);

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entryValue) => stableStringify(entryValue)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function resolveCriticalDomainTruthMode(store) {
  const storeKind = typeof store?.kind === "string" ? store.kind : null;
  if (storeKind && storeKind !== "memory_critical_domain_state_store") {
    return "durable_snapshot";
  }
  return "in_memory_snapshot";
}

function hashSnapshot(value) {
  return crypto.createHash("sha256").update(stableStringify(value ?? null)).digest("hex");
}

function isReadMethod(methodName) {
  return CRITICAL_DOMAIN_READ_METHOD_PREFIXES.some((prefix) => methodName.startsWith(prefix));
}

function resolveCriticalDomainStateStore({
  options,
  env,
  runtimeModeProfile
}) {
  if (options.criticalDomainStateStore) {
    return options.criticalDomainStateStore;
  }

  const storeKind =
    options.criticalDomainStateStoreKind ||
    env.ERP_CRITICAL_DOMAIN_STATE_STORE ||
    (runtimeModeProfile.environmentMode === "test" ? "memory" : "sqlite");

  if (storeKind === "memory") {
    return createInMemoryCriticalDomainStateStore();
  }

  if (storeKind === "sqlite") {
    const filePath =
      options.criticalDomainStateStorePath ||
      env.ERP_CRITICAL_DOMAIN_STATE_DB_PATH ||
      path.join(os.tmpdir(), `swedish-erp-${runtimeModeProfile.environmentMode}-critical-domain-state.sqlite`);
    return createSqliteCriticalDomainStateStore({ filePath });
  }

  throw new Error(`Unsupported critical domain state store kind: ${storeKind}.`);
}

function decorateCriticalDomainPersistence({ domainKey, platform, store }) {
  if (!CRITICAL_DOMAIN_KEYS.includes(domainKey)) {
    return platform;
  }

  if (
    !store ||
    typeof platform?.exportDurableState !== "function" ||
    typeof platform?.importDurableState !== "function"
  ) {
    return platform;
  }

  const existingRecord = store.load(domainKey);
  if (existingRecord?.snapshot) {
    platform.importDurableState(existingRecord.snapshot);
  }

  let lastPersistedHash = existingRecord?.snapshotHash || null;
  const persist = () => {
    const snapshot = platform.exportDurableState();
    const snapshotHash = hashSnapshot(snapshot);
    if (snapshotHash === lastPersistedHash) {
      return null;
    }
    const record = store.save({ domainKey, snapshot });
    lastPersistedHash = record.snapshotHash;
    return record;
  };

  persist();

  const proxy = new Proxy(platform, {
    get(target, property, receiver) {
      if (property === "getCriticalDomainDurability") {
        return () =>
          Object.freeze({
            domainKey,
            truthMode: resolveCriticalDomainTruthMode(store),
            persistenceStoreKind: store.kind,
            snapshotHash: lastPersistedHash
          });
      }
      if (property === "flushDurableState") {
        return () => persist();
      }

      const value = Reflect.get(target, property, receiver);
      if (typeof property !== "string" || typeof value !== "function") {
        return value;
      }
      if (
        [
          "exportDurableState",
          "importDurableState",
          "getCriticalDomainDurability",
          "flushDurableState"
        ].includes(property) ||
        isReadMethod(property)
      ) {
        return value.bind(target);
      }
      return (...args) => {
        const result = value.apply(target, args);
        if (result && typeof result.then === "function") {
          return result.then((resolved) => {
            persist();
            return resolved;
          });
        }
        persist();
        return result;
      };
    }
  });

  Object.defineProperty(proxy, "__criticalDomainPersistence", {
    value: Object.freeze({
      domainKey,
      storeKind: store.kind
    }),
    enumerable: false
  });

  return proxy;
}

function buildRuntimeDiagnostics({
  startupSurface = "api",
  runtimeModeProfile,
  bootstrapModePolicy,
  bootstrapSeeding,
  domains,
  domainRegistry,
  env,
  options
}) {
  const activeStoreKind = resolveRuntimeStoreKind({
    explicitStoreKind:
      options.runtimeStoreKind ||
      options.asyncJobStoreKind ||
      options.asyncJobStore?.kind ||
      null,
    env
  });

  return scanRuntimeInvariants({
    startupSurface,
    runtimeModeProfile,
    bootstrapModePolicy,
    bootstrapMode: bootstrapSeeding.bootstrapMode,
    bootstrapScenarioCode: bootstrapSeeding.bootstrapScenarioCode,
    seedDemo: bootstrapSeeding.shouldSeedDemo,
    domainRegistry,
    domains,
    mergeOrder: API_PLATFORM_FLAT_MERGE_ORDER,
    activeStoreKind,
    env,
    versionRef: options.versionRef || null,
    disabledAdapters: options.disabledAdapters || []
  });
}

export const defaultApiPlatform = createDefaultApiPlatform();
