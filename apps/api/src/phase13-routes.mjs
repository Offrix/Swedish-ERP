import { tryHandlePhase13AutomationRoutes } from "./phase13-automation-routes.mjs";
import { tryHandlePhase13JobRoutes } from "./phase13-job-routes.mjs";
import { tryHandlePhase13PartnerRoutes } from "./phase13-partner-routes.mjs";
import { tryHandlePhase13PublicRoutes } from "./phase13-public-routes.mjs";

export async function tryHandlePhase13Route({ req, res, url, path, platform }) {
  if (await tryHandlePhase13PublicRoutes({ req, res, url, path, platform })) {
    return true;
  }
  if (await tryHandlePhase13PartnerRoutes({ req, res, url, path, platform })) {
    return true;
  }
  if (await tryHandlePhase13JobRoutes({ req, res, url, path, platform })) {
    return true;
  }
  if (await tryHandlePhase13AutomationRoutes({ req, res, url, path, platform })) {
    return true;
  }

  return false;
}
