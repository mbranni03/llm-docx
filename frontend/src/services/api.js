/**
 * Thin API client for the backend analyze endpoints.
 *
 * All methods throw on non-2xx responses.
 */

const BASE_URL = 'http://localhost:3000'

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

/**
 * Chunk a document and return full analysis (stats + chunks).
 * @param {string} text
 * @param {object} [options]
 * @param {boolean} [useHierarchy] Enable structure-aware chunking
 */
export async function analyzeChunk(text, options, useHierarchy = false) {
  return post('/analyze/chunk', { text, options, useHierarchy })
}

/**
 * Extract the hierarchical structure (headings, outline, summaries).
 * @param {string} text
 * @param {object} [options] HierarchyOptions
 */
export async function analyzeHierarchy(text, options) {
  return post('/analyze/hierarchy', { text, options })
}

/**
 * Get lightweight word/char/paragraph stats.
 * @param {string} text
 */
export async function analyzeStats(text) {
  return post('/analyze/stats', { text })
}

/**
 * Sync the document into VectorDB then run a semantic search.
 *
 * This is the primary method used before every question — the backend
 * will skip re-embedding if the doc hasn't changed.
 *
 * @param {string} text      Full document text
 * @param {string} question  User's question
 * @param {object} [options] Chunking + limit options
 */
export async function queryDocument(text, question, options) {
  return post('/analyze/query', { text, question, options })
}

/**
 * Generates AI criticisms for the document using a sliding window.
 *
 * @param {string} text Full document text
 */
export async function criticizeDocument(text) {
  return post('/analyze/criticize', { text })
}

/**
 * Generates AI textual change suggestions for the document using a sliding window.
 *
 * @param {string} text Full document text
 */
export async function suggestChangesDocument(text) {
  return post('/analyze/suggest', { text })
}

/**
 * Generates an AI summary for the document using Map-Reduce.
 *
 * @param {string} text Full document text
 */
export async function summarizeDocument(text) {
  return post('/analyze/summarize', { text })
}
