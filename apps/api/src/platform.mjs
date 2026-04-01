import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { createOrgAuthPlatform, AUTH_PROVIDER_BASELINES } from "../../../packages/domain-org-auth/src/index.mjs";
import { createTenantControlPlatform } from "../../../packages/domain-tenant-control/src/index.mjs";
import { createDocumentArchivePlatform } from "../../../packages/domain-documents/src/index.mjs";
import { createEvidencePlatform } from "../../../packages/domain-evidence/src/index.mjs";
import { createObservabilityPlatform } from "../../../packages/domain-observability/src/index.mjs";
import { createLedgerPlatform } from "../../../packages/domain-ledger/src/index.mjs";
import { createSiePlatform } from "../../../packages/domain-sie/src/index.mjs";
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
  createDurableStateSnapshotArtifact,
  createCorePlatform,
  createSecurityRuntimePlatform,
  cloneSnapshotValue,
  validateDurableStateSnapshotArtifact,
  applyDurableStateSnapshot,
  createInMemoryCriticalDomainStateStore,
  createPostgresCriticalDomainStateStore,
  createSqliteCriticalDomainStateStore,
  resolveCriticalDomainStateConnectionString,
  serializeDurableState,
  summarizeProjectionRebuildGates,
  summarizeTransactionBoundary,
  resolveCanonicalRepositoryConnectionString,
  verifyRuntimeCanonicalRepositorySchemaContract as verifyRuntimeCanonicalRepositorySchemaContractBinding
} from "../../../packages/domain-core/src/index.mjs";
import { createAnnualReportingPlatform, ANNUAL_REPORTING_PROVIDER_BASELINES } from "../../../packages/domain-annual-reporting/src/index.mjs";
import {
  createAutomationAiEngine,
  createProviderBaselineRegistry,
  createRegulatoryChangeCalendar
} from "../../../packages/rule-engine/src/index.mjs";
import { INTEGRATION_PROVIDER_BASELINES } from "../../../packages/domain-integrations/src/index.mjs";
import {
  AUDIT_EVENT_VERSION,
  COMMAND_ENVELOPE_VERSION,
  ERROR_ENVELOPE_VERSION,
  EVENT_ENVELOPE_VERSION,
  RECEIPT_ENVELOPE_VERSION,
  createAuditEnvelope,
  createCommandEnvelope,
  createErrorEnvelope,
  createEventEnvelope
  ,
  createReceiptEnvelope
} from "../../../packages/events/src/index.mjs";
import {
  createBootstrapModePolicy,
  resolveBootstrapSeeding,
  resolveRuntimeModeProfile
} from "../../../scripts/lib/runtime-mode.mjs";
import {
  resolveCriticalDomainStoreKind,
  resolveRuntimeStoreKind,
  scanRuntimeInvariants
} from "../../../scripts/lib/runtime-diagnostics.mjs";
import {
  assertCriticalDomainMethodIntentCoverage,
  listCriticalDomainMethodIntents,
  resolveCriticalDomainMethodIntent
} from "./platform-method-intents.mjs";

function createDomainDefinition({ key, label, packageName, dependsOn = [], create }) {
  return Object.freeze({
    key,
    label,
    packageName,
    dependsOn: Object.freeze([...dependsOn]),
    create
  });
}

function resolveImplicitCriticalDomainStateSqlitePath(runtimeModeProfile) {
  const workspaceFingerprint = crypto
    .createHash("sha256")
    .update(process.cwd(), "utf8")
    .digest("hex")
    .slice(0, 12);
  return path.join(
    os.tmpdir(),
    `swedish-erp-${workspaceFingerprint}-${runtimeModeProfile.environmentMode}-critical-domain-state-v2.sqlite`
  );
}

