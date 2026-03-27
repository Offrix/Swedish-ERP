import {
  authorizeCompanyAccess,
  createHttpError,
  matchPath,
  optionalInteger,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

const OPEN_RUNTIME_REPLAY_PLAN_STATUSES = new Set(["pending_approval", "approved", "scheduled", "running"]);

export async function tryHandlePhase14Route({ req, res, url, path, platform }) {
  if (req.method === "POST" && path === "/v1/legal-forms/profiles") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "legal_form_profile",
      objectId: companyId,
      scopeCode: "annual_reporting"
    });
    assertFinanceOperationsReadAccess({ principal });
    const result = platform.createLegalFormProfile({
      companyId,
      legalFormCode: body.legalFormCode,
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo,
      filingProfileCode: body.filingProfileCode,
      signatoryClassCode: body.signatoryClassCode,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "legal_form.profile.updated",
      resourceType: "legal_form_profile",
      resourceId: result.legalFormProfileId,
      payload: result,
      mode: "production"
    });
    writeJson(res, 201, result);
    return true;
  }

  if (req.method === "GET" && path === "/v1/legal-forms/profiles") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "legal_form_profile",
      objectId: companyId,
      scopeCode: "annual_reporting"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listLegalFormProfiles({
        companyId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  const legalFormProfileMatch = matchPath(path, "/v1/legal-forms/profiles/:legalFormProfileId");
  if (req.method === "GET" && legalFormProfileMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "legal_form_profile",
      objectId: legalFormProfileMatch.legalFormProfileId,
      scopeCode: "annual_reporting"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.getLegalFormProfile({
        companyId,
        legalFormProfileId: legalFormProfileMatch.legalFormProfileId
      })
    );
    return true;
  }

  const legalFormActivateMatch = matchPath(path, "/v1/legal-forms/profiles/:legalFormProfileId/activate");
  if (req.method === "POST" && legalFormActivateMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "legal_form_profile",
      objectId: legalFormActivateMatch.legalFormProfileId,
      scopeCode: "annual_reporting"
    });
    assertFinanceOperationsReadAccess({ principal });
    const result = platform.activateLegalFormProfile({
      companyId,
      legalFormProfileId: legalFormActivateMatch.legalFormProfileId,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "legal_form.profile.updated",
      resourceType: "legal_form_profile",
      resourceId: result.legalFormProfileId,
      payload: result,
      mode: "production"
    });
    writeJson(res, 200, result);
    return true;
  }

  if (req.method === "GET" && path === "/v1/legal-forms/active") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const asOfDate = requireText(url.searchParams.get("asOfDate"), "as_of_date_required", "asOfDate is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "legal_form_profile",
      objectId: companyId,
      scopeCode: "annual_reporting"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, platform.resolveActiveLegalFormProfile({ companyId, asOfDate }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/legal-forms/reporting-obligations") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "reporting_obligation_profile",
      objectId: companyId,
      scopeCode: "annual_reporting"
    });
    assertFinanceOperationsReadAccess({ principal });
    const result = platform.createReportingObligationProfile({
      companyId,
      legalFormProfileId: body.legalFormProfileId,
      fiscalYearKey: body.fiscalYearKey,
      fiscalYearId: body.fiscalYearId,
      accountingPeriodId: body.accountingPeriodId,
      requiresAnnualReport: body.requiresAnnualReport === true,
      requiresYearEndAccounts: body.requiresYearEndAccounts === true,
      allowsSimplifiedYearEnd: body.allowsSimplifiedYearEnd === true,
      requiresBolagsverketFiling: body.requiresBolagsverketFiling === true,
      requiresTaxDeclarationPackage: body.requiresTaxDeclarationPackage !== false,
      declarationProfileCode: body.declarationProfileCode,
      signatoryClassCode: body.signatoryClassCode,
      packageFamilyCode: body.packageFamilyCode,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "legal_form.profile.updated",
      resourceType: "reporting_obligation_profile",
      resourceId: result.reportingObligationProfileId,
      payload: result,
      mode: "production"
    });
    writeJson(res, 201, result);
    return true;
  }

  if (req.method === "GET" && path === "/v1/legal-forms/reporting-obligations") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "reporting_obligation_profile",
      objectId: companyId,
      scopeCode: "annual_reporting"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listReportingObligationProfiles({
        companyId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  const reportingObligationMatch = matchPath(path, "/v1/legal-forms/reporting-obligations/:reportingObligationProfileId");
  if (req.method === "GET" && reportingObligationMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "reporting_obligation_profile",
      objectId: reportingObligationMatch.reportingObligationProfileId,
      scopeCode: "annual_reporting"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.getReportingObligationProfile({
        companyId,
        reportingObligationProfileId: reportingObligationMatch.reportingObligationProfileId
      })
    );
    return true;
  }

  const approveReportingObligationMatch = matchPath(path, "/v1/legal-forms/reporting-obligations/:reportingObligationProfileId/approve");
  if (req.method === "POST" && approveReportingObligationMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "reporting_obligation_profile",
      objectId: approveReportingObligationMatch.reportingObligationProfileId,
      scopeCode: "annual_reporting"
    });
    assertFinanceOperationsReadAccess({ principal });
    const result = platform.approveReportingObligationProfile({
      companyId,
      reportingObligationProfileId: approveReportingObligationMatch.reportingObligationProfileId,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "legal_form.profile.updated",
      resourceType: "reporting_obligation_profile",
      resourceId: result.reportingObligationProfileId,
      payload: result,
      mode: "production"
    });
    writeJson(res, 200, result);
    return true;
  }

  if (req.method === "GET" && path === "/v1/legal-forms/declaration-profile") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const asOfDate = requireText(url.searchParams.get("asOfDate"), "as_of_date_required", "asOfDate is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "legal_form_profile",
      objectId: companyId,
      scopeCode: "annual_reporting"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.resolveDeclarationProfile({
        companyId,
        asOfDate,
        fiscalYearKey: optionalText(url.searchParams.get("fiscalYearKey")),
        fiscalYearId: optionalText(url.searchParams.get("fiscalYearId")),
        accountingPeriodId: optionalText(url.searchParams.get("accountingPeriodId"))
      })
    );
    return true;
  }

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

  if (req.method === "POST" && path === "/v1/fiscal-years/profiles") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
    writeJson(
      res,
      201,
      platform.createFiscalYearProfile({
        companyId,
        legalFormCode: body.legalFormCode,
        ownerTaxationCode: body.ownerTaxationCode,
        groupAlignmentRequired: body.groupAlignmentRequired === true,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/fiscal-years/profiles") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listFiscalYearProfiles({ companyId }) });
    return true;
  }

  if (req.method === "POST" && path === "/v1/fiscal-years/change-requests") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
    writeJson(
      res,
      201,
      platform.submitFiscalYearChangeRequest({
        companyId,
        requestedStartDate: body.requestedStartDate,
        requestedEndDate: body.requestedEndDate,
        reasonCode: body.reasonCode,
        permissionReference: body.permissionReference,
        groupAlignmentStartDate: body.groupAlignmentStartDate,
        groupAlignmentEndDate: body.groupAlignmentEndDate,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/fiscal-years/change-requests") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listFiscalYearChangeRequests({
        companyId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  const approveFiscalYearChangeRequestMatch = matchPath(path, "/v1/fiscal-years/change-requests/:changeRequestId/approve");
  if (req.method === "POST" && approveFiscalYearChangeRequestMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "fiscal_year",
      objectId: approveFiscalYearChangeRequestMatch.changeRequestId,
      scopeCode: "fiscal_year"
    });
    writeJson(
      res,
      200,
      platform.approveFiscalYearChangeRequest({
        companyId,
        changeRequestId: approveFiscalYearChangeRequestMatch.changeRequestId,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "POST" && path === "/v1/fiscal-years") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
    writeJson(
      res,
      201,
      platform.createFiscalYear({
        companyId,
        fiscalYearProfileId: body.fiscalYearProfileId,
        startDate: body.startDate,
        endDate: body.endDate,
        approvalBasisCode: body.approvalBasisCode,
        changeRequestId: body.changeRequestId,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/fiscal-years") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listFiscalYears({
        companyId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  if (req.method === "GET" && path === "/v1/fiscal-years/active") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const accountingDate = requireText(url.searchParams.get("accountingDate"), "accounting_date_required", "accountingDate is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, platform.getActiveFiscalYearForDate({ companyId, accountingDate }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/fiscal-years/periods/lookup") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const accountingDate = requireText(url.searchParams.get("accountingDate"), "accounting_date_required", "accountingDate is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, platform.getPeriodForDate({ companyId, accountingDate }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/fiscal-years/history") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, platform.getFiscalYearHistory({ companyId }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/tax-account/events") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "tax_account",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listTaxAccountEvents({
        companyId,
        eventTypeCode: optionalText(url.searchParams.get("eventTypeCode")),
        mappingStatus: optionalText(url.searchParams.get("mappingStatus")),
        reconciliationStatus: optionalText(url.searchParams.get("reconciliationStatus"))
      }),
      balance: platform.getTaxAccountBalance({ companyId })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/tax-account/imports") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "tax_account",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    const result = platform.importTaxAccountEvents({
      companyId,
      importSource: body.importSource,
      statementDate: body.statementDate,
      importBatchId: body.importBatchId,
      events: body.events,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "tax_account.reconciliation.updated",
      resourceType: "tax_account_import_batch",
      resourceId: result.importBatch.importBatchId,
      payload: {
        importBatch: result.importBatch,
        importedCount: result.items.length,
        balance: platform.getTaxAccountBalance({ companyId })
      },
      mode: "production"
    });
    writeJson(res, 201, result);
    return true;
  }

  if (req.method === "GET" && path === "/v1/tax-account/reconciliations") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "tax_account",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listTaxAccountReconciliations({ companyId }),
      openDifferenceCases: platform.listOpenTaxAccountDifferenceCases({ companyId }),
      balance: platform.getTaxAccountBalance({ companyId })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/tax-account/reconciliations") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "tax_account",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    const result = platform.createTaxAccountReconciliation({
      companyId,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "tax_account.reconciliation.updated",
      resourceType: "tax_account_reconciliation_run",
      resourceId: result.reconciliationRunId,
      payload: result,
      mode: "production"
    });
    writeJson(res, 201, result);
    return true;
  }

  if (req.method === "POST" && path === "/v1/tax-account/offsets") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "tax_account",
      objectId: companyId,
      scopeCode: "tax_account"
    });
    const result = platform.approveTaxAccountOffset({
      companyId,
      taxAccountEventId: body.taxAccountEventId,
      reconciliationItemId: body.reconciliationItemId,
      offsetAmount: body.offsetAmount,
      offsetReasonCode: body.offsetReasonCode,
      reconciliationRunId: body.reconciliationRunId,
      approvalNote: body.approvalNote,
      actorId: principal.userId
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "tax_account.reconciliation.updated",
      resourceType: "tax_account_offset",
      resourceId: result.taxAccountOffsetId,
      payload: {
        offset: result,
        balance: platform.getTaxAccountBalance({ companyId })
      },
      mode: "production"
    });
    writeJson(res, 201, result);
    return true;
  }

  if (req.method === "GET" && path === "/v1/balances/types") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_type",
      objectId: companyId,
      scopeCode: "balances"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listBalanceTypes({
        companyId,
        active: optionalText(url.searchParams.get("active"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/balances/types") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "balance_type",
      objectId: companyId,
      scopeCode: "balances"
    });
    writeJson(
      res,
      201,
      platform.createBalanceType({
        companyId,
        balanceTypeCode: body.balanceTypeCode,
        label: body.label,
        unitCode: body.unitCode,
        negativeAllowed: body.negativeAllowed === true,
        minimumBalance: body.minimumBalance ?? null,
        maximumBalance: body.maximumBalance ?? null,
        carryForwardModeCode: body.carryForwardModeCode,
        carryForwardCapQuantity: body.carryForwardCapQuantity ?? null,
        expiryModeCode: body.expiryModeCode,
        expiryDays: body.expiryDays ?? null,
        expiryMonthDay: body.expiryMonthDay ?? null,
        expiryYearOffset: body.expiryYearOffset ?? 1,
        active: body.active !== false,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/balances/accounts") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_account",
      objectId: companyId,
      scopeCode: "balances"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listBalanceAccounts({
        companyId,
        balanceTypeCode: optionalText(url.searchParams.get("balanceTypeCode")),
        ownerTypeCode: optionalText(url.searchParams.get("ownerTypeCode")),
        employeeId: optionalText(url.searchParams.get("employeeId")),
        employmentId: optionalText(url.searchParams.get("employmentId")),
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/balances/accounts") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "balance_account",
      objectId: companyId,
      scopeCode: "balances"
    });
    writeJson(
      res,
      201,
      platform.openBalanceAccount({
        companyId,
        balanceTypeCode: body.balanceTypeCode,
        ownerTypeCode: body.ownerTypeCode,
        employeeId: body.employeeId ?? null,
        employmentId: body.employmentId ?? null,
        openedOn: body.openedOn ?? null,
        externalReference: body.externalReference ?? null,
        actorId: principal.userId
      })
    );
    return true;
  }

  const balanceAccountMatch = matchPath(path, "/v1/balances/accounts/:balanceAccountId");
  if (req.method === "GET" && balanceAccountMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_account",
      objectId: balanceAccountMatch.balanceAccountId,
      scopeCode: "balances"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.getBalanceAccount({
        companyId,
        balanceAccountId: balanceAccountMatch.balanceAccountId
      })
    );
    return true;
  }

  const balanceTransactionsMatch = matchPath(path, "/v1/balances/accounts/:balanceAccountId/transactions");
  if (req.method === "GET" && balanceTransactionsMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_transaction",
      objectId: balanceTransactionsMatch.balanceAccountId,
      scopeCode: "balances"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listBalanceTransactions({
        companyId,
        balanceAccountId: balanceTransactionsMatch.balanceAccountId
      })
    });
    return true;
  }

  if (req.method === "POST" && balanceTransactionsMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "balance_transaction",
      objectId: balanceTransactionsMatch.balanceAccountId,
      scopeCode: "balances"
    });
    writeJson(
      res,
      201,
      platform.recordBalanceTransaction({
        companyId,
        balanceAccountId: balanceTransactionsMatch.balanceAccountId,
        effectiveDate: body.effectiveDate,
        transactionTypeCode: body.transactionTypeCode,
        quantityDelta: body.quantityDelta,
        sourceDomainCode: body.sourceDomainCode,
        sourceObjectType: body.sourceObjectType,
        sourceObjectId: body.sourceObjectId,
        sourceReference: body.sourceReference ?? null,
        idempotencyKey: body.idempotencyKey ?? null,
        explanation: body.explanation ?? null,
        actorId: principal.userId
      })
    );
    return true;
  }

  const balanceSnapshotMatch = matchPath(path, "/v1/balances/accounts/:balanceAccountId/snapshot");
  if (req.method === "GET" && balanceSnapshotMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_snapshot",
      objectId: balanceSnapshotMatch.balanceAccountId,
      scopeCode: "balances"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.getBalanceSnapshot({
        companyId,
        balanceAccountId: balanceSnapshotMatch.balanceAccountId,
        cutoffDate: optionalText(url.searchParams.get("cutoffDate"))
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/balances/carry-forwards") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_carry_forward_run",
      objectId: companyId,
      scopeCode: "balances"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listBalanceCarryForwardRuns({ companyId }) });
    return true;
  }

  if (req.method === "POST" && path === "/v1/balances/carry-forwards") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "balance_carry_forward_run",
      objectId: companyId,
      scopeCode: "balances"
    });
    writeJson(
      res,
      201,
      platform.runBalanceCarryForward({
        companyId,
        sourceDate: body.sourceDate,
        targetDate: body.targetDate,
        balanceTypeCode: body.balanceTypeCode ?? null,
        balanceAccountId: body.balanceAccountId ?? null,
        idempotencyKey: body.idempotencyKey ?? null,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/balances/expiry-runs") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_expiry_run",
      objectId: companyId,
      scopeCode: "balances"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listBalanceExpiryRuns({ companyId }) });
    return true;
  }

  if (req.method === "POST" && path === "/v1/balances/expiry-runs") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "balance_expiry_run",
      objectId: companyId,
      scopeCode: "balances"
    });
    writeJson(
      res,
      201,
      platform.runBalanceExpiry({
        companyId,
        runDate: body.runDate,
        balanceTypeCode: body.balanceTypeCode ?? null,
        balanceAccountId: body.balanceAccountId ?? null,
        idempotencyKey: body.idempotencyKey ?? null,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/collective-agreements/families") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "agreement_family",
      objectId: companyId,
      scopeCode: "collective_agreements"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listAgreementFamilies({
        companyId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/collective-agreements/families") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "agreement_family",
      objectId: companyId,
      scopeCode: "collective_agreements"
    });
    writeJson(
      res,
      201,
      platform.createAgreementFamily({
        companyId,
        code: body.code,
        name: body.name,
        sectorCode: body.sectorCode ?? null,
        status: body.status ?? "active",
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/collective-agreements/versions") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "agreement_version",
      objectId: companyId,
      scopeCode: "collective_agreements"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listAgreementVersions({
        companyId,
        agreementFamilyId: optionalText(url.searchParams.get("agreementFamilyId")),
        agreementFamilyCode: optionalText(url.searchParams.get("agreementFamilyCode")),
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/collective-agreements/versions") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "agreement_version",
      objectId: companyId,
      scopeCode: "collective_agreements"
    });
    writeJson(
      res,
      201,
      platform.publishAgreementVersion({
        companyId,
        agreementFamilyId: body.agreementFamilyId ?? null,
        agreementFamilyCode: body.agreementFamilyCode ?? null,
        versionCode: body.versionCode ?? null,
        effectiveFrom: body.effectiveFrom,
        effectiveTo: body.effectiveTo ?? null,
        rulepackCode: body.rulepackCode || undefined,
        rulepackVersion: body.rulepackVersion,
        ruleSet: body.ruleSet ?? {},
        actorId: principal.userId
      })
    );
    return true;
  }

  const agreementVersionMatch = matchPath(path, "/v1/collective-agreements/versions/:agreementVersionId");
  if (req.method === "GET" && agreementVersionMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "agreement_version",
      objectId: agreementVersionMatch.agreementVersionId,
      scopeCode: "collective_agreements"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, platform.getAgreementVersion({
      companyId,
      agreementVersionId: agreementVersionMatch.agreementVersionId
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/collective-agreements/assignments") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "agreement_assignment",
      objectId: companyId,
      scopeCode: "collective_agreements"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listAgreementAssignments({
        companyId,
        employeeId: optionalText(url.searchParams.get("employeeId")),
        employmentId: optionalText(url.searchParams.get("employmentId")),
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/collective-agreements/assignments") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "agreement_assignment",
      objectId: companyId,
      scopeCode: "collective_agreements"
    });
    writeJson(
      res,
      201,
      platform.assignAgreementToEmployment({
        companyId,
        employeeId: body.employeeId,
        employmentId: body.employmentId,
        agreementVersionId: body.agreementVersionId,
        effectiveFrom: body.effectiveFrom,
        effectiveTo: body.effectiveTo ?? null,
        assignmentReasonCode: body.assignmentReasonCode,
        actorId: principal.userId
      })
    );
    return true;
  }

  const agreementOverridesMatch = matchPath(path, "/v1/collective-agreements/assignments/:agreementAssignmentId/overrides");
  if (req.method === "GET" && agreementOverridesMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "agreement_override",
      objectId: agreementOverridesMatch.agreementAssignmentId,
      scopeCode: "collective_agreements"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listAgreementOverrides({
        companyId,
        agreementAssignmentId: agreementOverridesMatch.agreementAssignmentId
      })
    });
    return true;
  }

  if (req.method === "POST" && agreementOverridesMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "agreement_override",
      objectId: agreementOverridesMatch.agreementAssignmentId,
      scopeCode: "collective_agreements"
    });
    writeJson(
      res,
      201,
      platform.createAgreementOverride({
        companyId,
        agreementAssignmentId: agreementOverridesMatch.agreementAssignmentId,
        overrideTypeCode: body.overrideTypeCode,
        overridePayload: body.overridePayload ?? {},
        effectiveFrom: body.effectiveFrom ?? null,
        effectiveTo: body.effectiveTo ?? null,
        reasonCode: body.reasonCode,
        approvedByActorId: body.approvedByActorId ?? principal.userId,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/collective-agreements/active") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const employeeId = requireText(url.searchParams.get("employeeId"), "employee_id_required", "employeeId is required.");
    const employmentId = requireText(url.searchParams.get("employmentId"), "employment_id_required", "employmentId is required.");
    const eventDate = requireText(url.searchParams.get("eventDate"), "event_date_required", "eventDate is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "agreement_assignment",
      objectId: employmentId,
      scopeCode: "collective_agreements"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, platform.getActiveAgreementForEmployment({
      companyId,
      employeeId,
      employmentId,
      eventDate
    }));
    return true;
  }

  const fiscalYearMatch = matchPath(path, "/v1/fiscal-years/:fiscalYearId");
  if (req.method === "GET" && fiscalYearMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "fiscal_year",
      objectId: fiscalYearMatch.fiscalYearId,
      scopeCode: "fiscal_year"
    });
    writeJson(res, 200, platform.getFiscalYear({ companyId, fiscalYearId: fiscalYearMatch.fiscalYearId }));
    return true;
  }

  const activateFiscalYearMatch = matchPath(path, "/v1/fiscal-years/:fiscalYearId/activate");
  if (req.method === "POST" && activateFiscalYearMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "fiscal_year",
      objectId: activateFiscalYearMatch.fiscalYearId,
      scopeCode: "fiscal_year"
    });
    writeJson(
      res,
      200,
      platform.activateFiscalYear({
        companyId,
        fiscalYearId: activateFiscalYearMatch.fiscalYearId,
        actorId: principal.userId
      })
    );
    return true;
  }

  const generatePeriodsMatch = matchPath(path, "/v1/fiscal-years/:fiscalYearId/generate-periods");
  if (req.method === "POST" && generatePeriodsMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "fiscal_year",
      objectId: generatePeriodsMatch.fiscalYearId,
      scopeCode: "fiscal_year"
    });
    writeJson(
      res,
      200,
      {
        items: platform.generatePeriods({
          companyId,
          fiscalYearId: generatePeriodsMatch.fiscalYearId,
          actorId: principal.userId
        })
      }
    );
    return true;
  }

  const reopenFiscalPeriodMatch = matchPath(path, "/v1/fiscal-years/periods/:periodId/reopen");
  if (req.method === "POST" && reopenFiscalPeriodMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "fiscal_period",
      objectId: reopenFiscalPeriodMatch.periodId,
      scopeCode: "fiscal_year"
    });
    writeJson(
      res,
      200,
      platform.reopenPeriod({
        companyId,
        periodId: reopenFiscalPeriodMatch.periodId,
        actorId: principal.userId,
        reasonCode: body.reasonCode
      })
    );
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/support-cases") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "support_case", objectId: companyId, scopeCode: "support_case" });
    writeJson(res, 201, platform.createSupportCase({
      sessionToken,
      companyId,
      category: body.category,
      severity: body.severity,
      requester: body.requester,
      relatedObjectRefs: body.relatedObjectRefs,
      policyScope: body.policyScope,
      approvedActions: body.approvedActions,
      ownerUserId: body.ownerUserId
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/support-cases") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "support_case", objectId: companyId, scopeCode: "support_case" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, { items: platform.listSupportCases({ sessionToken, companyId, status: optionalText(url.searchParams.get("status")) }) });
    return true;
  }

  const supportCloseMatch = matchPath(path, "/v1/backoffice/support-cases/:supportCaseId/close");
  if (req.method === "POST" && supportCloseMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "support_case", objectId: supportCloseMatch.supportCaseId, scopeCode: "support_case" });
    writeJson(res, 200, platform.closeSupportCase({
      sessionToken,
      companyId,
      supportCaseId: supportCloseMatch.supportCaseId,
      resolutionCode: body.resolutionCode,
      resolutionNote: body.resolutionNote
    }));
    return true;
  }

  const supportApprovalMatch = matchPath(path, "/v1/backoffice/support-cases/:supportCaseId/approve-actions");
  if (req.method === "POST" && supportApprovalMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "support_case", objectId: supportApprovalMatch.supportCaseId, scopeCode: "support_case" });
    writeJson(res, 200, platform.approveSupportCaseActions({
      sessionToken,
      companyId,
      supportCaseId: supportApprovalMatch.supportCaseId,
      approvedActions: body.approvedActions
    }));
    return true;
  }

  const supportDiagnosticMatch = matchPath(path, "/v1/backoffice/support-cases/:supportCaseId/diagnostics");
  if (req.method === "POST" && supportDiagnosticMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "admin_diagnostic", objectId: supportDiagnosticMatch.supportCaseId, scopeCode: "admin_diagnostic" });
    writeJson(res, 201, platform.runAdminDiagnostic({
      sessionToken,
      companyId,
      supportCaseId: supportDiagnosticMatch.supportCaseId,
      commandType: body.commandType,
      input: body.input || {}
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/audit-events") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "audit_event", objectId: companyId, scopeCode: "audit_event" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listAuditTrail({
        sessionToken,
        companyId,
        entityType: optionalText(url.searchParams.get("entityType")),
        correlationId: optionalText(url.searchParams.get("correlationId"))
      })
    });
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/audit-correlations") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "audit_correlation", objectId: companyId, scopeCode: "audit_event" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      query: {
        actorId: optionalText(url.searchParams.get("actorId")),
        entityType: optionalText(url.searchParams.get("entityType")),
        entityId: optionalText(url.searchParams.get("entityId"))
      },
      items: platform.listRuntimeAuditCorrelations({
        sessionToken,
        companyId,
        actorId: optionalText(url.searchParams.get("actorId")),
        entityType: optionalText(url.searchParams.get("entityType")),
        entityId: optionalText(url.searchParams.get("entityId"))
      })
    });
    return true;
  }

  const auditCorrelationMatch = matchPath(path, "/v1/backoffice/audit-correlations/:correlationId");
  if (req.method === "GET" && auditCorrelationMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "audit_correlation", objectId: auditCorrelationMatch.correlationId, scopeCode: "audit_event" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      correlation: platform.getRuntimeAuditCorrelation({
        sessionToken,
        companyId,
        correlationId: auditCorrelationMatch.correlationId
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/impersonations") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "impersonation_session", objectId: companyId, scopeCode: "impersonation_session" });
    writeJson(res, 201, platform.requestImpersonation({
      sessionToken,
      companyId,
      supportCaseId: body.supportCaseId,
      targetCompanyUserId: body.targetCompanyUserId,
      purposeCode: body.purposeCode,
      mode: body.mode,
      expiresInMinutes: body.expiresInMinutes,
      restrictedActions: body.restrictedActions
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/impersonations") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "impersonation_session", objectId: companyId, scopeCode: "impersonation_session" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, { items: platform.listImpersonationSessions({ sessionToken, companyId, status: optionalText(url.searchParams.get("status")) }) });
    return true;
  }

  const impersonationApproveMatch = matchPath(path, "/v1/backoffice/impersonations/:sessionId/approve");
  if (req.method === "POST" && impersonationApproveMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "impersonation_session", objectId: impersonationApproveMatch.sessionId, scopeCode: "impersonation_session" });
    writeJson(res, 200, platform.approveImpersonation({ sessionToken, companyId, sessionId: impersonationApproveMatch.sessionId }));
    return true;
  }

  const impersonationEndMatch = matchPath(path, "/v1/backoffice/impersonations/:sessionId/end");
  if (req.method === "POST" && impersonationEndMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "impersonation_session", objectId: impersonationEndMatch.sessionId, scopeCode: "impersonation_session" });
    writeJson(res, 200, platform.terminateImpersonation({ sessionToken, companyId, sessionId: impersonationEndMatch.sessionId, reasonCode: body.reasonCode }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/access-reviews") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "access_review_batch", objectId: companyId, scopeCode: "access_review_batch" });
    writeJson(res, 201, platform.generateAccessReview({
      sessionToken,
      companyId,
      scopeType: body.scopeType,
      scopeRef: body.scopeRef,
      dueInDays: body.dueInDays
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/access-reviews") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "access_review_batch", objectId: companyId, scopeCode: "access_review_batch" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, { items: platform.listAccessReviews({ sessionToken, companyId }) });
    return true;
  }

  const accessReviewDecisionMatch = matchPath(path, "/v1/backoffice/access-reviews/:reviewBatchId/findings/:findingId");
  if (req.method === "POST" && accessReviewDecisionMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "access_review_batch", objectId: accessReviewDecisionMatch.reviewBatchId, scopeCode: "access_review_batch" });
    writeJson(res, 200, platform.recordAccessReviewDecision({
      sessionToken,
      companyId,
      reviewBatchId: accessReviewDecisionMatch.reviewBatchId,
      findingId: accessReviewDecisionMatch.findingId,
      decision: body.decision,
      remediationNote: body.remediationNote
    }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/break-glass") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "break_glass_session", objectId: companyId, scopeCode: "break_glass_session" });
    writeJson(res, 201, platform.requestBreakGlass({
      sessionToken,
      companyId,
      incidentId: body.incidentId,
      purposeCode: body.purposeCode,
      requestedActions: body.requestedActions
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/break-glass") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "break_glass_session", objectId: companyId, scopeCode: "break_glass_session" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, { items: platform.listBreakGlassSessions({ sessionToken, companyId }) });
    return true;
  }

  const breakGlassApproveMatch = matchPath(path, "/v1/backoffice/break-glass/:breakGlassId/approve");
  if (req.method === "POST" && breakGlassApproveMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "break_glass_session", objectId: breakGlassApproveMatch.breakGlassId, scopeCode: "break_glass_session" });
    writeJson(res, 200, platform.approveBreakGlass({ sessionToken, companyId, breakGlassId: breakGlassApproveMatch.breakGlassId }));
    return true;
  }

  const breakGlassCloseMatch = matchPath(path, "/v1/backoffice/break-glass/:breakGlassId/close");
  if (req.method === "POST" && breakGlassCloseMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "break_glass_session", objectId: breakGlassCloseMatch.breakGlassId, scopeCode: "break_glass_session" });
    writeJson(res, 200, platform.closeBreakGlassSession({ sessionToken, companyId, breakGlassId: breakGlassCloseMatch.breakGlassId }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/jobs") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "async_job", objectId: companyId, scopeCode: "async_job" });
    assertBackofficeReadAccess({ principal });
    const items = await buildBackofficeJobRows({
      platform,
      companyId,
      status: optionalText(url.searchParams.get("status")),
      jobType: optionalText(url.searchParams.get("jobType")),
      operatorState: optionalText(url.searchParams.get("operatorState"))
    });
    writeJson(res, 200, {
      items,
      counters: {
        highRiskOpen: items.filter((item) => item.riskClass === "high" && !["succeeded", "cancelled"].includes(item.status)).length,
        deadLetterOpen: items.filter((item) => item.deadLetter?.operatorState && item.deadLetter.operatorState !== "closed").length,
        replayPlanned: items.filter((item) => OPEN_RUNTIME_REPLAY_PLAN_STATUSES.has(item.replayPlan?.status)).length
      }
    });
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/replays") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "async_job_replay_plan", objectId: companyId, scopeCode: "async_job" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: await buildBackofficeReplayRows({
        platform,
        companyId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  const replayApproveMatch = matchPath(path, "/v1/backoffice/replays/:replayPlanId/approve");
  if (req.method === "POST" && replayApproveMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "async_job_replay_plan", objectId: replayApproveMatch.replayPlanId, scopeCode: "async_job" });
    resolveBackofficeOperatorBinding({
      platform,
      sessionToken,
      companyId,
      supportCaseId: body.supportCaseId,
      incidentId: body.incidentId,
      requiredSupportAction: "plan_job_replay"
    });
    const replayPlan = await platform.approveRuntimeJobReplay({
      replayPlanId: replayApproveMatch.replayPlanId,
      approvedByUserId: principal.userId
    });
    writeJson(res, 200, { replayPlan });
    return true;
  }

  const replayExecuteMatch = matchPath(path, "/v1/backoffice/replays/:replayPlanId/execute");
  if (req.method === "POST" && replayExecuteMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "async_job_replay_plan", objectId: replayExecuteMatch.replayPlanId, scopeCode: "async_job" });
    resolveBackofficeOperatorBinding({
      platform,
      sessionToken,
      companyId,
      supportCaseId: body.supportCaseId,
      incidentId: body.incidentId,
      requiredSupportAction: "execute_job_replay"
    });
    const replay = await platform.executeRuntimeJobReplay({
      replayPlanId: replayExecuteMatch.replayPlanId,
      actorId: principal.userId
    });
    const deadLetter = (await platform.listRuntimeDeadLetters({ companyId }))
      .find((candidate) => candidate.jobId === replay.replayPlan.jobId) || null;
    const resolvedDeadLetter = deadLetter
      ? await platform.triageRuntimeDeadLetter({
        companyId,
        deadLetterId: deadLetter.deadLetterId,
        actorId: principal.userId,
        operatorState: "resolved"
      })
      : null;
    writeJson(res, 200, {
      replayPlan: replay.replayPlan,
      replayJob: replay.replayJob,
      deadLetter: resolvedDeadLetter
    });
    return true;
  }

  const backofficeJobReplayMatch = matchPath(path, "/v1/backoffice/jobs/:jobId/replay");
  if (req.method === "POST" && backofficeJobReplayMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "async_job", objectId: backofficeJobReplayMatch.jobId, scopeCode: "async_job" });
    resolveBackofficeOperatorBinding({
      platform,
      sessionToken,
      companyId,
      supportCaseId: body.supportCaseId,
      incidentId: body.incidentId,
      requiredSupportAction: "plan_job_replay"
    });
    const replayPlan = await platform.planRuntimeJobReplay({
      jobId: backofficeJobReplayMatch.jobId,
      plannedByUserId: principal.userId,
      reasonCode: body.reasonCode || "backoffice_manual_replay",
      plannedPayloadStrategy: body.plannedPayloadStrategy || "reuse"
    });
    const deadLetter = (await platform.listRuntimeDeadLetters({ companyId }))
      .find((candidate) => candidate.jobId === backofficeJobReplayMatch.jobId) || null;
    const triagedDeadLetter = deadLetter
      ? await platform.triageRuntimeDeadLetter({
        companyId,
        deadLetterId: deadLetter.deadLetterId,
        actorId: principal.userId,
        operatorState: "replay_planned"
      })
      : null;
    writeJson(res, 200, { replayPlan, deadLetter: triagedDeadLetter });
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/dead-letters") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "async_dead_letter", objectId: companyId, scopeCode: "async_job" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: await buildBackofficeDeadLetterRows({
        platform,
        companyId,
        operatorState: optionalText(url.searchParams.get("operatorState"))
      })
    });
    return true;
  }

  const deadLetterTriageMatch = matchPath(path, "/v1/backoffice/dead-letters/:deadLetterId/triage");
  if (req.method === "POST" && deadLetterTriageMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "async_dead_letter", objectId: deadLetterTriageMatch.deadLetterId, scopeCode: "async_job" });
    resolveBackofficeOperatorBinding({
      platform,
      sessionToken,
      companyId,
      supportCaseId: body.supportCaseId,
      incidentId: body.incidentId,
      requiredSupportAction: body.operatorState === "replay_planned" ? "plan_job_replay" : null
    });
    writeJson(res, 200, await platform.triageRuntimeDeadLetter({
      companyId,
      deadLetterId: deadLetterTriageMatch.deadLetterId,
      actorId: principal.userId,
      operatorState: body.operatorState
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/submissions/monitor") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "submission", objectId: companyId, scopeCode: "annual_reporting" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, await buildSubmissionMonitorPayload({
      platform,
      companyId,
      submissionType: optionalText(url.searchParams.get("submissionType")),
      ownerQueue: optionalText(url.searchParams.get("ownerQueue")),
      status: optionalText(url.searchParams.get("status")),
      asOf: optionalText(url.searchParams.get("asOf"))
    }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/submissions/monitor/scan") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "submission",
      objectId: companyId,
      scopeCode: "backoffice"
    });
    assertBackofficeReadAccess({ principal });

    const monitor = await buildSubmissionMonitorPayload({
      platform,
      companyId,
      submissionType: optionalText(body.submissionType),
      ownerQueue: optionalText(body.ownerQueue),
      status: optionalText(body.status),
      asOf: optionalText(body.asOf)
    });
    const scan = buildSubmissionMonitorScan({
      platform,
      companyId,
      principal,
      monitor,
      asOf: monitor.asOf
    });
    writeJson(res, 200, scan);
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/review-center/sla-scan") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "review_queue",
      objectId: companyId,
      scopeCode: "backoffice"
    });
    assertBackofficeReadAccess({ principal });

    const scan = platform.runReviewCenterSlaScan({
      companyId,
      asOf: body.asOf || null,
      actorId: principal.userId
    });

    const workItems = [];
    const notifications = [];
    const activityEntries = [];
    const incidentSignals = [];

    for (const escalation of scan.escalations) {
      const workItem = platform.upsertOperationalWorkItem({
        companyId,
        queueCode: escalation.queueCode,
        ownerTeamId: escalation.ownerTeamId,
        sourceType: "review_center_sla_breach",
        sourceId: escalation.reviewItemId,
        title: `SLA breach: ${escalation.itemTitle || escalation.reviewItemId}`,
        summary: escalation.recurringBreach
          ? `Recurring SLA breach in ${escalation.queueCode} for review item ${escalation.reviewItemId}.`
          : `SLA breach in ${escalation.queueCode} for review item ${escalation.reviewItemId}.`,
        priority: escalation.priority || "high",
        deadlineAt: escalation.sourceSlaDueAt,
        blockerScope: "sla_breach",
        escalationPolicyCode: escalation.escalationPolicyCode,
        actorId: principal.userId,
        metadata: {
          reviewEscalationId: escalation.reviewEscalationId,
          reviewItemId: escalation.reviewItemId,
          reviewQueueId: escalation.reviewQueueId,
          breachCount: escalation.breachCount,
          recurringBreach: escalation.recurringBreach
        }
      });
      workItems.push(workItem);

      const notificationTarget = resolveReviewSlaNotificationTarget({
        escalation,
        principal
      });
      const notification = platform.createNotification({
        companyId,
        recipientType: notificationTarget.recipientType,
        recipientId: notificationTarget.recipientId,
        categoryCode: "review_sla_breach",
        priorityCode: escalation.priority || "high",
        sourceDomainCode: "REVIEW_CENTER",
        sourceObjectType: "review_item",
        sourceObjectId: escalation.reviewItemId,
        title: escalation.recurringBreach
          ? `Recurring SLA breach in ${escalation.queueCode}`
          : `SLA breach in ${escalation.queueCode}`,
        body: escalation.recurringBreach
          ? `Review item ${escalation.itemTitle || escalation.reviewItemId} has breached SLA repeatedly and needs intervention.`
          : `Review item ${escalation.itemTitle || escalation.reviewItemId} has breached SLA and needs follow-up.`,
        deepLink: `/review-center/items/${escalation.reviewItemId}`,
        actorId: principal.userId
      });
      notifications.push(notification);

      const activityEntry = platform.projectActivityEntry({
        companyId,
        objectType: "review_item",
        objectId: escalation.reviewItemId,
        activityType: escalation.recurringBreach ? "review_sla_breach_recurring" : "review_sla_breach",
        actorType: "system",
        actorSnapshot: {
          actorId: principal.userId,
          actorLabel: "Backoffice SLA scan"
        },
        summary: escalation.recurringBreach
          ? `Recurring SLA breach recorded for ${escalation.itemTitle || escalation.reviewItemId}.`
          : `SLA breach recorded for ${escalation.itemTitle || escalation.reviewItemId}.`,
        occurredAt: scan.asOf,
        sourceEventId: escalation.reviewEscalationId,
        visibilityScope: "company",
        relatedObjects: [
          {
            relatedObjectType: "review_queue",
            relatedObjectId: escalation.reviewQueueId,
            relationCode: "belongs_to_queue"
          },
          {
            relatedObjectType: "operational_work_item",
            relatedObjectId: workItem.workItemId,
            relationCode: "follow_up_work_item"
          }
        ],
        actorId: principal.userId
      });
      activityEntries.push(activityEntry);

      if (escalation.recurringBreach) {
        incidentSignals.push(platform.recordRuntimeIncidentSignal({
          sessionToken,
          companyId,
          signalType: "review_queue_sla_breach",
          severity: mapQueuePriorityToIncidentSeverity(escalation.priority),
          summary: `Recurring SLA breach in ${escalation.queueCode}.`,
          sourceObjectType: "review_item",
          sourceObjectId: escalation.reviewItemId,
          metadata: {
            reviewEscalationId: escalation.reviewEscalationId,
            reviewQueueId: escalation.reviewQueueId,
            escalationPolicyCode: escalation.escalationPolicyCode,
            breachCount: escalation.breachCount
          }
        }));
      }
    }

    writeJson(res, 200, {
      scan,
      workItems,
      notifications,
      activityEntries,
      incidentSignals
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/incidents") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "runtime_incident", objectId: companyId, scopeCode: "backoffice" });
    writeJson(res, 201, platform.openRuntimeIncident({
      sessionToken,
      companyId,
      title: body.title,
      summary: body.summary,
      severity: body.severity,
      sourceSignalId: body.sourceSignalId || null,
      commanderUserId: body.commanderUserId || principal.userId,
      linkedCorrelationId: body.linkedCorrelationId || null,
      relatedObjectRefs: Array.isArray(body.relatedObjectRefs) ? body.relatedObjectRefs : [],
      impactScope: body.impactScope || null
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/incidents") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "runtime_incident", objectId: companyId, scopeCode: "backoffice" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listRuntimeIncidents({
        sessionToken,
        companyId,
        status: optionalText(url.searchParams.get("status")),
        severity: optionalText(url.searchParams.get("severity"))
      })
    });
    return true;
  }

  const incidentEventsMatch = matchPath(path, "/v1/backoffice/incidents/:incidentId/events");
  if (req.method === "GET" && incidentEventsMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "runtime_incident", objectId: incidentEventsMatch.incidentId, scopeCode: "backoffice" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listRuntimeIncidentEvents({
        sessionToken,
        companyId,
        incidentId: incidentEventsMatch.incidentId
      })
    });
    return true;
  }

  if (req.method === "POST" && incidentEventsMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "runtime_incident", objectId: incidentEventsMatch.incidentId, scopeCode: "backoffice" });
    writeJson(res, 201, platform.recordRuntimeIncidentEvent({
      sessionToken,
      companyId,
      incidentId: incidentEventsMatch.incidentId,
      eventType: body.eventType || "note_added",
      note: body.note,
      relatedObjectRefs: Array.isArray(body.relatedObjectRefs) ? body.relatedObjectRefs : [],
      linkedCorrelationId: body.linkedCorrelationId || null,
      metadata: body.metadata || {}
    }));
    return true;
  }

  const incidentPostReviewMatch = matchPath(path, "/v1/backoffice/incidents/:incidentId/post-review");
  if (req.method === "GET" && incidentPostReviewMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "runtime_incident", objectId: incidentPostReviewMatch.incidentId, scopeCode: "backoffice" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      postIncidentReview: platform.getRuntimeIncidentPostReview({
        sessionToken,
        companyId,
        incidentId: incidentPostReviewMatch.incidentId
      })
    });
    return true;
  }

  if (req.method === "POST" && incidentPostReviewMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "runtime_incident", objectId: incidentPostReviewMatch.incidentId, scopeCode: "backoffice" });
    writeJson(res, 201, platform.recordRuntimeIncidentPostReview({
      sessionToken,
      companyId,
      incidentId: incidentPostReviewMatch.incidentId,
      summary: body.summary,
      rootCauseSummary: body.rootCauseSummary,
      impactScope: body.impactScope || null,
      mitigationActions: Array.isArray(body.mitigationActions) ? body.mitigationActions : [],
      correctiveActions: Array.isArray(body.correctiveActions) ? body.correctiveActions : [],
      preventiveActions: Array.isArray(body.preventiveActions) ? body.preventiveActions : [],
      reviewedBreakGlassIds: Array.isArray(body.reviewedBreakGlassIds) ? body.reviewedBreakGlassIds : [],
      evidenceRefs: Array.isArray(body.evidenceRefs) ? body.evidenceRefs : []
    }));
    return true;
  }

  const incidentStatusMatch = matchPath(path, "/v1/backoffice/incidents/:incidentId/status");
  if (req.method === "POST" && incidentStatusMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "runtime_incident", objectId: incidentStatusMatch.incidentId, scopeCode: "backoffice" });
    writeJson(res, 200, platform.updateRuntimeIncidentStatus({
      sessionToken,
      companyId,
      incidentId: incidentStatusMatch.incidentId,
      status: body.status,
      note: body.note || null
    }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/ops/feature-flags") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "feature_flag", objectId: companyId, scopeCode: "feature_flag" });
    writeJson(res, 201, platform.upsertFeatureFlag({
      sessionToken,
      companyId,
      flagKey: body.flagKey,
      description: body.description,
      defaultEnabled: body.defaultEnabled,
      flagType: body.flagType,
      scopeType: body.scopeType,
      scopeRef: body.scopeRef,
      enabled: body.enabled,
      ownerUserId: body.ownerUserId,
      riskClass: body.riskClass,
      sunsetAt: body.sunsetAt,
      changeReason: body.changeReason,
      approvalActorIds: body.approvalActorIds
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/feature-flags") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "feature_flag", objectId: companyId, scopeCode: "feature_flag" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listFeatureFlags({ sessionToken, companyId, flagKey: optionalText(url.searchParams.get("flagKey")) }),
      resolved: platform.resolveRuntimeFlags({ companyId, companyUserId: optionalText(url.searchParams.get("companyUserId")) })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/ops/emergency-disables") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "emergency_disable", objectId: companyId, scopeCode: "emergency_disable" });
    writeJson(res, 201, platform.requestEmergencyDisable({
      sessionToken,
      companyId,
      flagKey: body.flagKey,
      scopeType: body.scopeType,
      scopeRef: body.scopeRef,
      reasonCode: body.reasonCode,
      expiresInMinutes: body.expiresInMinutes
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/emergency-disables") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "emergency_disable", objectId: companyId, scopeCode: "emergency_disable" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, { items: platform.listEmergencyDisables({ sessionToken, companyId }) });
    return true;
  }

  const emergencyDisableReleaseMatch = matchPath(path, "/v1/ops/emergency-disables/:emergencyDisableId/release");
  if (req.method === "POST" && emergencyDisableReleaseMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "emergency_disable", objectId: emergencyDisableReleaseMatch.emergencyDisableId, scopeCode: "emergency_disable" });
    writeJson(res, 200, platform.releaseEmergencyDisable({
      sessionToken,
      companyId,
      emergencyDisableId: emergencyDisableReleaseMatch.emergencyDisableId,
      verificationSummary: body.verificationSummary
    }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/ops/load-profiles") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "load_profile", objectId: companyId, scopeCode: "load_profile" });
    writeJson(res, 201, platform.recordLoadProfile({
      sessionToken,
      companyId,
      profileCode: body.profileCode,
      targetThroughputPerMinute: body.targetThroughputPerMinute,
      observedP95Ms: body.observedP95Ms,
      queueRecoverySeconds: body.queueRecoverySeconds,
      status: body.status
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/load-profiles") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "load_profile", objectId: companyId, scopeCode: "load_profile" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, { items: platform.listLoadProfiles({ sessionToken, companyId }) });
    return true;
  }

  if (req.method === "POST" && path === "/v1/ops/secrets") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "managed_secret", objectId: companyId, scopeCode: "backoffice" });
    writeJson(res, 201, platform.registerManagedSecret({
      sessionToken,
      companyId,
      mode: body.mode,
      providerCode: body.providerCode,
      secretType: body.secretType,
      secretRef: body.secretRef,
      ownerUserId: body.ownerUserId,
      backupOwnerUserId: body.backupOwnerUserId,
      rotationCadenceDays: body.rotationCadenceDays,
      supportsDualRunning: body.supportsDualRunning,
      metadataJson: body.metadataJson
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/secrets") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "managed_secret", objectId: companyId, scopeCode: "backoffice" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listManagedSecrets({
        sessionToken,
        companyId,
        mode: optionalText(url.searchParams.get("mode")),
        providerCode: optionalText(url.searchParams.get("providerCode"))
      })
    });
    return true;
  }

  const rotateManagedSecretMatch = matchPath(path, "/v1/ops/secrets/:managedSecretId/rotate");
  if (req.method === "POST" && rotateManagedSecretMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "managed_secret", objectId: rotateManagedSecretMatch.managedSecretId, scopeCode: "backoffice" });
    writeJson(res, 200, platform.rotateManagedSecret({
      sessionToken,
      companyId,
      managedSecretId: rotateManagedSecretMatch.managedSecretId,
      nextSecretRef: body.nextSecretRef,
      nextSecretVersion: body.nextSecretVersion,
      verificationMode: body.verificationMode,
      dualRunningUntil: body.dualRunningUntil,
      callbackSecretIds: body.callbackSecretIds,
      certificateChainIds: body.certificateChainIds
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/secret-rotations") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "secret_rotation", objectId: companyId, scopeCode: "backoffice" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listSecretRotationRecords({
        sessionToken,
        companyId,
        mode: optionalText(url.searchParams.get("mode")),
        providerCode: optionalText(url.searchParams.get("providerCode"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/ops/certificate-chains") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "certificate_chain", objectId: companyId, scopeCode: "backoffice" });
    writeJson(res, 201, platform.registerCertificateChain({
      sessionToken,
      companyId,
      mode: body.mode,
      providerCode: body.providerCode,
      certificateLabel: body.certificateLabel,
      callbackDomain: body.callbackDomain,
      subjectCommonName: body.subjectCommonName,
      sanDomains: body.sanDomains,
      certificateSecretRef: body.certificateSecretRef,
      privateKeySecretRef: body.privateKeySecretRef,
      ownerUserId: body.ownerUserId,
      backupOwnerUserId: body.backupOwnerUserId,
      issuedAt: body.issuedAt,
      notBefore: body.notBefore,
      notAfter: body.notAfter,
      renewalWindowDays: body.renewalWindowDays
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/certificate-chains") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "certificate_chain", objectId: companyId, scopeCode: "backoffice" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listCertificateChains({
        sessionToken,
        companyId,
        mode: optionalText(url.searchParams.get("mode")),
        providerCode: optionalText(url.searchParams.get("providerCode"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/ops/callback-secrets") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "callback_secret", objectId: companyId, scopeCode: "backoffice" });
    writeJson(res, 201, platform.registerCallbackSecret({
      sessionToken,
      companyId,
      mode: body.mode,
      providerCode: body.providerCode,
      callbackLabel: body.callbackLabel,
      callbackDomain: body.callbackDomain,
      callbackPath: body.callbackPath,
      currentSecretRef: body.currentSecretRef,
      managedSecretId: body.managedSecretId,
      ownerUserId: body.ownerUserId,
      backupOwnerUserId: body.backupOwnerUserId,
      rotationCadenceDays: body.rotationCadenceDays,
      overlapEndsAt: body.overlapEndsAt
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/callback-secrets") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "callback_secret", objectId: companyId, scopeCode: "backoffice" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listCallbackSecrets({
        sessionToken,
        companyId,
        mode: optionalText(url.searchParams.get("mode")),
        providerCode: optionalText(url.searchParams.get("providerCode"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/ops/restore-drills") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "restore_drill", objectId: companyId, scopeCode: "restore_drill" });
    writeJson(res, 201, platform.recordRestoreDrill({
      sessionToken,
      companyId,
      drillCode: body.drillCode,
      drillType: body.drillType,
      targetRtoMinutes: body.targetRtoMinutes,
      targetRpoMinutes: body.targetRpoMinutes,
      actualRtoMinutes: body.actualRtoMinutes,
      actualRpoMinutes: body.actualRpoMinutes,
      status: body.status,
      scheduledFor: body.scheduledFor,
      restorePlanId: body.restorePlanId,
      verificationSummary: body.verificationSummary,
      evidence: body.evidence
    }));
    return true;
  }

  const restoreDrillStartMatch = matchPath(path, "/v1/ops/restore-drills/:restoreDrillId/start");
  if (req.method === "POST" && restoreDrillStartMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "restore_drill", objectId: restoreDrillStartMatch.restoreDrillId, scopeCode: "restore_drill" });
    writeJson(res, 200, platform.startRestoreDrill({
      sessionToken,
      companyId,
      restoreDrillId: restoreDrillStartMatch.restoreDrillId,
      startedAt: body.startedAt
    }));
    return true;
  }

  const restoreDrillCompleteMatch = matchPath(path, "/v1/ops/restore-drills/:restoreDrillId/complete");
  if (req.method === "POST" && restoreDrillCompleteMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "restore_drill", objectId: restoreDrillCompleteMatch.restoreDrillId, scopeCode: "restore_drill" });
    writeJson(res, 200, platform.completeRestoreDrill({
      sessionToken,
      companyId,
      restoreDrillId: restoreDrillCompleteMatch.restoreDrillId,
      actualRtoMinutes: body.actualRtoMinutes,
      actualRpoMinutes: body.actualRpoMinutes,
      status: body.status,
      verificationSummary: body.verificationSummary,
      completedAt: body.completedAt,
      evidence: body.evidence
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/restore-drills") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "restore_drill", objectId: companyId, scopeCode: "restore_drill" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, { items: platform.listRestoreDrills({ sessionToken, companyId }) });
    return true;
  }

  if (req.method === "POST" && path === "/v1/ops/chaos-scenarios") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "chaos_scenario", objectId: companyId, scopeCode: "chaos_scenario" });
    writeJson(res, 201, platform.recordChaosScenario({
      sessionToken,
      companyId,
      scenarioCode: body.scenarioCode,
      failureMode: body.failureMode,
      queueRecoverySeconds: body.queueRecoverySeconds,
      impactSummary: body.impactSummary,
      status: body.status,
      restoreDrillId: body.restoreDrillId,
      evidence: body.evidence
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/chaos-scenarios") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "chaos_scenario", objectId: companyId, scopeCode: "chaos_scenario" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, { items: platform.listChaosScenarios({ sessionToken, companyId }) });
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/observability") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "observability", objectId: companyId, scopeCode: "resilience" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, await buildObservabilityPayload({
      platform,
      sessionToken,
      companyId,
      principal,
      asOf: optionalText(url.searchParams.get("asOf")),
      includeGlobal: url.searchParams.get("includeGlobal") !== "false",
      logLimit: optionalInteger(url.searchParams.get("logLimit")) || 50,
      traceLimit: optionalInteger(url.searchParams.get("traceLimit")) || 25
    }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/migration/mapping-sets") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_mapping_set", objectId: companyId, scopeCode: "migration_mapping_set" });
    writeJson(res, 201, platform.createMappingSet({
      sessionToken,
      companyId,
      sourceSystem: body.sourceSystem,
      domainScope: body.domainScope,
      versionNo: body.versionNo,
      mappings: body.mappings
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/mapping-sets") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_mapping_set", objectId: companyId, scopeCode: "migration_mapping_set" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listMappingSets({ sessionToken, companyId, sourceSystem: optionalText(url.searchParams.get("sourceSystem")) }) });
    return true;
  }

  const mappingApproveMatch = matchPath(path, "/v1/migration/mapping-sets/:mappingSetId/approve");
  if (req.method === "POST" && mappingApproveMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_mapping_set", objectId: mappingApproveMatch.mappingSetId, scopeCode: "migration_mapping_set" });
    writeJson(res, 200, platform.approveMappingSet({ sessionToken, companyId, mappingSetId: mappingApproveMatch.mappingSetId, batchIds: body.batchIds }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/migration/import-batches") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_import_batch", objectId: companyId, scopeCode: "migration_import_batch" });
    writeJson(res, 201, platform.registerImportBatch({
      sessionToken,
      companyId,
      sourceSystem: body.sourceSystem,
      batchType: body.batchType,
      recordCount: body.recordCount,
      hash: body.hash,
      scope: body.scope,
      mappingSetId: body.mappingSetId,
      objectRefs: body.objectRefs
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/import-batches") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_import_batch", objectId: companyId, scopeCode: "migration_import_batch" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listImportBatches({ sessionToken, companyId, status: optionalText(url.searchParams.get("status")) }) });
    return true;
  }

  const importRunMatch = matchPath(path, "/v1/migration/import-batches/:importBatchId/run");
  if (req.method === "POST" && importRunMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_import_batch", objectId: importRunMatch.importBatchId, scopeCode: "migration_import_batch" });
    writeJson(res, 200, platform.runImportBatch({ sessionToken, companyId, importBatchId: importRunMatch.importBatchId, autoAccept: body.autoAccept }));
    return true;
  }

  const importCorrectionMatch = matchPath(path, "/v1/migration/import-batches/:importBatchId/corrections");
  if (req.method === "POST" && importCorrectionMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_correction", objectId: importCorrectionMatch.importBatchId, scopeCode: "migration_correction" });
    writeJson(res, 201, platform.recordManualMigrationCorrection({
      sessionToken,
      companyId,
      importBatchId: importCorrectionMatch.importBatchId,
      sourceObjectId: body.sourceObjectId,
      targetObjectId: body.targetObjectId,
      reasonCode: body.reasonCode,
      comment: body.comment
    }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/migration/diff-reports") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_diff_report", objectId: companyId, scopeCode: "migration_diff_report" });
    const diffReport = platform.generateDiffReport({
      sessionToken,
      companyId,
      comparisonScope: body.comparisonScope,
      sourceSnapshotRef: body.sourceSnapshotRef,
      targetSnapshotRef: body.targetSnapshotRef,
      differenceItems: body.differenceItems
    });
    platform.emitWebhookEvent({ companyId, eventType: "migration.diff.generated", resourceType: "migration_diff_report", resourceId: diffReport.diffReportId, payload: diffReport });
    writeJson(res, 201, diffReport);
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/diff-reports") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_diff_report", objectId: companyId, scopeCode: "migration_diff_report" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listDiffReports({ sessionToken, companyId, status: optionalText(url.searchParams.get("status")) }) });
    return true;
  }

  const diffDecisionMatch = matchPath(path, "/v1/migration/diff-reports/:diffReportId/items/:itemId");
  if (req.method === "POST" && diffDecisionMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_diff_report", objectId: diffDecisionMatch.diffReportId, scopeCode: "migration_diff_report" });
    writeJson(res, 200, platform.recordDifferenceDecision({
      sessionToken,
      companyId,
      diffReportId: diffDecisionMatch.diffReportId,
      itemId: diffDecisionMatch.itemId,
      decision: body.decision,
      comment: body.comment
    }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/migration/cutover-plans") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: companyId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 201, platform.createCutoverPlan({
      sessionToken,
      companyId,
      freezeAt: body.freezeAt,
      rollbackPoint: body.rollbackPoint,
      rollbackPointRef: body.rollbackPointRef,
      acceptedVarianceThresholds: body.acceptedVarianceThresholds,
      stabilizationWindowHours: body.stabilizationWindowHours,
      signoffChain: body.signoffChain,
      goLiveChecklist: body.goLiveChecklist
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/cutover-plans") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_cutover_plan", objectId: companyId, scopeCode: "migration_cutover_plan" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listCutoverPlans({ sessionToken, companyId }) });
    return true;
  }

  if (req.method === "POST" && path === "/v1/migration/acceptance-records") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_acceptance_record", objectId: companyId, scopeCode: "migration_cockpit" });
    writeJson(res, 201, platform.createMigrationAcceptanceRecord({
      sessionToken,
      companyId,
      acceptanceType: body.acceptanceType,
      cutoverPlanId: body.cutoverPlanId,
      importBatchIds: body.importBatchIds,
      diffReportIds: body.diffReportIds,
      sourceParitySummary: body.sourceParitySummary,
      signoffRefs: body.signoffRefs,
      rollbackPointRef: body.rollbackPointRef,
      notes: body.notes
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/acceptance-records") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_acceptance_record", objectId: companyId, scopeCode: "migration_cockpit" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listMigrationAcceptanceRecords({
        sessionToken,
        companyId,
        acceptanceType: optionalText(url.searchParams.get("acceptanceType")),
        status: optionalText(url.searchParams.get("status")),
        cutoverPlanId: optionalText(url.searchParams.get("cutoverPlanId"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/migration/post-cutover-correction-cases") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_post_cutover_correction_case", objectId: companyId, scopeCode: "migration_cockpit" });
    writeJson(res, 201, platform.createPostCutoverCorrectionCase({
      sessionToken,
      companyId,
      cutoverPlanId: body.cutoverPlanId,
      reasonCode: body.reasonCode,
      linkedSourceBatchIds: body.linkedSourceBatchIds,
      targetObjectRefs: body.targetObjectRefs,
      regulatedSubmissionRefs: body.regulatedSubmissionRefs,
      acceptanceReportDelta: body.acceptanceReportDelta
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/post-cutover-correction-cases") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_post_cutover_correction_case", objectId: companyId, scopeCode: "migration_cockpit" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listPostCutoverCorrectionCases({
        sessionToken,
        companyId,
        cutoverPlanId: optionalText(url.searchParams.get("cutoverPlanId")),
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  const cutoverSignoffMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/signoffs");
  if (req.method === "POST" && cutoverSignoffMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverSignoffMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.recordCutoverSignoff({ sessionToken, companyId, cutoverPlanId: cutoverSignoffMatch.cutoverPlanId }));
    return true;
  }

  const cutoverChecklistMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/checklist/:itemCode");
  if (req.method === "POST" && cutoverChecklistMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverChecklistMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.updateCutoverChecklistItem({
      sessionToken,
      companyId,
      cutoverPlanId: cutoverChecklistMatch.cutoverPlanId,
      itemCode: cutoverChecklistMatch.itemCode,
      status: body.status
    }));
    return true;
  }

  const cutoverStartMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/start");
  if (req.method === "POST" && cutoverStartMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverStartMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.startCutover({ sessionToken, companyId, cutoverPlanId: cutoverStartMatch.cutoverPlanId }));
    return true;
  }

  const cutoverExtractMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/final-extract");
  if (req.method === "POST" && cutoverExtractMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverExtractMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.completeFinalExtract({ sessionToken, companyId, cutoverPlanId: cutoverExtractMatch.cutoverPlanId, lastExtractAt: body.lastExtractAt }));
    return true;
  }

  const cutoverValidateMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/validate");
  if (req.method === "POST" && cutoverValidateMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverValidateMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, await platform.passCutoverValidation({
      sessionToken,
      companyId,
      cutoverPlanId: cutoverValidateMatch.cutoverPlanId,
      contractTestsPassed: body.contractTestsPassed === true,
      goldenScenariosPassed: body.goldenScenariosPassed === true,
      runbooksAcknowledged: body.runbooksAcknowledged === true,
      restoreDrillFreshnessDays: body.restoreDrillFreshnessDays
    }));
    return true;
  }

  const cutoverSwitchMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/switch");
  if (req.method === "POST" && cutoverSwitchMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverSwitchMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.switchCutover({ sessionToken, companyId, cutoverPlanId: cutoverSwitchMatch.cutoverPlanId }));
    return true;
  }

  const cutoverStabilizeMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/stabilize");
  if (req.method === "POST" && cutoverStabilizeMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverStabilizeMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.stabilizeCutover({ sessionToken, companyId, cutoverPlanId: cutoverStabilizeMatch.cutoverPlanId, close: body.close === true }));
    return true;
  }

  const cutoverRollbackMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/rollback");
  if (req.method === "POST" && cutoverRollbackMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverRollbackMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.startRollback({
      sessionToken,
      companyId,
      cutoverPlanId: cutoverRollbackMatch.cutoverPlanId,
      reasonCode: body.reasonCode,
      rollbackOwnerUserId: body.rollbackOwnerUserId,
      supportSignoffRef: body.supportSignoffRef,
      securitySignoffRef: body.securitySignoffRef,
      complianceSignoffRef: body.complianceSignoffRef,
      suspendIntegrationCodes: body.suspendIntegrationCodes,
      freezeOperationalIntake: body.freezeOperationalIntake,
      recoveryPlanCode: body.recoveryPlanCode,
      recoveryPlanNote: body.recoveryPlanNote
    }));
    return true;
  }

  const cutoverRollbackCompleteMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/rollback/complete");
  if (req.method === "POST" && cutoverRollbackCompleteMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverRollbackCompleteMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.completeRollback({
      sessionToken,
      companyId,
      cutoverPlanId: cutoverRollbackCompleteMatch.cutoverPlanId,
      integrationsSuspended: body.integrationsSuspended,
      switchMarkersReversed: body.switchMarkersReversed,
      auditEvidencePreserved: body.auditEvidencePreserved,
      immutableReceiptsPreserved: body.immutableReceiptsPreserved,
      stagedObjectsPurged: body.stagedObjectsPurged,
      recoveryPlanActivated: body.recoveryPlanActivated
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/cockpit") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_cockpit", objectId: companyId, scopeCode: "migration_cockpit" });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, platform.getMigrationCockpit({ sessionToken, companyId }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/notifications") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "notification", objectId: companyId, scopeCode: "notifications" });
    const recipientType = optionalText(url.searchParams.get("recipientType"));
    const recipientId = optionalText(url.searchParams.get("recipientId"));
    const status = optionalText(url.searchParams.get("status"));
    const categoryCode = optionalText(url.searchParams.get("categoryCode"));
    const onlyUnread = url.searchParams.get("onlyUnread") === "true";
    const targets = resolveNotificationRecipientTargets({ principal, recipientType, recipientId });
    writeJson(res, 200, {
      items: listAccessibleNotifications({
        platform,
        companyId,
        targets,
        status,
        categoryCode,
        onlyUnread
      }),
      summary: buildAccessibleNotificationSummary({
        platform,
        companyId,
        targets,
        status,
        categoryCode,
        onlyUnread
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/notifications/bulk-actions") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "notification", objectId: companyId, scopeCode: "notifications" });
    const notificationIds = requireTextArray(body.notificationIds, "notification_ids_required", "notificationIds must contain at least one notification id.");
    for (const notificationId of notificationIds) {
      assertNotificationReadAccess({ platform, principal, companyId, notificationId });
    }
    writeJson(res, 200, platform.bulkApplyNotificationAction({
      companyId,
      notificationIds,
      actionCode: body.actionCode,
      actorId: principal.userId
    }));
    return true;
  }

  const notificationMatch = matchPath(path, "/v1/notifications/:notificationId");
  if (req.method === "GET" && notificationMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "notification", objectId: notificationMatch.notificationId, scopeCode: "notifications" });
    assertNotificationReadAccess({ platform, principal, companyId, notificationId: notificationMatch.notificationId });
    writeJson(res, 200, platform.getNotification({
      companyId,
      notificationId: notificationMatch.notificationId
    }));
    return true;
  }

  const notificationReadMatch = matchPath(path, "/v1/notifications/:notificationId/read");
  if (req.method === "POST" && notificationReadMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "notification", objectId: notificationReadMatch.notificationId, scopeCode: "notifications" });
    assertNotificationReadAccess({ platform, principal, companyId, notificationId: notificationReadMatch.notificationId });
    writeJson(res, 200, platform.markNotificationRead({
      companyId,
      notificationId: notificationReadMatch.notificationId,
      actorId: principal.userId
    }));
    return true;
  }

  const notificationAckMatch = matchPath(path, "/v1/notifications/:notificationId/ack");
  if (req.method === "POST" && notificationAckMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "notification", objectId: notificationAckMatch.notificationId, scopeCode: "notifications" });
    assertNotificationReadAccess({ platform, principal, companyId, notificationId: notificationAckMatch.notificationId });
    writeJson(res, 200, platform.acknowledgeNotification({
      companyId,
      notificationId: notificationAckMatch.notificationId,
      actorId: principal.userId
    }));
    return true;
  }

  const notificationSnoozeMatch = matchPath(path, "/v1/notifications/:notificationId/snooze");
  if (req.method === "POST" && notificationSnoozeMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "notification", objectId: notificationSnoozeMatch.notificationId, scopeCode: "notifications" });
    assertNotificationReadAccess({ platform, principal, companyId, notificationId: notificationSnoozeMatch.notificationId });
    writeJson(res, 200, platform.snoozeNotification({
      companyId,
      notificationId: notificationSnoozeMatch.notificationId,
      until: body.until || null,
      actorId: principal.userId
    }));
    return true;
  }

  const notificationAcknowledgeMatch = matchPath(path, "/v1/notifications/:notificationId/acknowledge");
  if (req.method === "POST" && notificationAcknowledgeMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "notification", objectId: notificationAcknowledgeMatch.notificationId, scopeCode: "notifications" });
    assertNotificationReadAccess({ platform, principal, companyId, notificationId: notificationAcknowledgeMatch.notificationId });
    writeJson(res, 200, platform.acknowledgeNotification({
      companyId,
      notificationId: notificationAcknowledgeMatch.notificationId,
      actorId: principal.userId
    }));
    return true;
  }

  const notificationRetryMatch = matchPath(path, "/v1/backoffice/notifications/:notificationId/retry-delivery");
  if (req.method === "POST" && notificationRetryMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "notification",
      objectId: notificationRetryMatch.notificationId,
      scopeCode: "notifications"
    });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, platform.retryNotificationDelivery({
      companyId,
      notificationId: notificationRetryMatch.notificationId,
      channelCode: body.channelCode || null,
      actorId: principal.userId
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/activity") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "activity_entry", objectId: companyId, scopeCode: "activity" });
    const objectType = optionalText(url.searchParams.get("objectType"));
    const objectId = optionalText(url.searchParams.get("objectId"));
    const isObjectTimelineRequest = Boolean(objectType && objectId);
    if (!isObjectTimelineRequest) {
      assertActivityFeedFullReadAccess({ principal });
    }
    writeJson(res, 200, platform.listActivityEntriesPage({
      companyId,
      objectType,
      objectId,
      visibilityScope: optionalText(url.searchParams.get("visibilityScope")),
      relatedObjectType: optionalText(url.searchParams.get("relatedObjectType")),
      relatedObjectId: optionalText(url.searchParams.get("relatedObjectId")),
      limit: parsePositiveInteger(url.searchParams.get("limit"), "activity_limit_invalid", "limit must be a positive integer.") || null,
      cursor: optionalText(url.searchParams.get("cursor"))
    }));
    return true;
  }

  const activityObjectMatch = matchPath(path, "/v1/activity/object/:objectType/:objectId");
  if (req.method === "GET" && activityObjectMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "activity_entry", objectId: activityObjectMatch.objectId, scopeCode: "activity" });
    writeJson(res, 200, platform.listActivityEntriesPage({
      companyId,
      objectType: activityObjectMatch.objectType,
      objectId: activityObjectMatch.objectId,
      visibilityScope: optionalText(url.searchParams.get("visibilityScope")),
      relatedObjectType: optionalText(url.searchParams.get("relatedObjectType")),
      relatedObjectId: optionalText(url.searchParams.get("relatedObjectId")),
      limit: parsePositiveInteger(url.searchParams.get("limit"), "activity_limit_invalid", "limit must be a positive integer.") || null,
      cursor: optionalText(url.searchParams.get("cursor"))
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/review-center/queues") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "review_queue", objectId: companyId, scopeCode: "review_center" });
    assertReviewCenterReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listReviewCenterQueues({
        companyId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  if (req.method === "GET" && path === "/v1/review-center/items") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "review_item", objectId: companyId, scopeCode: "review_center" });
    assertReviewCenterReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listReviewCenterItems({
        companyId,
        queueCode: optionalText(url.searchParams.get("queueCode")),
        status: optionalText(url.searchParams.get("status")),
        assignedUserId: optionalText(url.searchParams.get("assignedUserId")),
        riskClass: optionalText(url.searchParams.get("riskClass")),
        sourceDomainCode: optionalText(url.searchParams.get("sourceDomainCode"))
      })
    });
    return true;
  }

  const reviewCenterItemMatch = matchPath(path, "/v1/review-center/items/:reviewItemId");
  if (req.method === "GET" && reviewCenterItemMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "review_item", objectId: reviewCenterItemMatch.reviewItemId, scopeCode: "review_center" });
    assertReviewCenterReadAccess({ principal });
    writeJson(res, 200, platform.getReviewCenterItem({
      companyId,
      reviewItemId: reviewCenterItemMatch.reviewItemId
    }));
    return true;
  }

  const reviewCenterClaimMatch = matchPath(path, "/v1/review-center/items/:reviewItemId/claim");
  if (req.method === "POST" && reviewCenterClaimMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "review_item", objectId: reviewCenterClaimMatch.reviewItemId, scopeCode: "review_center" });
    assertReviewCenterActionAccess({
      platform,
      principal,
      companyId,
      reviewItemId: reviewCenterClaimMatch.reviewItemId,
      operation: "claim"
    });
    writeJson(res, 200, platform.claimReviewCenterItem({
      companyId,
      reviewItemId: reviewCenterClaimMatch.reviewItemId,
      actorId: principal.userId
    }));
    return true;
  }

  const reviewCenterDecideMatch = matchPath(path, "/v1/review-center/items/:reviewItemId/decide");
  if (req.method === "POST" && reviewCenterDecideMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "review_item", objectId: reviewCenterDecideMatch.reviewItemId, scopeCode: "review_center" });
    assertReviewCenterActionAccess({
      platform,
      principal,
      companyId,
      reviewItemId: reviewCenterDecideMatch.reviewItemId,
      operation: "decide"
    });
    writeJson(res, 200, platform.decideReviewCenterItem({
      companyId,
      reviewItemId: reviewCenterDecideMatch.reviewItemId,
      decisionCode: body.decisionCode,
      reasonCode: body.reasonCode,
      note: body.note || null,
      decisionPayload: body.decisionPayload || {},
      evidenceRefs: body.evidenceRefs || [],
      overrideReasonCode: body.overrideReasonCode || null,
      resultingCommand: body.resultingCommand || null,
      targetQueueCode: body.targetQueueCode || null,
      actorId: principal.userId
    }));
    return true;
  }

  const documentClassificationCasesMatch = matchPath(path, "/v1/documents/:documentId/classification-cases");
  if (req.method === "POST" && documentClassificationCasesMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "classification_case",
      objectId: documentClassificationCasesMatch.documentId,
      scopeCode: "document_classification"
    });
    writeJson(
      res,
      201,
      platform.createClassificationCase({
        companyId,
        documentId: documentClassificationCasesMatch.documentId,
        sourceOcrRunId: body.sourceOcrRunId || null,
        extractedFields: body.extractedFields || {},
        lineInputs: body.lineInputs || [],
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && documentClassificationCasesMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "classification_case",
      objectId: documentClassificationCasesMatch.documentId,
      scopeCode: "document_classification"
    });
    assertReviewCenterReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listClassificationCases({
        companyId,
        documentId: documentClassificationCasesMatch.documentId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  const documentClassificationCaseMatch = matchPath(path, "/v1/documents/:documentId/classification-cases/:classificationCaseId");
  if (req.method === "GET" && documentClassificationCaseMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "classification_case",
      objectId: documentClassificationCaseMatch.classificationCaseId,
      scopeCode: "document_classification"
    });
    assertReviewCenterReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.getClassificationCase({
        companyId,
        classificationCaseId: documentClassificationCaseMatch.classificationCaseId
      })
    );
    return true;
  }

  const documentClassificationApproveMatch = matchPath(path, "/v1/documents/:documentId/classification-cases/:classificationCaseId/decide");
  if (req.method === "POST" && documentClassificationApproveMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "classification_case",
      objectId: documentClassificationApproveMatch.classificationCaseId,
      scopeCode: "document_classification"
    });
    writeJson(
      res,
      200,
      platform.approveClassificationCase({
        companyId,
        classificationCaseId: documentClassificationApproveMatch.classificationCaseId,
        approvalNote: body.approvalNote || null,
        actorId: principal.userId
      })
    );
    return true;
  }

  const documentClassificationDispatchMatch = matchPath(path, "/v1/documents/:documentId/classification-cases/:classificationCaseId/dispatch");
  if (req.method === "POST" && documentClassificationDispatchMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "classification_case",
      objectId: documentClassificationDispatchMatch.classificationCaseId,
      scopeCode: "document_classification"
    });
    writeJson(
      res,
      200,
      platform.dispatchTreatmentIntents({
        companyId,
        classificationCaseId: documentClassificationDispatchMatch.classificationCaseId,
        actorId: principal.userId
      })
    );
    return true;
  }

  const documentClassificationCorrectMatch = matchPath(path, "/v1/documents/:documentId/classification-cases/:classificationCaseId/correct");
  if (req.method === "POST" && documentClassificationCorrectMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "classification_case",
      objectId: documentClassificationCorrectMatch.classificationCaseId,
      scopeCode: "document_classification"
    });
    writeJson(
      res,
      200,
      platform.correctClassificationCase({
        companyId,
        classificationCaseId: documentClassificationCorrectMatch.classificationCaseId,
        lineInputs: body.lineInputs || [],
        extractedFields: body.extractedFields || {},
        sourceOcrRunId: body.sourceOcrRunId || null,
        reasonCode: body.reasonCode || "correction",
        reasonNote: body.reasonNote || null,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "POST" && path === "/v1/import-cases") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "import_case",
      objectId: companyId,
      scopeCode: "import_case"
    });
    writeJson(
      res,
      201,
      platform.createImportCase({
        companyId,
        caseReference: body.caseReference,
        goodsOriginCountry: body.goodsOriginCountry || null,
        customsReference: body.customsReference || null,
        currencyCode: body.currencyCode || "SEK",
        requiresCustomsEvidence:
          body.requiresCustomsEvidence == null ? null : body.requiresCustomsEvidence === true,
        sourceClassificationCaseId: body.sourceClassificationCaseId || null,
        initialDocuments: body.initialDocuments || [],
        initialComponents: body.initialComponents || [],
        metadataJson: body.metadataJson || {},
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/import-cases") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "import_case",
      objectId: companyId,
      scopeCode: "import_case"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listImportCases({
        companyId,
        status: optionalText(url.searchParams.get("status")),
        completenessStatus: optionalText(url.searchParams.get("completenessStatus"))
      })
    });
    return true;
  }

  const importCaseMatch = matchPath(path, "/v1/import-cases/:importCaseId");
  if (req.method === "GET" && importCaseMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "import_case",
      objectId: importCaseMatch.importCaseId,
      scopeCode: "import_case"
    });
    assertFinanceOperationsReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.getImportCase({
        companyId,
        importCaseId: importCaseMatch.importCaseId
      })
    );
    return true;
  }

  const importCaseAttachMatch = matchPath(path, "/v1/import-cases/:importCaseId/attach-document");
  if (req.method === "POST" && importCaseAttachMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "import_case",
      objectId: importCaseAttachMatch.importCaseId,
      scopeCode: "import_case"
    });
    writeJson(
      res,
      200,
      platform.attachDocumentToImportCase({
        companyId,
        importCaseId: importCaseAttachMatch.importCaseId,
        documentId: body.documentId,
        roleCode: body.roleCode,
        metadataJson: body.metadataJson || {},
        actorId: principal.userId
      })
    );
    return true;
  }

  const importCaseComponentMatch = matchPath(path, "/v1/import-cases/:importCaseId/components");
  if (req.method === "POST" && importCaseComponentMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "import_case",
      objectId: importCaseComponentMatch.importCaseId,
      scopeCode: "import_case"
    });
    writeJson(
      res,
      200,
      platform.addImportCaseComponent({
        companyId,
        importCaseId: importCaseComponentMatch.importCaseId,
        componentType: body.componentType,
        amount: body.amount,
        currencyCode: body.currencyCode || null,
        vatRelevanceCode: body.vatRelevanceCode || null,
        sourceDocumentId: body.sourceDocumentId || null,
        ledgerTreatmentCode: body.ledgerTreatmentCode || null,
        metadataJson: body.metadataJson || {},
        actorId: principal.userId
      })
    );
    return true;
  }

  const importCaseRecalculateMatch = matchPath(path, "/v1/import-cases/:importCaseId/recalculate");
  if (req.method === "POST" && importCaseRecalculateMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "import_case",
      objectId: importCaseRecalculateMatch.importCaseId,
      scopeCode: "import_case"
    });
    writeJson(
      res,
      200,
      platform.recalculateImportCase({
        companyId,
        importCaseId: importCaseRecalculateMatch.importCaseId,
        actorId: principal.userId
      })
    );
    return true;
  }

  const importCaseApproveMatch = matchPath(path, "/v1/import-cases/:importCaseId/approve");
  if (req.method === "POST" && importCaseApproveMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "import_case",
      objectId: importCaseApproveMatch.importCaseId,
      scopeCode: "import_case"
    });
    writeJson(
      res,
      200,
      platform.approveImportCase({
        companyId,
        importCaseId: importCaseApproveMatch.importCaseId,
        approvalNote: body.approvalNote || null,
        actorId: principal.userId
      })
    );
    return true;
  }

  for (const [routePattern, decisionCode] of [
    ["/v1/review-center/items/:reviewItemId/approve", "approve"],
    ["/v1/review-center/items/:reviewItemId/reject", "reject"],
    ["/v1/review-center/items/:reviewItemId/escalate", "escalate"]
  ]) {
    const decisionAliasMatch = matchPath(path, routePattern);
    if (req.method === "POST" && decisionAliasMatch) {
      const body = await readJsonBody(req);
      const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
      const sessionToken = readSessionToken(req, body);
      const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "review_item", objectId: decisionAliasMatch.reviewItemId, scopeCode: "review_center" });
      assertReviewCenterActionAccess({
        platform,
        principal,
        companyId,
        reviewItemId: decisionAliasMatch.reviewItemId,
        operation: "decide"
      });
      writeJson(res, 200, platform.decideReviewCenterItem({
        companyId,
        reviewItemId: decisionAliasMatch.reviewItemId,
        decisionCode,
        reasonCode: body.reasonCode,
        note: body.note || null,
        decisionPayload: body.decisionPayload || {},
        evidenceRefs: body.evidenceRefs || [],
        overrideReasonCode: body.overrideReasonCode || null,
        resultingCommand: body.resultingCommand || null,
        targetQueueCode: body.targetQueueCode || null,
        actorId: principal.userId
      }));
      return true;
    }
  }

  if (req.method === "POST" && path === "/v1/payroll/migrations") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "payroll_migration",
      objectId: companyId,
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createPayrollMigrationBatch({
        sessionToken,
        companyId,
        sourceSystemCode: body.sourceSystemCode,
        migrationMode: body.migrationMode || "test",
        migrationScope: body.migrationScope || "payroll",
        effectiveCutoverDate: body.effectiveCutoverDate,
        firstTargetReportingPeriod: body.firstTargetReportingPeriod,
        mappingSetId: body.mappingSetId || null,
        cutoverPlanId: body.cutoverPlanId || null,
        requiredBalanceTypeCodes: body.requiredBalanceTypeCodes || [],
        requiredApprovalRoleCodes: body.requiredApprovalRoleCodes || ["PAYROLL_OWNER"],
        sourceSnapshotRef: body.sourceSnapshotRef || {},
        batchReference: body.batchReference || null,
        note: body.note || null,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/payroll/migrations") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "payroll_migration",
      objectId: companyId,
      scopeCode: "payroll"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listPayrollMigrationBatches({
        sessionToken,
        companyId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  const payrollMigrationMatch = matchPath(path, "/v1/payroll/migrations/:payrollMigrationBatchId");
  if (req.method === "GET" && payrollMigrationMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "payroll_migration",
      objectId: payrollMigrationMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.getPayrollMigrationBatch({
        sessionToken,
        companyId,
        payrollMigrationBatchId: payrollMigrationMatch.payrollMigrationBatchId
      })
    );
    return true;
  }

  const payrollMigrationEmployeesMatch = matchPath(path, "/v1/payroll/migrations/:payrollMigrationBatchId/employees");
  if (req.method === "GET" && payrollMigrationEmployeesMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "payroll_migration",
      objectId: payrollMigrationEmployeesMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.getEmployeeMigrationSummary({
        sessionToken,
        companyId,
        payrollMigrationBatchId: payrollMigrationEmployeesMatch.payrollMigrationBatchId
      })
    });
    return true;
  }

  const payrollMigrationImportMatch = matchPath(path, "/v1/payroll/migrations/:payrollMigrationBatchId/import-records");
  if (req.method === "POST" && payrollMigrationImportMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "payroll_migration",
      objectId: payrollMigrationImportMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.importEmployeeMigrationRecords({
        sessionToken,
        companyId,
        payrollMigrationBatchId: payrollMigrationImportMatch.payrollMigrationBatchId,
        records: body.records || []
      })
    );
    return true;
  }

  const payrollMigrationBaselinesMatch = matchPath(path, "/v1/payroll/migrations/:payrollMigrationBatchId/balance-baselines");
  if (req.method === "POST" && payrollMigrationBaselinesMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "payroll_migration",
      objectId: payrollMigrationBaselinesMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.registerBalanceBaselines({
        sessionToken,
        companyId,
        payrollMigrationBatchId: payrollMigrationBaselinesMatch.payrollMigrationBatchId,
        baselines: body.baselines || []
      })
    );
    return true;
  }

  const payrollMigrationValidateMatch = matchPath(path, "/v1/payroll/migrations/:payrollMigrationBatchId/validate");
  if (req.method === "POST" && payrollMigrationValidateMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "payroll_migration",
      objectId: payrollMigrationValidateMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.validatePayrollMigrationBatch({
        sessionToken,
        companyId,
        payrollMigrationBatchId: payrollMigrationValidateMatch.payrollMigrationBatchId
      })
    );
    return true;
  }

  const payrollMigrationDiffsMatch = matchPath(path, "/v1/payroll/migrations/:payrollMigrationBatchId/diffs");
  if (req.method === "GET" && payrollMigrationDiffsMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "payroll_migration",
      objectId: payrollMigrationDiffsMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listPayrollMigrationDiffs({
        sessionToken,
        companyId,
        payrollMigrationBatchId: payrollMigrationDiffsMatch.payrollMigrationBatchId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  if (req.method === "POST" && payrollMigrationDiffsMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "payroll_migration",
      objectId: payrollMigrationDiffsMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.calculatePayrollMigrationDiff({
        sessionToken,
        companyId,
        payrollMigrationBatchId: payrollMigrationDiffsMatch.payrollMigrationBatchId,
        sourceTotals: body.sourceTotals || {},
        targetTotals: body.targetTotals || {},
        differenceItems: body.differenceItems || [],
        toleranceSek: body.toleranceSek ?? 0
      })
    );
    return true;
  }

  const payrollMigrationDiffDecisionMatch = matchPath(path, "/v1/payroll/migrations/:payrollMigrationBatchId/diffs/:payrollMigrationDiffId/decide");
  if (req.method === "POST" && payrollMigrationDiffDecisionMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "payroll_migration",
      objectId: payrollMigrationDiffDecisionMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.decidePayrollMigrationDiff({
        sessionToken,
        companyId,
        payrollMigrationBatchId: payrollMigrationDiffDecisionMatch.payrollMigrationBatchId,
        payrollMigrationDiffId: payrollMigrationDiffDecisionMatch.payrollMigrationDiffId,
        decision: body.decision,
        explanation: body.explanation
      })
    );
    return true;
  }

  const payrollMigrationApproveMatch = matchPath(path, "/v1/payroll/migrations/:payrollMigrationBatchId/approve");
  if (req.method === "POST" && payrollMigrationApproveMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "payroll_migration",
      objectId: payrollMigrationApproveMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.approvePayrollMigrationBatch({
        sessionToken,
        companyId,
        payrollMigrationBatchId: payrollMigrationApproveMatch.payrollMigrationBatchId,
        approvalRoleCode: body.approvalRoleCode,
        note: body.note || null
      })
    );
    return true;
  }

  const payrollMigrationFinalizeMatch = matchPath(path, "/v1/payroll/migrations/:payrollMigrationBatchId/finalize");
  if (req.method === "POST" && payrollMigrationFinalizeMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "payroll_migration",
      objectId: payrollMigrationFinalizeMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.executePayrollMigrationBatch({
        sessionToken,
        companyId,
        payrollMigrationBatchId: payrollMigrationFinalizeMatch.payrollMigrationBatchId
      })
    );
    return true;
  }

  const payrollMigrationRollbackMatch = matchPath(path, "/v1/payroll/migrations/:payrollMigrationBatchId/rollback");
  if (req.method === "POST" && payrollMigrationRollbackMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "payroll_migration",
      objectId: payrollMigrationRollbackMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.rollbackPayrollMigrationBatch({
        sessionToken,
        companyId,
        payrollMigrationBatchId: payrollMigrationRollbackMatch.payrollMigrationBatchId,
        reasonCode: body.reasonCode
      })
    );
    return true;
  }

  return false;
}

