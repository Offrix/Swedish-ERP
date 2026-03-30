import { tryHandlePhase6AuthRoutes } from "./phase6-auth-routes.mjs";

export async function tryHandleIdentityRoutes(context) {
  return tryHandlePhase6AuthRoutes(context);
}
