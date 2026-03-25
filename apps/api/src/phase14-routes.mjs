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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "legal_form_profile",
      objectId: companyId,
      scopeCode: "annual_reporting"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "legal_form_profile",
      objectId: legalFormProfileMatch.legalFormProfileId,
      scopeCode: "annual_reporting"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "legal_form_profile",
      objectId: companyId,
      scopeCode: "annual_reporting"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "reporting_obligation_profile",
      objectId: companyId,
      scopeCode: "annual_reporting"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "reporting_obligation_profile",
      objectId: reportingObligationMatch.reportingObligationProfileId,
      scopeCode: "annual_reporting"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "legal_form_profile",
      objectId: companyId,
      scopeCode: "annual_reporting"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: accountingMethodProfileMatch.methodProfileId,
      scopeCode: "accounting_method"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
    writeJson(res, 200, platform.getActiveMethodForDate({ companyId, accountingDate }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/accounting-method/history") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: companyId,
      scopeCode: "accounting_method"
    });
    writeJson(res, 200, { items: platform.listYearEndCatchUpRuns({ companyId }) });
    return true;
  }

  const yearEndCatchUpRunMatch = matchPath(path, "/v1/accounting-method/year-end-catch-up-runs/:yearEndCatchUpRunId");
  if (req.method === "GET" && yearEndCatchUpRunMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "accounting_method",
      objectId: yearEndCatchUpRunMatch.yearEndCatchUpRunId,
      scopeCode: "accounting_method"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
    writeJson(res, 200, platform.getActiveFiscalYearForDate({ companyId, accountingDate }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/fiscal-years/periods/lookup") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const accountingDate = requireText(url.searchParams.get("accountingDate"), "accounting_date_required", "accountingDate is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
    writeJson(res, 200, platform.getPeriodForDate({ companyId, accountingDate }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/fiscal-years/history") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "fiscal_year",
      objectId: companyId,
      scopeCode: "fiscal_year"
    });
    writeJson(res, 200, platform.getFiscalYearHistory({ companyId }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/tax-account/events") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "tax_account",
      objectId: companyId,
      scopeCode: "tax_account"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "tax_account",
      objectId: companyId,
      scopeCode: "tax_account"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_type",
      objectId: companyId,
      scopeCode: "balances"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_account",
      objectId: companyId,
      scopeCode: "balances"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_account",
      objectId: balanceAccountMatch.balanceAccountId,
      scopeCode: "balances"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_transaction",
      objectId: balanceTransactionsMatch.balanceAccountId,
      scopeCode: "balances"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_snapshot",
      objectId: balanceSnapshotMatch.balanceAccountId,
      scopeCode: "balances"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_carry_forward_run",
      objectId: companyId,
      scopeCode: "balances"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "balance_expiry_run",
      objectId: companyId,
      scopeCode: "balances"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "agreement_family",
      objectId: companyId,
      scopeCode: "collective_agreements"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "agreement_version",
      objectId: companyId,
      scopeCode: "collective_agreements"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "agreement_version",
      objectId: agreementVersionMatch.agreementVersionId,
      scopeCode: "collective_agreements"
    });
    writeJson(res, 200, platform.getAgreementVersion({
      companyId,
      agreementVersionId: agreementVersionMatch.agreementVersionId
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/collective-agreements/assignments") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "agreement_assignment",
      objectId: companyId,
      scopeCode: "collective_agreements"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "agreement_override",
      objectId: agreementOverridesMatch.agreementAssignmentId,
      scopeCode: "collective_agreements"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "agreement_assignment",
      objectId: employmentId,
      scopeCode: "collective_agreements"
    });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "support_case", objectId: companyId, scopeCode: "support_case" });
    writeJson(res, 200, { items: platform.listSupportCases({ sessionToken, companyId, status: optionalText(url.searchParams.get("status")) }) });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "audit_event", objectId: companyId, scopeCode: "audit_event" });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "impersonation_session", objectId: companyId, scopeCode: "impersonation_session" });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "access_review_batch", objectId: companyId, scopeCode: "access_review_batch" });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "break_glass_session", objectId: companyId, scopeCode: "break_glass_session" });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "feature_flag", objectId: companyId, scopeCode: "feature_flag" });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "emergency_disable", objectId: companyId, scopeCode: "emergency_disable" });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "load_profile", objectId: companyId, scopeCode: "load_profile" });
    writeJson(res, 200, { items: platform.listLoadProfiles({ sessionToken, companyId }) });
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
      targetRtoMinutes: body.targetRtoMinutes,
      targetRpoMinutes: body.targetRpoMinutes,
      actualRtoMinutes: body.actualRtoMinutes,
      actualRpoMinutes: body.actualRpoMinutes,
      status: body.status,
      evidence: body.evidence
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/restore-drills") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "restore_drill", objectId: companyId, scopeCode: "restore_drill" });
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
      evidence: body.evidence
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/ops/chaos-scenarios") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "chaos_scenario", objectId: companyId, scopeCode: "chaos_scenario" });
    writeJson(res, 200, { items: platform.listChaosScenarios({ sessionToken, companyId }) });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_mapping_set", objectId: companyId, scopeCode: "migration_mapping_set" });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_import_batch", objectId: companyId, scopeCode: "migration_import_batch" });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_diff_report", objectId: companyId, scopeCode: "migration_diff_report" });
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
      signoffChain: body.signoffChain,
      goLiveChecklist: body.goLiveChecklist
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/cutover-plans") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_cutover_plan", objectId: companyId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, { items: platform.listCutoverPlans({ sessionToken, companyId }) });
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
    writeJson(res, 200, platform.passCutoverValidation({ sessionToken, companyId, cutoverPlanId: cutoverValidateMatch.cutoverPlanId }));
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
    writeJson(res, 200, platform.startRollback({ sessionToken, companyId, cutoverPlanId: cutoverRollbackMatch.cutoverPlanId, reasonCode: body.reasonCode }));
    return true;
  }

  const cutoverRollbackCompleteMatch = matchPath(path, "/v1/migration/cutover-plans/:cutoverPlanId/rollback/complete");
  if (req.method === "POST" && cutoverRollbackCompleteMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.manage", objectType: "migration_cutover_plan", objectId: cutoverRollbackCompleteMatch.cutoverPlanId, scopeCode: "migration_cutover_plan" });
    writeJson(res, 200, platform.completeRollback({ sessionToken, companyId, cutoverPlanId: cutoverRollbackCompleteMatch.cutoverPlanId }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/migration/cockpit") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "migration_cockpit", objectId: companyId, scopeCode: "migration_cockpit" });
    writeJson(res, 200, platform.getMigrationCockpit({ sessionToken, companyId }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/notifications") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "notification", objectId: companyId, scopeCode: "notifications" });
    const recipientType = optionalText(url.searchParams.get("recipientType"));
    const recipientId = optionalText(url.searchParams.get("recipientId"));
    const resolvedRecipient = resolveNotificationRecipientScope({ principal, recipientType, recipientId });
    writeJson(res, 200, {
      items: platform.listNotifications({
        companyId,
        recipientType: resolvedRecipient.recipientType,
        recipientId: resolvedRecipient.recipientId,
        status: optionalText(url.searchParams.get("status")),
        categoryCode: optionalText(url.searchParams.get("categoryCode")),
        onlyUnread: url.searchParams.get("onlyUnread") === "true"
      })
    });
    return true;
  }

  const notificationReadMatch = matchPath(path, "/v1/notifications/:notificationId/read");
  if (req.method === "POST" && notificationReadMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "notification", objectId: notificationReadMatch.notificationId, scopeCode: "notifications" });
    assertNotificationMutationAccess({ platform, principal, companyId, notificationId: notificationReadMatch.notificationId });
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
    assertNotificationMutationAccess({ platform, principal, companyId, notificationId: notificationAckMatch.notificationId });
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
    assertNotificationMutationAccess({ platform, principal, companyId, notificationId: notificationSnoozeMatch.notificationId });
    writeJson(res, 200, platform.snoozeNotification({
      companyId,
      notificationId: notificationSnoozeMatch.notificationId,
      until: body.until || null,
      actorId: principal.userId
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/activity") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "activity_entry", objectId: companyId, scopeCode: "activity" });
    writeJson(res, 200, {
      items: platform.listActivityEntries({
        companyId,
        objectType: optionalText(url.searchParams.get("objectType")),
        objectId: optionalText(url.searchParams.get("objectId")),
        visibilityScope: optionalText(url.searchParams.get("visibilityScope")),
        relatedObjectType: optionalText(url.searchParams.get("relatedObjectType")),
        relatedObjectId: optionalText(url.searchParams.get("relatedObjectId"))
      })
    });
    return true;
  }

  if (req.method === "GET" && path === "/v1/review-center/queues") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "review_queue", objectId: companyId, scopeCode: "review_center" });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "review_item", objectId: companyId, scopeCode: "review_center" });
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
    authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "review_item", objectId: reviewCenterItemMatch.reviewItemId, scopeCode: "review_center" });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "classification_case",
      objectId: documentClassificationCasesMatch.documentId,
      scopeCode: "document_classification"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "classification_case",
      objectId: documentClassificationCaseMatch.classificationCaseId,
      scopeCode: "document_classification"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "import_case",
      objectId: companyId,
      scopeCode: "import_case"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "import_case",
      objectId: importCaseMatch.importCaseId,
      scopeCode: "import_case"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "payroll_migration",
      objectId: companyId,
      scopeCode: "payroll"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "payroll_migration",
      objectId: payrollMigrationMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "payroll_migration",
      objectId: payrollMigrationEmployeesMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
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
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "payroll_migration",
      objectId: payrollMigrationDiffsMatch.payrollMigrationBatchId,
      scopeCode: "payroll"
    });
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
  if (recipientType != null && recipientType !== "user") {
    throw createHttpError(403, "notification_recipient_scope_forbidden", "Notification center only exposes the current user's direct inbox in this route.");
  }
  const resolvedRecipientId = recipientId || principal.userId;
  if (resolvedRecipientId !== principal.userId) {
    throw createHttpError(403, "notification_recipient_scope_forbidden", "Notification center only exposes the current user's direct inbox in this route.");
  }
  return {
    recipientType: "user",
    recipientId: resolvedRecipientId
  };
}

function assertNotificationMutationAccess({ platform, principal, companyId, notificationId }) {
  const notification = platform.getNotification({ companyId, notificationId });
  if (notification.recipientType !== "user" || notification.recipientId !== principal.userId) {
    throw createHttpError(403, "notification_recipient_scope_forbidden", "Notification action is only allowed for the addressed user in this route.");
  }
}

const REVIEW_CENTER_OPERATOR_ROLE_CODES = new Set(["company_admin", "approver", "payroll_admin", "bureau_user"]);

function assertReviewCenterActionAccess({ platform, principal, companyId, reviewItemId, operation }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  const isAllowedOperator = [...REVIEW_CENTER_OPERATOR_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
  if (!isAllowedOperator) {
    throw createHttpError(403, "review_center_role_forbidden", "Current actor is not allowed to operate review-center items.");
  }

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