function resolveNotificationRecipientScope({ principal, recipientType, recipientId }) {
  if (recipientType == null && recipientId == null) {
    return {
      recipientType: "user",
      recipientId: principal.userId
    };
  }
  if (recipientType === "user") {
    const resolvedRecipientId = recipientId || principal.userId;
    if (resolvedRecipientId !== principal.userId) {
      throw createHttpError(403, "notification_recipient_scope_forbidden", "Notification center only exposes the current user's direct inbox or team inboxes in this route.");
    }
    return {
      recipientType: "user",
      recipientId: resolvedRecipientId
    };
  }
  if (recipientType === "team") {
    const resolvedRecipientId = requireText(recipientId, "team_id_required", "recipientId is required for team inbox.");
    if (!resolvePrincipalTeamIds(principal).includes(resolvedRecipientId)) {
      throw createHttpError(403, "notification_recipient_scope_forbidden", "Notification center only exposes team inboxes for the current actor's active teams.");
    }
    return {
      recipientType: "team",
      recipientId: resolvedRecipientId
    };
  }
  throw createHttpError(403, "notification_recipient_scope_forbidden", "Notification recipient scope is not allowed.");
}

function resolveNotificationRecipientTargets({ principal, recipientType, recipientId }) {
  if (recipientType == null && recipientId == null) {
    return [
      { recipientType: "user", recipientId: principal.userId },
      ...resolvePrincipalTeamIds(principal).map((teamId) => ({
        recipientType: "team",
        recipientId: teamId
      }))
    ];
  }
  return [resolveNotificationRecipientScope({ principal, recipientType, recipientId })];
}