export const API_PLATFORM_BUILD_ORDER = Object.freeze([
  "orgAuth",
  "tenantControl",
  "documents",
  "evidence",
  "observability",
  "accountingMethod",
  "fiscalYear",
  "legalForm",
  "ledger",
  "sie",
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
  "tenantControl",
  "documents",
  "evidence",
  "observability",
  "accountingMethod",
  "fiscalYear",
  "legalForm",
  "ledger",
  "sie",
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
    key: "securityRuntime",
    label: "Security runtime",
    packageName: "@swedish-erp/domain-core",
    create: ({ options }) => createSecurityRuntimePlatform(options)
  }),
  createDomainDefinition({
    key: "orgAuth",
    label: "Org and auth",
    packageName: "@swedish-erp/domain-org-auth",
    dependsOn: ["securityRuntime"],
    create: ({ options, dependencies }) =>
      createOrgAuthPlatform({
        ...options,
        securityRuntimePlatform: dependencies.securityRuntime
      })
  }),
  createDomainDefinition({
    key: "tenantControl",
    label: "Tenant control",
    packageName: "@swedish-erp/domain-tenant-control",
    dependsOn: ["orgAuth"],
    create: ({ options, dependencies, getDomain }) =>
      createTenantControlPlatform({
        ...options,
        orgAuthPlatform: dependencies.orgAuth,
        getDomain
      })
  }),
  createDomainDefinition({
    key: "documents",
    label: "Documents",
    packageName: "@swedish-erp/domain-documents",
    create: ({ options, getDomain }) =>
      createDocumentArchivePlatform({
        ...options,
        getIntegrationsPlatform: () => getDomain("integrations")
      })
  }),
  createDomainDefinition({
    key: "evidence",
    label: "Evidence",
    packageName: "@swedish-erp/domain-evidence",
    create: ({ options }) => createEvidencePlatform(options)
  }),
  createDomainDefinition({
    key: "observability",
    label: "Observability",
    packageName: "@swedish-erp/domain-observability",
    create: ({ options }) => createObservabilityPlatform(options)
  }),
  createDomainDefinition({
    key: "accountingMethod",
    label: "Accounting method",
    packageName: "@swedish-erp/domain-accounting-method",
    create: ({ options, getDomain }) =>
      createAccountingMethodPlatform({
        ...options,
        getLedgerPlatform: () => getDomain("ledger")
      })
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
    create: ({ options, dependencies, getDomain }) =>
      createLedgerPlatform({
        ...options,
        accountingMethodPlatform: dependencies.accountingMethod,
        fiscalYearPlatform: dependencies.fiscalYear,
        getVatPlatform: () => getDomain("vat")
      })
  }),
  createDomainDefinition({
    key: "sie",
    label: "SIE",
    packageName: "@swedish-erp/domain-sie",
    dependsOn: ["orgAuth", "fiscalYear", "ledger"],
    create: ({ options, dependencies }) =>
      createSiePlatform({
        ...options,
        orgAuthPlatform: dependencies.orgAuth,
        fiscalYearPlatform: dependencies.fiscalYear,
        ledgerPlatform: dependencies.ledger
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
    dependsOn: ["evidence"],
    create: ({ options, getDomain, dependencies }) =>
      createIntegrationPlatform({
        ...options,
        evidencePlatform: dependencies.evidence,
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
    dependsOn: ["accountingMethod", "vat", "ledger", "integrations", "orgAuth"],
    create: ({ options, dependencies }) =>
      createArPlatform({
        ...options,
        accountingMethodPlatform: dependencies.accountingMethod,
        vatPlatform: dependencies.vat,
        ledgerPlatform: dependencies.ledger,
        integrationPlatform: dependencies.integrations,
        orgAuthPlatform: dependencies.orgAuth
      })
  }),
  createDomainDefinition({
    key: "ap",
    label: "Accounts payable",
    packageName: "@swedish-erp/domain-ap",
    dependsOn: ["accountingMethod", "vat", "ledger", "documents", "orgAuth"],
    create: ({ options, dependencies, getDomain }) =>
      createApPlatform({
        ...options,
        accountingMethodPlatform: dependencies.accountingMethod,
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
    dependsOn: ["ap", "integrations", "ledger"],
    create: ({ options, dependencies, getDomain }) =>
      createBankingPlatform({
        ...options,
        apPlatform: dependencies.ap,
        ledgerPlatform: dependencies.ledger,
        integrationsPlatform: dependencies.integrations,
        getTaxAccountPlatform: () => getDomain("taxAccount")
      })
  }),
    createDomainDefinition({
      key: "taxAccount",
      label: "Tax account",
      packageName: "@swedish-erp/domain-tax-account",
      dependsOn: ["banking", "ledger"],
      create: ({ options, dependencies }) =>
        createTaxAccountPlatform({
          ...options,
          bankingPlatform: dependencies.banking,
          ledgerPlatform: dependencies.ledger
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
    dependsOn: ["hr", "documents", "vat"],
    create: ({ options, dependencies }) =>
      createTravelPlatform({
        ...options,
        hrPlatform: dependencies.hr,
        documentPlatform: dependencies.documents,
        vatPlatform: dependencies.vat
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
    dependsOn: [
      "orgAuth",
      "hr",
      "time",
      "balances",
      "collectiveAgreements",
      "benefits",
      "travel",
      "pension",
      "ledger",
      "banking",
      "tenantControl",
      "evidence"
    ],
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
        tenantControlPlatform: dependencies.tenantControl,
        evidencePlatform: dependencies.evidence,
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
    dependsOn: ["ar", "ap", "hr", "time", "payroll", "vat", "evidence"],
    create: ({ options, dependencies, getDomain }) =>
      createProjectsPlatform({
        ...options,
        arPlatform: dependencies.ar,
        apPlatform: dependencies.ap,
        hrPlatform: dependencies.hr,
        timePlatform: dependencies.time,
        payrollPlatform: dependencies.payroll,
        vatPlatform: dependencies.vat,
        evidencePlatform: dependencies.evidence,
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
      dependsOn: ["ledger", "documents", "ar", "ap", "taxAccount", "integrations", "payroll", "projects", "securityRuntime"],
      create: ({ options, dependencies }) =>
        createReportingPlatform({
          ...options,
          ledgerPlatform: dependencies.ledger,
          documentPlatform: dependencies.documents,
          arPlatform: dependencies.ar,
          apPlatform: dependencies.ap,
          taxAccountPlatform: dependencies.taxAccount,
          integrationPlatform: dependencies.integrations,
          payrollPlatform: dependencies.payroll,
          projectsPlatform: dependencies.projects,
          securityRuntimePlatform: dependencies.securityRuntime
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
      dependsOn: ["orgAuth", "reporting", "ledger", "legalForm", "fiscalYear", "integrations", "hr", "balances", "collectiveAgreements", "evidence", "securityRuntime"],
      create: ({ options, dependencies }) =>
        createCorePlatform({
          ...options,
          orgAuthPlatform: dependencies.orgAuth,
          reportingPlatform: dependencies.reporting,
          ledgerPlatform: dependencies.ledger,
          legalFormPlatform: dependencies.legalForm,
          fiscalYearPlatform: dependencies.fiscalYear,
          integrationPlatform: dependencies.integrations,
          hrPlatform: dependencies.hr,
          balancesPlatform: dependencies.balances,
          collectiveAgreementsPlatform: dependencies.collectiveAgreements,
          evidencePlatform: dependencies.evidence,
          securityRuntimePlatform: dependencies.securityRuntime
        })
    }),
  createDomainDefinition({
    key: "hus",
    label: "HUS",
    packageName: "@swedish-erp/domain-hus",
    dependsOn: ["ar", "projects", "ledger"],
    create: ({ options, dependencies }) =>
      createHusPlatform({
        ...options,
        arPlatform: dependencies.ar,
        projectsPlatform: dependencies.projects,
        ledgerPlatform: dependencies.ledger
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
    dependsOn: ["ledger", "reporting", "orgAuth", "vat", "payroll", "hus", "pension", "fiscalYear", "legalForm", "integrations", "evidence"],
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
        integrationPlatform: dependencies.integrations,
        evidencePlatform: dependencies.evidence
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
      commandEnvelopeVersion: COMMAND_ENVELOPE_VERSION,
      receiptEnvelopeVersion: RECEIPT_ENVELOPE_VERSION,
      errorEnvelopeVersion: ERROR_ENVELOPE_VERSION,
      auditEnvelopeVersion: AUDIT_EVENT_VERSION,
      createCommandEnvelope,
      createReceiptEnvelope,
      createErrorEnvelope,
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
    bootstrapMode: options.bootstrapMode || bootstrapModePolicy.defaultBootstrapMode,
    bootstrapScenarioCode: options.bootstrapScenarioCode || null,
    seedDemo: options.seedDemo
  });
  const providerBaselineRegistry =
    options.providerBaselineRegistry
    || createProviderBaselineRegistry({
      clock: options.clock || (() => new Date()),
      seedProviderBaselines: [
        ...AUTH_PROVIDER_BASELINES,
        ...ANNUAL_REPORTING_PROVIDER_BASELINES,
        ...INTEGRATION_PROVIDER_BASELINES
      ]
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
      dataRetentionClass: runtimeModeProfile.dataRetentionClass,
      providerBaselineRegistry
    });
  const criticalDomainStateStore = resolveCriticalDomainStateStore({
    options,
    env,
    runtimeModeProfile
  });
  const canonicalRepositoryConnectionString = resolveCanonicalRepositoryConnectionString({
    connectionString: options.canonicalRepositoryConnectionString || null,
    env
  });
  const domains = {};
  const domainRegistry = [];
  const domainRegistryByKey = {};
  const builtInIdentityModeIsolationResolver = ({
    sessionToken,
    companyId,
    runtimeMode,
    activeProfile,
    providerCode
  } = {}) => {
    const corePlatform = domains.core;
    const blockingMode = activeProfile?.supportsLegalEffect === true || runtimeMode === "pilot_parallel";
    if (
      !corePlatform
      || typeof corePlatform.listManagedSecrets !== "function"
      || typeof corePlatform.listCallbackSecrets !== "function"
    ) {
      return {
        inventory: {},
        violations: [
          {
            providerCode,
            code: "auth_inventory_runtime_unavailable",
            severity: blockingMode ? "blocking" : "warning",
            detail: "Core secret inventory is not available to validate auth mode isolation."
          }
        ]
      };
    }

    let managedSecrets;
    let callbackSecrets;
    let certificateChains;
    try {
      managedSecrets = corePlatform.listManagedSecrets({
        sessionToken,
        companyId,
        mode: runtimeMode,
        providerCode
      });
      callbackSecrets = corePlatform.listCallbackSecrets({
        sessionToken,
        companyId,
        mode: runtimeMode,
        providerCode
      });
      certificateChains =
        typeof corePlatform.listCertificateChains === "function"
          ? corePlatform.listCertificateChains({
            sessionToken,
            companyId,
            mode: runtimeMode,
            providerCode
          })
          : [];
    } catch {
      return {
        inventory: {},
        violations: [
          {
            providerCode,
            code: "auth_inventory_runtime_unavailable",
            severity: blockingMode ? "blocking" : "warning",
            detail: "Core secret inventory could not be inspected with the current auth context."
          }
        ]
      };
    }
    const configuredManagedSecretTypes = [...new Set(managedSecrets.map((record) => record.secretType))].sort();
    const requiredManagedSecretTypes = [...new Set(activeProfile?.requiredManagedSecretTypes || [])].sort();
    const missingSecretTypes = requiredManagedSecretTypes.filter((secretType) => !configuredManagedSecretTypes.includes(secretType));
    const matchingCallbackCount = callbackSecrets.filter(
      (record) => record.callbackDomain === activeProfile?.callbackDomain && record.callbackPath === activeProfile?.callbackPath
    ).length;
    const violations = [];

    if (missingSecretTypes.length > 0) {
      violations.push({
        providerCode,
        code: "auth_provider_secret_missing",
        severity: blockingMode ? "blocking" : "warning",
        detail: `${providerCode}/${runtimeMode} is missing required managed secret types: ${missingSecretTypes.join(", ")}.`
      });
    }
    if (callbackSecrets.length === 0) {
      violations.push({
        providerCode,
        code: "auth_provider_callback_secret_missing",
        severity: blockingMode ? "blocking" : "warning",
        detail: `${providerCode}/${runtimeMode} has no callback secret configured.`
      });
    }
    if (matchingCallbackCount === 0) {
      violations.push({
        providerCode,
        code: "auth_provider_callback_domain_mismatch",
        severity: blockingMode ? "blocking" : "warning",
        detail: `${providerCode}/${runtimeMode} does not have a callback secret bound to ${activeProfile.callbackDomain}${activeProfile.callbackPath}.`
      });
    }
    if (activeProfile?.supportsLegalEffect === true && Array.isArray(activeProfile.testIdentities) && activeProfile.testIdentities.length > 0) {
      violations.push({
        providerCode,
        code: "auth_provider_production_test_identity_forbidden",
        severity: "blocking",
        detail: `${providerCode}/${runtimeMode} still exposes test identities in a legal-effect environment.`
      });
    }
    if (activeProfile?.supportsLegalEffect !== true && (!Array.isArray(activeProfile?.testIdentities) || activeProfile.testIdentities.length === 0)) {
      violations.push({
        providerCode,
        code: "auth_provider_test_identity_missing",
        severity: "warning",
        detail: `${providerCode}/${runtimeMode} should expose explicit test identities for sandbox/trial verification.`
      });
    }

    return {
      inventory: {
        managedSecretCount: managedSecrets.length,
        callbackSecretCount: callbackSecrets.length,
        matchingCallbackCount,
        certificateChainCount: certificateChains.length,
        requiredManagedSecretTypes,
        configuredManagedSecretTypes
      },
      violations
    };
  };
  const resolveIdentityModeIsolation =
    typeof options.resolveIdentityModeIsolation === "function"
      ? options.resolveIdentityModeIsolation
      : builtInIdentityModeIsolationResolver;
  const effectivePlatformOptions = Object.freeze({
    ...platformOptions,
    resolveIdentityModeIsolation
  });

  for (const definition of API_DOMAIN_DEFINITIONS) {
    const dependencies = Object.fromEntries(
      definition.dependsOn.map((domainKey) => [domainKey, requireRegisteredDomain(domains, domainKey, definition.key)])
    );
      const platform = definition.create({
        options: effectivePlatformOptions,
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
  assertCriticalDomainMethodIntentCoverage(registrations, registeredDomains);
  const defaultRuntimeDiagnostics = buildRuntimeDiagnostics({
    startupSurface: options.startupSurface || "api",
    runtimeModeProfile,
    bootstrapModePolicy,
    bootstrapSeeding,
    domains: registeredDomains,
    domainRegistry: registrations,
    env,
    options,
    criticalDomainStateStore
  });
  const defaultFlatMergeCollisions = Object.freeze(
    defaultRuntimeDiagnostics.findings.filter((finding) => finding.findingCode === "flat_merge_collision")
  );
  const contractVersions = Object.freeze({
    eventEnvelopeVersion: EVENT_ENVELOPE_VERSION,
    commandEnvelopeVersion: COMMAND_ENVELOPE_VERSION,
    receiptEnvelopeVersion: RECEIPT_ENVELOPE_VERSION,
    errorEnvelopeVersion: ERROR_ENVELOPE_VERSION,
    auditEnvelopeVersion: AUDIT_EVENT_VERSION
  });
  const regulatoryChangeCalendar = createRegulatoryChangeCalendar({
    clock: options.clock || (() => new Date()),
    providerBaselineRegistry,
    resolveRulePackTargets: () =>
      Object.freeze({
        accounting_method: registeredDomains.accountingMethod.rulePackGovernance,
        fiscal_year: registeredDomains.fiscalYear.rulePackGovernance,
        legal_form: registeredDomains.legalForm.rulePackGovernance,
        vat: registeredDomains.vat.rulePackGovernance,
        payroll: registeredDomains.payroll.rulePackGovernance,
        hus: registeredDomains.hus.rulePackGovernance,
        tax_account: registeredDomains.taxAccount.rulePackGovernance
      })
  });
  const platform = {
    ...flatPlatform,
    ...regulatoryChangeCalendar
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
    runtimeFlatMergeCollisions: {
      value: defaultFlatMergeCollisions,
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
    providerBaselineRegistry: {
      value: providerBaselineRegistry,
      enumerable: false
    },
    regulatoryChangeCalendar: {
      value: regulatoryChangeCalendar,
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
    getCriticalDomainDurability: {
      value: (domainKey) =>
        registeredDomains[domainKey] && typeof registeredDomains[domainKey].getCriticalDomainDurability === "function"
          ? registeredDomains[domainKey].getCriticalDomainDurability()
          : null,
      enumerable: false
    },
    listCriticalDomainDurability: {
      value: () =>
        CRITICAL_DOMAIN_KEYS.map((domainKey) => {
          const durability =
            registeredDomains[domainKey] && typeof registeredDomains[domainKey].getCriticalDomainDurability === "function"
              ? registeredDomains[domainKey].getCriticalDomainDurability()
              : null;
          return Object.freeze({
            domainKey,
            truthMode: durability?.truthMode || "map_only",
            persistenceStoreKind: durability?.persistenceStoreKind || null,
            snapshotHash: durability?.snapshotHash || null,
            objectVersion: durability?.objectVersion ?? null,
            durabilityPolicy: durability?.durabilityPolicy || null,
            adapterKind: durability?.adapterKind || null,
            durable: ["repository_envelope", "in_memory_repository_envelope"].includes(durability?.truthMode)
          });
        }),
      enumerable: false
    },
    listCriticalDomainCommandReceipts: {
      value: ({ domainKey = null, companyId = null } = {}) =>
        typeof criticalDomainStateStore.listCommandReceipts === "function"
          ? criticalDomainStateStore.listCommandReceipts({ domainKey, companyId })
          : [],
      enumerable: false
    },
    listCriticalDomainDomainEvents: {
      value: ({ domainKey = null, companyId = null, commandReceiptId = null } = {}) =>
        typeof criticalDomainStateStore.listDomainEvents === "function"
          ? criticalDomainStateStore.listDomainEvents({ domainKey, companyId, commandReceiptId })
          : [],
      enumerable: false
    },
    listCriticalDomainOutboxMessages: {
      value: ({ domainKey = null, companyId = null, commandReceiptId = null } = {}) =>
        typeof criticalDomainStateStore.listOutboxMessages === "function"
          ? criticalDomainStateStore.listOutboxMessages({ domainKey, companyId, commandReceiptId })
          : [],
      enumerable: false
    },
    listCriticalDomainEvidenceRefs: {
      value: ({ domainKey = null, companyId = null, commandReceiptId = null } = {}) =>
        typeof criticalDomainStateStore.listEvidenceRefs === "function"
          ? criticalDomainStateStore.listEvidenceRefs({ domainKey, companyId, commandReceiptId })
          : [],
      enumerable: false
    },
    getTransactionBoundarySummary: {
      value: ({
        companyId,
        asOf = null,
        warningLagMinutes = 15,
        criticalLagMinutes = 60,
        projectionRunningStaleMinutes = 15
      } = {}) => {
        const resolvedCompanyId = text(companyId, "companyId");
        const commitLag = summarizeTransactionBoundary({
          commandReceipts:
            typeof criticalDomainStateStore.listCommandReceipts === "function"
              ? criticalDomainStateStore.listCommandReceipts({ companyId: resolvedCompanyId })
              : [],
          outboxMessages:
            typeof criticalDomainStateStore.listOutboxMessages === "function"
              ? criticalDomainStateStore.listOutboxMessages({ companyId: resolvedCompanyId })
              : [],
          asOf,
          warningLagMinutes,
          criticalLagMinutes
        });
        const projectionRebuildGates = summarizeProjectionRebuildGates({
          projectionContracts:
            typeof platform.listSearchProjectionContracts === "function"
              ? platform.listSearchProjectionContracts({ companyId: resolvedCompanyId })
              : [],
          projectionCheckpoints:
            typeof platform.listProjectionCheckpoints === "function"
              ? platform.listProjectionCheckpoints({ companyId: resolvedCompanyId })
              : [],
          asOf,
          runningStaleMinutes: projectionRunningStaleMinutes
        });
        return Object.freeze({
          companyId: resolvedCompanyId,
          asOf: commitLag.asOf,
          commitLag,
          projectionRebuildGates
        });
      },
      enumerable: false
    },
    exportCriticalDomainSnapshotArtifact: {
      value: ({ domainKey, ...options } = {}) => {
        const resolvedDomainKey = text(domainKey, "domainKey");
        const domain = registeredDomains[resolvedDomainKey];
        if (!domain || typeof domain.exportCriticalDomainSnapshotArtifact !== "function") {
          throw new Error(`Domain "${resolvedDomainKey}" does not expose critical snapshot export.`);
        }
        return domain.exportCriticalDomainSnapshotArtifact(options);
      },
      enumerable: false
    },
    importCriticalDomainSnapshotArtifact: {
      value: ({ domainKey, ...options } = {}) => {
        const resolvedDomainKey = text(domainKey, "domainKey");
        const domain = registeredDomains[resolvedDomainKey];
        if (!domain || typeof domain.importCriticalDomainSnapshotArtifact !== "function") {
          throw new Error(`Domain "${resolvedDomainKey}" does not expose critical snapshot import.`);
        }
        return domain.importCriticalDomainSnapshotArtifact(options);
      },
      enumerable: false
    },
    listCriticalDomainMethodIntents: {
      value: ({ domainKey = null } = {}) =>
        listCriticalDomainMethodIntents(registrations, registeredDomains).filter((entry) =>
          domainKey ? entry.domainKey === domainKey : true
        ),
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
    verifyRuntimeCanonicalRepositorySchemaContract: {
      value:
        typeof options.verifyRuntimeCanonicalRepositorySchemaContract === "function"
          ? options.verifyRuntimeCanonicalRepositorySchemaContract
          : canonicalRepositoryConnectionString
            ? () =>
              verifyRuntimeCanonicalRepositorySchemaContractBinding({
                connectionString: canonicalRepositoryConnectionString,
                env
              })
            : undefined,
      enumerable: false
    },
    verifyRuntimeCriticalDomainStateStoreSchemaContract: {
      value:
        typeof options.verifyRuntimeCriticalDomainStateStoreSchemaContract === "function"
          ? options.verifyRuntimeCriticalDomainStateStoreSchemaContract
          : typeof criticalDomainStateStore?.verifySchemaContract === "function"
            ? () => criticalDomainStateStore.verifySchemaContract()
            : undefined,
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
    listFlatMergeCollisions: {
      value: () => defaultFlatMergeCollisions,
      enumerable: false
    },
    listSecurityAlerts: {
      value: (...args) =>
        typeof registeredDomains.securityRuntime?.listSecurityAlerts === "function"
          ? registeredDomains.securityRuntime.listSecurityAlerts(...args)
          : [],
      enumerable: false
    },
    listSecurityBudgets: {
      value: (...args) =>
        typeof registeredDomains.securityRuntime?.listSecurityBudgets === "function"
          ? registeredDomains.securityRuntime.listSecurityBudgets(...args)
          : [],
      enumerable: false
    },
    listSecurityFailureSeries: {
      value: (...args) =>
        typeof registeredDomains.securityRuntime?.listSecurityFailureSeries === "function"
          ? registeredDomains.securityRuntime.listSecurityFailureSeries(...args)
          : [],
      enumerable: false
    },
    getSecurityRiskSummary: {
      value: (...args) =>
        typeof registeredDomains.securityRuntime?.getSecurityRiskSummary === "function"
          ? registeredDomains.securityRuntime.getSecurityRiskSummary(...args)
          : null,
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
            criticalDomainStateStoreKind:
              overrides.criticalDomainStoreKind === undefined
                ? options.criticalDomainStateStoreKind
                : overrides.criticalDomainStoreKind,
            runtimeStoreKind:
              overrides.activeStoreKind ||
              overrides.runtimeStoreKind ||
              options.runtimeStoreKind ||
              options.asyncJobStoreKind ||
              options.asyncJobStore?.kind ||
              null
          },
          criticalDomainStateStore
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
    createCommandEnvelope: {
      value: (input) => createCommandEnvelope(input),
      enumerable: false
    },
    createReceiptEnvelope: {
      value: (input) => createReceiptEnvelope(input),
      enumerable: false
    },
    createErrorEnvelope: {
      value: (input) => createErrorEnvelope(input),
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

const STATELESS_DOMAIN_KEYS = Object.freeze(["automation"]);
const CRITICAL_DOMAIN_KEYS = Object.freeze(
  API_PLATFORM_BUILD_ORDER.filter((domainKey) => !STATELESS_DOMAIN_KEYS.includes(domainKey))
);
const CRITICAL_DOMAIN_SNAPSHOT_SCHEMA_VERSIONS = Object.freeze(
  Object.fromEntries(CRITICAL_DOMAIN_KEYS.map((domainKey) => [domainKey, 1]))
);
const CRITICAL_DOMAIN_SNAPSHOT_CLASS_MASK_OVERRIDES = Object.freeze({
  orgAuth: Object.freeze(["S3", "S4"]),
  integrations: Object.freeze(["S3", "S4"]),
  core: Object.freeze(["S2", "S4"]),
  payroll: Object.freeze(["S3"]),
  taxAccount: Object.freeze(["S3"]),
  annualReporting: Object.freeze(["S3"]),
  hus: Object.freeze(["S3"]),
  banking: Object.freeze(["S3"]),
  ledger: Object.freeze(["S3"]),
  vat: Object.freeze(["S3"]),
  ar: Object.freeze(["S3"]),
  ap: Object.freeze(["S3"])
});

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
    return "repository_envelope";
  }
  return "in_memory_repository_envelope";
}

function hashSnapshot(value) {
  return crypto.createHash("sha256").update(stableStringify(value ?? null)).digest("hex");
}

function createSnapshotArtifactError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function text(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createSnapshotArtifactError(`${fieldName}_required`, `${fieldName} is required.`);
  }
  return value.trim();
}

function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw createSnapshotArtifactError(`${fieldName}_invalid`, `${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function resolveCriticalDomainSnapshotSchemaVersion(domainKey) {
  return CRITICAL_DOMAIN_SNAPSHOT_SCHEMA_VERSIONS[domainKey] || 1;
}

function resolveCriticalDomainSnapshotClassMask(domainKey) {
  const classMask = CRITICAL_DOMAIN_SNAPSHOT_CLASS_MASK_OVERRIDES[domainKey];
  return Array.isArray(classMask) && classMask.length > 0 ? [...classMask] : ["S2"];
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function summarizeMutationValue(value) {
  if (Array.isArray(value)) {
    return Object.freeze({
      kind: "array",
      length: value.length,
      items: value.slice(0, 5).map((entry) => summarizeMutationValue(entry))
    });
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return Object.freeze({
      kind: "object",
      keys,
      fields: Object.freeze(
        Object.fromEntries(keys.slice(0, 32).map((key) => [key, summarizeMutationValue(value[key])]))
      )
    });
  }
  if (value == null) {
    return null;
  }
  return Object.freeze({
    kind: typeof value
  });
}

function resolveMutationInput(args) {
  return isPlainObject(args?.[0]) ? args[0] : {};
}

function resolveMutationCompanyId(input, result) {
  const candidates = [
    input.companyId,
    input.bureauOrgId,
    input.clientCompanyId,
    input.tenantId,
    result?.companyId,
    result?.bureauOrgId,
    result?.tenantId,
    "platform"
  ];
  return candidates.find((candidate) => typeof candidate === "string" && candidate.trim().length > 0) || "platform";
}

function resolveMutationActorId(input, result) {
  return (
    [input.actorId, input.userId, result?.actorId, "system"].find(
      (candidate) => typeof candidate === "string" && candidate.trim().length > 0
    ) || "system"
  );
}

function resolveMutationSessionRevision(input) {
  const candidate = Number(input.sessionRevision);
  if (Number.isInteger(candidate) && candidate > 0) {
    return candidate;
  }
  return 1;
}

function resolveMutationCorrelationId(input) {
  return (
    [input.correlationId, input.correlation_id].find(
      (candidate) => typeof candidate === "string" && candidate.trim().length > 0
    ) || crypto.randomUUID()
  );
}

function resolveMutationCausationId(input) {
  return (
    [input.causationId, input.causation_id].find(
      (candidate) => typeof candidate === "string" && candidate.trim().length > 0
    ) || null
  );
}

function summarizeMutationArgs(args) {
  return Object.freeze({
    argumentCount: Array.isArray(args) ? args.length : 0,
    arguments: Array.isArray(args) ? args.map((entry) => summarizeMutationValue(entry)) : []
  });
}

function summarizeMutationResult(result) {
  return summarizeMutationValue(result);
}

function extractEvidenceRefRecords({ domainKey, companyId, aggregateType, aggregateId, actorId, correlationId, result }) {
  if (!Array.isArray(result?.evidenceRefs)) {
    return [];
  }
  return result.evidenceRefs
    .filter((entry) => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) =>
      Object.freeze({
        domainKey,
        companyId,
        aggregateType,
        aggregateId,
        evidenceRefType: "domain_result_ref",
        evidenceRef: entry.trim(),
        actorId,
        correlationId,
        metadata: Object.freeze({
          source: "domain_result"
        })
      })
    );
}

function resolveDomainDurabilityPolicy(domainKey) {
  if (STATELESS_DOMAIN_KEYS.includes(domainKey)) {
    return Object.freeze({
      domainKey,
      truthMode: "stateless",
      durabilityPolicy: "stateless"
    });
  }
  return Object.freeze({
    domainKey,
    truthMode: "repository_envelope",
    durabilityPolicy: "repository_envelope"
  });
}

function resolveDurableStateAdapter(platform) {
  if (
    typeof platform?.exportDurableState === "function"
    && typeof platform?.importDurableState === "function"
  ) {
    return {
      adapterKind: "platform_export_import",
      exportSnapshot: () => platform.exportDurableState(),
      importSnapshot: (snapshot) => platform.importDurableState(snapshot)
    };
  }

  if (platform?.__durableState && typeof platform.__durableState === "object") {
    return {
      adapterKind: "hidden_state_generic",
      exportSnapshot: () => serializeDurableState(platform.__durableState),
      importSnapshot: (snapshot) => applyDurableStateSnapshot(platform.__durableState, snapshot)
    };
  }

  return null;
}

function resolveCriticalDomainStateStore({
  options,
  env,
  runtimeModeProfile
}) {
  if (options.criticalDomainStateStore) {
    return options.criticalDomainStateStore;
  }

  const hasExplicitPostgresConnection =
    !!options.criticalDomainStateConnectionString
    || !!env.ERP_CRITICAL_DOMAIN_STATE_URL
    || !!env.CRITICAL_DOMAIN_STATE_URL;
  const storeKind =
    options.criticalDomainStateStoreKind ||
    env.ERP_CRITICAL_DOMAIN_STATE_STORE ||
    (hasExplicitPostgresConnection ? "postgres" : null) ||
    "memory";

  if (storeKind === "memory") {
    return createInMemoryCriticalDomainStateStore();
  }

    if (storeKind === "sqlite") {
      const filePath =
        options.criticalDomainStateStorePath ||
        env.ERP_CRITICAL_DOMAIN_STATE_DB_PATH ||
        resolveImplicitCriticalDomainStateSqlitePath(runtimeModeProfile);
      return createSqliteCriticalDomainStateStore({ filePath });
    }

  if (storeKind === "postgres") {
    return createPostgresCriticalDomainStateStore({
      connectionString: resolveCriticalDomainStateConnectionString({
        connectionString: options.criticalDomainStateConnectionString || null,
        env
      }),
      env,
      max: options.criticalDomainStateStoreMaxConnections || 5,
      idleTimeout: options.criticalDomainStateStoreIdleTimeout || 5,
      connectTimeout: options.criticalDomainStateStoreConnectTimeout || 30
    });
  }

  throw new Error(`Unsupported critical domain state store kind: ${storeKind}.`);
}

function decorateCriticalDomainPersistence({ domainKey, platform, store }) {
  const durabilityPolicy = resolveDomainDurabilityPolicy(domainKey);
  if (durabilityPolicy.truthMode === "stateless") {
    Object.defineProperty(platform, "__criticalDomainPersistence", {
      value: Object.freeze({
        domainKey,
        storeKind: null,
        durabilityPolicy: durabilityPolicy.durabilityPolicy
      }),
      enumerable: false
    });
    Object.defineProperty(platform, "getCriticalDomainDurability", {
      value: () =>
        Object.freeze({
          domainKey,
          truthMode: "stateless",
          persistenceStoreKind: null,
          snapshotHash: null,
          objectVersion: null,
          durabilityPolicy: durabilityPolicy.durabilityPolicy,
          adapterKind: null
        }),
      enumerable: false
    });
    Object.defineProperty(platform, "flushDurableState", {
      value: () => null,
      enumerable: false
    });
    return platform;
  }

  const adapter = resolveDurableStateAdapter(platform);
  if (!store || !adapter) {
    throw new Error(`Domain "${domainKey}" requires a repository durability adapter in phase 2.1.`);
  }

  const existingRecord = store.load(domainKey);
  if (existingRecord?.snapshot) {
    adapter.importSnapshot(existingRecord.snapshot);
  }

  let lastPersistedHash = existingRecord?.snapshotHash || null;
  let lastPersistedObjectVersion = existingRecord?.objectVersion || 0;
  const persist = (journalContext = null) => {
    const snapshot = adapter.exportSnapshot();
    const snapshotHash = hashSnapshot(snapshot);
    if (snapshotHash === lastPersistedHash) {
      return null;
    }
    const record = typeof store.recordMutation === "function" && journalContext
      ? store.recordMutation({
        domainKey,
        companyId: journalContext.companyId,
        commandType: journalContext.commandType,
        aggregateType: journalContext.aggregateType,
        aggregateId: journalContext.aggregateId,
        commandId: journalContext.commandId,
        idempotencyKey: journalContext.idempotencyKey,
        expectedObjectVersion: lastPersistedObjectVersion,
        actorId: journalContext.actorId,
        sessionRevision: journalContext.sessionRevision,
        correlationId: journalContext.correlationId,
        causationId: journalContext.causationId,
        commandPayload: journalContext.commandPayload,
        metadata: journalContext.metadata,
        domainEventRecords: journalContext.domainEventRecords,
        outboxMessageRecords: journalContext.outboxMessageRecords,
        evidenceRefRecords: journalContext.evidenceRefRecords,
        snapshot,
        durabilityPolicy: durabilityPolicy.durabilityPolicy,
        adapterKind: adapter.adapterKind
      }).stateRecord
      : store.save({
        domainKey,
        snapshot,
        expectedObjectVersion: lastPersistedObjectVersion,
        durabilityPolicy: durabilityPolicy.durabilityPolicy,
        adapterKind: adapter.adapterKind
      });
    lastPersistedHash = record.snapshotHash;
    lastPersistedObjectVersion = record.objectVersion;
    return record;
  };
  const exportSnapshotArtifact = ({
    companyId = null,
    exportedAt = null,
    classMask = null,
    metadata = {}
  } = {}) =>
    createDurableStateSnapshotArtifact({
      domainKey,
      snapshot: adapter.exportSnapshot(),
      snapshotSchemaVersion: resolveCriticalDomainSnapshotSchemaVersion(domainKey),
      classMask: Array.isArray(classMask) && classMask.length > 0 ? classMask : resolveCriticalDomainSnapshotClassMask(domainKey),
      exportedAt,
      sourceObjectVersion: lastPersistedObjectVersion,
      sourceSnapshotHash: lastPersistedHash,
      adapterKind: adapter.adapterKind,
      durabilityPolicy: durabilityPolicy.durabilityPolicy,
      scopeCompanyId: optionalText(companyId, "companyId"),
      metadata
    });
  const importSnapshotArtifact = ({
    artifact,
    companyId = null,
    actorId = "system",
    sessionRevision = 1,
    correlationId = crypto.randomUUID(),
    causationId = null,
    commandId = crypto.randomUUID(),
    idempotencyKey = null
  } = {}) => {
    const beforeSnapshot = adapter.exportSnapshot();
    try {
      const validatedArtifact = validateDurableStateSnapshotArtifact(artifact, {
        expectedDomainKey: domainKey,
        expectedSnapshotSchemaVersion: resolveCriticalDomainSnapshotSchemaVersion(domainKey)
      });
      const resolvedCompanyId = optionalText(companyId, "companyId") || validatedArtifact.scopeCompanyId;
      if (!resolvedCompanyId) {
        throw createSnapshotArtifactError(
          "snapshot_artifact_company_id_required",
          `Snapshot import for "${domainKey}" requires an explicit companyId or a scoped artifact company id.`
        );
      }
      const resolvedActorId = text(actorId, "actorId");
      const resolvedCorrelationId = text(correlationId, "correlationId");
      const resolvedCommandId = text(commandId, "commandId");
      const resolvedSessionRevision = normalizePositiveInteger(sessionRevision, "sessionRevision");
      adapter.importSnapshot(validatedArtifact.snapshotPayload);

      const aggregateType = `${domainKey}_aggregate_state`;
      const aggregateId = domainKey;
      const commandType = `${domainKey}.importSnapshotArtifact`;
      const auditEnvelope = createAuditEnvelope({
        action: commandType,
        actorId: resolvedActorId,
        companyId: resolvedCompanyId,
        entityType: aggregateType,
        entityId: aggregateId,
        explanation: `Imported snapshot artifact ${validatedArtifact.snapshotArtifactId} into ${domainKey}.`,
        correlationId: resolvedCorrelationId,
        causationId: optionalText(causationId, "causationId"),
        metadata: {
          domainKey,
          snapshotArtifactId: validatedArtifact.snapshotArtifactId,
          snapshotSchemaVersion: validatedArtifact.snapshotSchemaVersion
        }
      });
      const stateRecord = persist({
        companyId: resolvedCompanyId,
        commandType,
        aggregateType,
        aggregateId,
        commandId: resolvedCommandId,
        idempotencyKey:
          optionalText(idempotencyKey, "idempotencyKey")
          || `${commandType}:${validatedArtifact.snapshotArtifactId}`,
        actorId: resolvedActorId,
        sessionRevision: resolvedSessionRevision,
        correlationId: resolvedCorrelationId,
        causationId: optionalText(causationId, "causationId"),
        commandPayload: Object.freeze({
          domainKey,
          methodName: "importSnapshotArtifact",
          snapshotArtifact: Object.freeze({
            snapshotArtifactId: validatedArtifact.snapshotArtifactId,
            snapshotSchemaVersion: validatedArtifact.snapshotSchemaVersion,
            checksum: validatedArtifact.checksum,
            classMask: [...validatedArtifact.classMask],
            sourceObjectVersion: validatedArtifact.sourceObjectVersion,
            sourceSnapshotHash: validatedArtifact.sourceSnapshotHash,
            scopeCompanyId: validatedArtifact.scopeCompanyId
          })
        }),
        metadata: Object.freeze({
          auditEnvelope,
          durabilityPolicy: durabilityPolicy.durabilityPolicy,
          adapterKind: adapter.adapterKind,
          snapshotArtifactMetadata: cloneSnapshotValue(validatedArtifact.metadata)
        }),
        domainEventRecords: [
          Object.freeze({
            aggregateType,
            aggregateId,
            eventType: "snapshot.imported",
            payload: Object.freeze({
              domainKey,
              snapshotArtifactId: validatedArtifact.snapshotArtifactId,
              snapshotSchemaVersion: validatedArtifact.snapshotSchemaVersion,
              sourceObjectVersion: validatedArtifact.sourceObjectVersion
            }),
            actorId: resolvedActorId,
            correlationId: resolvedCorrelationId,
            causationId: optionalText(causationId, "causationId")
          })
        ],
        outboxMessageRecords: [],
        evidenceRefRecords: []
      });
      return Object.freeze({
        domainKey,
        companyId: resolvedCompanyId,
        snapshotArtifactId: validatedArtifact.snapshotArtifactId,
        snapshotSchemaVersion: validatedArtifact.snapshotSchemaVersion,
        stateRecord
      });
    } catch (error) {
      adapter.importSnapshot(beforeSnapshot);
      throw error;
    }
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
            snapshotHash: lastPersistedHash,
            objectVersion: lastPersistedObjectVersion,
            durabilityPolicy: durabilityPolicy.durabilityPolicy,
            adapterKind: adapter.adapterKind
          });
      }
      if (property === "flushDurableState") {
        return () => persist();
      }
      if (property === "exportCriticalDomainSnapshotArtifact") {
        return exportSnapshotArtifact;
      }
      if (property === "importCriticalDomainSnapshotArtifact") {
        return importSnapshotArtifact;
      }

      const value = Reflect.get(target, property, receiver);
      if (typeof property !== "string" || typeof value !== "function") {
        return value;
      }
      if (
        [
          "exportDurableState",
          "importDurableState",
          "__durableState",
          "getCriticalDomainDurability",
          "flushDurableState"
        ].includes(property) ||
        resolveCriticalDomainMethodIntent(domainKey, property) === "read"
      ) {
        return value.bind(target);
      }
        return (...args) => {
          const beforeSnapshot = adapter.exportSnapshot();
          const input = resolveMutationInput(args);
          const restoreOnFailure = (error) => {
            if (error?.preserveDurableStateOnFailure === true) {
              try {
                persist();
              } catch (persistError) {
                adapter.importSnapshot(beforeSnapshot);
                throw persistError;
              }
              throw error;
            }
            adapter.importSnapshot(beforeSnapshot);
            throw error;
          };
        try {
          const result = value.apply(target, args);
          if (result && typeof result.then === "function") {
            return result
              .then((resolved) => {
                try {
                  const companyId = resolveMutationCompanyId(input, resolved);
                  const actorId = resolveMutationActorId(input, resolved);
                  const correlationId = resolveMutationCorrelationId(input);
                  const commandId = typeof input.commandId === "string" && input.commandId.trim().length > 0
                    ? input.commandId.trim()
                    : crypto.randomUUID();
                  const aggregateType = `${domainKey}_aggregate_state`;
                  const aggregateId = domainKey;
                  const commandType = `${domainKey}.${property}`;
                  const auditEnvelope = createAuditEnvelope({
                    action: commandType,
                    actorId,
                    companyId,
                    entityType: aggregateType,
                    entityId: aggregateId,
                    explanation: `Committed ${commandType} through critical domain persistence.`,
                    correlationId,
                    causationId: resolveMutationCausationId(input),
                    metadata: {
                      domainKey,
                      methodName: property
                    }
                  });
                  persist({
                    companyId,
                    commandType,
                    aggregateType,
                    aggregateId,
                    commandId,
                    idempotencyKey:
                      typeof input.idempotencyKey === "string" && input.idempotencyKey.trim().length > 0
                        ? input.idempotencyKey.trim()
                        : `${commandType}:${commandId}`,
                    actorId,
                    sessionRevision: resolveMutationSessionRevision(input),
                    correlationId,
                    causationId: resolveMutationCausationId(input),
                    commandPayload: Object.freeze({
                      domainKey,
                      methodName: property,
                      input: summarizeMutationArgs(args),
                      result: summarizeMutationResult(resolved)
                    }),
                    metadata: Object.freeze({
                      auditEnvelope,
                      durabilityPolicy: durabilityPolicy.durabilityPolicy,
                      adapterKind: adapter.adapterKind
                    }),
                    domainEventRecords: [
                      Object.freeze({
                        aggregateType,
                        aggregateId,
                        eventType: `${commandType}.committed`,
                        payload: Object.freeze({
                          domainKey,
                          methodName: property,
                          result: summarizeMutationResult(resolved)
                        }),
                        actorId,
                        correlationId
                      })
                    ],
                    outboxMessageRecords: [],
                    evidenceRefRecords: extractEvidenceRefRecords({
                      domainKey,
                      companyId,
                      aggregateType,
                      aggregateId,
                      actorId,
                      correlationId,
                      result: resolved
                    })
                  });
                } catch (error) {
                  restoreOnFailure(error);
                }
                return resolved;
              })
              .catch((error) => restoreOnFailure(error));
          }
          const companyId = resolveMutationCompanyId(input, result);
          const actorId = resolveMutationActorId(input, result);
          const correlationId = resolveMutationCorrelationId(input);
          const commandId = typeof input.commandId === "string" && input.commandId.trim().length > 0
            ? input.commandId.trim()
            : crypto.randomUUID();
          const aggregateType = `${domainKey}_aggregate_state`;
          const aggregateId = domainKey;
          const commandType = `${domainKey}.${property}`;
          const auditEnvelope = createAuditEnvelope({
            action: commandType,
            actorId,
            companyId,
            entityType: aggregateType,
            entityId: aggregateId,
            explanation: `Committed ${commandType} through critical domain persistence.`,
            correlationId,
            causationId: resolveMutationCausationId(input),
            metadata: {
              domainKey,
              methodName: property
            }
          });
          persist({
            companyId,
            commandType,
            aggregateType,
            aggregateId,
            commandId,
            idempotencyKey:
              typeof input.idempotencyKey === "string" && input.idempotencyKey.trim().length > 0
                ? input.idempotencyKey.trim()
                : `${commandType}:${commandId}`,
            actorId,
            sessionRevision: resolveMutationSessionRevision(input),
            correlationId,
            causationId: resolveMutationCausationId(input),
            commandPayload: Object.freeze({
              domainKey,
              methodName: property,
              input: summarizeMutationArgs(args),
              result: summarizeMutationResult(result)
            }),
            metadata: Object.freeze({
              auditEnvelope,
              durabilityPolicy: durabilityPolicy.durabilityPolicy,
              adapterKind: adapter.adapterKind
            }),
            domainEventRecords: [
              Object.freeze({
                aggregateType,
                aggregateId,
                eventType: `${commandType}.committed`,
                payload: Object.freeze({
                  domainKey,
                  methodName: property,
                  result: summarizeMutationResult(result)
                }),
                actorId,
                correlationId
              })
            ],
            outboxMessageRecords: [],
            evidenceRefRecords: extractEvidenceRefRecords({
              domainKey,
              companyId,
              aggregateType,
              aggregateId,
              actorId,
              correlationId,
              result
            })
          });
          return result;
        } catch (error) {
          restoreOnFailure(error);
        }
      };
    }
  });

  Object.defineProperty(proxy, "__criticalDomainPersistence", {
    value: Object.freeze({
      domainKey,
      storeKind: store.kind,
      durabilityPolicy: durabilityPolicy.durabilityPolicy,
      objectVersion: () => lastPersistedObjectVersion
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
  options,
  criticalDomainStateStore = null
}) {
  const activeStoreKind = resolveRuntimeStoreKind({
    explicitStoreKind:
      options.runtimeStoreKind ||
      options.asyncJobStoreKind ||
      options.asyncJobStore?.kind ||
      null,
    env
  });
  const criticalDomainStoreKind = resolveCriticalDomainStoreKind({
    explicitStoreKind:
      options.criticalDomainStateStoreKind
      || options.criticalDomainStateStore?.kind
      || criticalDomainStateStore?.kind
      || null,
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
    criticalDomainStoreKind,
    env,
    versionRef: options.versionRef || null,
    disabledAdapters: options.disabledAdapters || []
  });
}

export const defaultApiPlatform = createDefaultApiPlatform({
  runtimeMode: "test",
  enforceExplicitRuntimeMode: true
});
