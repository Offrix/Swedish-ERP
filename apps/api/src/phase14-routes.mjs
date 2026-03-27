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
import { tryHandlePhase14BackofficeRoutes } from "./phase14-backoffice-routes.mjs";
import { tryHandlePhase14MigrationIntakeRoutes } from "./phase14-migration-intake-routes.mjs";
import { tryHandlePhase14MigrationRoutes } from "./phase14-migration-routes.mjs";
import { tryHandlePhase14ResilienceRoutes } from "./phase14-resilience-routes.mjs";
import { tryHandlePhase14ReviewRoutes } from "./phase14-review-routes.mjs";

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

  if (
    await tryHandlePhase14BackofficeRoutes({
      req,
      res,
      url,
      path,
      platform,
      helpers: {
        OPEN_RUNTIME_REPLAY_PLAN_STATUSES,
        assertBackofficeReadAccess,
        buildBackofficeJobRows,
        buildBackofficeReplayRows,
        buildBackofficeDeadLetterRows,
        buildSubmissionMonitorPayload,
        buildSubmissionMonitorScan,
        resolveBackofficeOperatorBinding,
        resolveReviewSlaNotificationTarget,
        mapQueuePriorityToIncidentSeverity
      }
    })
  ) {
    return true;
  }

  if (
    await tryHandlePhase14ResilienceRoutes({
      req,
      res,
      url,
      path,
      platform,
      helpers: {
        assertBackofficeReadAccess,
        buildObservabilityPayload
      }
    })
  ) {
    return true;
  }

  if (
    await tryHandlePhase14MigrationRoutes({
      req,
      res,
      url,
      path,
      platform,
      helpers: {
        assertPayrollOperationsReadAccess
      }
    })
  ) {
    return true;
  }

  if (
    await tryHandlePhase14ReviewRoutes({
      req,
      res,
      url,
      path,
      platform,
      helpers: {
        assertBackofficeReadAccess,
        resolveNotificationRecipientTargets,
        listAccessibleNotifications,
        buildAccessibleNotificationSummary,
        requireTextArray,
        assertNotificationReadAccess,
        assertActivityFeedFullReadAccess,
        parsePositiveInteger
      }
    })
  ) {
    return true;
  }

  if (
    await tryHandlePhase14MigrationIntakeRoutes({
      req,
      res,
      url,
      path,
      platform,
      helpers: {
        assertFinanceOperationsReadAccess,
        assertPayrollOperationsReadAccess,
        assertReviewCenterActionAccess
      }
    })
  ) {
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