function listAccessibleNotifications({ platform, companyId, targets, status, categoryCode, onlyUnread }) {
  return sortNotificationsByCreatedAtDesc(dedupeNotifications(
    targets.flatMap((target) => platform.listNotifications({
      companyId,
      recipientType: target.recipientType,
      recipientId: target.recipientId,
      status,
      categoryCode,
      onlyUnread
    }))
  ));
}

function buildAccessibleNotificationSummary({ platform, companyId, targets, status, categoryCode, onlyUnread }) {
  const items = listAccessibleNotifications({
    platform,
    companyId,
    targets,
    status,
    categoryCode,
    onlyUnread
  });
  const countsByStatus = Object.fromEntries(platform.notificationStatuses.map((statusCode) => [statusCode, 0]));
  const countsByPriority = Object.fromEntries(platform.notificationPriorityCodes.map((priorityCode) => [priorityCode, 0]));
  const groups = new Map();
  for (const item of items) {
    countsByStatus[item.status] += 1;
    countsByPriority[item.priorityCode] += 1;
    if (!groups.has(item.categoryCode)) {
      groups.set(item.categoryCode, {
        categoryCode: item.categoryCode,
        totalCount: 0,
        unreadCount: 0,
        countsByPriority: Object.fromEntries(platform.notificationPriorityCodes.map((priorityCode) => [priorityCode, 0]))
      });
    }
    const group = groups.get(item.categoryCode);
    group.totalCount += 1;
    group.countsByPriority[item.priorityCode] += 1;
    if (item.unread) {
      group.unreadCount += 1;
    }
  }
  return {
    totalCount: items.length,
    unreadCount: items.filter((item) => item.unread).length,
    countsByStatus,
    countsByPriority,
    groups: [...groups.values()].sort((left, right) => left.categoryCode.localeCompare(right.categoryCode))
  };
}

