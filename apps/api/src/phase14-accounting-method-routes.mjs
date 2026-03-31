import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase14AccountingMethodRoutes({ req, res, url, path, platform, helpers }) {
  const { assertFinanceOperationsReadAccess } = helpers;

  if (req.method === "POST" && path === "/v1/accounting-method/eligibility-assessments") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
    writeJson(
      res,
      201,
      platform.assessCashMethodEligibility({
        companyId,
        assessmentDate: body.assessmentDate,
        annualNetTurnoverSek: body.annualNetTurnoverSek,
        legalFormCode: body.legalFormCode,
        financialEntityClassification: body.financialEntityClassification,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/accounting-method/eligibility-assessments") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listMethodEligibilityAssessments({ companyId }) });
    return true;
  }

  if (req.method === "POST" && path === "/v1/accounting-method/profiles") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
    writeJson(
      res,
      201,
      platform.createMethodProfile({
        companyId,
        methodCode: body.methodCode,
        effectiveFrom: body.effectiveFrom,
        effectiveTo: body.effectiveTo,
        fiscalYearStartDate: body.fiscalYearStartDate,
        legalBasisCode: body.legalBasisCode,
        eligibilityAssessmentId: body.eligibilityAssessmentId,
        onboardingOverride: body.onboardingOverride === true,
        methodChangeRequestId: body.methodChangeRequestId,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/accounting-method/profiles") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listMethodProfiles({
        companyId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  const accountingMethodProfileMatch = matchPath(path, "/v1/accounting-method/profiles/:methodProfileId");
  if (req.method === "GET" && accountingMethodProfileMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: accountingMethodProfileMatch.methodProfileId,
      scopeCode: "accounting_method"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.getMethodProfile({
        companyId,
        methodProfileId: accountingMethodProfileMatch.methodProfileId
      })
    );
    return true;
  }

  const activateMethodProfileMatch = matchPath(path, "/v1/accounting-method/profiles/:methodProfileId/activate");
  if (req.method === "POST" && activateMethodProfileMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "accounting_method",
      objectId: activateMethodProfileMatch.methodProfileId,
      scopeCode: "accounting_method"
    });
    writeJson(
      res,
      200,
      platform.activateMethodProfile({
        companyId,
        methodProfileId: activateMethodProfileMatch.methodProfileId,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/accounting-method/active") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const accountingDate = requireText(url.searchParams.get("accountingDate"), "accounting_date_required", "accountingDate is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, platform.getActiveMethodForDate({ companyId, accountingDate }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/accounting-method/history") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, platform.getMethodHistory({ companyId }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/accounting-method/change-requests") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
    writeJson(
      res,
      201,
      platform.submitMethodChangeRequest({
        companyId,
        requestedMethodCode: body.requestedMethodCode,
        requestedEffectiveFrom: body.requestedEffectiveFrom,
        reasonCode: body.reasonCode,
        fiscalYearStartDate: body.fiscalYearStartDate,
        onboardingOverride: body.onboardingOverride === true,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/accounting-method/change-requests") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listMethodChangeRequests({
        companyId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  const approveMethodChangeRequestMatch = matchPath(path, "/v1/accounting-method/change-requests/:methodChangeRequestId/approve");
  if (req.method === "POST" && approveMethodChangeRequestMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "accounting_method",
      objectId: approveMethodChangeRequestMatch.methodChangeRequestId,
      scopeCode: "accounting_method"
    });
    writeJson(
      res,
      200,
      platform.approveMethodChangeRequest({
        companyId,
        methodChangeRequestId: approveMethodChangeRequestMatch.methodChangeRequestId,
        actorId: principal.userId,
        decisionNote: body.decisionNote
      })
    );
    return true;
  }

  const rejectMethodChangeRequestMatch = matchPath(path, "/v1/accounting-method/change-requests/:methodChangeRequestId/reject");
  if (req.method === "POST" && rejectMethodChangeRequestMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "accounting_method",
      objectId: rejectMethodChangeRequestMatch.methodChangeRequestId,
      scopeCode: "accounting_method"
    });
    writeJson(
      res,
      200,
      platform.rejectMethodChangeRequest({
        companyId,
        methodChangeRequestId: rejectMethodChangeRequestMatch.methodChangeRequestId,
        actorId: principal.userId,
        decisionNote: body.decisionNote
      })
    );
    return true;
  }

  if (req.method === "POST" && path === "/v1/accounting-method/year-end-catch-up-runs") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
    writeJson(
      res,
      201,
      platform.runYearEndCatchUp({
        companyId,
        fiscalYearEndDate: body.fiscalYearEndDate,
        openItems: body.openItems,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/accounting-method/year-end-catch-up-runs") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listYearEndCatchUpRuns({ companyId }) });
    return true;
  }

  const reverseYearEndCatchUpRunMatch = matchPath(path, "/v1/accounting-method/year-end-catch-up-runs/:yearEndCatchUpRunId/reverse");
  if (req.method === "POST" && reverseYearEndCatchUpRunMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "accounting_method",
      objectId: reverseYearEndCatchUpRunMatch.yearEndCatchUpRunId,
      scopeCode: "accounting_method"
    });
    writeJson(
      res,
      200,
      platform.reverseYearEndCatchUpRun({
        companyId,
        yearEndCatchUpRunId: reverseYearEndCatchUpRunMatch.yearEndCatchUpRunId,
        reasonCode: body.reasonCode,
        reversedOn: body.reversedOn,
        actorId: principal.userId,
        approvedByActorId: body.approvedByActorId,
        approvedByRoleCode: body.approvedByRoleCode
      })
    );
    return true;
  }

  const yearEndCatchUpRunMatch = matchPath(path, "/v1/accounting-method/year-end-catch-up-runs/:yearEndCatchUpRunId");
  if (req.method === "GET" && yearEndCatchUpRunMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: yearEndCatchUpRunMatch.yearEndCatchUpRunId,
      scopeCode: "accounting_method"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.getYearEndCatchUpRun({
        companyId,
        yearEndCatchUpRunId: yearEndCatchUpRunMatch.yearEndCatchUpRunId
      })
    );
    return true;
  }

  return false;
}
