import { matchPath, readJsonBody, readSessionToken, writeJson } from "./route-helpers.mjs";

export async function tryHandlePhase6AuthRoutes({ req, res, path, platform }) {
  if (req.method === "POST" && path === "/v1/auth/bankid/start") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.startBankIdAuthentication({ sessionToken: readSessionToken(req, body) }));
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
        completionToken: body.completionToken
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
        redirectUri: body.redirectUri
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
        state: body.state
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
