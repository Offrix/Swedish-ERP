import test from "node:test";
import assert from "node:assert/strict";
import { createHrPlatform } from "../../packages/domain-hr/src/index.mjs";
import { createDocumentArchivePlatform } from "../../packages/domain-documents/src/index.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 7.1 direct platform supports multiple employments, preserves contract history and audits sensitive fields", () => {
  const documentPlatform = createDocumentArchivePlatform({
    clock: () => new Date("2026-12-01T08:00:00Z"),
    seedDemo: false
  });
  const hrPlatform = createHrPlatform({
    clock: () => new Date("2026-12-01T08:00:00Z"),
    seedDemo: false,
    documentPlatform
  });

  const document = documentPlatform.createDocumentRecord({
    companyId: COMPANY_ID,
    documentType: "employment_contract",
    sourceReference: "hr-unit-contract-001",
    actorId: "unit-test",
    correlationId: "hr-unit-doc"
  });
  documentPlatform.appendDocumentVersion({
    companyId: COMPANY_ID,
    documentId: document.documentId,
    variantType: "original",
    storageKey: "documents/originals/hr-unit-contract-001.pdf",
    mimeType: "application/pdf",
    fileHash: "hr-unit-contract-001",
    sourceReference: "hr-unit-contract-001",
    actorId: "unit-test",
    correlationId: "hr-unit-doc"
  });

  const employee = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Klara",
    familyName: "Lind",
    dateOfBirth: "1991-05-05",
    identityType: "samordningsnummer",
    identityValue: "910505-1234",
    privateEmail: "klara.private@example.com",
    protectedIdentity: true,
    actorId: "unit-test",
    correlationId: "hr-unit-employee"
  });
  assert.equal(employee.identityValueMasked.endsWith("1234"), true);

  const manager = hrPlatform.createEmployee({
    companyId: COMPANY_ID,
    givenName: "Mikael",
    familyName: "Chef",
    identityType: "personnummer",
    identityValue: "800101-4321",
    actorId: "unit-test",
    correlationId: "hr-unit-manager"
  });

  const managerEmployment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: manager.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "HR-chef",
    payModelCode: "monthly_salary",
    startDate: "2024-01-01",
    actorId: "unit-test",
    correlationId: "hr-unit-manager-employment"
  });

  const firstEmployment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "HR-specialist",
    payModelCode: "monthly_salary",
    startDate: "2025-01-01",
    actorId: "unit-test",
    correlationId: "hr-unit-employment-1"
  });
  const secondEmployment = hrPlatform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "hourly_assignment",
    jobTitle: "Projektstöd",
    payModelCode: "hourly_salary",
    startDate: "2025-06-01",
    actorId: "unit-test",
    correlationId: "hr-unit-employment-2"
  });

  hrPlatform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: firstEmployment.employmentId,
    validFrom: "2025-01-01",
    validTo: "2025-12-31",
    salaryModelCode: "monthly_salary",
    monthlySalary: 39000,
    actorId: "unit-test",
    correlationId: "hr-unit-contract-1"
  });
  hrPlatform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: firstEmployment.employmentId,
    validFrom: "2026-01-01",
    salaryModelCode: "monthly_salary",
    monthlySalary: 42000,
    termsDocumentId: document.documentId,
    actorId: "unit-test",
    correlationId: "hr-unit-contract-2"
  });

  hrPlatform.assignEmploymentManager({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: firstEmployment.employmentId,
    managerEmploymentId: managerEmployment.employmentId,
    validFrom: "2025-01-01",
    actorId: "unit-test",
    correlationId: "hr-unit-manager-assign"
  });

  const bankAccount = hrPlatform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "iban",
    accountHolderName: "Klara Lind",
    countryCode: "DE",
    iban: "DE02120300000000202051",
    bic: "BYLADEM1001",
    actorId: "unit-test",
    correlationId: "hr-unit-bank"
  });
  assert.equal(bankAccount.maskedAccountDisplay.endsWith("2051"), true);

  hrPlatform.attachEmployeeDocument({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    documentId: document.documentId,
    actorId: "unit-test",
    correlationId: "hr-unit-link"
  });

  const employments = hrPlatform.listEmployments({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId
  });
  const contracts = hrPlatform.listEmploymentContracts({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: firstEmployment.employmentId
  });
  const audits = hrPlatform.listEmployeeAuditEvents({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId
  });
  const linkedDocuments = hrPlatform.listEmployeeDocuments({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId
  });

  assert.equal(employments.length, 2);
  assert.equal(employments.some((candidate) => candidate.employmentId === secondEmployment.employmentId), true);
  assert.equal(contracts.length, 2);
  assert.equal(contracts[0].contractVersion, 1);
  assert.equal(contracts[1].contractVersion, 2);
  assert.equal(linkedDocuments.length, 1);
  assert.equal(audits.some((candidate) => candidate.action === "hr.employee.sensitive_fields_logged"), true);
  assert.equal(audits.some((candidate) => candidate.action === "hr.employee_bank_account.recorded"), true);
});
