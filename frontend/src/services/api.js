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
 */
export async function analyzeChunk(text, options) {
  return post('/analyze/chunk', { text, options })
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
