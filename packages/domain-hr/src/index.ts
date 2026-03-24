export type HrIdentityType = "personnummer" | "samordningsnummer" | "other";
export type HrBankPayoutMethod = "domestic_account" | "bankgiro" | "plusgiro" | "iban";

export interface EmploymentRef {
  readonly employmentId: string;
  readonly employeeId: string;
  readonly companyId: string;
}

export interface HrEmployee {
  readonly employeeId: string;
  readonly companyId: string;
  readonly employeeNo: string;
  readonly givenName: string;
  readonly familyName: string;
  readonly preferredName: string | null;
  readonly displayName: string;
  readonly dateOfBirth: string | null;
  readonly identityType: HrIdentityType;
  readonly identityValueMasked: string | null;
  readonly protectedIdentity: boolean;
  readonly workEmail: string | null;
  readonly privateEmail: string | null;
  readonly phone: string | null;
  readonly countryCode: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface HrEmployment {
  readonly employmentId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentNo: string;
  readonly employmentTypeCode: string;
  readonly jobTitle: string;
  readonly departmentCode: string | null;
  readonly payModelCode: string;
  readonly workerCategoryCode: string | null;
  readonly externalContractorRef: string | null;
  readonly payrollMigrationAnchorRef: string | null;
  readonly scheduleTemplateCode: string | null;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface HrEmploymentSnapshot {
  readonly snapshotDate: string;
  readonly employee: HrEmployee;
  readonly employment: HrEmployment & {
    readonly contracts: readonly HrEmploymentContract[];
    readonly managerAssignments: readonly HrManagerAssignment[];
    readonly activeContract: HrEmploymentContract | null;
    readonly activeManagerAssignment: HrManagerAssignment | null;
  };
  readonly activeContract: HrEmploymentContract | null;
  readonly activeManagerAssignment: HrManagerAssignment | null;
  readonly primaryBankAccount: HrEmployeeBankAccount | null;
}

export interface HrEmploymentContract {
  readonly employmentContractId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly contractVersion: number;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly salaryModelCode: string;
  readonly monthlySalary: number | null;
  readonly hourlyRate: number | null;
  readonly currencyCode: string;
  readonly collectiveAgreementCode: string | null;
  readonly salaryRevisionReason: string | null;
  readonly termsDocumentId: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface HrManagerAssignment {
  readonly employmentManagerAssignmentId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly employmentId: string;
  readonly managerEmploymentId: string;
  readonly managerEmployeeId: string;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
}

export interface HrEmployeeBankAccount {
  readonly employeeBankAccountId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly payoutMethod: HrBankPayoutMethod;
  readonly accountHolderName: string;
  readonly countryCode: string;
  readonly clearingNumber: string | null;
  readonly accountNumber: string | null;
  readonly bankgiro: string | null;
  readonly plusgiro: string | null;
  readonly iban: string | null;
  readonly bic: string | null;
  readonly bankName: string | null;
  readonly maskedAccountDisplay: string;
  readonly primaryAccount: boolean;
  readonly active: boolean;
  readonly createdAt: string;
}

export interface HrEmployeeDocumentLink {
  readonly employeeDocumentLinkId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly documentId: string;
  readonly documentType: string;
  readonly relationType: string;
  readonly linkedAt: string;
  readonly linkedByActorId: string;
}

export interface HrAuditEvent {
  readonly auditId: string;
  readonly companyId: string;
  readonly actorId: string;
  readonly action: string;
  readonly result: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly explanation: string;
  readonly correlationId: string;
  readonly recordedAt: string;
}
