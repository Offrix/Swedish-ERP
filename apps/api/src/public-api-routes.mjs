import { tryHandlePhase13PublicRoutes } from "./phase13-public-routes.mjs";

export async function tryHandlePublicApiRoutes(context) {
  return tryHandlePhase13PublicRoutes(context);
}
