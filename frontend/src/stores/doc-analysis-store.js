import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  analyzeChunk,
  analyzeStats,
  queryDocument,
  analyzeHierarchy,
  criticizeDocument,
  suggestChangesDocument,
} from '../services/api'

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

  /** Hierarchical document map from /analyze/hierarchy */
  const hierarchyMap = ref(null)

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
      analysisResult.value = await analyzeChunk(text, options, true)
      // Also capture hierarchy if returned
      if (analysisResult.value?.hierarchy) {
        hierarchyMap.value = analysisResult.value.hierarchy
      }
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

  /**
   * Fetch just the hierarchy map.
   * @param {string} text
   * @param {object} [options]
   */
  async function fetchHierarchy(text, options) {
    loading.value = true
    error.value = null
    try {
      hierarchyMap.value = await analyzeHierarchy(text, options)
      return hierarchyMap.value
    } catch (err) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  function clearResults() {
    analysisResult.value = null
    stats.value = null
    queryResults.value = null
    hierarchyMap.value = null
    error.value = null
  }

  /**
   * Run the sliding window AI criticism.
   * @param {string} text Full document text
   */
  async function generateCriticisms(text) {
    loading.value = true
    error.value = null
    try {
      return await criticizeDocument(text)
    } catch (err) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Run the sliding window AI text suggestions (Track Changes).
   * @param {string} text Full document text
   */
  async function generateSuggestions(text) {
    loading.value = true
    error.value = null
    try {
      return await suggestChangesDocument(text)
    } catch (err) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    analysisResult,
    stats,
    queryResults,
    hierarchyMap,
    analyze,
    fetchStats,
    query,
    fetchHierarchy,
    clearResults,
    generateCriticisms,
    generateSuggestions,
  }
})
