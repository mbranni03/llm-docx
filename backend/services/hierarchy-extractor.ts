/**
 * Hierarchical document structure extractor.
 *
 * Extracts a document's natural hierarchy (headings, sections) and builds
 * a structured map that can be used to:
 *  - Chunk along section boundaries
 *  - Prefix every chunk with structural context for the LLM
 *  - Generate document-level and section-level summaries
 *
 * Strategies (selected automatically):
 *  1. **heading**              – Markdown `#`/`##`, ALL-CAPS lines, numbered sections
 *  2. **embedding-similarity** – Sliding-window cosine similarity over paragraph
 *                                embeddings to detect topic shifts (headerless docs)
 *  3. **positional**           – Last resort: evenly split into N virtual sections
 */

import type { Embedder } from "../db/embedder";

// ─── Public types ────────────────────────────────────────────────────

export interface HierarchyOptions {
  /** Cosine-similarity threshold for topic-boundary detection (0–1, default 0.5). */
  similarityThreshold?: number;
  /** Minimum characters per virtual section in fallback modes (default 200). */
  minSectionSize?: number;
  /** Max sentences in the document-level summary (default 3). */
  docSummaryMaxSentences?: number;
  /** Max sentences in each section-level summary (default 1). */
  sectionSummaryMaxSentences?: number;
  /** Maximum heading depth to include in the outline (default 6). */
  maxOutlineDepth?: number;
}

export interface HeadingNode {
  level: number;
  title: string;
  startOffset: number;
  endOffset: number;
  children: HeadingNode[];
}

export interface SectionSummary {
  title: string;
  summary: string;
  startOffset: number;
  endOffset: number;
}

export interface HierarchyMap {
  headings: HeadingNode[];
  outline: string;
  documentSummary: string;
  sectionSummaries: SectionSummary[];
  strategy: "heading" | "embedding-similarity" | "positional";
}

// ─── Defaults ────────────────────────────────────────────────────────

const DEFAULTS: Required<HierarchyOptions> = {
  similarityThreshold: 0.5,
  minSectionSize: 200,
  docSummaryMaxSentences: 3,
  sectionSummaryMaxSentences: 1,
  maxOutlineDepth: 6,
};

function resolveOptions(opts?: HierarchyOptions): Required<HierarchyOptions> {
  return { ...DEFAULTS, ...opts };
}

// ─── Heading extraction ──────────────────────────────────────────────

interface FlatHeading {
  level: number;
  title: string;
  offset: number; // character offset where the heading line starts
}

/**
 * Detect headings from plain/markdown text using multiple heuristics:
 *  - Markdown `# Heading` (levels 1-6)
 *  - ALL-CAPS lines of ≥3 words (treated as H1)
 *  - Numbered sections like `1. Title` or `1.1 Title` (depth → level)
 */
export function extractHeadings(text: string): FlatHeading[] {
  const headings: FlatHeading[] = [];
  const lines = text.split("\n");
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // ── Markdown headings ──────────────────────────────────────────
    const mdMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (mdMatch) {
      headings.push({
        level: mdMatch[1]!.length,
        title: mdMatch[2]!.trim(),
        offset,
      });
      offset += line.length + 1; // +1 for \n
      continue;
    }

    // ── ALL-CAPS lines (≥3 words, no leading special chars) ────────
    if (
      trimmed.length >= 5 &&
      trimmed === trimmed.toUpperCase() &&
      /^[A-Z]/.test(trimmed) &&
      trimmed.split(/\s+/).length >= 3 &&
      !/^[#\-*>]/.test(trimmed)
    ) {
      headings.push({ level: 1, title: titleCase(trimmed), offset });
      offset += line.length + 1;
      continue;
    }

    // ── Numbered sections: "1.", "1.1", "2.3.1 Title" ─────────────
    const numMatch = trimmed.match(/^(\d+(?:\.\d+)*)[.)]\s+(.+)$/);
    if (numMatch) {
      const depth = numMatch[1]!.split(".").length;
      headings.push({
        level: Math.min(depth, 6),
        title: numMatch[2]!.trim(),
        offset,
      });
      offset += line.length + 1;
      continue;
    }

    offset += line.length + 1;
  }

  return headings;
}

// ─── Tree building ───────────────────────────────────────────────────

/**
 * Nest flat headings into a tree. Each node's `endOffset` is set to the
 * start of the next same-or-higher-level heading (or end of document).
 */
