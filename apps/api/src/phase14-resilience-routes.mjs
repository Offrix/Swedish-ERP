import {
  authorizeCompanyAccess,
  matchPath,
  optionalInteger,
  optionalText,
  readJsonBody,
  readSessionToken,
  requireText,
  writeJson
} from "./route-helpers.mjs";

export async function tryHandlePhase14ResilienceRoutes({ req, res, url, path, platform, helpers }) {
  const { assertBackofficeReadAccess, buildObservabilityPayload } = helpers;

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

  if (req.method === "GET" && path === "/v1/ops/transaction-boundary") {
    const companyId = requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.");
    const sessionToken = readSessionToken(req);
    const principal = authorizeCompanyAccess({ platform, sessionToken, companyId, action: "company.read", objectType: "transaction_boundary", objectId: companyId, scopeCode: "resilience" });
    assertBackofficeReadAccess({ principal });
    writeJson(res, 200, platform.getTransactionBoundarySummary({
      companyId,
      asOf: optionalText(url.searchParams.get("asOf")),
      warningLagMinutes: optionalInteger(url.searchParams.get("warningLagMinutes")) || 15,
      criticalLagMinutes: optionalInteger(url.searchParams.get("criticalLagMinutes")) || 60,
      projectionRunningStaleMinutes: optionalInteger(url.searchParams.get("projectionRunningStaleMinutes")) || 15
    }));
    return true;
  }

  return false;
}
