import crypto from "node:crypto";
import http from "node:http";
import { defaultApiPlatform } from "./platform.mjs";
import { isMainModule, stopServer } from "../../../scripts/lib/repo.mjs";

export function createApiServer({ platform = defaultApiPlatform, flags = readFeatureFlags(process.env) } = {}) {
  return http.createServer((req, res) => {
    handleRequest({ req, res, platform, flags }).catch((error) => {
      writeError(res, error);
    });
  });
}

export async function startApiServer({
  port = Number(process.env.PORT || 3000),
  logger = console.log,
  platform = defaultApiPlatform,
  flags = readFeatureFlags(process.env)
} = {}) {
  const server = createApiServer({ platform, flags });
  await new Promise((resolve) => {
    server.listen(port, resolve);
  });
  logger(`api listening on http://localhost:${port}`);
  return {
    port,
    server,
    stop: () => stopServer(server)
  };
}

async function handleRequest({ req, res, platform, flags }) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;

  if (path === "/" || path === "/healthz" || path === "/readyz") {
    writeJson(
      res,
      200,
      path === "/"
        ? {
            service: "api",
            status: "ok",
            phase1AuthOnboardingEnabled: flags.phase1AuthOnboardingEnabled,
            phase2DocumentArchiveEnabled: flags.phase2DocumentArchiveEnabled,
            phase2CompanyInboxEnabled: flags.phase2CompanyInboxEnabled,
            routes: [
              "/healthz",
              "/readyz",
              "/v1/auth/login",
              "/v1/onboarding/runs",
              "/v1/documents",
              "/v1/documents/:documentId/export",
              "/v1/inbox/channels",
              "/v1/inbox/messages"
            ]
          }
        : { status: "ok" }
    );
    return;
  }

  if (!flags.phase1AuthOnboardingEnabled && isPhase1Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 1 auth and onboarding routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase2DocumentArchiveEnabled && isPhase2Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 2.1 document archive routes are disabled by configuration."
    });
    return;
  }

  if ((!flags.phase2DocumentArchiveEnabled || !flags.phase2CompanyInboxEnabled) && isPhase2InboxRoute(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 2.2 company inbox routes are disabled by configuration."
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/login") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.startLogin(body));
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/logout") {
    writeJson(res, 200, {
      session: platform.logout({ sessionToken: readSessionToken(req, await readJsonBody(req, true)) })
    });
    return;
  }

  const revokeMatch = matchPath(path, "/v1/auth/sessions/:sessionId/revoke");
  if (req.method === "POST" && revokeMatch) {
    writeJson(res, 200, {
      session: platform.revokeSession({
        sessionToken: readSessionToken(req, await readJsonBody(req, true)),
        targetSessionId: revokeMatch.sessionId
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/totp/enroll") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.beginTotpEnrollment({ sessionToken: readSessionToken(req, body), label: body.label }));
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/totp/verify") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.verifyTotp({
        sessionToken: readSessionToken(req, body),
        code: body.code,
        factorId: body.factorId || null
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/passkeys/register-options") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.beginPasskeyRegistration({ sessionToken: readSessionToken(req, body), deviceName: body.deviceName }));
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/passkeys/register-verify") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.finishPasskeyRegistration({
        sessionToken: readSessionToken(req, body),
        challengeId: body.challengeId,
        credentialId: body.credentialId,
        publicKey: body.publicKey,
        deviceName: body.deviceName
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/passkeys/assert") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.assertPasskey({
        sessionToken: readSessionToken(req, body),
        credentialId: body.credentialId,
        assertion: body.assertion
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/bankid/start") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.startBankIdAuthentication({ sessionToken: readSessionToken(req, body) }));
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/bankid/collect") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.collectBankIdAuthentication({
        sessionToken: readSessionToken(req, body),
        orderRef: body.orderRef,
        completionToken: body.completionToken
      })
    );
    return;
  }

  const usersMatch = matchPath(path, "/v1/org/companies/:companyId/users");
  if (usersMatch && req.method === "GET") {
    writeJson(res, 200, {
      items: platform.listCompanyUsers({
        sessionToken: readSessionToken(req),
        companyId: usersMatch.companyId
      })
    });
    return;
  }

  if (usersMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createCompanyUser({
        sessionToken: readSessionToken(req, body),
        companyId: usersMatch.companyId,
        email: body.email,
        displayName: body.displayName,
        roleCode: body.roleCode,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        requiresMfa: body.requiresMfa
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/org/delegations") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createDelegation({
        sessionToken: readSessionToken(req, body),
        ...body
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/org/object-grants") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createObjectGrant({
        sessionToken: readSessionToken(req, body),
        ...body
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/org/attest-chains") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createApprovalChain({
        sessionToken: readSessionToken(req, body),
        ...body
      })
    );
    return;
  }

  const approvalChainMatch = matchPath(path, "/v1/org/attest-chains/:approvalChainId");
  if (approvalChainMatch && req.method === "GET") {
    writeJson(res, 200, platform.getApprovalChain({ approvalChainId: approvalChainMatch.approvalChainId }));
    return;
  }

  if (req.method === "POST" && path === "/v1/authz/check") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.checkAuthorization({
        sessionToken: readSessionToken(req, body),
        action: body.action,
        resource: body.resource
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/onboarding/runs") {
    const body = await readJsonBody(req);
    writeJson(res, 201, platform.createOnboardingRun(body));
    return;
  }

  const onboardingRunMatch = matchPath(path, "/v1/onboarding/runs/:runId");
  if (onboardingRunMatch && req.method === "GET") {
    writeJson(
      res,
      200,
      platform.getOnboardingRun({
        runId: onboardingRunMatch.runId,
        resumeToken: url.searchParams.get("resumeToken") || req.headers["x-resume-token"]
      })
    );
    return;
  }

  const onboardingChecklistMatch = matchPath(path, "/v1/onboarding/runs/:runId/checklist");
  if (onboardingChecklistMatch && req.method === "GET") {
    writeJson(
      res,
      200,
      platform.getOnboardingChecklist({
        runId: onboardingChecklistMatch.runId,
        resumeToken: url.searchParams.get("resumeToken") || req.headers["x-resume-token"]
      })
    );
    return;
  }

  const stepMatchers = {
    company_profile: matchPath(path, "/v1/onboarding/runs/:runId/steps/company"),
    registrations: matchPath(path, "/v1/onboarding/runs/:runId/steps/registrations"),
    chart_template: matchPath(path, "/v1/onboarding/runs/:runId/steps/chart"),
    vat_setup: matchPath(path, "/v1/onboarding/runs/:runId/steps/vat"),
    fiscal_periods: matchPath(path, "/v1/onboarding/runs/:runId/steps/periods")
  };

  if (req.method === "POST") {
    for (const [stepCode, match] of Object.entries(stepMatchers)) {
      if (!match) {
        continue;
      }
      const body = await readJsonBody(req);
      writeJson(
        res,
        200,
        platform.updateOnboardingStep({
          runId: match.runId,
          resumeToken: body.resumeToken || req.headers["x-resume-token"],
          stepCode,
          payload: body
        })
      );
      return;
    }
  }

  if (req.method === "POST" && path === "/v1/documents") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.createDocumentRecord({
        companyId,
        documentType: body.documentType || null,
        sourceChannel: body.sourceChannel || "manual",
        sourceReference: body.sourceReference || null,
        retentionPolicyCode: body.retentionPolicyCode || null,
        metadataJson: body.metadataJson || {},
        receivedAt: body.receivedAt || new Date().toISOString(),
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const documentVersionsMatch = matchPath(path, "/v1/documents/:documentId/versions");
  if (documentVersionsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.appendDocumentVersion({
        companyId,
        documentId: documentVersionsMatch.documentId,
        variantType: body.variantType,
        storageKey: body.storageKey,
        mimeType: body.mimeType,
        contentText: body.contentText || null,
        contentBase64: body.contentBase64 || null,
        fileHash: body.fileHash || null,
        fileSizeBytes: body.fileSizeBytes ?? null,
        sourceReference: body.sourceReference || null,
        derivesFromDocumentVersionId: body.derivesFromDocumentVersionId || null,
        metadataJson: body.metadataJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const documentLinksMatch = matchPath(path, "/v1/documents/:documentId/links");
  if (documentLinksMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.linkDocumentRecord({
        companyId,
        documentId: documentLinksMatch.documentId,
        targetType: body.targetType,
        targetId: body.targetId,
        metadataJson: body.metadataJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const documentExportMatch = matchPath(path, "/v1/documents/:documentId/export");
  if (documentExportMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read"
    });
    writeJson(
      res,
      200,
      platform.exportDocumentChain({
        companyId,
        documentId: documentExportMatch.documentId,
        actorId: principal.userId,
        correlationId: createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/inbox/channels") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.registerInboxChannel({
        companyId,
        channelCode: body.channelCode,
        inboundAddress: body.inboundAddress,
        useCase: body.useCase,
        allowedMimeTypes: body.allowedMimeTypes,
        maxAttachmentSizeBytes: body.maxAttachmentSizeBytes,
        defaultDocumentType: body.defaultDocumentType || null,
        metadataJson: body.metadataJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/inbox/messages") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    const result = platform.ingestEmailMessage({
      companyId,
      recipientAddress: body.recipientAddress,
      messageId: body.messageId,
      rawStorageKey: body.rawStorageKey,
      senderAddress: body.senderAddress || null,
      subject: body.subject || null,
      payloadJson: body.payloadJson || {},
      receivedAt: body.receivedAt || new Date().toISOString(),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    });
    writeJson(res, result.duplicateDetected ? 200 : 201, result);
    return;
  }

  const emailIngestMessageMatch = matchPath(path, "/v1/inbox/messages/:emailIngestMessageId");
  if (emailIngestMessageMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read"
    });
    writeJson(
      res,
      200,
      platform.getEmailIngestMessage({
        companyId,
        emailIngestMessageId: emailIngestMessageMatch.emailIngestMessageId
      })
    );
    return;
  }

  writeJson(res, 404, { error: "not_found" });
}

function authorizeDocumentAccess({ platform, sessionToken, companyId, permissionCode }) {
  const { principal, decision } = platform.checkAuthorization({
    sessionToken,
    action: permissionCode,
    resource: {
      companyId,
      objectType: "document",
      objectId: companyId,
      scopeCode: "document"
    }
  });
  if (!decision.allowed) {
    throw createHttpError(403, decision.reasonCode, decision.explanation);
  }
  return principal;
}

function matchPath(actualPath, template) {
  const actualParts = actualPath.split("/").filter(Boolean);
  const templateParts = template.split("/").filter(Boolean);
  if (actualParts.length !== templateParts.length) {
    return null;
  }

  const params = {};
  for (let index = 0; index < templateParts.length; index += 1) {
    const templatePart = templateParts[index];
    const actualPart = actualParts[index];
    if (templatePart.startsWith(":")) {
      params[templatePart.slice(1)] = decodeURIComponent(actualPart);
      continue;
    }
    if (templatePart !== actualPart) {
      return null;
    }
  }
  return params;
}

function isPhase1Route(path) {
  return path.startsWith("/v1/auth") || path.startsWith("/v1/org") || path.startsWith("/v1/onboarding");
}

function isPhase2Route(path) {
  return path.startsWith("/v1/documents");
}

function isPhase2InboxRoute(path) {
  return path.startsWith("/v1/inbox");
}

async function readJsonBody(req, allowEmpty = false) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) {
    return allowEmpty ? {} : {};
  }
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("Request body is not valid JSON.");
    error.status = 400;
    error.code = "json_invalid";
    throw error;
  }
}

function readSessionToken(req, body = {}) {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return body.sessionToken || null;
}

function requireText(value, code, message) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createHttpError(400, code, message);
  }
  return value.trim();
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function writeError(res, error) {
  writeJson(res, error.status || 500, {
    error: error.code || "internal_error",
    message: error.message || "Unexpected error"
  });
}

function createCorrelationId() {
  return crypto.randomUUID();
}

function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function readFeatureFlags(env) {
  return {
    phase1AuthOnboardingEnabled: String(env.PHASE1_AUTH_ONBOARDING_ENABLED || "true").toLowerCase() !== "false",
    phase2DocumentArchiveEnabled: String(env.PHASE2_DOCUMENT_ARCHIVE_ENABLED || "true").toLowerCase() !== "false",
    phase2CompanyInboxEnabled: String(env.PHASE2_COMPANY_INBOX_ENABLED || "true").toLowerCase() !== "false"
  };
}

if (isMainModule(import.meta.url)) {
  const runtime = await startApiServer();
  process.on("SIGINT", async () => {
    await runtime.stop();
    process.exit(0);
  });
}