export function buildHierarchyTree(
  flatHeadings: FlatHeading[],
  docLength: number,
): HeadingNode[] {
  if (flatHeadings.length === 0) return [];

  // Assign end offsets
  const withEnds = flatHeadings.map((h, i) => {
    const nextSameOrHigher = flatHeadings
      .slice(i + 1)
      .find((n) => n.level <= h.level);
    return {
      ...h,
      endOffset: nextSameOrHigher ? nextSameOrHigher.offset : docLength,
    };
  });

  // Recursive nesting
  function nestFrom(
    items: typeof withEnds,
    start: number,
    end: number,
    parentLevel: number,
  ): HeadingNode[] {
    const result: HeadingNode[] = [];
    let i = start;

    while (i < end) {
      const item = items[i]!;
      if (item.level <= parentLevel && parentLevel > 0) break;

      const node: HeadingNode = {
        level: item.level,
        title: item.title,
        startOffset: item.offset,
        endOffset: item.endOffset,
        children: [],
      };

      // Find children: everything until the next item at same or higher level
      let childEnd = i + 1;
      while (childEnd < end && items[childEnd]!.level > item.level) {
        childEnd++;
      }

      if (childEnd > i + 1) {
        node.children = nestFrom(items, i + 1, childEnd, item.level);
      }

      result.push(node);
      i = childEnd;
    }

    return result;
  }

  return nestFrom(withEnds, 0, withEnds.length, 0);
}

// ─── Outline generation ──────────────────────────────────────────────

/**
 * Produce a human-readable indented outline from a heading tree.
 *
 * Example output:
 * ```
 * 1. Introduction
 *    1.1. Background
 *    1.2. Objectives
 * 2. Methodology
 * ```
 */
export function generateOutline(
  tree: HeadingNode[],
  maxDepth: number = 6,
  _prefix = "",
): string {
  const lines: string[] = [];

  tree.forEach((node, i) => {
    if (node.level > maxDepth) return;
    const num = `${_prefix}${i + 1}`;
    const indent = "  ".repeat(node.level - 1);
    lines.push(`${indent}${num}. ${node.title}`);
    if (node.children.length > 0) {
      lines.push(generateOutline(node.children, maxDepth, `${num}.`));
    }
  });

  return lines.join("\n");
}

// ─── Embedding-similarity fallback ───────────────────────────────────

/**
 * For headerless documents: compute paragraph-level embeddings and detect
 * topic boundaries using cosine similarity between neighboring paragraph
 * groups (sliding window).
 */
export async function detectSectionsByEmbedding(
  text: string,
  embedder: Embedder,
  options?: HierarchyOptions,
): Promise<HeadingNode[]> {
  const opts = resolveOptions(options);
  const paragraphs = splitParagraphs(text);

  if (paragraphs.length <= 1) {
    // Entire document is one section
    return [
      {
        level: 1,
        title: "Section 1 of 1",
        startOffset: 0,
        endOffset: text.length,
        children: [],
      },
    ];
  }

  // Embed all paragraphs
  const vectors = await embedder.embedBatch(paragraphs.map((p) => p.text));

  // Calculate similarities between adjacent paragraphs
  const similarities: number[] = [];
  for (let i = 1; i < paragraphs.length; i++) {
    similarities.push(cosineSimilarity(vectors[i - 1]!, vectors[i]!));
  }

  // Use dynamic thresholding based on the distribution of similarities
  // threshold = mean - (opts.similarityThreshold * std)
  let threshold = opts.similarityThreshold;
  if (similarities.length > 0) {
    const mean = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const std = Math.sqrt(
      similarities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
        similarities.length,
    );
    threshold = mean - opts.similarityThreshold * std;
  }

  // Find topic boundaries via relative similarity drop
  const boundaries: number[] = [0]; // Always start at paragraph 0

  for (let i = 0; i < similarities.length; i++) {
    if (similarities[i]! < threshold) {
      boundaries.push(i + 1);
    }
  }

  // Merge tiny sections (below minSectionSize) into their predecessor
  const mergedBoundaries = mergeTinySections(
    boundaries,
    paragraphs,
    opts.minSectionSize,
  );

  // Build HeadingNodes from merged boundaries
  const totalSections = mergedBoundaries.length;
  return mergedBoundaries.map((startIdx, i) => {
    const endIdx =
      i + 1 < mergedBoundaries.length
        ? mergedBoundaries[i + 1]!
        : paragraphs.length;
    const startOffset = paragraphs[startIdx]!.start;
    const endOffset = paragraphs[endIdx - 1]?.end ?? text.length;

    return {
      level: 1,
      title: `Section ${i + 1} of ${totalSections}`,
      startOffset,
      endOffset,
      children: [],
    };
  });
}

// ─── Positional fallback ─────────────────────────────────────────────

/**
 * Last-resort: split into roughly equal virtual sections by character count.
 */
function positionalSections(
  text: string,
  targetCount: number = 5,
): HeadingNode[] {
  const count = Math.max(
    1,
    Math.min(targetCount, Math.ceil(text.length / 500)),
  );
  const sectionSize = Math.ceil(text.length / count);
  const sections: HeadingNode[] = [];

  for (let i = 0; i < count; i++) {
    const start = i * sectionSize;
    const end = Math.min((i + 1) * sectionSize, text.length);
    sections.push({
      level: 1,
      title: `Section ${i + 1} of ${count}`,
      startOffset: start,
      endOffset: end,
      children: [],
    });
  }

  return sections;
}

