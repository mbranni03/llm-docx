import type { Router } from "./index";

/**
 * Register all docs endpoints.
 *
 * Usage:
 * ```ts
 * import { registerDocsRoutes } from "./docs";
 * registerDocsRoutes(router);
 * ```
 */
export function registerDocsRoutes(router: Router) {
  router.group("/docs", (r) => {
    // GET /docs — list all docs
    r.get("/", (ctx) => {
      return Response.json({ message: "Docs Healthy" }, { status: 200 });
    });
  });
}