function assertNotificationReadAccess({ platform, principal, companyId, notificationId }) {
  const notification = platform.getNotification({ companyId, notificationId });
  if (notification.recipientType === "user" && notification.recipientId === principal.userId) {
    return;
  }
  if (notification.recipientType === "team" && resolvePrincipalTeamIds(principal).includes(notification.recipientId)) {
    return;
  }
  throw createHttpError(403, "notification_recipient_scope_forbidden", "Notification action is only allowed for the addressed user or one of the actor's active teams in this route.");
}

function resolvePrincipalTeamIds(principal) {
  return Array.isArray(principal?.teamIds)
    ? [...new Set(principal.teamIds.filter((teamId) => typeof teamId === "string" && teamId.trim().length > 0))]
    : [];
}

function dedupeNotifications(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!item || seen.has(item.notificationId)) {
      continue;
    }
    seen.add(item.notificationId);
    result.push(item);
  }
  return result;
}

function sortNotificationsByCreatedAtDesc(items) {
  return [...items].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
    || right.notificationId.localeCompare(left.notificationId)
  );
}

function requireTextArray(value, code, message) {
  if (!Array.isArray(value) || value.length === 0) {
    throw createHttpError(400, code, message);
  }
  return value.map((entry) => requireText(entry, code, message));
}

