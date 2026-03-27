import { matchPath, readJsonBody, readSessionToken, writeJson } from "./route-helpers.mjs";

export async function tryHandlePhase6AuthRoutes({ req, res, path, platform }) {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && path === "/v1/auth/challenges") {
    writeJson(res, 200, {
      items: platform.listChallenges({
        sessionToken: readSessionToken(req),
        status: requestUrl.searchParams.get("status")
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/auth/challenges") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.createChallenge({
      sessionToken: readSessionToken(req, body),
      factorType: body.factorType,
      actionClass: body.actionClass,
      deviceName: body.deviceName
    }));
    return true;
  }

  const completeChallengeMatch = matchPath(path, "/v1/auth/challenges/:challengeId/complete");
  if (req.method === "POST" && completeChallengeMatch) {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.completeChallenge({
      sessionToken: readSessionToken(req, body),
      challengeId: completeChallengeMatch.challengeId,
      code: body.code,
      factorId: body.factorId,
      credentialId: body.credentialId,
      assertion: body.assertion,
      completionToken: body.completionToken,
      deviceFingerprint: body.deviceFingerprint
    }));
    return true;
  }

  if (req.method === "GET" && path === "/v1/auth/devices") {
    writeJson(res, 200, {
      items: platform.listDeviceTrustRecords({
        sessionToken: readSessionToken(req)
      })
    });
    return true;
  }

  const trustDeviceMatch = matchPath(path, "/v1/auth/devices/:deviceTrustRecordId/trust");
  if (req.method === "POST" && trustDeviceMatch) {
    const body = await readJsonBody(req);
    writeJson(res, 200, {
      deviceTrustRecord: platform.trustDevice({
        sessionToken: readSessionToken(req, body),
        deviceTrustRecordId: trustDeviceMatch.deviceTrustRecordId,
        trustedUntil: body.trustedUntil
      })
    });
    return true;
  }

  const revokeDeviceMatch = matchPath(path, "/v1/auth/devices/:deviceTrustRecordId/revoke");
  if (req.method === "POST" && revokeDeviceMatch) {
    const body = await readJsonBody(req);
    writeJson(res, 200, {
      deviceTrustRecord: platform.revokeDevice({
        sessionToken: readSessionToken(req, body),
        deviceTrustRecordId: revokeDeviceMatch.deviceTrustRecordId
      })
    });
    return true;
  }

  if (req.method === "POST" && path === "/v1/auth/bankid/start") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.startBankIdAuthentication({
      sessionToken: readSessionToken(req, body),
      actionClass: body.actionClass
    }));
    return true;
  }

  if (req.method === "POST" && path === "/v1/auth/bankid/collect") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.collectBankIdAuthentication({
        sessionToken: readSessionToken(req, body),
        orderRef: body.orderRef,
        completionToken: body.completionToken,
        actionClass: body.actionClass,
        deviceFingerprint: body.deviceFingerprint
      })
    );
    return true;
  }

  if (req.method === "POST" && path === "/v1/auth/federation/start") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.startFederationAuthentication({
        sessionToken: readSessionToken(req, body, { required: false }),
        companyId: body.companyId,
        email: body.email,
        connectionId: body.connectionId,
        loginHint: body.loginHint,
        redirectUri: body.redirectUri,
        actionClass: body.actionClass
      })
    );
    return true;
  }

  if (req.method === "POST" && path === "/v1/auth/federation/callback") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.completeFederationAuthentication({
        sessionToken: readSessionToken(req, body),
        authRequestId: body.authRequestId,
        authorizationCode: body.authorizationCode,
        state: body.state,
        actionClass: body.actionClass,
        deviceFingerprint: body.deviceFingerprint
      })
    );
    return true;
  }

  const revokeMatch = matchPath(path, "/v1/auth/sessions/:sessionId/revoke");
  if (req.method === "POST" && revokeMatch) {
    writeJson(res, 200, {
      session: platform.revokeSession({
        sessionToken: readSessionToken(req),
        targetSessionId: revokeMatch.sessionId
      })
    });
    return true;
  }

  return false;
}
