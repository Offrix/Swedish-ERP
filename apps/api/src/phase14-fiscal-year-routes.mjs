import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase14FiscalYearRoutes({ req, res, url, path, platform, helpers }) {
  const { assertFinanceOperationsReadAccess } = helpers;

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

  return false;
}
