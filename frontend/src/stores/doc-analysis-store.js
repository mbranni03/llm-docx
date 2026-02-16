import { defineStore } from 'pinia'
import { ref } from 'vue'
import { analyzeChunk, analyzeStats, queryDocument } from '../services/api'

export const useDocAnalysisStore = defineStore('doc-analysis', () => {
  // ── State ──────────────────────────────────────────────────────────
  const loading = ref(false)
  const error = ref(null)

  /** Full analysis result from /analyze/chunk */
  const analysisResult = ref(null)

  /** Lightweight stats from /analyze/stats */
  const stats = ref(null)

  /** Last query results from /analyze/query */
  const queryResults = ref(null)

  // ── Actions ────────────────────────────────────────────────────────

  /**
   * Chunk the document and get full analysis.
   * @param {string} text
   * @param {object} [options]
   */
  async function analyze(text, options) {
    loading.value = true
    error.value = null
    try {
      analysisResult.value = await analyzeChunk(text, options)
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  /**
   * Get lightweight stats only.
   * @param {string} text
   */
  async function fetchStats(text) {
    loading.value = true
    error.value = null
    try {
      stats.value = await analyzeStats(text)
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  /**
   * Sync VectorDB and query — call this before every user question.
   * @param {string} text      Full document text
   * @param {string} question  User question
   * @param {object} [options]
   */
  async function query(text, question, options) {
    loading.value = true
    error.value = null
    try {
      const res = await queryDocument(text, question, options)
      queryResults.value = res.results
      return res.results
    } catch (err) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  function clearResults() {
    analysisResult.value = null
    stats.value = null
    queryResults.value = null
    error.value = null
  }

  return {
    loading,
    error,
    analysisResult,
    stats,
    queryResults,
    analyze,
    fetchStats,
    query,
    clearResults,
  }
})
