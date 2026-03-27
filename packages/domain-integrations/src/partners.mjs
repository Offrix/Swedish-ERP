import crypto from "node:crypto";

export const PARTNER_CONNECTION_TYPES = Object.freeze(["bank", "peppol", "pension", "crm", "commerce", "id06"]);
export const PARTNER_CONNECTION_MODES = Object.freeze(["sandbox", "test", "production"]);
export const PARTNER_CONNECTION_STATUSES = Object.freeze(["active", "degraded", "outage", "disabled"]);
export const PARTNER_HEALTH_STATUSES = Object.freeze(["unknown", "healthy", "degraded", "outage"]);
export const PARTNER_FALLBACK_MODES = Object.freeze(["queue_retry", "manual_review", "disabled"]);
export const PARTNER_OPERATION_STATUSES = Object.freeze(["queued", "running", "succeeded", "failed", "fallback", "rate_limited", "retry_scheduled"]);
export const JOB_STATUSES = Object.freeze(["queued", "claimed", "running", "succeeded", "failed", "retry_scheduled", "dead_lettered", "replay_planned", "replayed"]);
export const JOB_RISK_CLASSES = Object.freeze(["normal", "high_risk", "restricted"]);
export const JOB_ERROR_CLASSES = Object.freeze(["transient_technical", "persistent_technical", "business_input", "downstream_unknown"]);
export const PARTNER_CONNECTION_CATALOG = Object.freeze({
  bank: Object.freeze({
    connectionType: "bank",
    supportedProviders: Object.freeze(["enable_banking", "bank_file_channel"]),
    supportedOperations: Object.freeze(["payment_export", "statement_sync", "tax_account_sync"]),
    requiredCredentials: Object.freeze(["api_credentials", "consent_grant"]),
    supportsSandbox: true,
    contractTestPackCode: "bank-adapter-core-v1",
    objectMappings: Object.freeze([
      Object.freeze({ sourceObjectType: "bank_account", targetObjectType: "BankAccountLink" }),
      Object.freeze({ sourceObjectType: "statement_line", targetObjectType: "StatementLine" }),
      Object.freeze({ sourceObjectType: "payment_order", targetObjectType: "PaymentInitiation" })
    ]),
    requiredEvents: Object.freeze(["integration.connection.authorized", "integration.operation.succeeded", "integration.operation.failed"]),
    defaultRateLimitPerMinute: 60,
    operationCodes: Object.freeze(["payment_export", "statement_sync", "tax_account_sync"]),
    replaySafe: true,
    emitsWebhookEventTypes: Object.freeze(["partner.connection.updated", "partner.operation.completed", "partner.operation.failed"])
  }),
  peppol: Object.freeze({
    connectionType: "peppol",
    supportedProviders: Object.freeze(["pagero_online"]),
    supportedOperations: Object.freeze(["invoice_send", "credit_note_send", "status_sync", "inbound_document_sync"]),
    requiredCredentials: Object.freeze(["api_credentials", "certificate_ref"]),
    supportsSandbox: true,
    contractTestPackCode: "peppol-adapter-core-v1",
    objectMappings: Object.freeze([
      Object.freeze({ sourceObjectType: "customer_invoice", targetObjectType: "EInvoiceEnvelope" }),
      Object.freeze({ sourceObjectType: "supplier_document", targetObjectType: "InboundPeppolDocument" })
    ]),
    requiredEvents: Object.freeze(["integration.connection.authorized", "integration.operation.succeeded", "integration.operation.failed"]),
    defaultRateLimitPerMinute: 30,
    operationCodes: Object.freeze(["invoice_send", "credit_note_send", "status_sync", "inbound_document_sync"]),
    replaySafe: true,
    emitsWebhookEventTypes: Object.freeze(["partner.connection.updated", "partner.contract_test.completed", "partner.operation.completed", "partner.operation.failed"])
  }),
  pension: Object.freeze({
    connectionType: "pension",
    supportedProviders: Object.freeze(["tenant_managed_pension_export"]),
    supportedOperations: Object.freeze(["enrollment_export", "premium_basis_export", "contribution_status_sync"]),
    requiredCredentials: Object.freeze(["file_channel_credentials"]),
    supportsSandbox: true,
    contractTestPackCode: "pension-adapter-core-v1",
    objectMappings: Object.freeze([
      Object.freeze({ sourceObjectType: "employment", targetObjectType: "PensionEnrollment" }),
      Object.freeze({ sourceObjectType: "pay_run", targetObjectType: "ContributionBasisExport" })
    ]),
    requiredEvents: Object.freeze(["integration.operation.succeeded", "integration.operation.failed"]),
    defaultRateLimitPerMinute: 20,
    operationCodes: Object.freeze(["enrollment_export", "premium_basis_export", "contribution_status_sync"]),
    replaySafe: true,
    emitsWebhookEventTypes: Object.freeze(["partner.connection.updated", "partner.operation.completed", "partner.operation.failed"])
  }),
  crm: Object.freeze({
    connectionType: "crm",
    supportedProviders: Object.freeze(["generic_crm_rest"]),
    supportedOperations: Object.freeze(["customer_sync", "invoice_sync", "project_sync"]),
    requiredCredentials: Object.freeze(["api_credentials"]),
    supportsSandbox: true,
    contractTestPackCode: "crm-adapter-core-v1",
    objectMappings: Object.freeze([
      Object.freeze({ sourceObjectType: "customer", targetObjectType: "ExternalCustomer" }),
      Object.freeze({ sourceObjectType: "project", targetObjectType: "ExternalProject" }),
      Object.freeze({ sourceObjectType: "invoice", targetObjectType: "ExternalInvoice" })
    ]),
    requiredEvents: Object.freeze(["integration.operation.succeeded", "integration.operation.failed"]),
    defaultRateLimitPerMinute: 60,
    operationCodes: Object.freeze(["customer_sync", "invoice_sync", "project_sync"]),
    replaySafe: true,
    emitsWebhookEventTypes: Object.freeze(["partner.connection.updated", "partner.operation.completed", "partner.operation.failed"])
  }),
  commerce: Object.freeze({
    connectionType: "commerce",
    supportedProviders: Object.freeze(["generic_commerce_rest"]),
    supportedOperations: Object.freeze(["order_sync", "payout_sync", "stock_sync"]),
    requiredCredentials: Object.freeze(["api_credentials"]),
    supportsSandbox: true,
    contractTestPackCode: "commerce-adapter-core-v1",
    objectMappings: Object.freeze([
      Object.freeze({ sourceObjectType: "sales_order", targetObjectType: "ExternalOrder" }),
      Object.freeze({ sourceObjectType: "payout", targetObjectType: "ExternalPayout" }),
      Object.freeze({ sourceObjectType: "inventory_delta", targetObjectType: "ExternalStockChange" })
    ]),
    requiredEvents: Object.freeze(["integration.operation.succeeded", "integration.operation.failed"]),
    defaultRateLimitPerMinute: 60,
    operationCodes: Object.freeze(["order_sync", "payout_sync", "stock_sync"]),
    replaySafe: true,
    emitsWebhookEventTypes: Object.freeze(["partner.connection.updated", "partner.operation.completed", "partner.operation.failed"])
  }),
  id06: Object.freeze({
    connectionType: "id06",
    supportedProviders: Object.freeze(["official_id06_integration"]),
    supportedOperations: Object.freeze(["attendance_sync", "site_registry_sync", "device_status_sync"]),
    requiredCredentials: Object.freeze(["api_credentials", "certificate_ref"]),
    supportsSandbox: false,
    contractTestPackCode: "id06-adapter-core-v1",
    objectMappings: Object.freeze([
      Object.freeze({ sourceObjectType: "workplace", targetObjectType: "Id06WorkplaceBinding" }),
      Object.freeze({ sourceObjectType: "attendance_event", targetObjectType: "Id06AttendanceMirror" }),
      Object.freeze({ sourceObjectType: "device_status", targetObjectType: "Id06DeviceStatus" })
    ]),
    requiredEvents: Object.freeze(["integration.connection.authorized", "integration.operation.succeeded", "integration.operation.failed"]),
    defaultRateLimitPerMinute: 20,
    operationCodes: Object.freeze(["attendance_sync", "site_registry_sync", "device_status_sync"]),
    replaySafe: true,
    emitsWebhookEventTypes: Object.freeze(["partner.connection.updated", "partner.operation.completed", "partner.operation.failed"])
  })
});

