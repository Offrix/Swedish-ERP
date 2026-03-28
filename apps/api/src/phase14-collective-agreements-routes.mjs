import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase14CollectiveAgreementRoutes({ req, res, url, path, platform, helpers }) {
  const { assertPayrollOperationsReadAccess, assertBackofficeReadAccess } = helpers;

  if (req.method === "GET" && path === "/v1/collective-agreements/catalog") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "agreement_catalog_entry",
      objectId: companyId,
      scopeCode: "collective_agreements"
    });
    writeJson(res, 200, {
      items: platform.listAgreementCatalogEntries({
        companyId,
        status: optionalText(url.searchParams.get("status")) || "published",
        agreementFamilyId: optionalText(url.searchParams.get("agreementFamilyId")),
        agreementFamilyCode: optionalText(url.searchParams.get("agreementFamilyCode"))
      })
    });
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

  if (req.method === "POST" && path === "/v1/collective-agreements/catalog") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "agreement_catalog_entry",
      objectId: companyId,
      scopeCode: "backoffice"
    });
    assertBackofficeReadAccess({ principal });
    writeJson(
      res,
      201,
      platform.publishAgreementCatalogEntry({
        companyId,
        agreementVersionId: body.agreementVersionId,
        catalogCode: body.catalogCode ?? null,
        dropdownLabel: body.dropdownLabel,
        publicationScopeCode: body.publicationScopeCode ?? "platform_published",
        sourceIntakeCaseId: body.sourceIntakeCaseId ?? null,
        idempotencyKey: body.idempotencyKey ?? null,
        actorId: principal.userId
      })
    );
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
        idempotencyKey: body.idempotencyKey ?? null,
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
        idempotencyKey: body.idempotencyKey ?? null,
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
    writeJson(
      res,
      200,
      platform.getAgreementVersion({
        companyId,
        agreementVersionId: agreementVersionMatch.agreementVersionId
      })
    );
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

  if (req.method === "GET" && path === "/v1/collective-agreements/local-supplements") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "agreement_local_supplement",
      objectId: companyId,
      scopeCode: "collective_agreements"
    });
    assertPayrollOperationsReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listLocalAgreementSupplements({
        companyId,
        targetEmploymentId: optionalText(url.searchParams.get("targetEmploymentId")),
        status: optionalText(url.searchParams.get("status")) || "approved"
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/collective-agreements/local-supplements") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "agreement_local_supplement",
      objectId: companyId,
      scopeCode: "backoffice"
    });
    assertBackofficeReadAccess({ principal });
    writeJson(
      res,
      201,
      platform.approveLocalAgreementSupplement({
        companyId,
        agreementVersionId: body.agreementVersionId,
        supplementCode: body.supplementCode,
        displayName: body.displayName,
        targetEmploymentId: body.targetEmploymentId ?? null,
        effectiveFrom: body.effectiveFrom ?? null,
        effectiveTo: body.effectiveTo ?? null,
        overlayRuleSet: body.overlayRuleSet ?? {},
        sourceIntakeCaseId: body.sourceIntakeCaseId ?? null,
        idempotencyKey: body.idempotencyKey ?? null,
        actorId: principal.userId
      })
    );
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
        agreementVersionId: body.agreementVersionId ?? null,
        agreementCatalogEntryId: body.agreementCatalogEntryId ?? null,
        localAgreementSupplementId: body.localAgreementSupplementId ?? null,
        effectiveFrom: body.effectiveFrom,
        effectiveTo: body.effectiveTo ?? null,
        assignmentReasonCode: body.assignmentReasonCode,
        idempotencyKey: body.idempotencyKey ?? null,
        actorId: principal.userId
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/backoffice/agreement-intake/cases") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "agreement_intake_case",
      objectId: companyId,
      scopeCode: "backoffice"
    });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listAgreementIntakeCases({
        companyId,
        status: optionalText(url.searchParams.get("status"))
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/backoffice/agreement-intake/cases") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "agreement_intake_case",
      objectId: companyId,
      scopeCode: "backoffice"
    });
    assertBackofficeReadAccess({ principal });
    writeJson(
      res,
      201,
      platform.submitAgreementIntakeCase({
        companyId,
        proposedFamilyCode: body.proposedFamilyCode,
        proposedFamilyName: body.proposedFamilyName,
        requestedPublicationTarget: body.requestedPublicationTarget ?? "catalog",
        sourceDocumentRef: body.sourceDocumentRef ?? null,
        intakeChannelCode: body.intakeChannelCode ?? "support_backoffice",
        requestedEmploymentId: body.requestedEmploymentId ?? null,
        note: body.note ?? null,
        idempotencyKey: body.idempotencyKey ?? null,
        actorId: principal.userId
      })
    );
    return true;
  }

  const agreementIntakeStartMatch = matchPath(path, "/v1/backoffice/agreement-intake/cases/:agreementIntakeCaseId/start-extraction");
  if (req.method === "POST" && agreementIntakeStartMatch) {
    const body = await readJsonBody(req, true);
    const companyId = requireText(body.companyId || url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "agreement_intake_case",
      objectId: agreementIntakeStartMatch.agreementIntakeCaseId,
      scopeCode: "backoffice"
    });
    assertBackofficeReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.startAgreementIntakeExtraction({
        companyId,
        agreementIntakeCaseId: agreementIntakeStartMatch.agreementIntakeCaseId,
        actorId: principal.userId
      })
    );
    return true;
  }

  const agreementIntakeReviewMatch = matchPath(path, "/v1/backoffice/agreement-intake/cases/:agreementIntakeCaseId/review");
  if (req.method === "POST" && agreementIntakeReviewMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "agreement_intake_case",
      objectId: agreementIntakeReviewMatch.agreementIntakeCaseId,
      scopeCode: "backoffice"
    });
    assertBackofficeReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.reviewAgreementIntakeCase({
        companyId,
        agreementIntakeCaseId: agreementIntakeReviewMatch.agreementIntakeCaseId,
        decisionStatus: body.decisionStatus,
        agreementFamilyId: body.agreementFamilyId ?? null,
        agreementFamilyCode: body.agreementFamilyCode ?? null,
        agreementFamilyName: body.agreementFamilyName ?? null,
        versionCode: body.versionCode ?? null,
        effectiveFrom: body.effectiveFrom,
        effectiveTo: body.effectiveTo ?? null,
        rulepackVersion: body.rulepackVersion ?? null,
        ruleSet: body.ruleSet ?? {},
        catalogCode: body.catalogCode ?? null,
        dropdownLabel: body.dropdownLabel ?? null,
        baseAgreementVersionId: body.baseAgreementVersionId ?? null,
        supplementCode: body.supplementCode ?? null,
        supplementLabel: body.supplementLabel ?? null,
        targetEmploymentId: body.targetEmploymentId ?? null,
        overlayRuleSet: body.overlayRuleSet ?? {},
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
        idempotencyKey: body.idempotencyKey ?? null,
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
    writeJson(
      res,
      200,
      platform.getActiveAgreementForEmployment({
        companyId,
        employeeId,
        employmentId,
        eventDate
      })
    );
    return true;
  }

  return false;
}
