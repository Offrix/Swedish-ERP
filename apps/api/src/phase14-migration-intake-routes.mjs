import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";
import {
  applyReviewCenterDecisionSideEffects,
  resolveReviewCenterDecisionReasonCode
} from "./review-center-decision-effects.mjs";

export async function tryHandlePhase14MigrationIntakeRoutes({ req, res, url, path, platform, helpers }) {
  const {
    assertFinanceOperationsReadAccess,
    assertPayrollOperationsReadAccess,
    assertReviewCenterActionAccess
  } = helpers;

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

  const importCaseCorrectionRequestMatch = matchPath(path, "/v1/import-cases/:importCaseId/correction-requests");
  if (req.method === "POST" && importCaseCorrectionRequestMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "import_case",
      objectId: importCaseCorrectionRequestMatch.importCaseId,
      scopeCode: "import_case"
    });
    writeJson(
      res,
      201,
      platform.requestImportCaseCorrection({
        companyId,
        importCaseId: importCaseCorrectionRequestMatch.importCaseId,
        reasonCode: body.reasonCode,
        reasonNote: body.reasonNote || null,
        evidenceRefs: body.evidenceRefs || [],
        actorId: principal.userId
      })
    );
    return true;
  }

  const importCaseCorrectionDecisionMatch = matchPath(
    path,
    "/v1/import-cases/:importCaseId/correction-requests/:importCaseCorrectionRequestId/decide"
  );
  if (req.method === "POST" && importCaseCorrectionDecisionMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "import_case",
      objectId: importCaseCorrectionDecisionMatch.importCaseId,
      scopeCode: "import_case"
    });
    writeJson(
      res,
      200,
      platform.decideImportCaseCorrectionRequest({
        companyId,
        importCaseId: importCaseCorrectionDecisionMatch.importCaseId,
        importCaseCorrectionRequestId: importCaseCorrectionDecisionMatch.importCaseCorrectionRequestId,
        decisionCode: body.decisionCode,
        decisionNote: body.decisionNote || null,
        replacementCaseReference: body.replacementCaseReference || null,
        actorId: principal.userId
      })
    );
    return true;
  }

  const importCaseApplyMatch = matchPath(path, "/v1/import-cases/:importCaseId/apply");
  if (req.method === "POST" && importCaseApplyMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "import_case",
      objectId: importCaseApplyMatch.importCaseId,
      scopeCode: "import_case"
    });
    writeJson(
      res,
      200,
      platform.applyImportCase({
        companyId,
        importCaseId: importCaseApplyMatch.importCaseId,
        targetDomainCode: body.targetDomainCode,
        targetObjectType: body.targetObjectType,
        targetObjectId: body.targetObjectId,
        appliedCommandKey: body.appliedCommandKey,
        payload: body.payload || {},
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
      const reviewItem = platform.getReviewCenterItem({
        companyId,
        reviewItemId: decisionAliasMatch.reviewItemId,
        viewerUserId: principal.userId,
        viewerTeamIds: principal.teamIds || []
      });
      const decided = platform.decideReviewCenterItem({
        companyId,
        reviewItemId: decisionAliasMatch.reviewItemId,
        decisionCode,
        reasonCode: resolveReviewCenterDecisionReasonCode({
          reviewItem,
          decisionCode,
          reasonCode: body.reasonCode || null
        }),
        note: body.note || null,
        decisionPayload: body.decisionPayload || {},
        evidenceRefs: body.evidenceRefs || [],
        overrideReasonCode: body.overrideReasonCode || null,
        resultingCommand: body.resultingCommand || null,
        targetQueueCode: body.targetQueueCode || null,
        actorId: principal.userId
      });
      const sourceObjectSnapshot = applyReviewCenterDecisionSideEffects({
        platform,
        companyId,
        reviewItem: decided,
        decisionCode,
        note: body.note || null,
        actorId: principal.userId
      });
      writeJson(res, 200, sourceObjectSnapshot ? { ...decided, sourceObjectSnapshot } : decided);
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

