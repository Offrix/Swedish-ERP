import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase13AutomationRoutes({ req, res, url, path, platform }) {
  if (req.method === "POST" && path === "/v1/automation/rule-packs") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "automation_rule_pack",
      objectId: companyId,
      scopeCode: "automation_rule_pack"
    });
    writeJson(
      res,
      201,
      platform.createNoCodeRulePack({
        rulePackId: body.rulePackId,
        domain: body.domain || "automation",
        jurisdiction: body.jurisdiction || "SE",
        effectiveFrom: body.effectiveFrom || new Date().toISOString().slice(0, 10),
        effectiveTo: body.effectiveTo || null,
        version: body.version || "1",
        semanticChangeSummary: body.semanticChangeSummary || "Automation rule pack created via API.",
        machineReadableRules: body.machineReadableRules || {},
        humanReadableExplanation: body.humanReadableExplanation || [],
        testVectors: body.testVectors || [],
        migrationNotes: body.migrationNotes || [],
        companyTypes: body.companyTypes || [],
        registrationCodes: body.registrationCodes || [],
        groupCodes: body.groupCodes || [],
        specialCaseCodes: body.specialCaseCodes || []
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/automation/rule-packs") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "automation_rule_pack",
      objectId: companyId,
      scopeCode: "automation_rule_pack"
    });
    writeJson(res, 200, {
      items: platform.listNoCodeRulePacks({
        domain: optionalText(url.searchParams.get("domain")),
        jurisdiction: optionalText(url.searchParams.get("jurisdiction"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/automation/posting-suggestions") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "automation_decision",
      objectId: companyId,
      scopeCode: "automation_decision"
    });
    const decision = platform.suggestLedgerPosting({
      companyId,
      companyUserId: principal.companyUserId || null,
      sourceObjectType: body.sourceObjectType,
      sourceObjectId: body.sourceObjectId,
      candidatePostings: body.candidatePostings,
      evidence: body.evidence || {},
      rulePackId: body.rulePackId,
      effectiveDate: body.effectiveDate,
      actorId: body.actorId || principal.companyUserId || "session_user"
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "automation.decision.ready",
      resourceType: "automation_decision",
      resourceId: decision.decisionId,
      payload: decision
    });
    writeJson(res, 201, decision);
    return true;
  }

  if (req.method === "POST" && path === "/v1/automation/classifications") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "automation_decision",
      objectId: companyId,
      scopeCode: "automation_decision"
    });
    const decision = platform.classifyArtifact({
      companyId,
      companyUserId: principal.companyUserId || null,
      classifierType: body.classifierType,
      candidates: body.candidates,
      evidence: body.evidence || {},
      rulePackId: body.rulePackId,
      effectiveDate: body.effectiveDate,
      actorId: body.actorId || principal.companyUserId || "session_user"
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "automation.decision.ready",
      resourceType: "automation_decision",
      resourceId: decision.decisionId,
      payload: decision
    });
    writeJson(res, 201, decision);
    return true;
  }

  if (req.method === "POST" && path === "/v1/automation/anomalies") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "automation_decision",
      objectId: companyId,
      scopeCode: "automation_decision"
    });
    const decision = platform.detectAnomaly({
      companyId,
      companyUserId: principal.companyUserId || null,
      anomalyType: body.anomalyType,
      actualValue: body.actualValue,
      expectedValue: body.expectedValue,
      tolerancePercent: body.tolerancePercent,
      evidence: body.evidence || {},
      rulePackId: body.rulePackId,
      effectiveDate: body.effectiveDate,
      actorId: body.actorId || principal.companyUserId || "session_user"
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "automation.decision.ready",
      resourceType: "automation_decision",
      resourceId: decision.decisionId,
      payload: decision
    });
    writeJson(res, 201, decision);
    return true;
  }

  if (req.method === "GET" && path === "/v1/automation/decisions") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "automation_decision",
      objectId: companyId,
      scopeCode: "automation_decision"
    });
    writeJson(res, 200, {
      items: platform.listAutomationDecisions({
        companyId,
        decisionType: optionalText(url.searchParams.get("decisionType"))
      })
    });
    return true;
  }

  const automationDecisionMatch = matchPath(path, "/v1/automation/decisions/:decisionId");
  if (req.method === "GET" && automationDecisionMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "automation_decision",
      objectId: automationDecisionMatch.decisionId,
      scopeCode: "automation_decision"
    });
    writeJson(res, 200, platform.getAutomationDecision({ companyId, decisionId: automationDecisionMatch.decisionId }));
    return true;
  }

  const automationOverrideMatch = matchPath(path, "/v1/automation/decisions/:decisionId/override");
  if (req.method === "POST" && automationOverrideMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "automation_decision",
      objectId: automationOverrideMatch.decisionId,
      scopeCode: "automation_decision"
    });
    writeJson(
      res,
      200,
      platform.overrideAutomationDecision({
        companyId,
        decisionId: automationOverrideMatch.decisionId,
        actorId: body.actorId || "session_user",
        overrideReasonCode: body.overrideReasonCode,
        acceptedOutputs: body.acceptedOutputs
      })
    );
    return true;
  }

  return false;
}
