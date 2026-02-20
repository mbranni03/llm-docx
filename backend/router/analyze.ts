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
import {
  extractHierarchy,
  type HierarchyOptions,
} from "../services/hierarchy-extractor";
import { Embedder } from "../db/embedder";
import { criticizeDocument } from "../services/criticism";
import { suggestChangesDocument } from "../services/suggest";

// Single shared sync manager instance (in-memory state per server lifetime)
const syncManager = new DocSyncManager();
// Shared embedder for hierarchy extraction on non-sync routes
const embedder = new Embedder();

export function registerAnalyzeRoutes(router: Router) {
  router.group("/analyze", (r) => {
    // ── POST /analyze/chunk ──────────────────────────────────────
    r.post("/chunk", async (ctx) => {
      const { text, options, useHierarchy } = await ctx.body<{
        text: string;
        options?: ChunkOptions & HierarchyOptions;
        useHierarchy?: boolean;
      }>();

      if (!text || typeof text !== "string") {
        return Response.json(
          { error: "Request body must include a `text` string." },
          { status: 400 },
        );
      }

      let hierarchy;
      if (useHierarchy) {
        hierarchy = await extractHierarchy(text, embedder, options);
      }

      const result = await analyzeDocument(text, options, hierarchy);
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
        options?: ChunkOptions & HierarchyOptions & { limit?: number };
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

      const { results, hierarchy } = await syncManager.queryWithSync(
        text,
        question,
        options,
      );
      return Response.json({ results, hierarchy });
    });

    // ── POST /analyze/hierarchy ────────────────────────────────────
    r.post("/hierarchy", async (ctx) => {
      const { text, options } = await ctx.body<{
        text: string;
        options?: HierarchyOptions;
      }>();

      if (!text || typeof text !== "string") {
        return Response.json(
          { error: "Request body must include a `text` string." },
          { status: 400 },
        );
      }

      const hierarchy = await extractHierarchy(text, embedder, options);
      return Response.json(hierarchy);
    });

    // ── POST /analyze/criticize ────────────────────────────────────
    r.post("/criticize", async (ctx) => {
      const { text } = await ctx.body<{ text: string }>();

      if (!text || typeof text !== "string") {
        return Response.json(
          { error: "Request body must include a `text` string." },
          { status: 400 },
        );
      }

      const criticisms = await criticizeDocument(text);
      return Response.json(criticisms);
    });

    // ── POST /analyze/suggest ──────────────────────────────────────
    r.post("/suggest", async (ctx) => {
      const { text } = await ctx.body<{ text: string }>();

      if (!text || typeof text !== "string") {
        return Response.json(
          { error: "Request body must include a `text` string." },
          { status: 400 },
        );
      }

      const suggestions = await suggestChangesDocument(text);
      return Response.json(suggestions);
    });
  });
}
