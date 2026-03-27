import {
  authorizeCompanyAccess,
  matchPath,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase13JobRoutes({ req, res, url, path, platform }) {
  if (req.method === "POST" && path === "/v1/jobs") {
    const body = await readJsonBody(req);
    const sessionToken = readSessionToken(req, body);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: companyId,
      scopeCode: "async_job"
    });
    writeJson(
      res,
      201,
      platform.enqueueAsyncJob({
        companyId,
        jobType: body.jobType,
        payloadRef: body.payloadRef,
        payload: body.payload || {},
        priority: body.priority,
        riskClass: body.riskClass,
        retryPolicy: body.retryPolicy,
        sourceEventId: body.sourceEventId,
        sourceActionId: body.sourceActionId,
        idempotencyKey: body.idempotencyKey,
        actorId: body.actorId || "session_user"
      })
    );
    return true;
  }

  if (req.method === "GET" && path === "/v1/jobs") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "async_job",
      objectId: companyId,
      scopeCode: "async_job"
    });
    writeJson(res, 200, {
      items: platform.listAsyncJobs({
        companyId,
        status: optionalText(url.searchParams.get("status")),
        jobType: optionalText(url.searchParams.get("jobType"))
      })
    });
    return true;
  }

  const jobMatch = matchPath(path, "/v1/jobs/:jobId");
  if (req.method === "GET" && jobMatch) {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      action: "company.read",
      objectType: "async_job",
      objectId: jobMatch.jobId,
      scopeCode: "async_job"
    });
    writeJson(res, 200, platform.getAsyncJob({ companyId, jobId: jobMatch.jobId }));
    return true;
  }

  const jobClaimMatch = matchPath(path, "/v1/jobs/:jobId/claim");
  if (req.method === "POST" && jobClaimMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: jobClaimMatch.jobId,
      scopeCode: "async_job"
    });
    writeJson(res, 200, platform.claimAsyncJob({ companyId, jobId: jobClaimMatch.jobId, workerId: body.workerId }));
    return true;
  }

  const jobCompleteMatch = matchPath(path, "/v1/jobs/:jobId/complete");
  if (req.method === "POST" && jobCompleteMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: jobCompleteMatch.jobId,
      scopeCode: "async_job"
    });
    writeJson(res, 200, platform.completeAsyncJob({ companyId, jobId: jobCompleteMatch.jobId, resultSummary: body.resultSummary || {} }));
    return true;
  }

  const jobFailMatch = matchPath(path, "/v1/jobs/:jobId/fail");
  if (req.method === "POST" && jobFailMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: jobFailMatch.jobId,
      scopeCode: "async_job"
    });
    writeJson(
      res,
      200,
      platform.failAsyncJobAttempt({
        companyId,
        jobId: jobFailMatch.jobId,
        errorClass: body.errorClass,
        errorMessage: body.errorMessage,
        replayAllowed: body.replayAllowed
      })
    );
    return true;
  }

  const jobReplayPlanMatch = matchPath(path, "/v1/jobs/:jobId/replay-plan");
  if (req.method === "POST" && jobReplayPlanMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: jobReplayPlanMatch.jobId,
      scopeCode: "async_job"
    });
    writeJson(
      res,
      200,
      platform.planJobReplay({
        companyId,
        jobId: jobReplayPlanMatch.jobId,
        actorId: body.actorId || "session_user",
        approvedByActorId: body.approvedByActorId || null
      })
    );
    return true;
  }

  const jobReplayMatch = matchPath(path, "/v1/jobs/:jobId/replay");
  if (req.method === "POST" && jobReplayMatch) {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: jobReplayMatch.jobId,
      scopeCode: "async_job"
    });
    writeJson(res, 200, platform.executeJobReplay({ companyId, jobId: jobReplayMatch.jobId, actorId: body.actorId || "session_user" }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/jobs/mass-retry") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "companyId is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      action: "company.manage",
      objectType: "async_job",
      objectId: companyId,
      scopeCode: "async_job"
    });
    writeJson(res, 200, {
      items: platform.massRetryJobs({
        companyId,
        jobIds: body.jobIds,
        actorId: body.actorId || "session_user"
      })
    });
    return true;
  }

  return false;
}
