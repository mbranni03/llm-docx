import Agent from "solo-ai-sdk";
import { Router } from "./router";
import { registerDocsRoutes } from "./router/docs";
import { registerAnalyzeRoutes } from "./router/analyze";

const router = new Router();

registerDocsRoutes(router);
registerAnalyzeRoutes(router);

// ─── CORS helper ─────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(res: Response): Response {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

// ─── Server ──────────────────────────────────────────────────────────

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const res = await router.handle(req);
    return withCors(res);
  },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
