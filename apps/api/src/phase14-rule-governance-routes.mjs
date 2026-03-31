import {
  authorizeCompanyAccess,
  createHttpError,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase14RuleGovernanceRoutes({ req, res, url, path, platform }) {
  if (req.method === "POST" && path === "/v1/ops/rule-governance/changes") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "regulatory_change_entry",
      objectId: companyId,
      scopeCode: "regulatory_change_entry"
    });
    writeJson(
      res,
      201,
      platform.createRegulatoryChangeEntry({
        companyId,
        targetType: body.targetType,
        targetKey: body.targetKey,
        targetId: body.targetId,
        changeSummary: body.changeSummary,
        reasonCode: body.reasonCode,
        plannedPublishAt: body.plannedPublishAt,
        stagedPublishAt: body.stagedPublishAt,
        actorId: body.actorId || principal.userId || "session_user",
        idempotencyKey: body.idempotencyKey
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/rule-governance/changes") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "regulatory_change_entry",
      objectId: companyId,
      scopeCode: "regulatory_change_entry"
    });
    writeJson(res, 200, {
      items: platform.listRegulatoryChangeEntries({
        companyId,
        status: optionalText(url.searchParams.get("status")),
        targetType: optionalText(url.searchParams.get("targetType")),
        targetKey: optionalText(url.searchParams.get("targetKey"))
      }),
      snapshot: platform.snapshotRegulatoryChangeCalendar({ companyId })
    });
    return true;
  }

  const changeEntryMatch = matchPath(path, "/v1/ops/rule-governance/changes/:regulatoryChangeEntryId");
  if (req.method === "GET" && changeEntryMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "regulatory_change_entry",
      objectId: changeEntryMatch.regulatoryChangeEntryId,
      scopeCode: "regulatory_change_entry"
    });
    writeJson(
      res,
      200,
      platform.getRegulatoryChangeEntry({ regulatoryChangeEntryId: changeEntryMatch.regulatoryChangeEntryId })
    );
    return true;
  }

  const sourceSnapshotMatch = matchPath(path, "/v1/ops/rule-governance/changes/:regulatoryChangeEntryId/source-snapshots");
  if (req.method === "POST" && sourceSnapshotMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "regulatory_change_entry",
      objectId: sourceSnapshotMatch.regulatoryChangeEntryId,
      scopeCode: "regulatory_change_entry"
    });
    writeJson(
      res,
      200,
      platform.captureRegulatorySourceSnapshot({
        companyId,
        regulatoryChangeEntryId: sourceSnapshotMatch.regulatoryChangeEntryId,
        actorId: body.actorId || principal.userId || "session_user",
        officialSourceUrl: body.officialSourceUrl,
        officialSourceRefs: body.officialSourceRefs,
        retrievedAt: body.retrievedAt,
        sourceChecksum: body.sourceChecksum,
        sourceSnapshotDate: body.sourceSnapshotDate,
        note: body.note
      })
    );
    return true;
  }

  const diffReviewMatch = matchPath(path, "/v1/ops/rule-governance/changes/:regulatoryChangeEntryId/diff-review");
  if (req.method === "POST" && diffReviewMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "regulatory_change_entry",
      objectId: diffReviewMatch.regulatoryChangeEntryId,
      scopeCode: "regulatory_change_entry"
    });
    writeJson(
      res,
      200,
      platform.recordRegulatoryDiffReview({
        companyId,
        regulatoryChangeEntryId: diffReviewMatch.regulatoryChangeEntryId,
        actorId: body.actorId || principal.userId || "session_user",
        diffSummary: body.diffSummary,
        impactSummary: body.impactSummary,
        approved: body.approved,
        breakingChangeRefs: body.breakingChangeRefs
      })
    );
    return true;
  }

  const sandboxVerificationMatch = matchPath(path, "/v1/ops/rule-governance/changes/:regulatoryChangeEntryId/sandbox-verification");
  if (req.method === "POST" && sandboxVerificationMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "regulatory_change_entry",
      objectId: sandboxVerificationMatch.regulatoryChangeEntryId,
      scopeCode: "regulatory_change_entry"
    });
    writeJson(
      res,
      200,
      platform.recordRegulatorySandboxVerification({
        companyId,
        regulatoryChangeEntryId: sandboxVerificationMatch.regulatoryChangeEntryId,
        actorId: body.actorId || principal.userId || "session_user",
        verificationResult: body.verificationResult,
        verificationEnvironment: body.verificationEnvironment,
        scenarioRefs: body.scenarioRefs,
        outputChecksum: body.outputChecksum,
        evidenceRef: body.evidenceRef
      })
    );
    return true;
  }

  const approvalMatch = matchPath(path, "/v1/ops/rule-governance/changes/:regulatoryChangeEntryId/approve");
  if (req.method === "POST" && approvalMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "regulatory_change_entry",
      objectId: approvalMatch.regulatoryChangeEntryId,
      scopeCode: "regulatory_change_entry"
    });
    assertApprovalRoleAllowed({
      platform,
      sessionToken,
      companyId,
      regulatoryChangeEntryId: approvalMatch.regulatoryChangeEntryId,
      approvalRole: body.approvalRole
    });
    writeJson(
      res,
      200,
      platform.approveRegulatoryChange({
        companyId,
        regulatoryChangeEntryId: approvalMatch.regulatoryChangeEntryId,
        actorId: body.actorId || principal.userId || "session_user",
        approvalRole: body.approvalRole,
        approvalRef: body.approvalRef,
        note: body.note
      })
    );
    return true;
  }

  const publishMatch = matchPath(path, "/v1/ops/rule-governance/changes/:regulatoryChangeEntryId/publish");
  if (req.method === "POST" && publishMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "regulatory_change_entry",
      objectId: publishMatch.regulatoryChangeEntryId,
      scopeCode: "regulatory_change_entry"
    });
    writeJson(
      res,
      200,
      platform.publishRegulatoryChange({
        companyId,
        regulatoryChangeEntryId: publishMatch.regulatoryChangeEntryId,
        actorId: body.actorId || principal.userId || "session_user",
        approvalRef: body.approvalRef
      })
    );
    return true;
  }

  const rollbackMatch = matchPath(path, "/v1/ops/rule-governance/changes/:regulatoryChangeEntryId/rollback");
  if (req.method === "POST" && rollbackMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "regulatory_change_entry",
      objectId: rollbackMatch.regulatoryChangeEntryId,
      scopeCode: "regulatory_change_entry"
    });
    writeJson(
      res,
      200,
      platform.activateRegulatoryRollback({
        companyId,
        regulatoryChangeEntryId: rollbackMatch.regulatoryChangeEntryId,
        actorId: body.actorId || principal.userId || "session_user",
        effectiveFrom: body.effectiveFrom,
        reasonCode: body.reasonCode,
        replayRequired: body.replayRequired
      })
    );
    return true;
  }

  return false;
}

function assertApprovalRoleAllowed({ platform, sessionToken, companyId, regulatoryChangeEntryId, approvalRole }) {
  const action = resolveRegulatoryChangeApprovalAction(approvalRole);
  const decision = platform.checkAuthorization({
    sessionToken,
    action,
    resource: {
      companyId,
      objectType: "regulatory_change_entry",
      objectId: regulatoryChangeEntryId,
      scopeCode: "regulatory_change_entry"
    }
  });
  if (decision.decision.allowed) {
    return;
  }
  throw createHttpError(403, "regulatory_change_approval_role_forbidden", "Current actor is not allowed to sign this approval role.");
}

function resolveRegulatoryChangeApprovalAction(approvalRole) {
  if (approvalRole === "domain_owner") {
    return "regulatory_change.approve.domain_owner";
  }
  if (approvalRole === "compliance_owner") {
    return "regulatory_change.approve.compliance_owner";
  }
  throw createHttpError(400, "regulatory_change_approval_role_invalid", "Approval role is not supported.");
}