// ─── Summary generation ──────────────────────────────────────────────

/**
 * Extract the first N sentences from a block of text.
 */
function extractSentences(text: string, maxSentences: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text.trim()];
  return sentences
    .slice(0, maxSentences)
    .map((s) => s.trim())
    .join(" ");
}

/**
 * Generate a document-level summary from the full text.
 */
function generateDocSummary(text: string, maxSentences: number): string {
  return extractSentences(text, maxSentences);
}

/**
 * Generate per-section summaries.
 */
function generateSectionSummaries(
  text: string,
  sections: HeadingNode[],
  maxSentences: number,
): SectionSummary[] {
  return sections.map((section) => {
    const sectionText = text.slice(section.startOffset, section.endOffset);
    return {
      title: section.title,
      summary: extractSentences(sectionText, maxSentences),
      startOffset: section.startOffset,
      endOffset: section.endOffset,
    };
  });
}

// ─── Main entry point ────────────────────────────────────────────────

/**
 * Extract the hierarchical structure from a document.
 *
 * Strategy selection:
 *  1. If headings are found → `heading`
 *  2. If an embedder is provided → `embedding-similarity`
 *  3. Otherwise → `positional`
 */
export async function extractHierarchy(
  text: string,
  embedder?: Embedder,
  options?: HierarchyOptions,
): Promise<HierarchyMap> {
  const opts = resolveOptions(options);

  // ── Try heading extraction first ───────────────────────────────
  const flatHeadings = extractHeadings(text);

  let headings: HeadingNode[];
  let strategy: HierarchyMap["strategy"];

  if (flatHeadings.length > 0) {
    headings = buildHierarchyTree(flatHeadings, text.length);
    strategy = "heading";
  } else if (embedder) {
    headings = await detectSectionsByEmbedding(text, embedder, options);
    strategy = "embedding-similarity";
  } else {
    headings = positionalSections(text);
    strategy = "positional";
  }

  const outline = generateOutline(headings, opts.maxOutlineDepth);
  const documentSummary = generateDocSummary(text, opts.docSummaryMaxSentences);
  const sectionSummaries = generateSectionSummaries(
    text,
    // Flatten to top-level for summaries
    flattenTopLevel(headings),
    opts.sectionSummaryMaxSentences,
  );

  return {
    headings,
    outline,
    documentSummary,
    sectionSummaries,
    strategy,
  };
}

// ─── Context prefix builder ─────────────────────────────────────────

/**
 * Given a character offset, find the heading path and produce a context
 * prefix string like:
 *   "[Chapter 2: Strategy > 2.1 Market Analysis]"
 */
export function buildContextPrefix(
  offset: number,
  headings: HeadingNode[],
): string {
  const path = findHeadingPath(offset, headings);
  if (path.length === 0) return "";
  return path.map((h) => h.title).join(" > ");
}

function findHeadingPath(
  offset: number,
  headings: HeadingNode[],
): HeadingNode[] {
  for (const h of headings) {
    if (offset >= h.startOffset && offset < h.endOffset) {
      return [h, ...findHeadingPath(offset, h.children)];
    }
  }
  return [];
}

// ─── Helpers ─────────────────────────────────────────────────────────

interface Paragraph {
  text: string;
  start: number;
  end: number;
}

function splitParagraphs(text: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const parts = text.split(/\n\s*\n/);
  let offset = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      const start = text.indexOf(trimmed, offset);
      paragraphs.push({
        text: trimmed,
        start,
        end: start + trimmed.length,
      });
    }
    offset += part.length + 1; // +1 approximation for separator
  }

  return paragraphs;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function mergeTinySections(
  boundaries: number[],
  paragraphs: Paragraph[],
  minSize: number,
): number[] {
  if (boundaries.length <= 1) return boundaries;

  const merged: number[] = [boundaries[0]!];

  for (let i = 1; i < boundaries.length; i++) {
    const prevStart = merged[merged.length - 1]!;
    const currentStart = boundaries[i]!;

    // Calculate size of previous section
    const prevEnd = currentStart;
    let prevSize = 0;
    for (let j = prevStart; j < prevEnd && j < paragraphs.length; j++) {
      prevSize += paragraphs[j]!.text.length;
    }

    if (prevSize >= minSize) {
      merged.push(currentStart);
    }
    // Otherwise skip this boundary → merges into the previous section
  }

  return merged;
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function flattenTopLevel(headings: HeadingNode[]): HeadingNode[] {
  // Return only level-1 nodes (or the shallowest level present)
  if (headings.length === 0) return [];
  const minLevel = Math.min(...headings.map((h) => h.level));
  return headings.filter((h) => h.level === minLevel);
}
