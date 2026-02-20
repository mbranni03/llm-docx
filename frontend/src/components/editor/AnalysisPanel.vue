<template>
  <div v-show="result" class="analysis-panel" :class="{ 'is-open': open }">
    <!-- Header -->
    <button class="panel-toggle group" @click="open = !open">
      <div
        class="toggle-icon-wrap transition-colors duration-300"
        :class="
          open
            ? 'bg-indigo-500 text-white'
            : 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100'
        "
      >
        <BarChart3Icon class="w-4 h-4" />
      </div>
      <div class="toggle-titles">
        <span class="title-main">Document Analysis</span>
        <span class="title-sub" v-if="result">{{ result.totalWords.toLocaleString() }} words</span>
      </div>
      <ChevronDownIcon
        class="w-4 h-4 ml-auto text-gray-400 transition-transform duration-300"
        :class="{ 'rotate-180': open }"
      />
    </button>

    <div v-show="open" class="panel-inner">
      <!-- Controls -->
      <div v-if="store.error" class="p-4 border-b border-gray-100/50">
        <div
          class="text-[11px] text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg flex items-center gap-2"
        >
          <AlertCircleIcon class="w-4 h-4 flex-shrink-0" />
          {{ store.error }}
        </div>
      </div>

      <div v-if="result" class="scrollable-content p-4 space-y-6">
        <!-- Stats Row -->
        <div class="grid grid-cols-2 gap-3">
          <div class="stat-card">
            <div class="stat-icon-wrap bg-blue-50 text-blue-500">
              <HashIcon class="w-4 h-4" />
            </div>
            <div class="stat-info">
              <span class="stat-val">{{ result.totalWords.toLocaleString() }}</span>
              <span class="stat-label">Words</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap bg-purple-50 text-purple-500">
              <LayersIcon class="w-4 h-4" />
            </div>
            <div class="stat-info">
              <span class="stat-val">{{ result.totalParagraphs }}</span>
              <span class="stat-label">Paragraphs</span>
            </div>
          </div>
        </div>

        <!-- Hierarchy / Strategy -->
        <div v-if="hierarchy" class="hierarchy-card group">
          <div class="flex items-center justify-between mb-3">
            <span class="text-[11px] font-bold text-gray-400 uppercase tracking-widest"
              >Structure</span
            >
            <span class="strategy-badge">{{ hierarchy.strategy }}</span>
          </div>

          <p v-if="hierarchy.documentSummary" class="text-[13px] text-gray-600 leading-relaxed">
            {{ hierarchy.documentSummary }}
          </p>

          <div
            v-if="hierarchy.outline"
            class="mt-4 p-3 bg-gray-50/80 rounded-lg border border-gray-100 max-h-40 overflow-y-auto outline-scroll shadow-inner"
          >
            <pre class="text-[11px] text-gray-500 whitespace-pre-wrap font-mono leading-relaxed">{{
              hierarchy.outline
            }}</pre>
          </div>
        </div>

        <!-- Chunks List -->
        <div v-if="result.chunks?.length" class="chunks-section">
          <span class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 block"
            >Semantic Chunks</span
          >
          <div class="space-y-3">
            <div v-for="chunk in result.chunks" :key="chunk.index" class="chunk-card">
              <div class="flex items-center gap-2 mb-2">
                <div class="chunk-idx">{{ chunk.index + 1 }}</div>
                <div class="text-[11px] text-gray-400 flex items-center gap-1.5 w-full truncate">
                  <AlignLeftIcon class="w-3.5 h-3.5" />
                  {{ chunk.text.length }} chars
                </div>
              </div>
              <div
                v-if="chunk.sectionPath"
                class="text-[11px] font-semibold text-indigo-500/90 mb-1.5 truncate"
              >
                {{ chunk.sectionPath }}
              </div>
              <p class="text-[12px] text-gray-600 line-clamp-4 leading-relaxed">
                {{ chunk.text }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  BarChart3Icon,
  ChevronDownIcon,
  AlertCircleIcon,
  HashIcon,
  LayersIcon,
  AlignLeftIcon,
} from 'lucide-vue-next'
import { useDocAnalysisStore } from '../../stores/doc-analysis-store'

const store = useDocAnalysisStore()

const open = ref(true)

const result = computed(() => store.analysisResult)
const hierarchy = computed(() => store.hierarchyMap)

// (moved to AIChatPanel.vue)
</script>

<style scoped>
.analysis-panel {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(229, 231, 235, 0.8);
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 4px 24px -6px rgba(0, 0, 0, 0.05),
    0 0 0 1px rgba(255, 255, 255, 0.6) inset;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 160px);
}

.analysis-panel.is-open {
  box-shadow:
    0 8px 32px -8px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(255, 255, 255, 0.6) inset;
}

/* Header */
.panel-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  flex-shrink: 0;
}

.toggle-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
}

.toggle-titles {
  display: flex;
  flex-direction: column;
}

.title-main {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  letter-spacing: -0.01em;
}

.title-sub {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.panel-inner {
  flex: 1 1 auto;
  overflow-y: auto;
  scrollbar-width: thin;
}

.panel-inner::-webkit-scrollbar {
  width: 4px;
}
.panel-inner::-webkit-scrollbar-track {
  background: transparent;
}
.panel-inner::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

/* Stats */
.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  transition:
    border-color 0.2s,
    background 0.2s;
}
.stat-card:hover {
  background: #ffffff;
  border-color: #e5e7eb;
}

.stat-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-val {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}

.stat-label {
  font-size: 10px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

/* Hierarchy */
.hierarchy-card {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.strategy-badge {
  padding: 2px 8px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #d1fae5;
  border-radius: 6px;
}

/* Chunks */
.chunk-card {
  padding: 14px;
  background: #ffffff;
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  transition: all 0.2s;
}
.chunk-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.chunk-idx {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 10px;
  font-weight: 700;
  color: #6366f1;
  background: #eef2ff;
  border-radius: 6px;
}

.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.outline-scroll::-webkit-scrollbar {
  width: 4px;
}
.outline-scroll::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 4px;
}
</style>
