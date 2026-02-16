<template>
  <div class="analysis-panel">
    <!-- Header -->
    <button class="panel-toggle" @click="open = !open">
      <BarChart3Icon class="w-4 h-4" />
      <span class="font-semibold text-xs">Document Analysis</span>
      <ChevronDownIcon
        class="w-3.5 h-3.5 ml-auto transition-transform"
        :class="{ 'rotate-180': open }"
      />
    </button>

    <div v-if="open" class="panel-body">
      <!-- Controls -->
      <div class="flex items-center gap-2 mb-3">
        <button @click="runAnalysis" :disabled="store.loading || !hasContent" class="analyze-btn">
          <Loader2Icon v-if="store.loading" class="w-3.5 h-3.5 animate-spin" />
          <ScanTextIcon v-else class="w-3.5 h-3.5" />
          {{ store.loading ? 'Analyzing...' : 'Analyze' }}
        </button>
      </div>

      <!-- Error -->
      <div v-if="store.error" class="text-xs text-red-500 bg-red-50 px-2 py-1.5 rounded mb-2">
        {{ store.error }}
      </div>

      <!-- Stats -->
      <div v-if="result" class="stats-grid mb-3">
        <div class="stat-card">
          <span class="stat-value">{{ result.totalWords.toLocaleString() }}</span>
          <span class="stat-label">Words</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ result.totalCharacters.toLocaleString() }}</span>
          <span class="stat-label">Chars</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ result.totalParagraphs }}</span>
          <span class="stat-label">Paragraphs</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ result.chunks.length }}</span>
          <span class="stat-label">Chunks</span>
        </div>
      </div>

      <!-- Chunks list -->
      <div v-if="result && result.chunks.length > 0" class="chunks-list">
        <div class="text-[11px] text-gray-500 font-medium mb-1.5 uppercase tracking-wider">
          Chunks
        </div>
        <div v-for="chunk in result.chunks" :key="chunk.index" class="chunk-card">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="chunk-badge">{{ chunk.index + 1 }}</span>
            <span class="text-[10px] text-gray-400">
              {{ chunk.text.length }} chars · offset {{ chunk.start }}–{{ chunk.end }}
            </span>
          </div>
          <p class="text-[11px] text-gray-600 line-clamp-3 leading-relaxed">
            {{ chunk.text }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { BarChart3Icon, ChevronDownIcon, Loader2Icon, ScanTextIcon } from 'lucide-vue-next'
import { useDocAnalysisStore } from '../../stores/doc-analysis-store'
import { useEditorStore } from '../../stores/editor-store'

const store = useDocAnalysisStore()
const editorStore = useEditorStore()

const open = ref(false)

const hasContent = computed(() => {
  const editor = editorStore.editor
  return editor && !editor.isEmpty
})

const result = computed(() => store.analysisResult)

function runAnalysis() {
  const editor = editorStore.editor
  if (!editor) return
  const text = editor.getText()
  if (!text.trim()) return
  store.analyze(text)
}
</script>

<style scoped>
.analysis-panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.panel-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fafbfc;
  border: none;
  cursor: pointer;
  color: #374151;
  transition: background 0.15s;
}

.panel-toggle:hover {
  background: #f3f4f6;
}

.panel-body {
  padding: 10px 12px;
  border-top: 1px solid #f3f4f6;
}

.analyze-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.analyze-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
}

.analyze-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 6px;
}

.stat-value {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
}

.stat-label {
  font-size: 10px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.chunks-list {
  max-height: 300px;
  overflow-y: auto;
}

.chunk-card {
  padding: 6px 8px;
  margin-bottom: 4px;
  background: #fafbfc;
  border: 1px solid #f0f1f3;
  border-radius: 6px;
  transition: border-color 0.15s;
}

.chunk-card:hover {
  border-color: #d1d5db;
}

.chunk-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 10px;
  font-weight: 700;
  color: #6366f1;
  background: #eef2ff;
  border-radius: 4px;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