const PARTNER_PROVIDER_BASELINE_SELECTIONS = Object.freeze({
  bank: Object.freeze({
    enable_banking: "SE-OPEN-BANKING-CORE",
    bank_file_channel: "SE-BANK-FILE-FORMAT"
  }),
  peppol: Object.freeze({
    pagero_online: "SE-PEPPOL-BIS-BILLING-3"
  }),
  id06: Object.freeze({
    official_id06_integration: "SE-ID06-API"
  })
});

export function createPartnerModule({
  state,
  clock = () => new Date(),
  contractTestExecutors = null,
  operationExecutors = null,
  providerBaselineRegistry = null
}) {
  state.partnerHealthChecks ||= new Map();
  return {
    partnerConnectionTypes: PARTNER_CONNECTION_TYPES,
    partnerConnectionModes: PARTNER_CONNECTION_MODES,
    partnerConnectionStatuses: PARTNER_CONNECTION_STATUSES,
    partnerHealthStatuses: PARTNER_HEALTH_STATUSES,
    partnerFallbackModes: PARTNER_FALLBACK_MODES,
    partnerOperationStatuses: PARTNER_OPERATION_STATUSES,
    jobStatuses: JOB_STATUSES,
    jobRiskClasses: JOB_RISK_CLASSES,
    jobErrorClasses: JOB_ERROR_CLASSES,
    listPartnerConnectionCatalog,
    getPartnerConnectionCapabilities,
    createPartnerConnection,
    listPartnerConnections,
    setPartnerConnectionHealth,
    runPartnerHealthCheck,
    runAdapterContractTest,
    listAdapterContractResults,
    dispatchPartnerOperation,
    executePartnerOperation,
    listPartnerOperations,
    getPartnerOperation,
    replayPartnerOperation,
    enqueueAsyncJob,
    listAsyncJobs,
    getAsyncJob,
    claimAsyncJob,
    completeAsyncJob,
    failAsyncJobAttempt,
    planJobReplay,
    executeJobReplay,
    massRetryJobs
  };

  function listPartnerConnectionCatalog() {
    return PARTNER_CONNECTION_TYPES.map((connectionType) => partnerCatalogEntry(connectionType));
  }

    function getPartnerConnectionCapabilities({ companyId, connectionId } = {}) {
      const connection = requireConnection(companyId, connectionId);
      const catalog = partnerCatalogEntry(connection.connectionType);
      return {
        connectionId: connection.connectionId,
        providerCode: connection.providerCode,
        providerBaselineId: connection.providerBaselineId || null,
        providerBaselineCode: connection.providerBaselineCode || null,
        providerBaselineVersion: connection.providerBaselineVersion || null,
        providerBaselineChecksum: connection.providerBaselineChecksum || null,
        providerBaselineRef: clone(connection.providerBaselineRef || null),
        operationCodes: catalog.supportedOperations,
      objectMappings: catalog.objectMappings,
      replaySafe: catalog.replaySafe,
      rateLimits: {
        perMinute: connection.rateLimitPerMinute,
        defaultPerMinute: catalog.defaultRateLimitPerMinute
      },
      requiredEvents: catalog.requiredEvents,
      supportedProviders: catalog.supportedProviders,
      requiredCredentials: catalog.requiredCredentials,
      supportsSandbox: catalog.supportsSandbox,
      contractTestPackCode: catalog.contractTestPackCode,
      connectionId: connection.connectionId,
      partnerCode: connection.providerCode,
      displayName: connection.displayName,
      mode: connection.mode,
      status: connection.status,
      healthStatus: connection.healthStatus || "unknown",
      fallbackMode: connection.fallbackMode,
      rateLimitPerMinute: connection.rateLimitPerMinute,
      credentialsConfigured: connection.credentialsRef != null,
      credentialsPresent: connection.credentialsRef != null
    };
  }

  function createPartnerConnection({
    companyId,
    connectionType,
    providerCode = null,
    partnerCode = null,
    displayName,
    mode = "production",
    rateLimitPerMinute = null,
    fallbackMode = "queue_retry",
    credentialsRef = null,
    config = {},
    actorId = "system"
  } = {}) {
    const resolvedConnectionType = assertAllowed(connectionType, PARTNER_CONNECTION_TYPES, "partner_connection_type_invalid");
    const catalog = partnerCatalogEntry(resolvedConnectionType);
    const resolvedMode = assertAllowed(mode, PARTNER_CONNECTION_MODES, "partner_mode_invalid");
    if (!catalog.supportsSandbox && resolvedMode === "sandbox") {
      throw createError(409, "partner_sandbox_not_supported", `${resolvedConnectionType} does not support sandbox mode.`);
    }
    const resolvedProviderCode = text(providerCode || partnerCode, "partner_provider_code_required");
      if (!catalog.supportedProviders.includes(resolvedProviderCode)) {
        throw createError(400, "partner_provider_code_invalid", `${resolvedProviderCode} is not a supported provider for ${resolvedConnectionType}.`);
      }
      const resolvedConfig = normalizePartnerConfig(config);
      const providerBaselineRef = resolvePartnerProviderBaseline({
        providerBaselineRegistry,
        connectionType: resolvedConnectionType,
        providerCode: resolvedProviderCode,
        effectiveDate: nowIso(clock).slice(0, 10),
        mode: resolvedMode
      });
      const connection = {
        connectionId: crypto.randomUUID(),
        companyId: text(companyId, "company_id_required"),
        connectionType: resolvedConnectionType,
        providerCode: resolvedProviderCode,
        partnerCode: resolvedProviderCode,
        providerBaselineId: providerBaselineRef?.providerBaselineId || null,
        providerBaselineCode: providerBaselineRef?.baselineCode || null,
        providerBaselineVersion: providerBaselineRef?.providerBaselineVersion || null,
        providerBaselineChecksum: providerBaselineRef?.providerBaselineChecksum || null,
        providerBaselineRef: providerBaselineRef ? clone(providerBaselineRef) : null,
        displayName: text(displayName, "partner_display_name_required"),
      mode: resolvedMode,
      rateLimitPerMinute: normalizePositiveInteger(rateLimitPerMinute || catalog.defaultRateLimitPerMinute, "partner_rate_limit_invalid"),
      fallbackMode: assertAllowed(fallbackMode, PARTNER_FALLBACK_MODES, "partner_fallback_mode_invalid"),
      credentialsRef: text(credentialsRef, "partner_credentials_ref_required"),
      configJson: resolvedConfig,
      capabilityVersion: resolvedConfig.capabilityVersion || `${resolvedProviderCode}:v1`,
      certificateVersion: resolvedConfig.certificateVersion || null,
      credentialsExpiresAt: resolvedConfig.credentialsExpiresAt || null,
      consentExpiresAt: resolvedConfig.consentExpiresAt || null,
      status: "active",
      healthStatus: "unknown",
      lastHealthCheckId: null,
      lastHealthCheckAt: null,
      lastContractResultId: null,
      lastContractResultAt: null,
      lastSuccessfulOperationId: null,
      lastSuccessfulOperationAt: null,
      lastFailureOperationId: null,
      lastFailureOperationAt: null,
      latestReceiptAt: null,
      createdByActorId: text(actorId || "system", "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.partnerConnections.set(connection.connectionId, connection);
    return presentPartnerConnection(connection);
  }

  function listPartnerConnections({ companyId, connectionType = null, providerCode = null, mode = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedType = optionalText(connectionType);
    const resolvedProviderCode = optionalText(providerCode);
    const resolvedMode = optionalText(mode);
    return [...state.partnerConnections.values()]
      .filter((connection) => connection.companyId === resolvedCompanyId)
      .filter((connection) => (resolvedType ? connection.connectionType === resolvedType : true))
      .filter((connection) => (resolvedProviderCode ? connection.providerCode === resolvedProviderCode : true))
      .filter((connection) => (resolvedMode ? connection.mode === resolvedMode : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(presentPartnerConnection);
  }

  function setPartnerConnectionHealth({ companyId, connectionId, status } = {}) {
    const connection = requireConnection(companyId, connectionId);
    connection.status = assertAllowed(status, PARTNER_CONNECTION_STATUSES, "partner_connection_status_invalid");
    connection.healthStatus = healthStatusFromConnectionStatus(connection.status);
    connection.updatedAt = nowIso(clock);
    return presentPartnerConnection(connection);
  }

  function runPartnerHealthCheck({ companyId, connectionId, checkSetCode = "standard", actorId = "system" } = {}) {
    const connection = requireConnection(companyId, connectionId);
    const executedAt = nowIso(clock);
    const results = buildDefaultHealthCheckResults({
      state,
      connection,
      checkSetCode: text(checkSetCode, "partner_health_check_set_code_required"),
      clock
    });
    const healthCheck = {
      healthCheckId: crypto.randomUUID(),
      companyId: connection.companyId,
      connectionId: connection.connectionId,
      providerCode: connection.providerCode,
      checkSetCode,
      actorId: text(actorId || "system", "actor_id_required"),
      status: summarizeHealthCheckStatus(results),
      results,
      executedAt
    };
    state.partnerHealthChecks.set(healthCheck.healthCheckId, healthCheck);
    connection.healthStatus = healthCheck.status;
    connection.lastHealthCheckId = healthCheck.healthCheckId;
    connection.lastHealthCheckAt = executedAt;
    connection.updatedAt = executedAt;
    return clone(healthCheck);
  }

  async function runAdapterContractTest({ companyId, connectionId, testPackCode = null, mode = null, actorId = "system" } = {}) {
    const connection = requireConnection(companyId, connectionId);
    const assertions = contractAssertionsFor(connection.connectionType);
    const resolvedTestPackCode = text(testPackCode || partnerCatalogEntry(connection.connectionType).contractTestPackCode, "partner_contract_test_pack_code_required");
    const resolvedMode = optionalText(mode) || connection.mode;
    const executor = resolveConfiguredExecutor(contractTestExecutors, connection);
    const rawResult =
      typeof executor === "function"
        ? await executor({
            connection: clone(connection),
            assertions: clone(assertions),
            testPackCode: resolvedTestPackCode,
            mode: resolvedMode,
            actorId: text(actorId || "system", "actor_id_required")
          })
        : {
            result: "failed",
            failures: [
              {
                code: "partner_contract_runtime_missing",
                message: `No contract-test executor is registered for ${connection.connectionType}.`
              }
            ]
          };
    const normalized = normalizeContractTestResult(rawResult, assertions);
    const contractResult = {
      contractResultId: crypto.randomUUID(),
      companyId: connection.companyId,
      connectionId: connection.connectionId,
      connectionType: connection.connectionType,
      providerCode: connection.providerCode,
      partnerCode: connection.providerCode,
      mode: resolvedMode,
      testPackCode: resolvedTestPackCode,
      actorId: text(actorId || "system", "actor_id_required"),
      status: normalized.result,
      result: normalized.result,
      assertions: normalized.assertions,
      failures: normalized.failures,
      diagnostics: normalized.diagnostics,
      executedAt: nowIso(clock)
    };
    state.partnerContractResults.set(contractResult.contractResultId, contractResult);
    connection.lastContractResultId = contractResult.contractResultId;
    connection.lastContractResultAt = contractResult.executedAt;
    connection.updatedAt = contractResult.executedAt;
    return clone(contractResult);
  }

  function listAdapterContractResults({ companyId, connectionId = null, status = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedConnectionId = optionalText(connectionId);
    const resolvedStatus = optionalText(status);
    return [...state.partnerContractResults.values()]
      .filter((result) => result.companyId === resolvedCompanyId)
      .filter((result) => (resolvedConnectionId ? result.connectionId === resolvedConnectionId : true))
      .filter((result) => (resolvedStatus ? result.status === resolvedStatus : true))
      .sort((left, right) => left.executedAt.localeCompare(right.executedAt))
      .map(clone);
  }

  async function dispatchPartnerOperation({
    companyId,
    connectionId,
    operationCode,
    operationKey = null,
    payload = {},
    dryRun = false,
    actorId = "system"
  } = {}) {
    const connection = requireConnection(companyId, connectionId);
    const companyKey = `${companyId}:${connectionId}:${currentMinuteKey(clock)}`;
    const currentCount = state.partnerRateLimitCounters.get(companyKey) || 0;
    const operation = {
      operationId: crypto.randomUUID(),
      companyId: connection.companyId,
      connectionId: connection.connectionId,
      connectionType: connection.connectionType,
      providerCode: connection.providerCode,
      partnerCode: connection.providerCode,
      mode: connection.mode,
      operationCode: text(operationCode, "partner_operation_code_required"),
      operationKey: optionalText(operationKey),
      payloadHash: hashObject(payload),
      payloadJson: clone(payload),
      dryRun: dryRun === true,
      actorId: text(actorId || "system", "actor_id_required"),
      fallbackMode: connection.fallbackMode,
      receiptRefs: [],
      receipts: [],
      status: "queued",
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    if (connection.status === "disabled") {
      throw createError(409, "partner_connection_disabled", "Partner connection is disabled.");
    }
    if (!partnerCatalogEntry(connection.connectionType).operationCodes.includes(operation.operationCode)) {
      throw createError(409, "partner_operation_code_not_supported", `Operation ${operation.operationCode} is not supported for ${connection.connectionType}.`);
    }
    if (currentCount >= connection.rateLimitPerMinute) {
      operation.status = "rate_limited";
      operation.fallbackTriggered = connection.fallbackMode !== "disabled";
      operation.fallbackReasonCode = "rate_limit_exceeded";
      operation.updatedAt = nowIso(clock);
      state.partnerOperations.set(operation.operationId, operation);
      if (connection.fallbackMode === "queue_retry") {
        const job = enqueueAsyncJob({
          companyId,
          jobType: `${connection.connectionType}.${operation.operationCode}`,
          payloadRef: operation.operationId,
          payload,
          priority: "normal",
          riskClass: connection.connectionType === "bank" ? "high_risk" : "normal",
          idempotencyKey: operation.operationKey || `${connection.connectionId}:${operation.operationCode}:${operation.payloadHash}`,
          actorId
        });
        operation.jobId = job.jobId;
      }
      return presentPartnerOperation(state, operation);
    }
    state.partnerRateLimitCounters.set(companyKey, currentCount + 1);
    state.partnerOperations.set(operation.operationId, operation);

    if (connection.status === "outage" || connection.status === "degraded") {
      operation.status = "fallback";
      operation.fallbackTriggered = true;
      operation.fallbackReasonCode = connection.status === "outage" ? "provider_outage" : "provider_degraded";
      operation.updatedAt = nowIso(clock);
      if (connection.fallbackMode === "queue_retry") {
        const job = enqueueAsyncJob({
          companyId,
          jobType: `${connection.connectionType}.${operation.operationCode}`,
          payloadRef: operation.operationId,
          payload,
          priority: connection.status === "outage" ? "high" : "normal",
          riskClass: connection.connectionType === "bank" ? "high_risk" : "normal",
          idempotencyKey: operation.operationKey || `${connection.connectionId}:${operation.operationCode}:${operation.payloadHash}`,
          actorId
        });
        operation.jobId = job.jobId;
      }
      return presentPartnerOperation(state, operation);
    }

    const job = enqueueAsyncJob({
      companyId,
      jobType: `${connection.connectionType}.${operation.operationCode}`,
      payloadRef: operation.operationId,
      payload,
      priority: "normal",
      riskClass: connection.connectionType === "bank" ? "high_risk" : "normal",
      idempotencyKey: operation.operationKey || `${connection.connectionId}:${operation.operationCode}:${operation.payloadHash}`,
      actorId
    });
    operation.jobId = job.jobId;
    operation.updatedAt = nowIso(clock);
    return presentPartnerOperation(state, operation);
  }

  async function executePartnerOperation({ companyId, operationId, actorId = "system" } = {}) {
    const operation = requireOperation(companyId, operationId);
    const connection = requireConnection(companyId, operation.connectionId);
    if (!operation.jobId) {
      throw createError(409, "partner_operation_not_dispatchable", "Partner operation does not have a dispatchable async job.");
    }
    if (operation.status === "succeeded") {
      return presentPartnerOperation(state, operation);
    }

    const claimedJob = claimAsyncJob({
      companyId,
      jobId: operation.jobId,
      workerId: `${connection.connectionType}-worker`
    });
    operation.status = "running";
    operation.updatedAt = nowIso(clock);

    const executor = resolveConfiguredExecutor(operationExecutors, connection);
    if (typeof executor !== "function") {
      const failedJob = failAsyncJobAttempt({
        companyId,
        jobId: operation.jobId,
        errorClass: "persistent_technical",
        errorMessage: `No partner-operation executor is registered for ${connection.connectionType}.`,
        replayAllowed: true
      });
      return finalizePartnerOperationFailure({
        operation,
        connection,
        failedJob,
        failureStatus: connection.fallbackMode === "disabled" ? "failed" : "fallback",
        failureCode: "partner_operation_runtime_missing",
        failureMessage: `No partner-operation executor is registered for ${connection.connectionType}.`,
        timestamp: nowIso(clock)
      }, state);
    }

    const rawResult = await executor({
      connection: clone(connection),
      operation: clone(operation),
      job: clone(claimedJob),
      actorId: text(actorId || "system", "actor_id_required")
    });
    const normalized = normalizePartnerOperationResult(rawResult);

    if (normalized.outcome === "succeeded") {
      completeAsyncJob({
        companyId,
        jobId: operation.jobId,
        resultSummary: {
          providerReference: normalized.providerReference || `${connection.providerCode}:${operation.operationId}`,
          responseSummary: normalized.responseSummary
        }
      });
      operation.status = "succeeded";
      operation.providerReference = normalized.providerReference || `${connection.providerCode}:${operation.operationId}`;
      operation.failureCode = null;
      operation.failureMessage = null;
      operation.nextRetryAt = null;
      operation.updatedAt = nowIso(clock);
      operation.receipts.push({
        receiptRef: `partner-receipt:${operation.operationId}:1`,
        providerReference: operation.providerReference,
        status: "accepted",
        receivedAt: operation.updatedAt,
        responseSummary: clone(normalized.responseSummary)
      });
      operation.receiptRefs = operation.receipts.map((receipt) => receipt.receiptRef);
      connection.lastSuccessfulOperationId = operation.operationId;
      connection.lastSuccessfulOperationAt = operation.updatedAt;
      connection.latestReceiptAt = operation.updatedAt;
      connection.updatedAt = operation.updatedAt;
      return presentPartnerOperation(state, operation);
    }

    const failedJob = failAsyncJobAttempt({
      companyId,
      jobId: operation.jobId,
      errorClass: normalized.errorClass,
      errorMessage: normalized.errorMessage,
      replayAllowed: normalized.replayAllowed
    });

    if (normalized.outcome === "rate_limited") {
      return finalizePartnerOperationFailure({
        operation,
        connection,
        failedJob,
        failureStatus: "rate_limited",
        failureCode: normalized.failureCode || "partner_rate_limit_exceeded",
        failureMessage: normalized.errorMessage,
        timestamp: nowIso(clock)
      }, state);
    }
    if (normalized.outcome === "fallback") {
      return finalizePartnerOperationFailure({
        operation,
        connection,
        failedJob,
        failureStatus: "fallback",
        failureCode: normalized.failureCode || normalized.fallbackReasonCode || "partner_fallback_triggered",
        failureMessage: normalized.errorMessage,
        timestamp: nowIso(clock)
      }, state);
    }
    return finalizePartnerOperationFailure({
      operation,
      connection,
      failedJob,
      failureStatus: failedJob.status === "retry_scheduled" ? "retry_scheduled" : "failed",
      failureCode: normalized.failureCode || "partner_operation_failed",
      failureMessage: normalized.errorMessage,
      timestamp: nowIso(clock)
    }, state);
  }

  function listPartnerOperations({ companyId, connectionId = null, status = null, operationCode = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedConnectionId = optionalText(connectionId);
    const resolvedStatus = optionalText(status);
    const resolvedOperationCode = optionalText(operationCode);
    return [...state.partnerOperations.values()]
      .filter((operation) => operation.companyId === resolvedCompanyId)
      .filter((operation) => (resolvedConnectionId ? operation.connectionId === resolvedConnectionId : true))
      .filter((operation) => (resolvedStatus ? operation.status === resolvedStatus : true))
      .filter((operation) => (resolvedOperationCode ? operation.operationCode === resolvedOperationCode : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((operation) => presentPartnerOperation(state, operation, false));
  }

  function getPartnerOperation({ companyId, operationId } = {}) {
    return presentPartnerOperation(state, requireOperation(companyId, operationId));
  }

  function replayPartnerOperation({ companyId, operationId, actorId = "system", reasonCode = null, approvedByActorId = null } = {}) {
    const operation = requireOperation(companyId, operationId);
    if (!operation.jobId) {
      throw createError(409, "partner_operation_replay_not_supported", "Partner operation does not have a replayable async job.");
    }
    const job = requireJob(companyId, operation.jobId);
    const replayPlan =
      job.status === "replay_planned"
        ? presentJob(state, job)
        : planJobReplay({
            companyId,
            jobId: operation.jobId,
            actorId,
            approvedByActorId
          });
    operation.lastReplayPlanId = crypto.randomUUID();
    operation.lastReplayReasonCode = optionalText(reasonCode) || "manual_partner_operation_replay";
    operation.updatedAt = nowIso(clock);
    return {
      replayPlanId: operation.lastReplayPlanId,
      operationId: operation.operationId,
      jobId: replayPlan.jobId,
      status: replayPlan.status
    };
  }

  function enqueueAsyncJob({
    companyId,
    jobType,
    payloadRef,
    payload = {},
    priority = "normal",
    riskClass = "normal",
    retryPolicy = {},
    sourceEventId = null,
    sourceActionId = null,
    idempotencyKey = null,
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedJobType = text(jobType, "job_type_required");
    const payloadHash = hashObject(payload);
    const resolvedKey = optionalText(idempotencyKey) || `${resolvedCompanyId}:${resolvedJobType}:${payloadHash}`;
    const existing = [...state.asyncJobs.values()].find(
      (job) => job.companyId === resolvedCompanyId && job.idempotencyKey === resolvedKey && ["queued", "claimed", "running", "retry_scheduled"].includes(job.status)
    );
    if (existing) {
      return presentJob(state, existing);
    }
    const normalizedRetryPolicy = normalizeRetryPolicy(retryPolicy);
    const job = {
      jobId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      jobType: resolvedJobType,
      jobPayloadHash: payloadHash,
      jobPayloadRef: text(payloadRef || resolvedKey, "job_payload_ref_required"),
      payloadJson: clone(payload),
      status: "queued",
      priority: text(priority || "normal", "job_priority_required"),
      riskClass: assertAllowed(riskClass, JOB_RISK_CLASSES, "job_risk_class_invalid"),
      idempotencyKey: resolvedKey,
      sourceEventId: optionalText(sourceEventId),
      sourceActionId: optionalText(sourceActionId),
      correlationId: crypto.randomUUID(),
      retryPolicy: normalizedRetryPolicy,
      timeoutSeconds: normalizedRetryPolicy.timeoutSeconds,
      createdByActorId: text(actorId || "system", "actor_id_required"),
      createdAt: nowIso(clock),
      availableAt: nowIso(clock),
      lastErrorClass: null,
      replayOfJobId: null,
      attempts: [],
      claimToken: null,
      claimedByWorkerId: null
    };
    state.asyncJobs.set(job.jobId, job);
    return presentJob(state, job);
  }

  function listAsyncJobs({ companyId, status = null, jobType = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedStatus = optionalText(status);
    const resolvedJobType = optionalText(jobType);
    return [...state.asyncJobs.values()]
      .filter((job) => job.companyId === resolvedCompanyId)
      .filter((job) => (resolvedStatus ? job.status === resolvedStatus : true))
      .filter((job) => (resolvedJobType ? job.jobType === resolvedJobType : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((job) => presentJob(state, job));
  }

  function getAsyncJob({ companyId, jobId } = {}) {
    return presentJob(state, requireJob(companyId, jobId));
  }

  function claimAsyncJob({ companyId, jobId, workerId } = {}) {
    const job = requireJob(companyId, jobId);
    if (!["queued", "retry_scheduled", "replay_planned"].includes(job.status)) {
      throw createError(409, "job_claim_invalid_state", "Job cannot be claimed in the current state.");
    }
    if (new Date(job.availableAt) > new Date(nowIso(clock))) {
      throw createError(409, "job_retry_not_ready", "Job cannot be claimed before its retry window opens.");
    }
    if (job.claimToken && job.status === "claimed") {
      throw createError(409, "job_double_claim_blocked", "Job is already claimed.");
    }
    job.status = "claimed";
    job.claimToken = crypto.randomUUID();
    job.claimedByWorkerId = text(workerId, "job_worker_id_required");
    job.updatedAt = nowIso(clock);
    return presentJob(state, job);
  }

  function completeAsyncJob({ companyId, jobId, resultSummary = {} } = {}) {
    const job = requireJob(companyId, jobId);
    const attempt = startAttemptIfNeeded(job);
    attempt.result = "succeeded";
    attempt.finishedAt = nowIso(clock);
    attempt.resultSummary = clone(resultSummary);
    job.status = "succeeded";
    job.claimToken = null;
    job.updatedAt = attempt.finishedAt;
    return presentJob(state, job);
  }

  function failAsyncJobAttempt({ companyId, jobId, errorClass, errorMessage, replayAllowed = null } = {}) {
    const job = requireJob(companyId, jobId);
    const attempt = startAttemptIfNeeded(job);
    const resolvedErrorClass = assertAllowed(errorClass, JOB_ERROR_CLASSES, "job_error_class_invalid");
    attempt.result = "failed";
    attempt.errorClass = resolvedErrorClass;
    attempt.errorMessageRedacted = text(errorMessage, "job_error_message_required");
    attempt.finishedAt = nowIso(clock);
    job.lastErrorClass = resolvedErrorClass;
    const nextAction = classifyFailure(job, resolvedErrorClass);
    job.updatedAt = attempt.finishedAt;
    job.claimToken = null;
    job.claimedByWorkerId = null;

    if (nextAction === "retry") {
      attempt.nextRetryAt = addMinutesIso(attempt.finishedAt, computeBackoffMinutes(job.retryPolicy, job.attempts.length));
      job.availableAt = attempt.nextRetryAt;
      job.status = "retry_scheduled";
      return presentJob(state, job);
    }

    job.status = "dead_lettered";
    state.asyncDeadLetters.set(job.jobId, {
      deadLetterId: crypto.randomUUID(),
      jobId: job.jobId,
      companyId: job.companyId,
      enteredAt: attempt.finishedAt,
      terminalReason: resolvedErrorClass,
      operatorState: "unseen",
      replayAllowed: replayAllowed == null ? job.riskClass !== "restricted" : replayAllowed === true,
      riskClass: job.riskClass
    });
    return presentJob(state, job);
  }

  function planJobReplay({ companyId, jobId, actorId = "system", approvedByActorId = null } = {}) {
    const job = requireJob(companyId, jobId);
    if (job.status !== "dead_lettered") {
      throw createError(409, "job_replay_invalid_state", "Only dead-lettered jobs can be replayed.");
    }
    const resolvedActorId = text(actorId || "system", "actor_id_required");
    const resolvedApprovedByActorId = optionalText(approvedByActorId);
    if (job.riskClass !== "normal" && resolvedApprovedByActorId == null) {
      throw createError(409, "job_replay_requires_approval", "High-risk or restricted jobs require explicit replay approval.");
    }
    if (job.riskClass !== "normal" && resolvedApprovedByActorId && resolvedApprovedByActorId === resolvedActorId) {
      throw createError(409, "job_replay_self_approval_forbidden", "Replay approval must come from a separate actor.");
    }
    job.status = "replay_planned";
    job.replayPlannedByActorId = resolvedActorId;
    job.replayApprovedByActorId = resolvedApprovedByActorId;
    job.updatedAt = nowIso(clock);
    return presentJob(state, job);
  }

  function executeJobReplay({ companyId, jobId, actorId = "system" } = {}) {
    const job = requireJob(companyId, jobId);
    if (job.status !== "replay_planned") {
      throw createError(409, "job_replay_not_planned", "Replay must be planned before execution.");
    }
    const replayed = enqueueAsyncJob({
      companyId: job.companyId,
      jobType: job.jobType,
      payloadRef: job.jobPayloadRef,
      payload: job.payloadJson,
      priority: job.priority,
      riskClass: job.riskClass,
      retryPolicy: job.retryPolicy,
      sourceEventId: job.sourceEventId,
      sourceActionId: job.sourceActionId,
      idempotencyKey: `${job.idempotencyKey}:replay:${job.attempts.length + 1}`,
      actorId
    });
    const replayJob = state.asyncJobs.get(replayed.jobId);
    replayJob.replayOfJobId = job.jobId;
    job.status = "replayed";
    job.updatedAt = nowIso(clock);
    return {
      originalJob: presentJob(state, job),
      replayJob: presentJob(state, replayJob)
    };
  }

  function massRetryJobs({ companyId, jobIds = [], actorId = "system" } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      throw createError(400, "mass_retry_job_ids_required", "At least one job id is required for mass retry.");
    }
    const jobs = jobIds.map((jobId) => requireJob(resolvedCompanyId, jobId));
    const firstRiskClass = jobs[0].riskClass;
    const firstErrorClass = jobs[0].lastErrorClass;
    if (jobs.some((job) => job.riskClass !== firstRiskClass || job.lastErrorClass !== firstErrorClass)) {
      throw createError(409, "mass_retry_mixed_scope_forbidden", "Mass retry requires matching risk class and error class.");
    }
    return jobs.map((job) =>
      planJobReplay({
        companyId: resolvedCompanyId,
        jobId: job.jobId,
        actorId,
        approvedByActorId: firstRiskClass === "normal" ? actorId : null
      })
    );
  }

  function requireConnection(companyId, connectionId) {
    const connection = state.partnerConnections.get(text(connectionId, "partner_connection_id_required"));
    if (!connection || connection.companyId !== text(companyId, "company_id_required")) {
      throw createError(404, "partner_connection_not_found", "Partner connection was not found.");
    }
    return connection;
  }

  function requireOperation(companyId, operationId) {
    const operation = state.partnerOperations.get(text(operationId, "partner_operation_id_required"));
    if (!operation || operation.companyId !== text(companyId, "company_id_required")) {
      throw createError(404, "partner_operation_not_found", "Partner operation was not found.");
    }
    return operation;
  }

  function requireJob(companyId, jobId) {
    const job = state.asyncJobs.get(text(jobId, "job_id_required"));
    if (!job || job.companyId !== text(companyId, "company_id_required")) {
      throw createError(404, "job_not_found", "Async job was not found.");
    }
    return job;
  }

  function startAttemptIfNeeded(job) {
    const lastAttempt = job.attempts[job.attempts.length - 1];
    if (lastAttempt && !lastAttempt.finishedAt) {
      return lastAttempt;
    }
    const attempt = {
      attemptNo: job.attempts.length + 1,
      startedAt: nowIso(clock),
      finishedAt: null,
      workerId: job.claimedByWorkerId || "system",
      result: null,
      errorClass: null,
      errorMessageRedacted: null,
      nextRetryAt: null,
      resultSummary: null
    };
    job.attempts.push(attempt);
    job.status = "running";
    job.updatedAt = attempt.startedAt;
    return attempt;
  }

}

function finalizePartnerOperationFailure({ operation, connection, failedJob, failureStatus, failureCode, failureMessage, timestamp }, state) {
  const latestAttempt = Array.isArray(failedJob.attempts) && failedJob.attempts.length > 0 ? failedJob.attempts[failedJob.attempts.length - 1] : null;
  operation.status = failureStatus;
  operation.failureCode = failureCode || null;
  operation.failureMessage = failureMessage || null;
  operation.fallbackTriggered = failureStatus === "fallback" || failureStatus === "rate_limited";
  operation.fallbackReasonCode = operation.fallbackTriggered ? failureCode || null : null;
  operation.nextRetryAt = latestAttempt?.nextRetryAt || null;
  operation.updatedAt = timestamp;
  if (connection.fallbackMode === "disabled" && failureStatus === "fallback") {
    operation.status = "failed";
    operation.fallbackTriggered = false;
    operation.fallbackReasonCode = null;
  }
  connection.lastFailureOperationId = operation.operationId;
  connection.lastFailureOperationAt = timestamp;
  connection.updatedAt = timestamp;
  return presentPartnerOperation(state, operation);
}

function resolveConfiguredExecutor(catalog, connection) {
  if (typeof catalog === "function") {
    return catalog;
  }
  if (!catalog || typeof catalog !== "object") {
    return null;
  }
  return catalog[connection.connectionId] || catalog[connection.partnerCode] || catalog[connection.connectionType] || null;
}

function normalizeContractTestResult(value, fallbackAssertions) {
  const resolved = value && typeof value === "object" ? value : {};
  const result = ["passed", "failed"].includes(resolved.result) ? resolved.result : "failed";
  const assertions = Array.isArray(resolved.assertions) && resolved.assertions.length > 0 ? resolved.assertions.map(String) : [...fallbackAssertions];
  const failures = Array.isArray(resolved.failures)
    ? resolved.failures.map((failure) => ({
        code: optionalText(failure?.code) || "partner_contract_failure",
        message: optionalText(failure?.message) || "Partner contract assertion failed."
      }))
    : [];
  return {
    result,
    assertions,
    failures,
    diagnostics: resolved.diagnostics && typeof resolved.diagnostics === "object" ? clone(resolved.diagnostics) : {}
  };
}

function normalizePartnerOperationResult(value = {}) {
  const resolved = value && typeof value === "object" ? value : {};
  const outcome = ["succeeded", "failed", "fallback", "rate_limited"].includes(resolved.outcome) ? resolved.outcome : "failed";
  return {
    outcome,
    providerReference: optionalText(resolved.providerReference),
    responseSummary: resolved.responseSummary && typeof resolved.responseSummary === "object" ? clone(resolved.responseSummary) : {},
    errorClass: assertAllowed(
      resolved.errorClass || (outcome === "rate_limited" ? "transient_technical" : outcome === "fallback" ? "downstream_unknown" : "persistent_technical"),
      JOB_ERROR_CLASSES,
      "job_error_class_invalid"
    ),
    errorMessage: optionalText(resolved.errorMessage) || `Partner operation ${outcome}.`,
    failureCode: optionalText(resolved.failureCode),
    fallbackReasonCode: optionalText(resolved.fallbackReasonCode),
    replayAllowed: resolved.replayAllowed !== false
  };
}

function partnerCatalogEntry(connectionType) {
  const catalog = PARTNER_CONNECTION_CATALOG[connectionType];
  if (!catalog) {
    throw createError(400, "partner_connection_type_invalid", `${connectionType} is not a supported partner connection type.`);
  }
  return clone({
    ...catalog,
    operationCodes: catalog.supportedOperations,
    contractAssertions: contractAssertionsFor(connectionType)
  });
}

function presentPartnerConnection(connection) {
  const cloneConnection = clone(connection);
  const credentialsPresent = cloneConnection.credentialsRef != null;
  delete cloneConnection.credentialsRef;
  cloneConnection.credentialsConfigured = credentialsPresent;
  cloneConnection.credentialsPresent = credentialsPresent;
  cloneConnection.partnerCode = cloneConnection.providerCode;
  cloneConnection.healthStatus = cloneConnection.healthStatus || "unknown";
  cloneConnection.latestReceiptAt = cloneConnection.latestReceiptAt || null;
  return cloneConnection;
}

function presentPartnerOperation(state, operation, includeDetails = true) {
  const cloneOperation = clone(operation);
  const job = cloneOperation.jobId && state.asyncJobs instanceof Map ? state.asyncJobs.get(cloneOperation.jobId) : null;
  cloneOperation.receiptRefs = Array.isArray(cloneOperation.receiptRefs) ? [...cloneOperation.receiptRefs] : [];
  cloneOperation.receipts = Array.isArray(cloneOperation.receipts) ? clone(cloneOperation.receipts) : [];
  cloneOperation.attempts = includeDetails && job ? clone(job.attempts || []) : includeDetails ? [] : undefined;
  if (!includeDetails) {
    delete cloneOperation.attempts;
    delete cloneOperation.receipts;
    delete cloneOperation.payloadJson;
    delete cloneOperation.receiptRefs;
    delete cloneOperation.dryRun;
    delete cloneOperation.operationKey;
  }
  return cloneOperation;
}

function presentJob(state, job) {
  return clone({
    ...job,
    deadLetter: state.asyncDeadLetters.get(job.jobId) || null
  });
}

function buildDefaultHealthCheckResults({ state, connection, checkSetCode, clock }) {
  const recentOperations = [...state.partnerOperations.values()]
    .filter((operation) => operation.connectionId === connection.connectionId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 20);
  const failureCount = recentOperations.filter((operation) => ["failed", "fallback", "rate_limited", "retry_scheduled"].includes(operation.status)).length;
  const errorRate = recentOperations.length > 0 ? failureCount / recentOperations.length : 0;
  const observedAt = nowIso(clock);
  return [
    healthCheckResult("auth_validity", connection.credentialsRef != null ? "passed" : "failed", connection.credentialsRef != null ? "Credentials are configured." : "Credentials are missing.", observedAt),
    healthCheckResult(
      "credential_expiry",
      classifyExpiryStatus(connection.credentialsExpiresAt),
      connection.credentialsExpiresAt ? `Credentials expire at ${connection.credentialsExpiresAt}.` : "Credential expiry is not registered.",
      observedAt
    ),
    healthCheckResult(
      "provider_reachability",
      connection.status === "outage" || connection.status === "disabled" ? "failed" : connection.status === "degraded" ? "warning" : "passed",
      `Connection status is ${connection.status}.`,
      observedAt
    ),
    healthCheckResult(
      "capability_version",
      connection.capabilityVersion ? "passed" : "warning",
      connection.capabilityVersion ? `Capability version ${connection.capabilityVersion} is pinned.` : "Capability version is missing.",
      observedAt
    ),
    healthCheckResult(
      "last_successful_operation",
      connection.lastSuccessfulOperationAt ? "passed" : "warning",
      connection.lastSuccessfulOperationAt ? `Last successful operation at ${connection.lastSuccessfulOperationAt}.` : "No successful partner operation has been recorded yet.",
      observedAt
    ),
    healthCheckResult(
      "error_rate_window",
      errorRate >= 0.5 ? "failed" : errorRate >= 0.25 ? "warning" : "passed",
      recentOperations.length > 0 ? `Error rate over last ${recentOperations.length} operations is ${(errorRate * 100).toFixed(0)}%.` : "No recent operation window is available yet.",
      observedAt
    ),
    healthCheckResult(
      "lag_window",
      checkSetCode === "full" && !connection.latestReceiptAt ? "warning" : "passed",
      connection.latestReceiptAt ? `Latest receipt recorded at ${connection.latestReceiptAt}.` : "No partner receipt recorded yet.",
      observedAt
    )
  ];
}

function healthCheckResult(checkCode, status, summary, observedAt) {
  return {
    checkCode,
    status,
    summary,
    observedAt
  };
}

function summarizeHealthCheckStatus(results) {
  if (results.some((result) => result.status === "failed")) {
    return "outage";
  }
  if (results.some((result) => result.status === "warning")) {
    return "degraded";
  }
  return "healthy";
}

function classifyExpiryStatus(timestamp) {
  if (!timestamp) {
    return "warning";
  }
  const expiryDate = new Date(timestamp);
  const now = new Date();
  if (Number.isNaN(expiryDate.getTime()) || expiryDate <= now) {
    return "failed";
  }
  const warningDate = new Date(now);
  warningDate.setUTCDate(warningDate.getUTCDate() + 14);
  return expiryDate <= warningDate ? "warning" : "passed";
}

function healthStatusFromConnectionStatus(status) {
  if (status === "outage" || status === "disabled") {
    return "outage";
  }
  if (status === "degraded") {
    return "degraded";
  }
  return "healthy";
}

function normalizePartnerConfig(value = {}) {
  const config = value && typeof value === "object" ? clone(value) : {};
  if (config.credentialsExpiresAt != null) {
    config.credentialsExpiresAt = normalizeIsoDateTime(config.credentialsExpiresAt, "partner_credentials_expiry_invalid");
  }
  if (config.consentExpiresAt != null) {
    config.consentExpiresAt = normalizeIsoDateTime(config.consentExpiresAt, "partner_consent_expiry_invalid");
  }
  if (config.certificateVersion != null) {
    config.certificateVersion = text(config.certificateVersion, "partner_certificate_version_invalid");
  }
  if (config.capabilityVersion != null) {
    config.capabilityVersion = text(config.capabilityVersion, "partner_capability_version_invalid");
  }
  return config;
}

function resolvePartnerProviderBaseline({ providerBaselineRegistry, connectionType, providerCode, effectiveDate, mode }) {
  if (!providerBaselineRegistry || typeof providerBaselineRegistry.resolveProviderBaseline !== "function") {
    return null;
  }
  const resolvedConnectionType = text(connectionType, "partner_connection_type_required");
  const resolvedProviderCode = text(providerCode, "partner_provider_code_required");
  const baselineCode = PARTNER_PROVIDER_BASELINE_SELECTIONS[resolvedConnectionType]?.[resolvedProviderCode] || null;
  if (!baselineCode) {
    return null;
  }
  try {
    const providerBaseline = providerBaselineRegistry.resolveProviderBaseline({
      domain: "integrations",
      jurisdiction: "SE",
      providerCode: resolvedProviderCode,
      baselineCode,
      effectiveDate,
      environmentMode: mode
    });
    return providerBaselineRegistry.buildProviderBaselineRef({
      effectiveDate,
      providerBaseline,
      metadata: {
        connectionType: resolvedConnectionType,
        mode,
        baselineSelectionCode: baselineCode
      }
    });
  } catch (error) {
    if (error?.code === "provider_baseline_not_found") {
      return null;
    }
    throw error;
  }
}

function normalizeIsoDateTime(value, code) {
  const timestamp = text(value, code);
  const resolved = new Date(timestamp);
  if (Number.isNaN(resolved.getTime())) {
    throw createError(400, code, `${code} is invalid.`);
  }
  return resolved.toISOString();
}

function normalizeRetryPolicy(value = {}) {
  const policy = value && typeof value === "object" ? value : {};
  return {
    maxAttempts: normalizePositiveInteger(policy.maxAttempts || 3, "job_retry_policy_invalid"),
    baseDelayMinutes: normalizePositiveInteger(policy.baseDelayMinutes || 5, "job_retry_policy_invalid"),
    timeoutSeconds: normalizePositiveInteger(policy.timeoutSeconds || 90, "job_retry_policy_invalid")
  };
}

function classifyFailure(job, errorClass) {
  if (errorClass === "business_input" || errorClass === "persistent_technical") {
    return "dead_letter";
  }
  if (job.attempts.length >= job.retryPolicy.maxAttempts) {
    return "dead_letter";
  }
  return "retry";
}

function computeBackoffMinutes(retryPolicy, attemptCount) {
  return Math.min(retryPolicy.baseDelayMinutes * 2 ** Math.max(0, attemptCount - 1), 120);
}

function contractAssertionsFor(connectionType) {
  const assertionCatalog = {
    bank: ["statement_cursor_required", "payment_reference_roundtrip", "retryable_transport_codes_mapped"],
    peppol: ["receiver_identifier_required", "receipt_normalization", "duplicate_delivery_guard"],
    pension: ["enrollment_period_required", "salary_exchange_snapshot", "provider_reference_recorded"],
    crm: ["external_customer_id_required", "upsert_idempotency", "rate_limit_headers_observed"],
    commerce: ["order_reference_required", "line_tax_mapping", "stock_change_idempotency"],
    id06: ["site_identifier_required", "attendance_window_validation", "device_reference_roundtrip"]
  };
  return assertionCatalog[connectionType] || ["contract_defined"];
}

function currentMinuteKey(clock = () => new Date()) {
  return nowIso(clock).slice(0, 16);
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function addMinutesIso(timestamp, minutes) {
  const resolved = new Date(timestamp);
  resolved.setUTCMinutes(resolved.getUTCMinutes() + minutes);
  return resolved.toISOString();
}

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
}

function normalizePositiveInteger(value, code) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw createError(400, code, `${code} must be a positive integer.`);
  }
  return number;
}

function assertAllowed(value, allowed, code) {
  const resolved = text(value, code);
  if (!allowed.includes(resolved)) {
    throw createError(400, code, `${code} does not allow ${resolved}.`);
  }
  return resolved;
}

function optionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function text(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