function parsePositiveInteger(value, code, message) {
  if (value == null || String(value).trim().length === 0) {
    return null;
  }
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw createHttpError(400, code, message);
  }
  return normalized;
}

async function buildBackofficeJobRows({ platform, companyId, status = null, jobType = null, operatorState = null }) {
  const [jobs, deadLetters, replayPlans] = await Promise.all([
    platform.listRuntimeJobs({ companyId, status, jobType }),
    platform.listRuntimeDeadLetters({ companyId, operatorState }),
    platform.listRuntimeJobReplayPlans({})
  ]);
  const deadLettersByJobId = new Map(deadLetters.map((deadLetter) => [deadLetter.jobId, deadLetter]));
  const replayPlansByJobId = new Map();
  for (const replayPlan of replayPlans.filter((candidate) => candidate.companyId === companyId)) {
    const existing = replayPlansByJobId.get(replayPlan.jobId);
    if (!existing || existing.updatedAt.localeCompare(replayPlan.updatedAt) < 0) {
      replayPlansByJobId.set(replayPlan.jobId, replayPlan);
    }
  }
  return jobs
    .filter((job) => (operatorState ? deadLettersByJobId.get(job.jobId)?.operatorState === operatorState : true))
    .map((job) => ({
      ...job,
      deadLetter: deadLettersByJobId.get(job.jobId) || null,
      replayPlan: replayPlansByJobId.get(job.jobId) || null
    }));
}

