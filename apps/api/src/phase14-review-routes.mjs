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

export async function tryHandlePhase14ReviewRoutes({ req, res, url, path, platform, helpers }) {
  const {
    assertBackofficeReadAccess,
    resolveNotificationRecipientTargets,
    listAccessibleNotifications,
    buildAccessibleNotificationSummary,
    requireTextArray,
    assertNotificationReadAccess,
    assertActivityFeedFullReadAccess,
    parsePositiveInteger
  } = helpers;

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
      cursor: optionalText(url.searchParams.get("cursor")),
      viewerUserId: principal.userId,
      viewerTeamIds: resolvePrincipalTeamIds(principal),
      viewerCanReadBackoffice: canReadBackofficeActivity({ principal })
    }));
    return true;
  }

  const activityObjectMatch = matchPath(path, "/v1/activity/object/:objectType/:objectId");
  if (req.method === "GET" && activityObjectMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "activity_entry", objectId: activityObjectMatch.objectId, scopeCode: "activity" });
    writeJson(res, 200, platform.listActivityEntriesPage({
      companyId,
      objectType: activityObjectMatch.objectType,
      objectId: activityObjectMatch.objectId,
      visibilityScope: optionalText(url.searchParams.get("visibilityScope")),
      relatedObjectType: optionalText(url.searchParams.get("relatedObjectType")),
      relatedObjectId: optionalText(url.searchParams.get("relatedObjectId")),
      limit: parsePositiveInteger(url.searchParams.get("limit"), "activity_limit_invalid", "limit must be a positive integer.") || null,
      cursor: optionalText(url.searchParams.get("cursor")),
      viewerUserId: principal.userId,
      viewerTeamIds: resolvePrincipalTeamIds(principal),
      viewerCanReadBackoffice: canReadBackofficeActivity({ principal })
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
        status: optionalText(url.searchParams.get("status")),
        viewerUserId: principal.userId,
        viewerTeamIds: resolvePrincipalTeamIds(principal)
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
        sourceDomainCode: optionalText(url.searchParams.get("sourceDomainCode")),
        viewerUserId: principal.userId,
        viewerTeamIds: resolvePrincipalTeamIds(principal)
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
      reviewItemId: reviewCenterItemMatch.reviewItemId,
      viewerUserId: principal.userId,
      viewerTeamIds: resolvePrincipalTeamIds(principal)
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
      actorId: principal.userId,
      viewerUserId: principal.userId,
      viewerTeamIds: resolvePrincipalTeamIds(principal)
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
      actorId: principal.userId,
      viewerUserId: principal.userId,
      viewerTeamIds: resolvePrincipalTeamIds(principal)
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


  return false;
}

const REVIEW_CENTER_OPERATOR_ROLE_CODES = new Set(["company_admin", "approver", "payroll_admin", "bureau_user"]);
const BACKOFFICE_ACTIVITY_ROLE_CODES = new Set(["company_admin", "approver"]);
const ACTIVITY_FEED_FULL_READ_ROLE_CODES = new Set(["company_admin", "approver", "payroll_admin", "bureau_user"]);

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
  const reviewItem = platform.getReviewCenterItem({
    companyId,
    reviewItemId,
    viewerUserId: principal.userId,
    viewerTeamIds: resolvePrincipalTeamIds(principal)
  });
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

function canReadBackofficeActivity({ principal }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  return [...BACKOFFICE_ACTIVITY_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
}

function resolvePrincipalTeamIds(principal) {
  return Array.isArray(principal?.teamIds)
    ? [...new Set(principal.teamIds.filter((teamId) => typeof teamId === "string" && teamId.trim().length > 0))]
    : [];
}
