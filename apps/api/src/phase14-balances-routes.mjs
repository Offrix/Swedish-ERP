import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase14BalancesRoutes({ req, res, url, path, platform, helpers }) {
  const { assertPayrollOperationsReadAccess } = helpers;

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

  if (req.method === "GET" && path === "/v1/balances/vacation-profiles") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "vacation_balance_profile",
      objectId: companyId,
      scopeCode: "balances"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listVacationBalanceProfiles({
        companyId,
        active: optionalText(url.searchParams.get("active"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/balances/vacation-profiles") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "vacation_balance_profile",
      objectId: companyId,
      scopeCode: "balances"
    });
    writeJson(
      res,
      201,
      platform.createVacationBalanceProfile({
        companyId,
        vacationBalanceProfileCode: body.vacationBalanceProfileCode,
        label: body.label,
        paidDaysBalanceTypeCode: body.paidDaysBalanceTypeCode,
        savedDaysBalanceTypeCode: body.savedDaysBalanceTypeCode,
        vacationYearStartMonthDay: body.vacationYearStartMonthDay,
        minimumPaidDaysToRetain: body.minimumPaidDaysToRetain ?? 20,
        maxSavedDaysPerYear: body.maxSavedDaysPerYear ?? 5,
        active: body.active !== false,
        actorId: principal.userId
      })
    );
    return true;
  }

  const vacationProfileMatch = matchPath(path, "/v1/balances/vacation-profiles/:vacationBalanceProfileId");
  if (req.method === "GET" && vacationProfileMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "vacation_balance_profile",
      objectId: vacationProfileMatch.vacationBalanceProfileId,
      scopeCode: "balances"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.getVacationBalanceProfile({
        companyId,
        vacationBalanceProfileId: vacationProfileMatch.vacationBalanceProfileId
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

  if (req.method === "GET" && path === "/v1/balances/vacation-balances") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const employmentId = requireText(url.searchParams.get("employmentId"), "employment_id_required", "employmentId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "vacation_balance",
      objectId: employmentId,
      scopeCode: "balances"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.getVacationBalance({
        companyId,
        employmentId,
        snapshotDate: optionalText(url.searchParams.get("snapshotDate")),
        vacationBalanceProfileCode: optionalText(url.searchParams.get("vacationBalanceProfileCode"))
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

  if (req.method === "GET" && path === "/v1/balances/vacation-year-closes") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.read",
      objectType: "vacation_year_close_run",
      objectId: companyId,
      scopeCode: "balances"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, { items: platform.listVacationYearCloseRuns({ companyId }) });
    return true;
  }

  if (req.method === "POST" && path === "/v1/balances/vacation-year-closes") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "vacation_year_close_run",
      objectId: companyId,
      scopeCode: "balances"
    });
    writeJson(
      res,
      201,
      platform.runVacationYearClose({
        companyId,
        snapshotDate: body.snapshotDate,
        employmentId: body.employmentId ?? null,
        vacationBalanceProfileCode: body.vacationBalanceProfileCode ?? null,
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

  return false;
}