async function buildBackofficeDeadLetterRows({ platform, companyId, operatorState = null }) {
  const [deadLetters, jobs, replayPlans] = await Promise.all([
    platform.listRuntimeDeadLetters({ companyId, operatorState }),
    platform.listRuntimeJobs({ companyId }),
    platform.listRuntimeJobReplayPlans({})
  ]);
  const jobsById = new Map(jobs.map((job) => [job.jobId, job]));
  const replayPlansByJobId = buildReplayPlansByJobId({ replayPlans, companyId });
  return deadLetters.map((deadLetter) => ({
    ...deadLetter,
    job: jobsById.get(deadLetter.jobId) || null,
    replayPlan: replayPlansByJobId.get(deadLetter.jobId) || null
  }));
}

async function buildBackofficeReplayRows({ platform, companyId, status = null }) {
  const [replayPlans, jobs, deadLetters] = await Promise.all([
    platform.listRuntimeJobReplayPlans({ status }),
    platform.listRuntimeJobs({ companyId }),
    platform.listRuntimeDeadLetters({ companyId })
  ]);
  const jobsById = new Map(jobs.map((job) => [job.jobId, job]));
  const deadLettersByJobId = new Map(deadLetters.map((deadLetter) => [deadLetter.jobId, deadLetter]));
  return replayPlans
    .filter((replayPlan) => replayPlan.companyId === companyId)
    .map((replayPlan) => ({
      ...replayPlan,
      job: jobsById.get(replayPlan.jobId) || null,
      deadLetter: deadLettersByJobId.get(replayPlan.jobId) || null
    }));
}

async function buildSubmissionMonitorPayload({ platform, companyId, submissionType = null, ownerQueue = null, status = null, asOf = null }) {
  const resolvedAsOf = resolveSubmissionMonitorAsOf(asOf);
  const [submissions, queueItems, jobs, deadLetters, replayPlans] = await Promise.all([
    platform.listAuthoritySubmissions({ companyId, submissionType }),
    platform.listSubmissionActionQueue({ companyId, ownerQueue, status: null }),
    platform.listRuntimeJobs({ companyId }),
    platform.listRuntimeDeadLetters({ companyId }),
    platform.listRuntimeJobReplayPlans({})
  ]);
  const filteredSubmissions = submissions.filter((submission) => (status ? submission.status === status : true));
  const submissionsById = new Map(submissions.map((submission) => [submission.submissionId, submission]));
  const queueItemsBySubmissionId = new Map();
  for (const queueItem of queueItems) {
    if (!queueItemsBySubmissionId.has(queueItem.submissionId)) {
      queueItemsBySubmissionId.set(queueItem.submissionId, []);
    }
    queueItemsBySubmissionId.get(queueItem.submissionId).push(queueItem);
  }
  const submissionRows = filteredSubmissions.map((submission) => {
    const submissionQueueItems = queueItemsBySubmissionId.get(submission.submissionId) || [];
    const receiptClasses = classifySubmissionReceiptClasses(submission.receipts || []);
    const lagAlerts = buildSubmissionLagAlerts({ submission, queueItems: submissionQueueItems, deadLetter: null, asOf: resolvedAsOf });
    const queueMetrics = buildSubmissionQueueMetrics({
      queueItems: submissionQueueItems,
      asOf: resolvedAsOf,
      escalationPolicyCode: "submission_monitor.default"
    });
    return {
      objectType: "authoritySubmission",
      submissionId: submission.submissionId,
      submissionType: submission.submissionType,
      submissionFamilyCode: submission.submissionFamilyCode,
      sourceObjectType: submission.sourceObjectType,
      sourceObjectId: submission.sourceObjectId,
      providerKey: submission.providerKey,
      status: submission.status,
      signedState: submission.signedState,
      attemptNo: submission.attemptNo,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      receiptClasses,
      queueItems: submissionQueueItems,
      ownerQueues: [...new Set(submissionQueueItems.map((queueItem) => queueItem.ownerQueue).filter(Boolean))],
      ...queueMetrics,
      lagAlerts,
      replayEligible: submission.status === "transport_failed" || submissionQueueItems.some((queueItem) => queueItem.actionType === "retry")
    };
  });
  const jobsById = new Map(jobs.map((job) => [job.jobId, job]));
  const replayPlansByJobId = buildReplayPlansByJobId({ replayPlans, companyId });
  const submissionDeadLetterRows = deadLetters
    .map((deadLetter) => {
      const job = jobsById.get(deadLetter.jobId) || null;
      if (!isSubmissionMonitorJob(job)) {
        return null;
      }
      const linkedSubmission = job?.sourceObjectId ? submissionsById.get(job.sourceObjectId) || null : null;
      if (submissionType && linkedSubmission?.submissionType !== submissionType) {
        return null;
      }
      if (status && status !== "dead_lettered" && linkedSubmission?.status !== status) {
        return null;
      }
      const submissionId = linkedSubmission?.submissionId || optionalText(job?.sourceObjectId);
      const submissionQueueItems = submissionId ? (queueItemsBySubmissionId.get(submissionId) || []) : [];
      const queueMetrics = buildSubmissionQueueMetrics({
        queueItems: submissionQueueItems,
        asOf: resolvedAsOf,
        escalationPolicyCode: deadLetter.operatorState === "replay_planned"
          ? "submission_monitor.dead_letter_replay"
          : "submission_monitor.dead_letter"
      });
      return {
        objectType: "submissionDeadLetter",
        deadLetterId: deadLetter.deadLetterId,
        submissionId,
        submissionType: linkedSubmission?.submissionType || null,
        submissionFamilyCode: linkedSubmission?.submissionFamilyCode || null,
        sourceObjectType: linkedSubmission?.sourceObjectType || optionalText(job?.sourceObjectType),
        sourceObjectId: linkedSubmission?.sourceObjectId || optionalText(job?.sourceObjectId),
        sourceObjectVersion: linkedSubmission?.sourceObjectVersion || null,
        providerKey: linkedSubmission?.providerKey || null,
        status: "dead_lettered",
        signedState: linkedSubmission?.signedState || null,
        attemptNo: linkedSubmission?.attemptNo || Number(job?.attemptCount || 0),
        createdAt: deadLetter.createdAt,
        updatedAt: deadLetter.updatedAt,
        enteredAt: deadLetter.enteredAt,
        receiptClasses: classifySubmissionReceiptClasses(linkedSubmission?.receipts || []),
        queueItems: submissionQueueItems,
        lagAlerts: buildSubmissionLagAlerts({
          submission: linkedSubmission,
          queueItems: submissionQueueItems,
          deadLetter,
          asOf: resolvedAsOf
        }),
        replayEligible: deadLetter.replayAllowed === true,
        deadLetter,
        replayPlan: replayPlansByJobId.get(deadLetter.jobId) || null,
        job,
        ownerQueues: [...new Set(submissionQueueItems.map((queueItem) => queueItem.ownerQueue).filter(Boolean))],
        ...queueMetrics
      };
    })
    .filter(Boolean);
  const items = [...submissionRows, ...submissionDeadLetterRows]
    .sort((left, right) =>
      resolveWorkbenchTimestamp(right).localeCompare(resolveWorkbenchTimestamp(left))
      || resolveWorkbenchIdentity(right).localeCompare(resolveWorkbenchIdentity(left))
    );
  return {
    asOf: resolvedAsOf,
    items,
    counters: {
      technicalPending: submissionRows.filter((item) => item.receiptClasses.technical === "pending").length,
      materialPending: submissionRows.filter((item) => item.receiptClasses.business === "pending" || item.receiptClasses.finalOutcome === "pending").length,
      deadLettered: submissionDeadLetterRows.filter((item) => item.deadLetter?.operatorState && item.deadLetter.operatorState !== "closed").length,
      replayPlanned: submissionDeadLetterRows.filter((item) => OPEN_RUNTIME_REPLAY_PLAN_STATUSES.has(item.replayPlan?.status)).length
        + submissionRows.filter((item) => item.queueItems.some((queueItem) => queueItem.status === "open" && queueItem.actionType === "retry")).length,
      lagging: [...submissionRows, ...submissionDeadLetterRows].filter((item) => item.lagAlerts.length > 0).length
    },
    queueSummary: buildSubmissionMonitorQueueSummary({ items, asOf: resolvedAsOf })
  };
}

