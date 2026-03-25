import crypto from "node:crypto";

const PUBLIC_API_SPEC_VERSION = "2026-03-25";

export const PUBLIC_API_MODES = Object.freeze(["sandbox", "production"]);
export const PUBLIC_API_CLIENT_STATUSES = Object.freeze(["active", "revoked"]);
export const PUBLIC_API_SCOPE_CODES = Object.freeze([
  "api_spec.read",
  "reporting.read",
  "submission.read",
  "legal_form.read",
  "annual_reporting.read",
  "tax_account.read",
  "webhook.manage",
  "partner.read",
  "automation.read"
]);
export const WEBHOOK_DELIVERY_STATUSES = Object.freeze(["queued", "running", "sent", "failed", "rate_limited", "suppressed", "disabled"]);
export const WEBHOOK_EVENT_TYPES = Object.freeze([
  "report.snapshot.ready",
  "submission.updated",
  "legal_form.profile.updated",
  "annual_reporting.package.updated",
  "tax_account.reconciliation.updated",
  "partner.connection.updated",
  "partner.contract_test.completed",
  "partner.operation.completed",
  "partner.operation.failed",
  "automation.decision.ready",
  "migration.diff.generated"
]);

export function createPublicApiModule({ state, clock = () => new Date(), deliveryExecutor = defaultWebhookDeliveryExecutor }) {
  return {
    publicApiModes: PUBLIC_API_MODES,
    publicApiClientStatuses: PUBLIC_API_CLIENT_STATUSES,
    publicApiScopeCodes: PUBLIC_API_SCOPE_CODES,
    webhookDeliveryStatuses: WEBHOOK_DELIVERY_STATUSES,
    webhookEventTypes: WEBHOOK_EVENT_TYPES,
    getPublicApiSpec,
    recordPublicApiCompatibilityBaseline,
    listPublicApiCompatibilityBaselines,
    createPublicApiClient,
    listPublicApiClients,
    exchangePublicApiClientCredentials,
    issuePublicApiToken,
    introspectPublicApiToken,
    authorizePublicApiToken,
    createWebhookSubscription,
    listWebhookSubscriptions,
    emitWebhookEvent,
    dispatchWebhookDeliveries,
    listWebhookEvents,
    listWebhookDeliveries,
    getPublicApiSandboxCatalog
  };

  function getPublicApiSpec({ version = PUBLIC_API_SPEC_VERSION } = {}) {
    const resolvedVersion = text(version, "public_api_version_required");
    return clone({
      version: resolvedVersion,
      backwardCompatibilityWindowDays: 180,
      auth: {
        scheme: "oauth2_client_credentials",
        tokenType: "opaque_access_token",
        supportedModes: [...PUBLIC_API_MODES],
        scopeCodes: [...PUBLIC_API_SCOPE_CODES]
      },
      endpoints: [
        { path: "/v1/public/spec", scopes: ["api_spec.read"], stability: "stable" },
        { path: "/v1/public/report-snapshots", scopes: ["reporting.read"], stability: "stable" },
        { path: "/v1/public/submissions", scopes: ["submission.read"], stability: "stable" },
        { path: "/v1/public/sandbox/catalog", scopes: ["api_spec.read"], stability: "stable" },
        { path: "/v1/public/legal-forms/declaration-profile", scopes: ["legal_form.read"], stability: "stable" },
        { path: "/v1/public/annual-reporting/packages", scopes: ["annual_reporting.read"], stability: "stable" },
        { path: "/v1/public/tax-account/summary", scopes: ["tax_account.read"], stability: "stable" },
        { path: "/v1/public/tax-account/reconciliations", scopes: ["tax_account.read"], stability: "stable" }
      ],
      webhookEventTypes: [...WEBHOOK_EVENT_TYPES]
    });
  }

  function recordPublicApiCompatibilityBaseline({ companyId, version, routeHash, actorId } = {}) {
    const baseline = {
      baselineId: crypto.randomUUID(),
      companyId: text(companyId, "company_id_required"),
      version: text(version, "public_api_version_required"),
      routeHash: text(routeHash, "public_api_route_hash_required"),
      actorId: text(actorId || "system", "actor_id_required"),
      recordedAt: nowIso(clock)
    };
    state.publicApiCompatibilityBaselines.set(baseline.baselineId, baseline);
    return clone(baseline);
  }

  function listPublicApiCompatibilityBaselines({ companyId } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    return [...state.publicApiCompatibilityBaselines.values()]
      .filter((baseline) => baseline.companyId === resolvedCompanyId)
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
      .map(clone);
  }

  function createPublicApiClient({
    companyId,
    displayName,
    mode = "production",
    scopes = [],
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedMode = assertAllowed(mode, PUBLIC_API_MODES, "public_api_mode_invalid");
    const resolvedScopes = normalizeScopes(scopes);
    const clientSecret = issueOpaqueToken();
    const client = {
      clientId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      displayName: text(displayName, "public_api_client_name_required"),
      mode: resolvedMode,
      scopes: resolvedScopes,
      status: "active",
      clientSecretHash: hashOpaqueToken(clientSecret),
      createdByActorId: text(actorId || "system", "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.publicApiClients.set(client.clientId, client);
    return {
      ...presentClient(client),
      clientSecret
    };
  }

  function listPublicApiClients({ companyId, mode = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedMode = optionalText(mode);
    return [...state.publicApiClients.values()]
      .filter((client) => client.companyId === resolvedCompanyId)
      .filter((client) => (resolvedMode ? client.mode === resolvedMode : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(presentClient);
  }

  function exchangePublicApiClientCredentials({
    companyId,
    clientId,
    clientSecret,
    scopes = null,
    actorId = "oauth_client_credentials",
    expiresInMinutes = 60
  } = {}) {
    const client = requireClient(companyId, clientId);
    const resolvedSecret = text(clientSecret, "public_api_client_secret_required");
    if (client.clientSecretHash !== hashOpaqueToken(resolvedSecret)) {
      throw createError(401, "public_api_client_credentials_invalid", "Client credentials are invalid.");
    }
    const issued = issuePublicApiToken({
      companyId: client.companyId,
      clientId: client.clientId,
      scopes,
      actorId,
      expiresInMinutes
    });
    return {
      accessToken: issued.accessToken,
      tokenType: "Bearer",
      expiresInSeconds: Number(expiresInMinutes) * 60,
      scope: issued.token.scopes.join(" "),
      mode: issued.token.mode,
      companyId: issued.token.companyId,
      clientId: issued.token.clientId,
      token: issued.token
    };
  }

  function issuePublicApiToken({
    companyId,
    clientId,
    scopes = null,
    actorId = "system",
    expiresInMinutes = 60
  } = {}) {
    const client = requireClient(companyId, clientId);
    if (client.status !== "active") {
      throw createError(409, "public_api_client_inactive", "Public API client is inactive.");
    }
    const requestedScopes = scopes == null ? client.scopes : normalizeScopes(scopes);
    for (const scope of requestedScopes) {
      if (!client.scopes.includes(scope)) {
        throw createError(403, "public_api_scope_not_granted", `Client is not granted scope ${scope}.`);
      }
    }
    const accessToken = issueOpaqueToken();
    const issuedAt = nowIso(clock);
    const token = {
      tokenId: crypto.randomUUID(),
      companyId: client.companyId,
      clientId: client.clientId,
      mode: client.mode,
      scopes: requestedScopes,
      tokenHash: hashOpaqueToken(accessToken),
      actorId: text(actorId || "system", "actor_id_required"),
      issuedAt,
      expiresAt: addMinutesIso(issuedAt, Number.isFinite(Number(expiresInMinutes)) ? Number(expiresInMinutes) : 60),
      revokedAt: null
    };
    state.publicApiTokens.set(token.tokenId, token);
    return {
      accessToken,
      token: clone(token)
    };
  }

  function introspectPublicApiToken({ accessToken } = {}) {
    const token = requireToken(accessToken);
    const client = requireClient(token.companyId, token.clientId);
    return {
      token: clone(token),
      client: presentClient(client)
    };
  }

  function authorizePublicApiToken({ accessToken, requiredScopes = [], mode = null, companyId = null } = {}) {
    const { token, client } = introspectPublicApiToken({ accessToken });
    if (mode && token.mode !== mode) {
      throw createError(403, "public_api_mode_denied", "Token mode does not match the requested resource mode.");
    }
    if (companyId && token.companyId !== companyId) {
      throw createError(403, "public_api_company_denied", "Token does not grant access to the requested company.");
    }
    for (const scope of normalizeScopes(requiredScopes)) {
      if (!token.scopes.includes(scope)) {
        throw createError(403, "public_api_scope_denied", `Token is missing scope ${scope}.`);
      }
    }
    return {
      token,
      client
    };
  }

  function createWebhookSubscription({
    companyId,
    clientId,
    mode = null,
    eventTypes = [],
    targetUrl,
    actorId = "system",
    description = null
  } = {}) {
    const client = requireClient(companyId, clientId);
    if (!client.scopes.includes("webhook.manage")) {
      throw createError(403, "public_api_webhook_scope_required", "Client must include webhook.manage to register webhooks.");
    }
    const resolvedMode = mode == null ? client.mode : assertAllowed(mode, PUBLIC_API_MODES, "public_api_mode_invalid");
    if (resolvedMode !== client.mode) {
      throw createError(409, "public_api_webhook_mode_mismatch", "Webhook subscriptions must use the same mode as the owning client.");
    }
    const subscription = {
      subscriptionId: crypto.randomUUID(),
      companyId: client.companyId,
      clientId: client.clientId,
      mode: resolvedMode,
      eventTypes: normalizeEventTypes(eventTypes),
      targetUrl: text(targetUrl, "webhook_target_url_required"),
      description: optionalText(description),
      secret: issueOpaqueToken(),
      status: "active",
      createdByActorId: text(actorId || "system", "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.webhookSubscriptions.set(subscription.subscriptionId, subscription);
    return presentWebhookSubscription(subscription, { includeSecret: true });
  }

  function listWebhookSubscriptions({ companyId, clientId = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedClientId = optionalText(clientId);
    return [...state.webhookSubscriptions.values()]
      .filter((subscription) => subscription.companyId === resolvedCompanyId)
      .filter((subscription) => (resolvedClientId ? subscription.clientId === resolvedClientId : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((subscription) => presentWebhookSubscription(subscription));
  }

  function emitWebhookEvent({
    companyId,
    eventType,
    resourceType,
    resourceId,
    payload = {},
    mode = "production",
    eventKey = null
  } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedEventType = assertAllowed(eventType, WEBHOOK_EVENT_TYPES, "webhook_event_type_invalid");
    const resolvedMode = assertAllowed(mode, PUBLIC_API_MODES, "public_api_mode_invalid");
    const resolvedEventKey = optionalText(eventKey) || hashObject({ resolvedCompanyId, resolvedEventType, resourceType, resourceId, payload });
    const existing = [...state.webhookEvents.values()].find(
      (candidate) => candidate.companyId === resolvedCompanyId && candidate.mode === resolvedMode && candidate.eventKey === resolvedEventKey
    );
    if (existing) {
      return materializeWebhookEvent(existing);
    }
    const event = {
      eventId: crypto.randomUUID(),
      eventKey: resolvedEventKey,
      companyId: resolvedCompanyId,
      eventType: resolvedEventType,
      resourceType: text(resourceType, "webhook_resource_type_required"),
      resourceId: text(resourceId, "webhook_resource_id_required"),
      mode: resolvedMode,
      payloadJson: clone(payload),
      payloadHash: hashObject(payload),
      createdAt: nowIso(clock)
    };
    state.webhookEvents.set(event.eventId, event);
    for (const subscription of state.webhookSubscriptions.values()) {
      if (subscription.companyId !== resolvedCompanyId || subscription.mode !== resolvedMode || subscription.status !== "active") {
        continue;
      }
      if (!subscription.eventTypes.includes(resolvedEventType)) {
        continue;
      }
      const body = {
        eventId: event.eventId,
        eventType: event.eventType,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        payload: clone(event.payloadJson)
      };
      const delivery = {
        deliveryId: crypto.randomUUID(),
        eventId: event.eventId,
        subscriptionId: subscription.subscriptionId,
        companyId: resolvedCompanyId,
        mode: resolvedMode,
        status: "queued",
        deliveryAttemptNo: 0,
        signature: signWebhookBody(subscription.secret, body),
        bodyHash: hashObject(body),
        bodyJson: clone(body),
        targetUrl: subscription.targetUrl,
        deliveredAt: null,
        lastAttemptedAt: null,
        lastHttpStatus: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        providerReference: null,
        nextAttemptAt: nowIso(clock),
        attempts: [],
        createdAt: nowIso(clock),
        updatedAt: nowIso(clock)
      };
      state.webhookDeliveries.set(delivery.deliveryId, delivery);
    }
    return materializeWebhookEvent(event);
  }

  async function dispatchWebhookDeliveries({
    companyId,
    deliveryId = null,
    subscriptionId = null,
    eventId = null,
    actorId = "system",
    limit = 50
  } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedDeliveryId = optionalText(deliveryId);
    const resolvedSubscriptionId = optionalText(subscriptionId);
    const resolvedEventId = optionalText(eventId);
    const resolvedLimit = normalizePositiveInteger(limit, "webhook_dispatch_limit_invalid", 50);
    const resolvedActorId = text(actorId || "system", "actor_id_required");
    const now = nowIso(clock);
    const deliveries = [...state.webhookDeliveries.values()]
      .filter((delivery) => delivery.companyId === resolvedCompanyId)
      .filter((delivery) => (resolvedDeliveryId ? delivery.deliveryId === resolvedDeliveryId : true))
      .filter((delivery) => (resolvedSubscriptionId ? delivery.subscriptionId === resolvedSubscriptionId : true))
      .filter((delivery) => (resolvedEventId ? delivery.eventId === resolvedEventId : true))
      .filter((delivery) => isDispatchableWebhookDelivery(delivery, now, resolvedDeliveryId != null))
      .sort(compareWebhookDeliveries)
      .slice(0, resolvedLimit);

    const dispatched = [];
    for (const delivery of deliveries) {
      const event = state.webhookEvents.get(delivery.eventId);
      const subscription = state.webhookSubscriptions.get(delivery.subscriptionId);
      if (!event || !subscription) {
        continue;
      }
      delivery.status = "running";
      delivery.updatedAt = nowIso(clock);
      const attemptNo = delivery.deliveryAttemptNo + 1;
      const attemptedAt = nowIso(clock);
      const rawResult = await executeWebhookDelivery({
        executor: deliveryExecutor,
        subscription,
        event,
        delivery
      });
      const result = normalizeWebhookDispatchResult(rawResult);
      const attempt = {
        attemptId: crypto.randomUUID(),
        attemptNo,
        actorId: resolvedActorId,
        attemptedAt,
        outcome: result.outcome,
        httpStatus: result.httpStatus,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        retryAfterSeconds: result.retryAfterSeconds,
        providerReference: result.providerReference
      };
      delivery.deliveryAttemptNo = attemptNo;
      delivery.lastAttemptedAt = attemptedAt;
      delivery.lastHttpStatus = result.httpStatus;
      delivery.lastErrorCode = result.errorCode;
      delivery.lastErrorMessage = result.errorMessage;
      delivery.providerReference = result.providerReference;
      delivery.updatedAt = attemptedAt;
      delivery.attempts.push(attempt);

      if (result.outcome === "sent") {
        delivery.status = "sent";
        delivery.deliveredAt = attemptedAt;
        delivery.nextAttemptAt = null;
      } else if (result.outcome === "rate_limited") {
        delivery.status = "rate_limited";
        delivery.nextAttemptAt = addSecondsIso(attemptedAt, result.retryAfterSeconds || 60);
      } else if (result.outcome === "suppressed") {
        delivery.status = "suppressed";
        delivery.nextAttemptAt = null;
      } else if (result.outcome === "disabled") {
        delivery.status = "disabled";
        delivery.nextAttemptAt = null;
      } else if (result.retryAfterSeconds != null) {
        delivery.status = "queued";
        delivery.nextAttemptAt = addSecondsIso(attemptedAt, result.retryAfterSeconds);
      } else {
        delivery.status = "failed";
        delivery.nextAttemptAt = null;
      }

      dispatched.push(presentWebhookDelivery(delivery));
    }

    return {
      companyId: resolvedCompanyId,
      attemptedCount: dispatched.length,
      items: dispatched
    };
  }

  function listWebhookEvents({ companyId, mode = null, eventType = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedMode = optionalText(mode);
    const resolvedType = optionalText(eventType);
    return [...state.webhookEvents.values()]
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (resolvedMode ? event.mode === resolvedMode : true))
      .filter((event) => (resolvedType ? event.eventType === resolvedType : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(materializeWebhookEvent);
  }

  function listWebhookDeliveries({ companyId, subscriptionId = null, eventId = null } = {}) {
    const resolvedCompanyId = text(companyId, "company_id_required");
    const resolvedSubscriptionId = optionalText(subscriptionId);
    const resolvedEventId = optionalText(eventId);
    return [...state.webhookDeliveries.values()]
      .filter((delivery) => delivery.companyId === resolvedCompanyId)
      .filter((delivery) => (resolvedSubscriptionId ? delivery.subscriptionId === resolvedSubscriptionId : true))
      .filter((delivery) => (resolvedEventId ? delivery.eventId === resolvedEventId : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(presentWebhookDelivery);
  }

  function getPublicApiSandboxCatalog({ companyId } = {}) {
    return {
      companyId: text(companyId, "company_id_required"),
      mode: "sandbox",
      apiSpec: getPublicApiSpec({ version: PUBLIC_API_SPEC_VERSION }),
      exampleResources: [
        {
          resourceType: "declaration_profile",
          payload: {
            legalFormCode: "AKTIEBOLAG",
            declarationProfileCode: "INK2",
            packageFamilyCode: "annual_report_ab"
          }
        },
        {
          resourceType: "annual_reporting_package",
          payload: {
            status: "draft",
            profileCode: "k2",
            requiresTaxDeclarationPackage: true
          }
        },
        {
          resourceType: "tax_account_summary",
          payload: {
            netBalance: -5000,
            openSettlementAmount: 15000,
            openDifferenceCaseCount: 1
          }
        }
      ],
      exampleWebhookEvents: [
        {
          eventType: "report.snapshot.ready",
          payload: {
            reportSnapshotId: "sandbox-report-snapshot",
            reportCode: "trial_balance",
            metricCount: 12
          }
        },
        {
          eventType: "submission.updated",
          payload: {
            submissionId: "sandbox-submission",
            status: "accepted",
            receiptCount: 2
          }
        },
        {
          eventType: "annual_reporting.package.updated",
          payload: {
            packageId: "sandbox-annual-package",
            status: "draft",
            versionCount: 1
          }
        },
        {
          eventType: "tax_account.reconciliation.updated",
          payload: {
            reconciliationRunId: "sandbox-tax-reconciliation",
            openDifferenceCaseCount: 1,
            openSettlementAmount: 15000
          }
        }
      ]
    };
  }

  function materializeWebhookEvent(event) {
    return clone({
      ...event,
      deliveries: [...state.webhookDeliveries.values()]
        .filter((delivery) => delivery.eventId === event.eventId)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .map(presentWebhookDelivery)
    });
  }

  function presentClient(client) {
    const cloneClient = clone(client);
    delete cloneClient.clientSecretHash;
    return cloneClient;
  }

  function presentWebhookSubscription(subscription, { includeSecret = false } = {}) {
    const cloneSubscription = clone(subscription);
    if (!includeSecret) {
      const secret = cloneSubscription.secret;
      delete cloneSubscription.secret;
      cloneSubscription.secretPresent = typeof secret === "string" && secret.length > 0;
      cloneSubscription.secretPreview = typeof secret === "string" ? `***${secret.slice(-4)}` : null;
    }
    return cloneSubscription;
  }

  function presentWebhookDelivery(delivery) {
    const cloneDelivery = clone(delivery);
    delete cloneDelivery.bodyJson;
    return cloneDelivery;
  }

  function requireClient(companyId, clientId) {
    const client = state.publicApiClients.get(text(clientId, "public_api_client_id_required"));
    if (!client || client.companyId !== text(companyId, "company_id_required")) {
      throw createError(404, "public_api_client_not_found", "Public API client was not found.");
    }
    return client;
  }

  function requireToken(accessToken) {
    const tokenHash = hashOpaqueToken(text(accessToken, "public_api_access_token_required"));
    const token = [...state.publicApiTokens.values()].find((candidate) => candidate.tokenHash === tokenHash);
    if (!token || token.revokedAt) {
      throw createError(401, "public_api_token_not_found", "Public API token is invalid.");
    }
    if (new Date(token.expiresAt) < new Date(nowIso(clock))) {
      throw createError(401, "public_api_token_expired", "Public API token has expired.");
    }
    return token;
  }
}

async function executeWebhookDelivery({ executor, subscription, event, delivery }) {
  if (typeof executor !== "function") {
    return {
      outcome: "failed",
      errorCode: "webhook_delivery_runtime_missing",
      errorMessage: "No webhook delivery executor is registered."
    };
  }
  return executor({
    subscription: clone(subscription),
    event: clone(event),
    delivery: clone(delivery),
    body: clone(delivery.bodyJson)
  });
}

async function defaultWebhookDeliveryExecutor({ subscription, delivery, body }) {
  try {
    const response = await fetch(subscription.targetUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-swedish-erp-signature": delivery.signature,
        "x-swedish-erp-event-id": delivery.eventId,
        "x-swedish-erp-subscription-id": delivery.subscriptionId
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000)
    });
    const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get("retry-after"));
    if (response.status >= 200 && response.status < 300) {
      return {
        outcome: "sent",
        httpStatus: response.status
      };
    }
    if (response.status === 429) {
      return {
        outcome: "rate_limited",
        httpStatus: response.status,
        retryAfterSeconds: retryAfterSeconds || 60,
        errorCode: "webhook_rate_limited"
      };
    }
    if (response.status === 410) {
      return {
        outcome: "disabled",
        httpStatus: response.status,
        errorCode: "webhook_endpoint_gone"
      };
    }
    if (response.status === 404 || response.status === 422) {
      return {
        outcome: "suppressed",
        httpStatus: response.status,
        errorCode: "webhook_endpoint_rejected"
      };
    }
    if (response.status >= 500) {
      return {
        outcome: "failed",
        httpStatus: response.status,
        errorCode: "webhook_transport_error",
        retryAfterSeconds: retryAfterSeconds || 60
      };
    }
    return {
      outcome: "failed",
      httpStatus: response.status,
      errorCode: "webhook_delivery_failed"
    };
  } catch (error) {
    return {
      outcome: "failed",
      errorCode: "webhook_transport_error",
      errorMessage: typeof error?.message === "string" ? error.message : "Webhook delivery failed.",
      retryAfterSeconds: 60
    };
  }
}

function normalizeWebhookDispatchResult(value = {}) {
  const resolved = value && typeof value === "object" ? value : {};
  const outcome = assertAllowed(
    resolved.outcome || "failed",
    ["sent", "rate_limited", "suppressed", "disabled", "failed"],
    "webhook_delivery_outcome_invalid"
  );
  return {
    outcome,
    httpStatus: normalizeNullableInteger(resolved.httpStatus),
    errorCode: optionalText(resolved.errorCode),
    errorMessage: optionalText(resolved.errorMessage),
    retryAfterSeconds: normalizeNullablePositiveInteger(resolved.retryAfterSeconds),
    providerReference: optionalText(resolved.providerReference)
  };
}

function compareWebhookDeliveries(left, right) {
  const leftNext = left.nextAttemptAt || left.createdAt;
  const rightNext = right.nextAttemptAt || right.createdAt;
  return leftNext.localeCompare(rightNext) || left.createdAt.localeCompare(right.createdAt);
}

function isDispatchableWebhookDelivery(delivery, now, forceDispatch) {
  if (delivery.status === "sent" || delivery.status === "suppressed" || delivery.status === "disabled" || delivery.status === "running") {
    return false;
  }
  if (forceDispatch) {
    return true;
  }
  const nextAttemptAt = delivery.nextAttemptAt || delivery.createdAt;
  return nextAttemptAt <= now;
}

function parseRetryAfterSeconds(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric > 0) {
    return numeric;
  }
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }
  const seconds = Math.ceil((parsedDate.getTime() - Date.now()) / 1000);
  return seconds > 0 ? seconds : null;
}

function normalizeScopes(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw createError(400, "public_api_scopes_required", "At least one public API scope is required.");
  }
  const resolved = [...new Set(values.map((value) => text(value, "public_api_scope_required")))];
  for (const scope of resolved) {
    if (!PUBLIC_API_SCOPE_CODES.includes(scope)) {
      throw createError(400, "public_api_scope_invalid", `Unsupported public API scope ${scope}.`);
    }
  }
  return resolved;
}

function normalizeEventTypes(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw createError(400, "webhook_event_types_required", "At least one webhook event type is required.");
  }
  const resolved = [...new Set(values.map((value) => text(value, "webhook_event_type_required")))];
  for (const eventType of resolved) {
    if (!WEBHOOK_EVENT_TYPES.includes(eventType)) {
      throw createError(400, "webhook_event_type_invalid", `Unsupported webhook event type ${eventType}.`);
    }
  }
  return resolved;
}

function issueOpaqueToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function hashOpaqueToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function signWebhookBody(secret, body) {
  return crypto.createHmac("sha256", secret).update(stableStringify(body)).digest("hex");
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

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
}

function addMinutesIso(timestamp, minutes) {
  const resolved = new Date(timestamp);
  resolved.setUTCMinutes(resolved.getUTCMinutes() + minutes);
  return resolved.toISOString();
}

function addSecondsIso(timestamp, seconds) {
  const resolved = new Date(timestamp);
  resolved.setUTCSeconds(resolved.getUTCSeconds() + seconds);
  return resolved.toISOString();
}

function normalizeNullableInteger(value) {
  if (value == null) {
    return null;
  }
  const number = Number(value);
  if (!Number.isInteger(number)) {
    return null;
  }
  return number;
}

function normalizeNullablePositiveInteger(value) {
  if (value == null) {
    return null;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }
  return number;
}

function normalizePositiveInteger(value, code, fallback) {
  if (value == null) {
    return fallback;
  }
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
