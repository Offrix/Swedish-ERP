import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";

export const HR_IDENTITY_TYPES = Object.freeze(["personnummer", "samordningsnummer", "other"]);
export const HR_BANK_PAYOUT_METHODS = Object.freeze(["domestic_account", "bankgiro", "plusgiro", "iban"]);

export function createHrPlatform(options = {}) {
  return createHrEngine(options);
}

export function createHrEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  documentPlatform = null
} = {}) {
  const state = {
    employees: new Map(),
    employeeIdsByCompany: new Map(),
    employeeIdsByCompanyNo: new Map(),
    employeeIdsByIdentity: new Map(),
    employeeSecrets: new Map(),
    employments: new Map(),
    employmentIdsByCompany: new Map(),
    employmentIdsByEmployee: new Map(),
    employmentIdsByCompanyNo: new Map(),
    employmentContracts: new Map(),
    contractIdsByEmployment: new Map(),
    managerAssignments: new Map(),
    managerAssignmentIdsByEmployment: new Map(),
    bankAccounts: new Map(),
    bankAccountIdsByEmployee: new Map(),
    bankAccountIdsByKey: new Map(),
    bankAccountSecrets: new Map(),
    employeeDocuments: new Map(),
    employeeDocumentIdsByEmployee: new Map(),
    employeeDocumentIdsByKey: new Map(),
    auditEvents: [],
    countersByCompany: new Map()
  };

  if (seedDemo) {
    seedDemoState();
  }

  return {
    identityTypes: HR_IDENTITY_TYPES,
    bankPayoutMethods: HR_BANK_PAYOUT_METHODS,
    listEmployees,
    getEmployee,
    getEmployeeComplianceSnapshot,
    getEmploymentSnapshot,
    findEmployeeByEmail,
    createEmployee,
    listEmployments,
    getEmployment,
    createEmployment,
    listEmploymentContracts,
    addEmploymentContract,
    listManagerAssignments,
    assignEmploymentManager,
    listEmployeeBankAccounts,
    getEmployeeBankAccountDetails,
    addEmployeeBankAccount,
    listEmployeeDocuments,
    attachEmployeeDocument,
    listEmployeeAuditEvents
  };

  function listEmployees({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return (state.employeeIdsByCompany.get(resolvedCompanyId) || [])
      .map((employeeId) => state.employees.get(employeeId))
      .filter(Boolean)
      .sort((left, right) => left.employeeNo.localeCompare(right.employeeNo))
      .map(copy);
  }

  function getEmployee({ companyId, employeeId } = {}) {
    const employee = requireEmployeeRecord(state, companyId, employeeId);
    return enrichEmployee(employee);
  }

  function getEmployeeComplianceSnapshot({ companyId, employeeId } = {}) {
    const employee = requireEmployeeRecord(state, companyId, employeeId);
    const secret = state.employeeSecrets.get(employee.employeeId) || null;
    return {
      ...copy(employee),
      identityValue: secret?.identityValue || null
    };
  }

  function getEmploymentSnapshot({ companyId, employeeId, employmentId, snapshotDate = null } = {}) {
    const employment = requireEmploymentRecord(state, companyId, employeeId, employmentId);
    const resolvedSnapshotDate = snapshotDate
      ? normalizeRequiredDate(snapshotDate, "employment_snapshot_date_invalid")
      : nowIso(clock).slice(0, 10);
    const activeContract = resolveActiveEmploymentContract({
      companyId: employment.companyId,
      employeeId: employment.employeeId,
      employmentId: employment.employmentId,
      snapshotDate: resolvedSnapshotDate
    });
    const activeManagerAssignment = resolveActiveEmploymentManagerAssignment({
      companyId: employment.companyId,
      employeeId: employment.employeeId,
      employmentId: employment.employmentId,
      snapshotDate: resolvedSnapshotDate
    });
    const primaryBankAccount = getEmployeeBankAccountDetails({
      companyId: employment.companyId,
      employeeId: employment.employeeId
    });

    return {
      snapshotDate: resolvedSnapshotDate,
      employee: getEmployee({
        companyId: employment.companyId,
        employeeId: employment.employeeId
      }),
      employment: enrichEmployment(employment),
      activeContract,
      activeManagerAssignment,
      primaryBankAccount
    };
  }

  function findEmployeeByEmail({ companyId, email } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const normalizedEmail = normalizeOptionalEmail(email, "employee_email_invalid");
    if (!normalizedEmail) {
      return null;
    }
    const employee = listEmployees({ companyId: resolvedCompanyId }).find(
      (candidate) => candidate.workEmail === normalizedEmail || candidate.privateEmail === normalizedEmail
    );
    return employee || null;
  }

  function createEmployee({
    companyId,
    employeeNo = null,
    givenName,
    familyName,
    preferredName = null,
    dateOfBirth = null,
    identityType = "other",
    identityValue = null,
    protectedIdentity = false,
    workEmail = null,
    privateEmail = null,
    phone = null,
    countryCode = "SE",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedIdentityType = assertAllowed(identityType || "other", HR_IDENTITY_TYPES, "employee_identity_type_invalid");
    const normalizedIdentityValue = normalizeOptionalText(identityValue);
    if (resolvedIdentityType !== "other" && !normalizedIdentityValue) {
      throw createError(400, "employee_identity_value_required", "Identity value is required for the chosen identity type.");
    }

    const identityKey = normalizedIdentityValue ? `${resolvedCompanyId}:${resolvedIdentityType}:${normalizedIdentityValue}` : null;
    if (identityKey && state.employeeIdsByIdentity.has(identityKey)) {
      throw createError(409, "employee_identity_already_exists", "Employee identity already exists for this company.");
    }

    const resolvedEmployeeNo = resolveSequenceOrValue({
      state,
      companyId: resolvedCompanyId,
      sequenceKey: "employee",
      prefix: "EMP",
      value: employeeNo,
      requiredCode: "employee_no_required"
    });
    ensureUniqueCode(state.employeeIdsByCompanyNo, resolvedCompanyId, resolvedEmployeeNo, "employee_no_already_exists");

    const record = {
      employeeId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      employeeNo: resolvedEmployeeNo,
      givenName: requireText(givenName, "employee_given_name_required"),
      familyName: requireText(familyName, "employee_family_name_required"),
      preferredName: normalizeOptionalText(preferredName),
      displayName: buildDisplayName({ givenName, familyName, preferredName }),
      dateOfBirth: normalizeOptionalDate(dateOfBirth, "employee_birth_date_invalid"),
      identityType: resolvedIdentityType,
      identityValueMasked: maskSensitiveValue(normalizedIdentityValue),
      protectedIdentity: protectedIdentity === true,
      workEmail: normalizeOptionalEmail(workEmail, "employee_work_email_invalid"),
      privateEmail: normalizeOptionalEmail(privateEmail, "employee_private_email_invalid"),
      phone: normalizeOptionalText(phone),
      countryCode: normalizeUpperCode(countryCode, "employee_country_code_invalid", 2),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };

    state.employees.set(record.employeeId, record);
    appendToIndex(state.employeeIdsByCompany, resolvedCompanyId, record.employeeId);
    setIndexValue(state.employeeIdsByCompanyNo, resolvedCompanyId, resolvedEmployeeNo, record.employeeId);
    if (identityKey) {
      state.employeeIdsByIdentity.set(identityKey, record.employeeId);
      state.employeeSecrets.set(record.employeeId, {
        identityType: resolvedIdentityType,
        identityValue: normalizedIdentityValue
      });
    }

    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "hr.employee.created",
      entityType: "hr_employee",
      entityId: record.employeeId,
      explanation: `Created employee ${resolvedEmployeeNo}.`
    });

    if (normalizedIdentityValue || record.protectedIdentity || record.privateEmail) {
      pushAudit(state, clock, {
        companyId: resolvedCompanyId,
        actorId,
        correlationId,
        action: "hr.employee.sensitive_fields_logged",
        entityType: "hr_employee",
        entityId: record.employeeId,
        explanation: buildSensitiveFieldExplanation({
          protectedIdentity: record.protectedIdentity,
          hasIdentityValue: Boolean(normalizedIdentityValue),
          hasPrivateEmail: Boolean(record.privateEmail)
        })
      });
    }

    return enrichEmployee(record);
  }

  function listEmployments({ companyId, employeeId } = {}) {
    requireEmployeeRecord(state, companyId, employeeId);
    return (state.employmentIdsByEmployee.get(employeeId) || [])
      .map((employmentId) => state.employments.get(employmentId))
      .filter(Boolean)
      .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.employmentNo.localeCompare(right.employmentNo))
      .map(enrichEmployment);
  }

  function getEmployment({ companyId, employeeId, employmentId } = {}) {
    const employment = requireEmploymentRecord(state, companyId, employeeId, employmentId);
    return enrichEmployment(employment);
  }

  function createEmployment({
    companyId,
    employeeId,
    employmentNo = null,
    employmentTypeCode,
    jobTitle,
    departmentCode = null,
    payModelCode,
    workerCategoryCode = null,
    externalContractorRef = null,
    payrollMigrationAnchorRef = null,
    scheduleTemplateCode = null,
    startDate,
    endDate = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const employee = requireEmployeeRecord(state, companyId, employeeId);
    const resolvedEmploymentNo = resolveSequenceOrValue({
      state,
      companyId: employee.companyId,
      sequenceKey: "employment",
      prefix: "EMPL",
      value: employmentNo,
      requiredCode: "employment_no_required"
    });
    ensureUniqueCode(state.employmentIdsByCompanyNo, employee.companyId, resolvedEmploymentNo, "employment_no_already_exists");

    const resolvedStartDate = normalizeRequiredDate(startDate, "employment_start_date_required");
    const resolvedEndDate = normalizeOptionalDate(endDate, "employment_end_date_invalid");
    if (resolvedEndDate && resolvedEndDate < resolvedStartDate) {
      throw createError(400, "employment_dates_invalid", "Employment end date cannot be earlier than the start date.");
    }

    const record = {
      employmentId: crypto.randomUUID(),
      companyId: employee.companyId,
      employeeId: employee.employeeId,
      employmentNo: resolvedEmploymentNo,
      employmentTypeCode: requireText(employmentTypeCode, "employment_type_code_required"),
      jobTitle: requireText(jobTitle, "employment_job_title_required"),
      departmentCode: normalizeOptionalText(departmentCode),
      payModelCode: requireText(payModelCode, "employment_pay_model_required"),
      workerCategoryCode: normalizeOptionalText(workerCategoryCode),
      externalContractorRef: normalizeOptionalText(externalContractorRef),
      payrollMigrationAnchorRef: normalizeOptionalText(payrollMigrationAnchorRef),
      scheduleTemplateCode: normalizeOptionalText(scheduleTemplateCode),
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };

    state.employments.set(record.employmentId, record);
    appendToIndex(state.employmentIdsByCompany, employee.companyId, record.employmentId);
    appendToIndex(state.employmentIdsByEmployee, employee.employeeId, record.employmentId);
    setIndexValue(state.employmentIdsByCompanyNo, employee.companyId, resolvedEmploymentNo, record.employmentId);

    pushAudit(state, clock, {
      companyId: employee.companyId,
      actorId,
      correlationId,
      action: "hr.employment.created",
      entityType: "hr_employment",
      entityId: record.employmentId,
      explanation: `Created employment ${resolvedEmploymentNo} for employee ${employee.employeeNo}.`
    });

    return enrichEmployment(record);
  }

  function listEmploymentContracts({ companyId, employeeId, employmentId } = {}) {
    requireEmploymentRecord(state, companyId, employeeId, employmentId);
    return (state.contractIdsByEmployment.get(employmentId) || [])
      .map((contractId) => state.employmentContracts.get(contractId))
      .filter(Boolean)
      .sort((left, right) => left.contractVersion - right.contractVersion)
      .map(copy);
  }

  function addEmploymentContract({
    companyId,
    employeeId,
    employmentId,
    validFrom,
    validTo = null,
    salaryModelCode,
    monthlySalary = null,
    hourlyRate = null,
    currencyCode = "SEK",
    collectiveAgreementCode = null,
    salaryRevisionReason = null,
    termsDocumentId = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const employment = requireEmploymentRecord(state, companyId, employeeId, employmentId);
    const resolvedValidFrom = normalizeRequiredDate(validFrom, "employment_contract_valid_from_required");
    const resolvedValidTo = normalizeOptionalDate(validTo, "employment_contract_valid_to_invalid");
    if (resolvedValidTo && resolvedValidTo < resolvedValidFrom) {
      throw createError(400, "employment_contract_dates_invalid", "Contract end date cannot be earlier than the start date.");
    }

    const existingContracts = listEmploymentContracts({
      companyId: employment.companyId,
      employeeId: employment.employeeId,
      employmentId: employment.employmentId
    });
    const contractVersion = existingContracts.length + 1;
    const record = {
      employmentContractId: crypto.randomUUID(),
      companyId: employment.companyId,
      employeeId: employment.employeeId,
      employmentId: employment.employmentId,
      contractVersion,
      validFrom: resolvedValidFrom,
      validTo: resolvedValidTo,
      salaryModelCode: requireText(salaryModelCode, "employment_contract_salary_model_required"),
      monthlySalary: normalizeOptionalMoney(monthlySalary, "employment_contract_monthly_salary_invalid"),
      hourlyRate: normalizeOptionalMoney(hourlyRate, "employment_contract_hourly_rate_invalid"),
      currencyCode: normalizeUpperCode(currencyCode, "employment_contract_currency_invalid", 3),
      collectiveAgreementCode: normalizeOptionalText(collectiveAgreementCode),
      salaryRevisionReason: normalizeOptionalText(salaryRevisionReason),
      termsDocumentId: normalizeOptionalText(termsDocumentId),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };

    if (record.monthlySalary == null && record.hourlyRate == null) {
      throw createError(400, "employment_contract_compensation_required", "Either monthly salary or hourly rate is required.");
    }

    state.employmentContracts.set(record.employmentContractId, record);
    appendToIndex(state.contractIdsByEmployment, employment.employmentId, record.employmentContractId);

    pushAudit(state, clock, {
      companyId: employment.companyId,
      actorId,
      correlationId,
      action: "hr.employment_contract.created",
      entityType: "hr_employment",
      entityId: employment.employmentId,
      explanation: `Created contract version ${contractVersion} for employment ${employment.employmentNo}.`
    });

    return copy(record);
  }

  function listManagerAssignments({ companyId, employeeId, employmentId } = {}) {
    requireEmploymentRecord(state, companyId, employeeId, employmentId);
    return (state.managerAssignmentIdsByEmployment.get(employmentId) || [])
      .map((assignmentId) => state.managerAssignments.get(assignmentId))
      .filter(Boolean)
      .sort((left, right) => left.validFrom.localeCompare(right.validFrom))
      .map(copy);
  }

  function assignEmploymentManager({
    companyId,
    employeeId,
    employmentId,
    managerEmploymentId,
    validFrom,
    validTo = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const employment = requireEmploymentRecord(state, companyId, employeeId, employmentId);
    const managerEmployment = requireEmploymentRecordById(state, employment.companyId, managerEmploymentId);
    if (managerEmployment.employmentId === employment.employmentId) {
      throw createError(400, "employment_manager_self_reference", "Employment cannot be its own manager.");
    }
    if (wouldCreateManagerCycle(state, employment.employmentId, managerEmployment.employmentId)) {
      throw createError(400, "employment_manager_cycle", "Manager assignment would create a cycle in the manager tree.");
    }

    const resolvedValidFrom = normalizeRequiredDate(validFrom, "employment_manager_valid_from_required");
    const resolvedValidTo = normalizeOptionalDate(validTo, "employment_manager_valid_to_invalid");
    if (resolvedValidTo && resolvedValidTo < resolvedValidFrom) {
      throw createError(400, "employment_manager_dates_invalid", "Manager assignment end date cannot be earlier than the start date.");
    }

    const assignment = {
      employmentManagerAssignmentId: crypto.randomUUID(),
      companyId: employment.companyId,
      employeeId: employment.employeeId,
      employmentId: employment.employmentId,
      managerEmploymentId: managerEmployment.employmentId,
      managerEmployeeId: managerEmployment.employeeId,
      validFrom: resolvedValidFrom,
      validTo: resolvedValidTo,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };

    state.managerAssignments.set(assignment.employmentManagerAssignmentId, assignment);
    appendToIndex(state.managerAssignmentIdsByEmployment, employment.employmentId, assignment.employmentManagerAssignmentId);

    pushAudit(state, clock, {
      companyId: employment.companyId,
      actorId,
      correlationId,
      action: "hr.manager_assignment.created",
      entityType: "hr_employment",
      entityId: employment.employmentId,
      explanation: `Assigned manager employment ${managerEmployment.employmentNo} to ${employment.employmentNo}.`
    });

    return copy(assignment);
  }

  function listEmployeeBankAccounts({ companyId, employeeId } = {}) {
    requireEmployeeRecord(state, companyId, employeeId);
    return (state.bankAccountIdsByEmployee.get(employeeId) || [])
      .map((bankAccountId) => state.bankAccounts.get(bankAccountId))
      .filter(Boolean)
      .sort((left, right) => Number(right.primaryAccount) - Number(left.primaryAccount) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function getEmployeeBankAccountDetails({ companyId, employeeId, employeeBankAccountId = null } = {}) {
    requireEmployeeRecord(state, companyId, employeeId);
    const selected =
      (employeeBankAccountId
        ? listEmployeeBankAccounts({ companyId, employeeId }).find(
            (candidate) => candidate.employeeBankAccountId === requireText(employeeBankAccountId, "employee_bank_account_id_required")
          ) || null
        : listEmployeeBankAccounts({ companyId, employeeId }).find((candidate) => candidate.primaryAccount && candidate.active !== false) ||
          listEmployeeBankAccounts({ companyId, employeeId }).find((candidate) => candidate.active !== false) ||
          null);
    if (!selected) {
      return null;
    }
    const secret = state.bankAccountSecrets.get(selected.employeeBankAccountId) || {};
    return {
      ...copy(selected),
      clearingNumber: normalizeOptionalText(secret.clearingNumber) || selected.clearingNumber || null,
      accountNumber: normalizeOptionalText(secret.accountNumber) || null,
      bankgiro: normalizeOptionalText(secret.bankgiro) || null,
      plusgiro: normalizeOptionalText(secret.plusgiro) || null,
      iban: normalizeOptionalText(secret.iban) || null,
      bic: normalizeOptionalText(secret.bic) || selected.bic || null,
      bankName: normalizeOptionalText(secret.bankName) || selected.bankName || null
    };
  }

  function addEmployeeBankAccount({
    companyId,
    employeeId,
    payoutMethod,
    accountHolderName,
    countryCode = "SE",
    clearingNumber = null,
    accountNumber = null,
    bankgiro = null,
    plusgiro = null,
    iban = null,
    bic = null,
    bankName = null,
    primaryAccount = true,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const employee = requireEmployeeRecord(state, companyId, employeeId);
    const resolvedPayoutMethod = assertAllowed(payoutMethod, HR_BANK_PAYOUT_METHODS, "employee_bank_payout_method_invalid");
    const normalizedBankDetails = {
      clearingNumber: normalizeOptionalText(clearingNumber),
      accountNumber: normalizeOptionalText(accountNumber),
      bankgiro: normalizeOptionalText(bankgiro),
      plusgiro: normalizeOptionalText(plusgiro),
      iban: normalizeOptionalText(iban),
      bic: normalizeOptionalText(bic),
      bankName: normalizeOptionalText(bankName)
    };

    validatePayoutMethod(resolvedPayoutMethod, normalizedBankDetails);
    const bankAccountKey = `${employee.companyId}:${employee.employeeId}:${resolvedPayoutMethod}:${buildBankAccountCanonicalValue(resolvedPayoutMethod, normalizedBankDetails)}`;
    if (state.bankAccountIdsByKey.has(bankAccountKey)) {
      const existingId = state.bankAccountIdsByKey.get(bankAccountKey);
      return copy(state.bankAccounts.get(existingId));
    }

    if (primaryAccount === true) {
      for (const existingAccount of listEmployeeBankAccounts({ companyId: employee.companyId, employeeId: employee.employeeId })) {
        const mutable = state.bankAccounts.get(existingAccount.employeeBankAccountId);
        mutable.primaryAccount = false;
      }
    }

    const record = {
      employeeBankAccountId: crypto.randomUUID(),
      companyId: employee.companyId,
      employeeId: employee.employeeId,
      payoutMethod: resolvedPayoutMethod,
      accountHolderName: requireText(accountHolderName, "employee_bank_account_holder_required"),
      countryCode: normalizeUpperCode(countryCode, "employee_bank_country_invalid", 2),
      clearingNumber: normalizedBankDetails.clearingNumber,
      accountNumber: normalizedBankDetails.accountNumber ? maskSensitiveValue(normalizedBankDetails.accountNumber) : null,
      bankgiro: normalizedBankDetails.bankgiro ? maskSensitiveValue(normalizedBankDetails.bankgiro) : null,
      plusgiro: normalizedBankDetails.plusgiro ? maskSensitiveValue(normalizedBankDetails.plusgiro) : null,
      iban: normalizedBankDetails.iban ? maskSensitiveValue(normalizedBankDetails.iban) : null,
      bic: normalizedBankDetails.bic,
      bankName: normalizedBankDetails.bankName,
      maskedAccountDisplay: maskSensitiveValue(buildBankAccountCanonicalValue(resolvedPayoutMethod, normalizedBankDetails)),
      primaryAccount: primaryAccount === true,
      active: true,
      createdAt: nowIso(clock)
    };

    state.bankAccounts.set(record.employeeBankAccountId, record);
    state.bankAccountSecrets.set(record.employeeBankAccountId, normalizedBankDetails);
    state.bankAccountIdsByKey.set(bankAccountKey, record.employeeBankAccountId);
    appendToIndex(state.bankAccountIdsByEmployee, employee.employeeId, record.employeeBankAccountId);

    pushAudit(state, clock, {
      companyId: employee.companyId,
      actorId,
      correlationId,
      action: "hr.employee_bank_account.recorded",
      entityType: "hr_employee",
      entityId: employee.employeeId,
      explanation: `Recorded ${resolvedPayoutMethod} payout details for employee ${employee.employeeNo}.`
    });

    return copy(record);
  }

  function listEmployeeDocuments({ companyId, employeeId } = {}) {
    requireEmployeeRecord(state, companyId, employeeId);
    return (state.employeeDocumentIdsByEmployee.get(employeeId) || [])
      .map((documentLinkId) => state.employeeDocuments.get(documentLinkId))
      .filter(Boolean)
      .sort((left, right) => left.linkedAt.localeCompare(right.linkedAt))
      .map(copy);
  }

  function attachEmployeeDocument({
    companyId,
    employeeId,
    documentId,
    documentType = "employment_document",
    relationType = "employee_masterdata",
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const employee = requireEmployeeRecord(state, companyId, employeeId);
    const resolvedDocumentId = requireText(documentId, "employee_document_id_required");
    const dedupeKey = `${employee.employeeId}:${resolvedDocumentId}`;
    if (state.employeeDocumentIdsByKey.has(dedupeKey)) {
      return copy(state.employeeDocuments.get(state.employeeDocumentIdsByKey.get(dedupeKey)));
    }

    const record = {
      employeeDocumentLinkId: crypto.randomUUID(),
      companyId: employee.companyId,
      employeeId: employee.employeeId,
      documentId: resolvedDocumentId,
      documentType: requireText(documentType, "employee_document_type_required"),
      relationType: requireText(relationType, "employee_document_relation_required"),
      linkedAt: nowIso(clock),
      linkedByActorId: requireText(actorId, "actor_id_required")
    };

    state.employeeDocuments.set(record.employeeDocumentLinkId, record);
    state.employeeDocumentIdsByKey.set(dedupeKey, record.employeeDocumentLinkId);
    appendToIndex(state.employeeDocumentIdsByEmployee, employee.employeeId, record.employeeDocumentLinkId);

    if (documentPlatform && typeof documentPlatform.linkDocumentRecord === "function") {
      documentPlatform.linkDocumentRecord({
        companyId: employee.companyId,
        documentId: resolvedDocumentId,
        targetType: "hr_employee",
        targetId: employee.employeeId,
        metadataJson: {
          relationType: record.relationType
        },
        actorId,
        correlationId
      });
    }

    pushAudit(state, clock, {
      companyId: employee.companyId,
      actorId,
      correlationId,
      action: "hr.employee_document.linked",
      entityType: "hr_employee",
      entityId: employee.employeeId,
      explanation: `Linked document ${resolvedDocumentId} to employee ${employee.employeeNo}.`
    });

    return copy(record);
  }

  function listEmployeeAuditEvents({ companyId, employeeId } = {}) {
    const employee = requireEmployeeRecord(state, companyId, employeeId);
    return state.auditEvents
      .filter((event) => event.companyId === employee.companyId && event.entityId === employee.employeeId)
      .map(copy);
  }

  function seedDemoState() {
    return null;
  }

  function enrichEmployee(employee) {
    return {
      ...copy(employee),
      employments: listEmployments({
        companyId: employee.companyId,
        employeeId: employee.employeeId
      }),
      bankAccounts: listEmployeeBankAccounts({
        companyId: employee.companyId,
        employeeId: employee.employeeId
      }),
      documents: listEmployeeDocuments({
        companyId: employee.companyId,
        employeeId: employee.employeeId
      })
    };
  }

  function enrichEmployment(employment) {
    return {
      ...copy(employment),
      contracts: listEmploymentContracts({
        companyId: employment.companyId,
        employeeId: employment.employeeId,
        employmentId: employment.employmentId
      }),
      managerAssignments: listManagerAssignments({
        companyId: employment.companyId,
        employeeId: employment.employeeId,
        employmentId: employment.employmentId
      }),
      activeContract: resolveActiveEmploymentContract({
        companyId: employment.companyId,
        employeeId: employment.employeeId,
        employmentId: employment.employmentId,
        snapshotDate: nowIso(clock).slice(0, 10)
      }),
      activeManagerAssignment: resolveActiveEmploymentManagerAssignment({
        companyId: employment.companyId,
        employeeId: employment.employeeId,
        employmentId: employment.employmentId,
        snapshotDate: nowIso(clock).slice(0, 10)
      })
    };
  }

  function resolveActiveEmploymentContract({ companyId, employeeId, employmentId, snapshotDate }) {
    return (
      listEmploymentContracts({
        companyId,
        employeeId,
        employmentId
      })
        .filter((contract) => contract.validFrom <= snapshotDate && (!contract.validTo || contract.validTo >= snapshotDate))
        .sort(
          (left, right) =>
            right.validFrom.localeCompare(left.validFrom) ||
            right.contractVersion - left.contractVersion
        )[0] || null
    );
  }

  function resolveActiveEmploymentManagerAssignment({ companyId, employeeId, employmentId, snapshotDate }) {
    return (
      listManagerAssignments({
        companyId,
        employeeId,
        employmentId
      })
        .filter((assignment) => assignment.validFrom <= snapshotDate && (!assignment.validTo || assignment.validTo >= snapshotDate))
        .sort((left, right) => right.validFrom.localeCompare(left.validFrom))[0] || null
    );
  }
}

function requireEmployeeRecord(state, companyId, employeeId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedEmployeeId = requireText(employeeId, "employee_id_required");
  const employee = state.employees.get(resolvedEmployeeId);
  if (!employee || employee.companyId !== resolvedCompanyId) {
    throw createError(404, "employee_not_found", "Employee was not found.");
  }
  return employee;
}

function requireEmploymentRecord(state, companyId, employeeId, employmentId) {
  const employee = requireEmployeeRecord(state, companyId, employeeId);
  const employment = state.employments.get(requireText(employmentId, "employment_id_required"));
  if (!employment || employment.companyId !== employee.companyId || employment.employeeId !== employee.employeeId) {
    throw createError(404, "employment_not_found", "Employment was not found.");
  }
  return employment;
}

function requireEmploymentRecordById(state, companyId, employmentId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const employment = state.employments.get(requireText(employmentId, "employment_id_required"));
  if (!employment || employment.companyId !== resolvedCompanyId) {
    throw createError(404, "employment_not_found", "Employment was not found.");
  }
  return employment;
}

function resolveSequenceOrValue({ state, companyId, sequenceKey, prefix, value, requiredCode }) {
  const normalizedValue = normalizeOptionalText(value);
  if (normalizedValue) {
    return normalizedValue;
  }
  const currentCounters = state.countersByCompany.get(companyId) || {};
  const nextValue = Number(currentCounters[sequenceKey] || 0) + 1;
  currentCounters[sequenceKey] = nextValue;
  state.countersByCompany.set(companyId, currentCounters);
  if (!prefix) {
    throw createError(400, requiredCode, "A sequence prefix is required.");
  }
  return `${prefix}${String(nextValue).padStart(4, "0")}`;
}

function buildDisplayName({ givenName, familyName, preferredName }) {
  const preferred = normalizeOptionalText(preferredName);
  const base = `${requireText(givenName, "employee_given_name_required")} ${requireText(familyName, "employee_family_name_required")}`;
  return preferred ? `${preferred} (${base})` : base;
}

function buildSensitiveFieldExplanation({ protectedIdentity, hasIdentityValue, hasPrivateEmail }) {
  const fields = [];
  if (protectedIdentity) {
    fields.push("protected_identity");
  }
  if (hasIdentityValue) {
    fields.push("national_identity");
  }
  if (hasPrivateEmail) {
    fields.push("private_contact");
  }
  return `Sensitive HR fields recorded: ${fields.join(", ")}.`;
}

function buildBankAccountCanonicalValue(payoutMethod, details) {
  switch (payoutMethod) {
    case "domestic_account":
      return `${details.clearingNumber || ""}:${details.accountNumber || ""}`;
    case "bankgiro":
      return details.bankgiro || "";
    case "plusgiro":
      return details.plusgiro || "";
    case "iban":
      return details.iban || "";
    default:
      return "";
  }
}

function validatePayoutMethod(payoutMethod, details) {
  if (payoutMethod === "domestic_account") {
    if (!details.clearingNumber || !details.accountNumber) {
      throw createError(400, "employee_bank_domestic_account_required", "Domestic payout requires both clearing number and account number.");
    }
    return;
  }

  if (payoutMethod === "bankgiro" && !details.bankgiro) {
    throw createError(400, "employee_bank_bankgiro_required", "Bankgiro payout requires a bankgiro value.");
  }
  if (payoutMethod === "plusgiro" && !details.plusgiro) {
    throw createError(400, "employee_bank_plusgiro_required", "Plusgiro payout requires a plusgiro value.");
  }
  if (payoutMethod === "iban" && (!details.iban || !details.bic)) {
    throw createError(400, "employee_bank_iban_required", "IBAN payout requires both IBAN and BIC.");
  }
}

function wouldCreateManagerCycle(state, employmentId, managerEmploymentId) {
  const seen = new Set([employmentId]);
  let currentEmploymentId = managerEmploymentId;
  while (currentEmploymentId) {
    if (seen.has(currentEmploymentId)) {
      return true;
    }
    seen.add(currentEmploymentId);
    currentEmploymentId = latestManagerEmploymentId(state, currentEmploymentId);
  }
  return false;
}

function latestManagerEmploymentId(state, employmentId) {
  const assignments = (state.managerAssignmentIdsByEmployment.get(employmentId) || [])
    .map((assignmentId) => state.managerAssignments.get(assignmentId))
    .filter(Boolean)
    .sort((left, right) => left.validFrom.localeCompare(right.validFrom));
  return assignments.length > 0 ? assignments[assignments.length - 1].managerEmploymentId : null;
}

function pushAudit(state, clock, event) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "hr_action",
      event
    })
  );
}

function ensureUniqueCode(index, companyId, code, errorCode) {
  const bucket = index.get(companyId);
  if (bucket instanceof Map && bucket.has(code)) {
    throw createError(409, errorCode, `Code ${code} already exists.`);
  }
}

function appendToIndex(index, key, value) {
  const values = index.get(key) || [];
  values.push(value);
  index.set(key, values);
}

function setIndexValue(index, companyId, code, value) {
  const bucket = index.get(companyId) || new Map();
  bucket.set(code, value);
  index.set(companyId, bucket);
}

function normalizeOptionalMoney(value, errorCode) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw createError(400, errorCode, "Money value is invalid.");
  }
  return Math.round(number * 100) / 100;
}