function classifySubmissionReceiptClasses(receipts) {
  const receiptTypes = new Set((receipts || []).map((receipt) => receipt.receiptType));
  return {
    technical: receiptTypes.has("technical_ack") ? "received" : receiptTypes.has("technical_nack") ? "rejected" : "pending",
    business: receiptTypes.has("business_ack") ? "received" : receiptTypes.has("business_nack") ? "rejected" : "pending",
    finalOutcome: receiptTypes.has("final_ack") ? "received" : "pending"
  };
}

function buildSubmissionLagAlerts({ submission = null, queueItems = [], deadLetter = null, asOf = null }) {
  const alerts = [];
  const openQueueItems = (queueItems || []).filter((queueItem) => ["open", "claimed", "waiting_input"].includes(queueItem.status));
  const resolvedAsOf = resolveSubmissionMonitorAsOf(asOf);
  if (submission?.status === "submitted" && !hasReceiptType(submission.receipts, ["technical_ack", "technical_nack"])) {
    alerts.push({ alertCode: "technical_receipt_missing", severity: "high" });
  }
  if (["received", "accepted"].includes(submission?.status) && !hasReceiptType(submission.receipts, ["final_ack", "business_nack", "technical_nack"])) {
    alerts.push({ alertCode: "final_outcome_pending", severity: "medium" });
  }
  if (submission?.status === "domain_rejected") {
    alerts.push({ alertCode: "business_rejection", severity: "high" });
  }
  if (openQueueItems.some((queueItem) => ["correct_payload", "collect_more_data"].includes(queueItem.actionType))) {
    alerts.push({ alertCode: "correction_required", severity: "high" });
  }
  if (deadLetter) {
    alerts.push({ alertCode: "dead_letter_open", severity: "high" });
  }
  if (openQueueItems.some((queueItem) => queueItem.slaDueAt && queueItem.slaDueAt.localeCompare(resolvedAsOf) <= 0)) {
    alerts.push({ alertCode: "long_lag", severity: "high" });
  }
  if (openQueueItems.length > 0) {
    alerts.push({ alertCode: "operator_intervention_required", severity: "high" });
  }
  return alerts;
}

function buildSubmissionMonitorScan({ platform, companyId, principal, monitor, asOf }) {
  const workItems = [];
  const notifications = [];
  const activityEntries = [];

  for (const item of monitor.items.filter((candidate) => Array.isArray(candidate.lagAlerts) && candidate.lagAlerts.length > 0)) {
    const alertCodes = [...new Set(item.lagAlerts.map((alert) => alert.alertCode).filter(Boolean))];
    const severity = resolveSubmissionMonitorPriority(item.lagAlerts);
    const sourceObjectId = resolveSubmissionMonitorSourceId(item);
    const title = buildSubmissionMonitorTitle(item);
    const summary = buildSubmissionMonitorSummary(item, alertCodes);
    const workItem = platform.upsertOperationalWorkItem({
      companyId,
      queueCode: "SUBMISSION_MONITORING",
      sourceType: item.objectType,
      sourceId: sourceObjectId,
      title,
      summary,
      priority: severity,
      deadlineAt: item.slaDueAt || asOf,
      blockerScope: "submission_monitoring",
      escalationPolicyCode: "submission_monitor.default",
      actorId: principal.userId,
      metadata: {
        submissionId: item.submissionId || null,
        deadLetterId: item.deadLetterId || null,
        submissionType: item.submissionType || null,
        ownerQueues: Array.isArray(item.ownerQueues) ? item.ownerQueues : [],
        alertCodes,
        receiptClasses: item.receiptClasses || null,
        replayEligible: item.replayEligible === true
      }
    });
    workItems.push(workItem);

    notifications.push(platform.createNotification({
      companyId,
      recipientType: "user",
      recipientId: principal.userId,
      categoryCode: "submission_monitor_alert",
      priorityCode: severity,
      sourceDomainCode: "INTEGRATIONS",
      sourceObjectType: item.objectType,
      sourceObjectId,
      title,
      body: summary,
      deepLink: `/backoffice/submissions/${item.submissionId || sourceObjectId}`,
      dedupeKey: `${companyId}::submission_monitor_alert::${item.objectType}::${sourceObjectId}::${alertCodes.join("|")}`,
      actorId: principal.userId
    }));

    activityEntries.push(platform.projectActivityEntry({
      companyId,
      objectType: item.objectType,
      objectId: sourceObjectId,
      activityType: "submission_monitor_alert",
      actorType: "system",
      actorSnapshot: {
        actorId: principal.userId,
        actorLabel: "Backoffice submission monitor scan"
      },
      summary,
      occurredAt: asOf,
      sourceEventId: `submission_monitor:${item.objectType}:${sourceObjectId}:${alertCodes.join("|")}`,
      visibilityScope: "company",
      relatedObjects: [
        item.submissionId ? { relatedObjectType: "submission", relatedObjectId: item.submissionId } : null,
        item.deadLetterId ? { relatedObjectType: "async_dead_letter", relatedObjectId: item.deadLetterId } : null,
        item.job?.jobId ? { relatedObjectType: "async_job", relatedObjectId: item.job.jobId } : null
      ].filter(Boolean),
      actorId: principal.userId
    }));
  }

  return {
    scan: {
      asOf,
      rowCount: monitor.items.length,
      laggingRowCount: monitor.items.filter((candidate) => candidate.lagAlerts?.length > 0).length,
      totalAlertCount: monitor.items.reduce((sum, candidate) => sum + (candidate.lagAlerts?.length || 0), 0)
    },
    workItems,
    notifications,
    activityEntries
  };
}

function hasReceiptType(receipts, receiptTypes) {
  const typeSet = new Set((receipts || []).map((receipt) => receipt.receiptType));
  return receiptTypes.some((receiptType) => typeSet.has(receiptType));
}

function resolveSubmissionMonitorAsOf(asOf = null) {
  const value = optionalText(asOf);
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createHttpError(400, "submission_monitor_as_of_invalid", "Submission monitor asOf must be a valid ISO timestamp.");
  }
  return parsed.toISOString();
}

function resolveSubmissionQueueSlaDueAt(queueItems) {
  return (queueItems || [])
    .filter((queueItem) => ["open", "claimed", "waiting_input"].includes(queueItem.status))
    .map((queueItem) => optionalText(queueItem.slaDueAt))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))[0] || null;
}

function buildSubmissionQueueMetrics({ queueItems, asOf, escalationPolicyCode = "submission_monitor.default" }) {
  const resolvedAsOf = resolveSubmissionMonitorAsOf(asOf);
  const openQueueItems = (queueItems || []).filter((queueItem) => ["open", "claimed", "waiting_input"].includes(queueItem.status));
  const oldestOpenAgeMinutes = openQueueItems.reduce((maxAge, queueItem) => {
    const ageMinutes = Math.max(0, Math.round((Date.parse(resolvedAsOf) - Date.parse(queueItem.createdAt)) / 60000));
    return Math.max(maxAge, ageMinutes);
  }, 0);
  return {
    slaDueAt: resolveSubmissionQueueSlaDueAt(openQueueItems),
    blockedCount: openQueueItems.filter((queueItem) => queueItem.status === "waiting_input").length,
    oldestOpenAgeMinutes,
    oldestOpenAgeHours: Number((oldestOpenAgeMinutes / 60).toFixed(2)),
    escalationPolicyCode
  };
}

function buildSubmissionMonitorQueueSummary({ items, asOf }) {
  const resolvedAsOf = resolveSubmissionMonitorAsOf(asOf);
  const queues = new Map();
  const seenQueueItems = new Set();
  for (const item of items) {
    for (const queueItem of item.queueItems || []) {
      if (!["open", "claimed", "waiting_input"].includes(queueItem.status)) {
        continue;
      }
      const queueIdentity = queueItem.queueItemId || `${queueItem.submissionId || item.submissionId || item.deadLetterId}:${queueItem.actionType}:${queueItem.createdAt}`;
      if (seenQueueItems.has(queueIdentity)) {
        continue;
      }
      seenQueueItems.add(queueIdentity);
      const key = queueItem.ownerQueue || "submission_operator";
      const existing = queues.get(key) || {
        ownerQueue: key,
        slaDueAt: null,
        openCount: 0,
        blockedCount: 0,
        oldestOpenAgeMinutes: 0,
        oldestOpenAgeHours: 0,
        escalationPolicyCode: "submission_monitor.default"
      };
      existing.openCount += 1;
      if (queueItem.status === "waiting_input") {
        existing.blockedCount += 1;
      }
      if (queueItem.slaDueAt && (!existing.slaDueAt || existing.slaDueAt.localeCompare(queueItem.slaDueAt) > 0)) {
        existing.slaDueAt = queueItem.slaDueAt;
      }
      const ageMinutes = Math.max(0, Math.round((Date.parse(resolvedAsOf) - Date.parse(queueItem.createdAt)) / 60000));
      if (ageMinutes > existing.oldestOpenAgeMinutes) {
        existing.oldestOpenAgeMinutes = ageMinutes;
        existing.oldestOpenAgeHours = Number((ageMinutes / 60).toFixed(2));
      }
      queues.set(key, existing);
    }
  }
  return [...queues.values()].sort((left, right) => left.ownerQueue.localeCompare(right.ownerQueue));
}

async function buildObservabilityPayload({
  platform,
  sessionToken,
  companyId,
  principal,
  asOf = null,
  includeGlobal = true,
  logLimit = 50,
  traceLimit = 25
}) {
  const resolvedAsOf = resolveSubmissionMonitorAsOf(asOf);
  const runtimeDiagnostics =
    typeof platform.scanRuntimeInvariants === "function"
      ? platform.scanRuntimeInvariants({ startupSurface: "api" })
      : {
          findings: [],
          summary: {
            totalCount: 0,
            blockingCount: 0,
            warningCount: 0
          }
        };
  const [
    controlPlane,
    secretManagementSummary,
    partnerConnections,
    projectionContracts,
    projectionCheckpoints,
    reindexRequests,
    runtimeJobs,
    deadLetters,
    reviewItems,
    submissionQueueItems,
    structuredLogs,
    traceChains,
    auditCorrelations
  ] = await Promise.all([
    typeof platform.getRuntimeControlPlaneSummary === "function"
      ? platform.getRuntimeControlPlaneSummary({ sessionToken, companyId })
      : null,
    typeof platform.getSecretManagementSummary === "function"
      ? platform.getSecretManagementSummary({ sessionToken, companyId })
      : null,
    typeof platform.listPartnerConnections === "function"
      ? platform.listPartnerConnections({ companyId })
      : [],
    typeof platform.listSearchProjectionContracts === "function"
      ? platform.listSearchProjectionContracts({ companyId })
      : [],
    typeof platform.listProjectionCheckpoints === "function"
      ? platform.listProjectionCheckpoints({ companyId })
      : [],
    typeof platform.listSearchReindexRequests === "function"
      ? platform.listSearchReindexRequests({ companyId })
      : [],
    typeof platform.listRuntimeJobs === "function"
      ? platform.listRuntimeJobs({ companyId })
      : [],
    typeof platform.listRuntimeDeadLetters === "function"
      ? platform.listRuntimeDeadLetters({ companyId })
      : [],
    typeof platform.listReviewCenterItems === "function"
      ? platform.listReviewCenterItems({ companyId })
      : [],
    typeof platform.listSubmissionActionQueue === "function"
      ? platform.listSubmissionActionQueue({ companyId })
      : [],
    typeof platform.listStructuredLogs === "function"
      ? platform.listStructuredLogs({ companyId, includeGlobal, limit: logLimit })
      : [],
    typeof platform.listTraceChains === "function"
      ? platform.listTraceChains({ companyId, includeGlobal, limit: traceLimit })
      : [],
    typeof platform.listRuntimeAuditCorrelations === "function"
      ? platform.listRuntimeAuditCorrelations({ sessionToken, companyId }).slice(0, traceLimit)
      : []
  ]);
  const providerHealth = buildProviderHealthPayload(partnerConnections);
  const projectionLag = buildProjectionLagPayload({
    projectionContracts,
    projectionCheckpoints,
    reindexRequests,
    asOf: resolvedAsOf
  });
  const queueAgeAlerts = buildObservabilityQueueAgeAlerts({
    reviewItems,
    runtimeJobs,
    deadLetters,
    submissionQueueItems,
    asOf: resolvedAsOf
  });
  synchronizeObservabilityAlarms({
    platform,
    companyId,
    runtimeDiagnostics,
    providerHealthItems: providerHealth.items,
    projectionLagItems: projectionLag.items,
    actorId: principal.userId
  });
  const invariantAlarms =
    typeof platform.listInvariantAlarms === "function"
      ? platform.listInvariantAlarms({ companyId, includeGlobal, limit: 100 })
      : [];
  return {
    companyId,
    asOf: resolvedAsOf,
    metrics: {
      runtimeFindingCount: runtimeDiagnostics.summary?.totalCount || 0,
      openInvariantAlarmCount: invariantAlarms.filter((alarm) => alarm.state !== "resolved").length,
      unhealthyProviderCount: providerHealth.items.filter((item) => ["degraded", "outage"].includes(item.healthStatus)).length,
      laggingProjectionCount: projectionLag.items.filter((item) => item.lagState !== "healthy").length,
      queueAgeAlertCount: queueAgeAlerts.length,
      runtimeJobBacklogCount: runtimeJobs.filter((job) => ["queued", "retry_scheduled", "claimed", "running"].includes(job.status)).length,
      runtimeDeadLetterCount: deadLetters.filter((item) => item.operatorState !== "closed").length,
      structuredLogCount: structuredLogs.length,
      traceChainCount: traceChains.length,
      openIncidentCount: controlPlane?.openIncidentCount || 0,
      openIncidentSignalCount: controlPlane?.openIncidentSignalCount || 0,
      rotationDueSecretCount: secretManagementSummary?.rotationDueCount || 0,
      expiringCertificateCount: secretManagementSummary?.expiringCertificateCount || 0,
      secretIsolationViolationCount: secretManagementSummary?.modeIsolationViolationCount || 0
    },
    runtimeDiagnostics,
    runtimeControlPlane: controlPlane,
    secretManagement: secretManagementSummary,
    providerHealth,
    projectionLag,
    queueAgeAlerts,
    invariantAlarms,
    structuredLogs,
    traceChains,
    auditCorrelations
  };
}

