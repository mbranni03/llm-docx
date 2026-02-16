/**
 * Lightweight, type-safe HTTP router for Bun.
 *
 * Supports method-based registration, `:param` path parameters,
 * query-string parsing, and route grouping for cross-file organisation.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface RouteContext {
  /** The original incoming request. */
  request: Request;
  /** Path parameters extracted from `:param` segments. */
  params: Record<string, string>;
  /** Parsed query-string key/value pairs. */
  query: Record<string, string>;
  /** Parse the request body as JSON. */
  body: <T = unknown>() => Promise<T>;
}

export type RouteHandler = (ctx: RouteContext) => Response | Promise<Response>;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface Route {
  method: HttpMethod;
  /** The original pattern, e.g. `/users/:id` */
  pattern: string;
  /** Compiled regex for matching request paths. */
  regex: RegExp;
  /** Ordered list of param names pulled from the pattern. */
  paramNames: string[];
  handler: RouteHandler;
}

// ─── Router ──────────────────────────────────────────────────────────

export class Router {
  private routes: Route[] = [];
  private prefix = "";

  // ── Registration helpers ─────────────────────────────────────────

  get(path: string, handler: RouteHandler) {
    this.addRoute("GET", path, handler);
  }

  post(path: string, handler: RouteHandler) {
    this.addRoute("POST", path, handler);
  }

  put(path: string, handler: RouteHandler) {
    this.addRoute("PUT", path, handler);
  }

  patch(path: string, handler: RouteHandler) {
    this.addRoute("PATCH", path, handler);
  }

  delete(path: string, handler: RouteHandler) {
    this.addRoute("DELETE", path, handler);
  }

  // ── Grouping ─────────────────────────────────────────────────────

  /**
   * Register a batch of routes under a shared prefix.
   *
   * ```ts
   * router.group("/api/v1", (r) => {
   *   r.get("/users", listUsers);
   * });
   * // registers GET /api/v1/users
   * ```
   */
  group(prefix: string, callback: (router: Router) => void) {
    const prev = this.prefix;
    this.prefix = prev + prefix;
    callback(this);
    this.prefix = prev;
  }

  // ── Request handling ─────────────────────────────────────────────

  /**
   * Match the incoming request to a registered route and invoke its
   * handler.  Returns a `404` response when no route matches.
   */
  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase() as HttpMethod;
    const pathname = url.pathname;

    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = route.regex.exec(pathname);
      if (!match) continue;

      // Build params from named capture groups
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1]!;
      });

      // Parse query string
      const query: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        query[key] = value;
      });

      const ctx: RouteContext = {
        request,
        params,
        query,
        body: <T = unknown>() => request.json() as Promise<T>,
      };

      return route.handler(ctx);
    }

    return Response.json({ error: "Not Found" }, { status: 404 });
  }

  // ── Internals ────────────────────────────────────────────────────

  private addRoute(method: HttpMethod, path: string, handler: RouteHandler) {
    // Normalise: strip trailing slash (but keep "/" as-is)
    const raw = this.prefix + path;
    const fullPath = raw.length > 1 ? raw.replace(/\/+$/, "") : raw;
    const { regex, paramNames } = this.compilePath(fullPath);
    this.routes.push({ method, pattern: fullPath, regex, paramNames, handler });
  }

  /**
   * Convert a path pattern like `/users/:id/posts/:postId`
   * into a regex and an ordered list of param names.
   */
  private compilePath(path: string): { regex: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];

    const regexStr = path.replace(
      /:([a-zA-Z_][a-zA-Z0-9_]*)/g,
      (_match, name) => {
        paramNames.push(name);
        return "([^/]+)";
      },
    );

    return { regex: new RegExp(`^${regexStr}$`), paramNames };
  }
}
