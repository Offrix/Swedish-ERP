import { tryHandlePhase16IntegrationRoutes } from "./phase16-integration-routes.mjs";

export async function tryHandleIntegrationRoutes(context) {
  return tryHandlePhase16IntegrationRoutes(context);
}