function buildProviderHealthPayload(partnerConnections = []) {
  const items = (partnerConnections || [])
    .map((connection) => ({
      connectionId: connection.connectionId,
      connectionType: connection.connectionType,
      providerCode: connection.providerCode,
      displayName: connection.displayName,
      mode: connection.mode,
      status: connection.status,
      healthStatus: connection.healthStatus || "unknown",
      fallbackMode: connection.fallbackMode,
      lastHealthCheckAt: connection.lastHealthCheckAt || null,
      lastSuccessfulOperationAt: connection.lastSuccessfulOperationAt || null,
      lastFailureOperationAt: connection.lastFailureOperationAt || null,
      latestReceiptAt: connection.latestReceiptAt || null
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName) || left.connectionId.localeCompare(right.connectionId));
  return {
    items,
    counters: {
      total: items.length,
      healthy: items.filter((item) => item.healthStatus === "healthy").length,
      degraded: items.filter((item) => item.healthStatus === "degraded").length,
      outage: items.filter((item) => item.healthStatus === "outage").length,
      unknown: items.filter((item) => item.healthStatus === "unknown").length
    }
  };
}

function buildProjectionLagPayload({
  projectionContracts = [],
  projectionCheckpoints = [],
  reindexRequests = [],
  asOf = null
}) {
  const resolvedAsOf = resolveSubmissionMonitorAsOf(asOf);
  const checkpointsByProjectionCode = new Map(
    (projectionCheckpoints || []).map((checkpoint) => [checkpoint.projectionCode, checkpoint])
  );
  const reindexRequestsByProjectionCode = new Map();
  for (const request of reindexRequests || []) {
    const key = request.projectionCode || "__all__";
    if (!reindexRequestsByProjectionCode.has(key)) {
      reindexRequestsByProjectionCode.set(key, []);
    }
    reindexRequestsByProjectionCode.get(key).push(request);
  }
  const items = (projectionContracts || []).map((contract) => {
    const checkpoint = checkpointsByProjectionCode.get(contract.projectionCode) || null;
    const projectionRequests = [
      ...(reindexRequestsByProjectionCode.get(contract.projectionCode) || []),
      ...(reindexRequestsByProjectionCode.get("__all__") || [])
    ].filter((request) => ["requested", "running"].includes(request.status));
    const checkpointStatus = checkpoint?.status || "missing";
    const checkpointAgeMinutes = checkpoint?.lastCompletedAt
      ? Math.max(0, Math.round((Date.parse(resolvedAsOf) - Date.parse(checkpoint.lastCompletedAt)) / 60000))
      : null;
    const runningAgeMinutes = checkpoint?.lastStartedAt
      ? Math.max(0, Math.round((Date.parse(resolvedAsOf) - Date.parse(checkpoint.lastStartedAt)) / 60000))
      : null;
    const lagState =
      !checkpoint || Number(checkpoint.checkpointSequenceNo || 0) === 0
        ? "never_built"
        : checkpointStatus === "failed"
          ? "failed"
          : checkpointStatus === "running" && Number(runningAgeMinutes || 0) >= 15
            ? "running_lagging"
            : projectionRequests.some((request) =>
              Math.max(0, Math.round((Date.parse(resolvedAsOf) - Date.parse(request.requestedAt)) / 60000)) >= 15
            )
              ? "reindex_backlog"
              : "healthy";
    return {
      projectionCode: contract.projectionCode,
      displayName: contract.displayName,
      sourceDomainCode: contract.sourceDomainCode,
      checkpointStatus,
      checkpointSequenceNo: checkpoint?.checkpointSequenceNo || 0,
      lagState,
      lastRequestedAt: checkpoint?.lastRequestedAt || null,
      lastStartedAt: checkpoint?.lastStartedAt || null,
      lastCompletedAt: checkpoint?.lastCompletedAt || null,
      lastErrorCode: checkpoint?.lastErrorCode || null,
      lastErrorMessage: checkpoint?.lastErrorMessage || null,
      checkpointAgeMinutes,
      runningAgeMinutes,
      openReindexRequestCount: projectionRequests.length
    };
  });
  return {
    items,
    counters: {
      total: items.length,
      healthy: items.filter((item) => item.lagState === "healthy").length,
      neverBuilt: items.filter((item) => item.lagState === "never_built").length,
      failed: items.filter((item) => item.lagState === "failed").length,
      lagging: items.filter((item) => ["running_lagging", "reindex_backlog"].includes(item.lagState)).length
    }
  };
}

function buildObservabilityQueueAgeAlerts({
  reviewItems = [],
  runtimeJobs = [],
  deadLetters = [],
  submissionQueueItems = [],
  asOf = null
}) {
  const resolvedAsOf = resolveSubmissionMonitorAsOf(asOf);
  const alerts = [];
  const overdueReviewGroups = new Map();
  for (const item of (reviewItems || []).filter((candidate) => ["open", "claimed", "waiting_input", "escalated"].includes(candidate.status))) {
    if (!item.slaDueAt || item.slaDueAt.localeCompare(resolvedAsOf) > 0) {
      continue;
    }
    const key = item.queueCode || "review_center";
    const existing = overdueReviewGroups.get(key) || {
      alertCode: "review_queue_overdue",
      severity: "high",
      queueType: "review_center",
      queueKey: key,
      openCount: 0,
      oldestOpenAgeMinutes: 0,
      sourceObjectRefs: []
    };
    existing.openCount += 1;
    const ageMinutes = Math.max(0, Math.round((Date.parse(resolvedAsOf) - Date.parse(item.createdAt)) / 60000));
    existing.oldestOpenAgeMinutes = Math.max(existing.oldestOpenAgeMinutes, ageMinutes);
    existing.sourceObjectRefs.push({ objectType: "review_item", objectId: item.reviewItemId });
    overdueReviewGroups.set(key, existing);
  }
  alerts.push(...overdueReviewGroups.values());

  for (const job of (runtimeJobs || []).filter((candidate) => ["queued", "retry_scheduled"].includes(candidate.status))) {
    const referenceTime = job.availableAt || job.createdAt;
    const ageMinutes = Math.max(0, Math.round((Date.parse(resolvedAsOf) - Date.parse(referenceTime)) / 60000));
    if (ageMinutes < 15) {
      continue;
    }
    alerts.push({
      alertCode: "async_job_queue_lag",
      severity: ageMinutes >= 60 ? "high" : "medium",
      queueType: "async_jobs",
      queueKey: job.jobType,
      openCount: 1,
      oldestOpenAgeMinutes: ageMinutes,
      sourceObjectRefs: [{ objectType: "async_job", objectId: job.jobId }]
    });
  }

  for (const queueItem of (submissionQueueItems || []).filter((candidate) => ["open", "claimed", "waiting_input"].includes(candidate.status))) {
    if (!queueItem.slaDueAt || queueItem.slaDueAt.localeCompare(resolvedAsOf) > 0) {
      continue;
    }
    const ageMinutes = Math.max(0, Math.round((Date.parse(resolvedAsOf) - Date.parse(queueItem.createdAt)) / 60000));
    alerts.push({
      alertCode: "submission_queue_overdue",
      severity: "high",
      queueType: "submission_operator",
      queueKey: queueItem.ownerQueue || "submission_operator",
      openCount: 1,
      blockedCount: queueItem.status === "waiting_input" ? 1 : 0,
      oldestOpenAgeMinutes: ageMinutes,
      sourceObjectRefs: [{ objectType: "submission_queue_item", objectId: queueItem.queueItemId || `${queueItem.submissionId}:${queueItem.actionType}` }]
    });
  }

  for (const deadLetter of (deadLetters || []).filter((candidate) => candidate.operatorState !== "closed")) {
    alerts.push({
      alertCode: "async_dead_letter_open",
      severity: deadLetter.poisonPillDetected === true ? "critical" : "high",
      queueType: "async_dead_letter",
      queueKey: deadLetter.terminalReason || "dead_letter",
      openCount: 1,
      oldestOpenAgeMinutes: Math.max(0, Math.round((Date.parse(resolvedAsOf) - Date.parse(deadLetter.enteredAt || deadLetter.createdAt)) / 60000)),
      sourceObjectRefs: [{ objectType: "async_dead_letter", objectId: deadLetter.deadLetterId }]
    });
  }

  return alerts.sort((left, right) =>
    compareObservabilitySeverity(left.severity, right.severity)
    || right.oldestOpenAgeMinutes - left.oldestOpenAgeMinutes
    || left.queueType.localeCompare(right.queueType)
    || left.queueKey.localeCompare(right.queueKey)
  );
}

function synchronizeObservabilityAlarms({
  platform,
  companyId,
  runtimeDiagnostics,
  providerHealthItems = [],
  projectionLagItems = [],
  actorId = "system"
}) {
  if (typeof platform.synchronizeInvariantAlarm !== "function" || typeof platform.listInvariantAlarms !== "function") {
    return;
  }
  const activeKeys = new Set();

  for (const finding of runtimeDiagnostics?.findings || []) {
    const alarmCode = `runtime_invariant.${finding.findingCode || "unknown"}`;
    const sourceObjectType = "runtime_startup_surface";
    const sourceObjectId = finding.startupSurface || runtimeDiagnostics?.startupSurface || "api";
    activeKeys.add(`${alarmCode}::${sourceObjectType}::${sourceObjectId}`);
    platform.synchronizeInvariantAlarm({
      companyId,
      alarmCode,
      sourceObjectType,
      sourceObjectId,
      severity: finding.severity === "blocking" ? "critical" : "high",
      summary: finding.message || finding.explanation || finding.findingCode || "Runtime invariant failed.",
      metadata: {
        severity: finding.severity || null,
        category: finding.category || null
      },
      actorId,
      active: true
    });
  }

  for (const item of providerHealthItems.filter((candidate) => ["degraded", "outage"].includes(candidate.healthStatus))) {
    const alarmCode = "provider_health_unhealthy";
    const sourceObjectType = "partner_connection";
    const sourceObjectId = item.connectionId;
    activeKeys.add(`${alarmCode}::${sourceObjectType}::${sourceObjectId}`);
    platform.synchronizeInvariantAlarm({
      companyId,
      alarmCode,
      sourceObjectType,
      sourceObjectId,
      severity: item.healthStatus === "outage" ? "critical" : "high",
      summary: `${item.displayName} is ${item.healthStatus}.`,
      metadata: {
        connectionType: item.connectionType,
        providerCode: item.providerCode,
        mode: item.mode
      },
      actorId,
      active: true
    });
  }

  for (const item of projectionLagItems.filter((candidate) => candidate.lagState !== "healthy")) {
    const alarmCode = "projection_lag";
    const sourceObjectType = "search_projection";
    const sourceObjectId = item.projectionCode;
    activeKeys.add(`${alarmCode}::${sourceObjectType}::${sourceObjectId}`);
    platform.synchronizeInvariantAlarm({
      companyId,
      alarmCode,
      sourceObjectType,
      sourceObjectId,
      severity: item.lagState === "failed" ? "critical" : "medium",
      summary: `Projection ${item.projectionCode} is ${item.lagState}.`,
      metadata: {
        lagState: item.lagState,
        checkpointStatus: item.checkpointStatus,
        sourceDomainCode: item.sourceDomainCode
      },
      actorId,
      active: true
    });
  }

  for (const alarm of platform.listInvariantAlarms({ companyId, includeGlobal: false, limit: 500 })) {
    const sourceObjectType = alarm.sourceObjectType || "_";
    const sourceObjectId = alarm.sourceObjectId || "_";
    const key = `${alarm.alarmCode}::${sourceObjectType}::${sourceObjectId}`;
    if (
      ["runtime_invariant", "provider_health_unhealthy", "projection_lag"].some((prefix) => alarm.alarmCode.startsWith(prefix))
      && !activeKeys.has(key)
    ) {
      platform.synchronizeInvariantAlarm({
        companyId,
        alarmCode: alarm.alarmCode,
        sourceObjectType: alarm.sourceObjectType,
        sourceObjectId: alarm.sourceObjectId,
        actorId,
        active: false
      });
    }
  }
}

function compareObservabilitySeverity(left, right) {
  const order = ["critical", "high", "medium", "low"];
  return order.indexOf(left) - order.indexOf(right);
}

function resolveBackofficeOperatorBinding({
  platform,
  sessionToken,
  companyId,
  supportCaseId = null,
  incidentId = null,
  requiredSupportAction = null
}) {
  const resolvedSupportCaseId = optionalText(supportCaseId);
  const resolvedIncidentId = optionalText(incidentId);
  if (!resolvedSupportCaseId && !resolvedIncidentId) {
    throw createHttpError(
      400,
      "backoffice_operator_binding_required",
      "Backoffice operator actions must be bound to an active support case or runtime incident."
    );
  }
  if (resolvedSupportCaseId) {
    const supportCase = platform.listSupportCases({ sessionToken, companyId })
      .find((candidate) => candidate.supportCaseId === resolvedSupportCaseId);
    if (!supportCase) {
      throw createHttpError(404, "support_case_not_found", "Support case was not found.");
    }
    if (supportCase.status === "closed") {
      throw createHttpError(409, "support_case_closed", "Support case is closed and cannot anchor new operator actions.");
    }
    if (requiredSupportAction && !supportCase.approvedActions.includes(requiredSupportAction)) {
      throw createHttpError(
        403,
        "support_case_action_not_approved",
        `Support case must approve ${requiredSupportAction} before this operator action is allowed.`
      );
    }
  }
  if (resolvedIncidentId) {
    const incident = platform.listRuntimeIncidents({ sessionToken, companyId })
      .find((candidate) => candidate.incidentId === resolvedIncidentId);
    if (!incident) {
      throw createHttpError(404, "runtime_incident_not_found", "Runtime incident was not found.");
    }
    if (incident.status === "closed") {
      throw createHttpError(409, "runtime_incident_closed", "Runtime incident is closed and cannot anchor new operator actions.");
    }
  }
  return {
    supportCaseId: resolvedSupportCaseId,
    incidentId: resolvedIncidentId
  };
}

function buildReplayPlansByJobId({ replayPlans, companyId }) {
  const replayPlansByJobId = new Map();
  for (const replayPlan of replayPlans.filter((candidate) => candidate.companyId === companyId)) {
    const existing = replayPlansByJobId.get(replayPlan.jobId);
    if (!existing || existing.updatedAt.localeCompare(replayPlan.updatedAt) < 0) {
      replayPlansByJobId.set(replayPlan.jobId, replayPlan);
    }
  }
  return replayPlansByJobId;
}

function isSubmissionMonitorJob(job) {
  if (!job) {
    return false;
  }
  return job.sourceObjectType === "submission"
    || typeof job.jobType === "string" && job.jobType.startsWith("submission.");
}

function resolveSubmissionMonitorSourceId(item) {
  return optionalText(item.deadLetterId) || requireText(item.submissionId, "submission_monitor_source_id_required", "Submission monitor source id is required.");
}

function buildSubmissionMonitorTitle(item) {
  if (item.objectType === "submissionDeadLetter") {
    return `Submission dead letter: ${item.submissionType || item.submissionId || item.deadLetterId}`;
  }
  return `Submission monitor alert: ${item.submissionType || item.submissionId}`;
}

function buildSubmissionMonitorSummary(item, alertCodes) {
  const joinedAlerts = alertCodes.join(", ");
  if (item.objectType === "submissionDeadLetter") {
    return `Submission dead letter ${item.deadLetterId} requires operator action. Active alerts: ${joinedAlerts}.`;
  }
  return `Submission ${item.submissionId} requires operator action. Active alerts: ${joinedAlerts}.`;
}

function resolveSubmissionMonitorPriority(lagAlerts) {
  if ((lagAlerts || []).some((alert) => alert.severity === "critical")) {
    return "critical";
  }
  if ((lagAlerts || []).some((alert) => alert.severity === "high")) {
    return "high";
  }
  if ((lagAlerts || []).some((alert) => alert.severity === "medium")) {
    return "medium";
  }
  return "low";
}

function resolveWorkbenchTimestamp(item) {
  return optionalText(item.updatedAt)
    || optionalText(item.enteredAt)
    || optionalText(item.createdAt)
    || "";
}

function resolveWorkbenchIdentity(item) {
  return optionalText(item.deadLetterId)
    || optionalText(item.submissionId)
    || optionalText(item.jobId)
    || "";
}

const REVIEW_CENTER_OPERATOR_ROLE_CODES = new Set(["company_admin", "approver", "payroll_admin", "bureau_user"]);
const BACKOFFICE_READ_ROLE_CODES = new Set(["company_admin", "approver"]);
const PAYROLL_OPERATIONS_ROLE_CODES = new Set(["company_admin", "payroll_admin", "approver"]);
const FINANCE_OPERATIONS_READ_ROLE_CODES = new Set(["company_admin", "approver", "bureau_user"]);
const ACTIVITY_FEED_FULL_READ_ROLE_CODES = new Set(["company_admin", "approver", "payroll_admin", "bureau_user"]);

function resolveReviewSlaNotificationTarget({ escalation, principal }) {
  if (escalation.ownerTeamId) {
    return {
      recipientType: "team",
      recipientId: escalation.ownerTeamId
    };
  }
  if (escalation.assignedUserId) {
    return {
      recipientType: "user",
      recipientId: escalation.assignedUserId
    };
  }
  return {
    recipientType: "user",
    recipientId: principal.companyUserId
  };
}

function mapQueuePriorityToIncidentSeverity(priority) {
  if (priority === "critical") {
    return "critical";
  }
  if (priority === "high") {
    return "high";
  }
  return "medium";
}

function assertBackofficeReadAccess({ principal }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  const isAllowedReader = [...BACKOFFICE_READ_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
  if (!isAllowedReader) {
    throw createHttpError(403, "backoffice_role_forbidden", "Current actor is not allowed to access backoffice read models.");
  }
}

function assertPayrollOperationsReadAccess({ principal }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  const isAllowedReader = [...PAYROLL_OPERATIONS_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
  if (!isAllowedReader) {
    throw createHttpError(403, "payroll_operations_role_forbidden", "Current actor is not allowed to access payroll operations worklists.");
  }
}

function assertFinanceOperationsReadAccess({ principal }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  const isAllowedReader = [...FINANCE_OPERATIONS_READ_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
  if (!isAllowedReader) {
    throw createHttpError(403, "finance_operations_role_forbidden", "Current actor is not allowed to access finance operations worklists.");
  }
}

function assertReviewCenterReadAccess({ principal }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  const isAllowedOperator = [...REVIEW_CENTER_OPERATOR_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
  if (!isAllowedOperator) {
    throw createHttpError(403, "review_center_role_forbidden", "Current actor is not allowed to access review-center worklists.");
  }
}

function assertActivityFeedFullReadAccess({ principal }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  const isAllowedReader = [...ACTIVITY_FEED_FULL_READ_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
  if (!isAllowedReader) {
    throw createHttpError(403, "activity_feed_role_forbidden", "Current actor is not allowed to access full activity-feed read models.");
  }
}

function assertReviewCenterActionAccess({ platform, principal, companyId, reviewItemId, operation }) {
  assertReviewCenterReadAccess({ principal });
  const reviewItem = platform.getReviewCenterItem({ companyId, reviewItemId });
  const assignedUserId = reviewItem.currentAssignment?.assignedUserId || null;
  if (operation === "claim") {
    if (assignedUserId && assignedUserId !== principal.userId) {
      throw createHttpError(409, "review_center_claimed_by_other_user", "Review item is already claimed by another actor.");
    }
    return;
  }

  if (assignedUserId !== principal.userId) {
    throw createHttpError(403, "review_center_assignment_required", "Review decisions require the current actor to hold the active assignment.");
  }
}
