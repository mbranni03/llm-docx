/**
 * Document chunking service.
 *
 * Splits long text into manageable, embeddable chunks while preserving
 * natural boundaries (paragraphs → sentences). When a paragraph exceeds
 * the target size it is broken at sentence boundaries; when consecutive
 * paragraphs are small they are merged until the target is approached.
 *
 * Each chunk is hashed (SHA-256) for efficient diff-based syncing.
 *
 * Usage:
 * ```ts
 * const chunks = chunkText("Very long doc...", { maxChunkSize: 1000, overlap: 200 });
 * ```
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface ChunkOptions {
  /** Target max characters per chunk (default 1000). */
  maxChunkSize?: number;
  /** Character overlap between consecutive chunks (default 200). */
  overlap?: number;
}

export interface Chunk {
  /** Zero-based index of the chunk. */
  index: number;
  /** Chunk text content. */
  text: string;
  /** Character offset of the first char in the original document. */
  start: number;
  /** Character offset one past the last char in the original document. */
  end: number;
  /** SHA-256 hex digest of `text`. */
  hash: string;
}

export interface AnalysisResult {
  totalCharacters: number;
  totalWords: number;
  totalParagraphs: number;
  chunks: Chunk[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

const PARAGRAPH_SPLIT = /\n\s*\n/;
const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

/** SHA-256 hex hash using the Web Crypto API (available in Bun). */
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Core: split into segments preserving natural boundaries ─────────

/**
 * Split text into segments respecting paragraph and sentence boundaries.
 *
 * 1. Split on double-newlines (paragraphs).
 * 2. If a paragraph exceeds `maxSize`, split it at sentence boundaries.
 * 3. Merge small consecutive segments until approaching `maxSize`.
 *
 * Returns raw text segments (no overlap applied yet).
 */
function splitIntoSegments(text: string, maxSize: number): string[] {
  const paragraphs = text
    .split(PARAGRAPH_SPLIT)
    .filter((p) => p.trim().length > 0);

  // Step 1 & 2: break large paragraphs at sentence boundaries
  const rawSegments: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= maxSize) {
      rawSegments.push(para.trim());
      continue;
    }

    // Paragraph too big — split on sentences
    const sentences = para
      .split(SENTENCE_SPLIT)
      .filter((s) => s.trim().length > 0);
    let current = "";
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (current.length + trimmed.length + 1 > maxSize && current.length > 0) {
        rawSegments.push(current);
        current = trimmed;
      } else {
        current = current.length > 0 ? `${current} ${trimmed}` : trimmed;
      }
    }
    if (current.length > 0) rawSegments.push(current);
  }

  // Step 3: merge small consecutive segments
  const merged: string[] = [];
  let buffer = "";
  for (const seg of rawSegments) {
    if (buffer.length + seg.length + 2 > maxSize && buffer.length > 0) {
      merged.push(buffer);
      buffer = seg;
    } else {
      buffer = buffer.length > 0 ? `${buffer}\n\n${seg}` : seg;
    }
  }
  if (buffer.length > 0) merged.push(buffer);

  return merged;
}

// ─── Core: apply overlap ─────────────────────────────────────────────

/**
 * Given ordered segments, create overlapping chunks by prepending the
 * tail of the previous segment as context.
 */
function applyOverlap(segments: string[], overlap: number): string[] {
  if (overlap <= 0 || segments.length <= 1) return segments;

  const result: string[] = [segments[0]!];
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1]!;
    // Grab the last `overlap` characters of the prior segment
    const overlapText = prev.slice(-overlap);
    // Find a word boundary in the overlap to keep it clean
    const firstSpace = overlapText.indexOf(" ");
    const cleanOverlap =
      firstSpace > 0 ? overlapText.slice(firstSpace + 1) : overlapText;
    result.push(`${cleanOverlap} ${segments[i]!}`);
  }
  return result;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Chunk a document and return `Chunk` objects with positional info and hashes.
 */
export async function chunkText(
  text: string,
  options: ChunkOptions = {},
): Promise<Chunk[]> {
  const maxChunkSize = options.maxChunkSize ?? 1000;
  const overlap = options.overlap ?? 200;

  const segments = splitIntoSegments(text, maxChunkSize);
  const overlapped = applyOverlap(segments, overlap);

  const chunks: Chunk[] = [];
  let searchFrom = 0;

  for (let i = 0; i < overlapped.length; i++) {
    const chunkText = overlapped[i]!;
    // Use the non-overlapped segment to find the canonical position
    const canonical = segments[i]!;
    const start = text.indexOf(canonical, searchFrom);
    const end = start >= 0 ? start + canonical.length : searchFrom;
    if (start >= 0) searchFrom = start + 1;

    chunks.push({
      index: i,
      text: chunkText,
      start: Math.max(start, 0),
      end,
      hash: await sha256(chunkText),
    });
  }

  return chunks;
}

/**
 * Compute document-level statistics.
 */
export function analyzeText(text: string) {
  const totalCharacters = text.length;
  const totalWords = text.split(/\s+/).filter((w) => w.length > 0).length;
  const totalParagraphs = text
    .split(PARAGRAPH_SPLIT)
    .filter((p) => p.trim().length > 0).length;
  return { totalCharacters, totalWords, totalParagraphs };
}

/**
 * Full analysis: stats + chunks.
 */
export async function analyzeDocument(
  text: string,
  options: ChunkOptions = {},
): Promise<AnalysisResult> {
  const stats = analyzeText(text);
  const chunks = await chunkText(text, options);
  return { ...stats, chunks };
}

/**
 * Hash an entire document string (used for the fast-path check).
 */
export async function hashDocument(text: string): Promise<string> {
  return sha256(text);
}