function normalizeRequiredDate(value, errorCode) {
  const normalized = normalizeOptionalDate(value, errorCode);
  if (!normalized) {
    throw createError(400, errorCode, "Date is required.");
  }
  return normalized;
}

function normalizeOptionalDate(value, errorCode) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const normalized = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createError(400, errorCode, "Date must use YYYY-MM-DD format.");
  }
  return normalized;
}

function normalizeUpperCode(value, errorCode, length) {
  const normalized = requireText(value, errorCode).toUpperCase();
  if (normalized.length !== length) {
    throw createError(400, errorCode, `Code must be ${length} characters.`);
  }
  return normalized;
}

function normalizeOptionalEmail(value, errorCode) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (!normalized.includes("@")) {
    throw createError(400, errorCode, "Email address is invalid.");
  }
  return normalized.toLowerCase();
}

function normalizeOptionalText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function requireText(value, errorCode) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw createError(400, errorCode, "Value is required.");
  }
  return normalized;
}

function maskSensitiveValue(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  const suffix = normalized.slice(-4);
  return `${"*".repeat(Math.max(normalized.length - 4, 4))}${suffix}`;
}

function assertAllowed(value, allowedValues, errorCode) {
  const normalized = requireText(value, errorCode);
  if (!allowedValues.includes(normalized)) {
    throw createError(400, errorCode, `Value ${normalized} is not supported.`);
  }
  return normalized;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function copy(value) {
  return value == null ? value : structuredClone(value);
}

function createError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
