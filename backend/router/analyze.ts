/**
 * Analyze / chunking API routes.
 *
 * POST /analyze/chunk  — chunk document, return analysis + chunks
 * POST /analyze/stats  — lightweight word/char/paragraph counts
 * POST /analyze/query  — sync VectorDB then semantic search
 */

import type { Router } from "./index";
import {
  analyzeDocument,
  analyzeText,
  type ChunkOptions,
} from "../services/chunker";
import { DocSyncManager } from "../services/doc-sync";

// Single shared sync manager instance (in-memory state per server lifetime)
const syncManager = new DocSyncManager();

export function registerAnalyzeRoutes(router: Router) {
  router.group("/analyze", (r) => {
    // ── POST /analyze/chunk ──────────────────────────────────────
    r.post("/chunk", async (ctx) => {
      const { text, options } = await ctx.body<{
        text: string;
        options?: ChunkOptions;
      }>();

      if (!text || typeof text !== "string") {
        return Response.json(
          { error: "Request body must include a `text` string." },
          { status: 400 },
        );
      }

      const result = await analyzeDocument(text, options);
      return Response.json(result);
    });

    // ── POST /analyze/stats ──────────────────────────────────────
    r.post("/stats", async (ctx) => {
      const { text } = await ctx.body<{ text: string }>();

      if (!text || typeof text !== "string") {
        return Response.json(
          { error: "Request body must include a `text` string." },
          { status: 400 },
        );
      }

      const stats = analyzeText(text);
      return Response.json(stats);
    });

    // ── POST /analyze/query ──────────────────────────────────────
    r.post("/query", async (ctx) => {
      const { text, question, options } = await ctx.body<{
        text: string;
        question: string;
        options?: ChunkOptions & { limit?: number };
      }>();

      if (!text || typeof text !== "string") {
        return Response.json(
          { error: "Request body must include a `text` string." },
          { status: 400 },
        );
      }

      if (!question || typeof question !== "string") {
        return Response.json(
          { error: "Request body must include a `question` string." },
          { status: 400 },
        );
      }

      const results = await syncManager.queryWithSync(text, question, options);
      return Response.json({ results });
    });
  });
}
