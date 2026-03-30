import { tryHandlePhase13PartnerRoutes } from "./phase13-partner-routes.mjs";

export async function tryHandlePartnerApiRoutes(context) {
  return tryHandlePhase13PartnerRoutes(context);
}
