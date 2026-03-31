import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase14LegalFormRoutes({ req, res, url, path, platform, helpers }) {
  const { assertFinanceOperationsReadAccess } = helpers;

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

  if (req.method === "GET" && path === "/v1/legal-forms/close-requirements") {
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
    const isFiscalYearEndValue = optionalText(url.searchParams.get("isFiscalYearEnd"));
    writeJson(
      res,
      200,
      platform.resolveCloseRequirements({
        companyId,
        asOfDate,
        fiscalYearKey: optionalText(url.searchParams.get("fiscalYearKey")),
        fiscalYearId: optionalText(url.searchParams.get("fiscalYearId")),
        accountingPeriodId: optionalText(url.searchParams.get("accountingPeriodId")),
        isFiscalYearEnd: ["1", "true", "yes"].includes(String(isFiscalYearEndValue || "").toLowerCase())
      })
    );
    return true;
  }

  return false;
}
