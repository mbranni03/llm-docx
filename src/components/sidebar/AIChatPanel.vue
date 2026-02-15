<template>
  <div
    class="h-full flex flex-col bg-white border-l border-gray-200 w-96 shadow-xl absolute right-0 top-0 z-50 transition-transform duration-300 transform"
    :class="{ 'translate-x-0': isOpen, 'translate-x-[120%]': !isOpen }"
  >
    <div
      class="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50"
    >
      <div class="flex items-center gap-2">
        <SparklesIcon class="w-5 h-5 text-indigo-600" />
        <h2 class="font-semibold text-gray-800">AI Assistant</h2>
      </div>
      <button @click="close" class="text-gray-500 hover:text-gray-700">
        <XIcon class="w-5 h-5" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
      <div class="flex gap-3">
        <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
          <BotIcon class="w-5 h-5 text-indigo-600" />
        </div>
        <div
          class="bg-white p-3 rounded-lg shadow-sm border border-gray-100 text-sm text-gray-700 max-w-[85%]"
        >
          Hello! I'm your AI writing assistant. How can I help you improve your document today?
        </div>
      </div>
    </div>

    <div class="p-4 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div class="relative">
        <textarea
          placeholder="Ask something..."
          class="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none min-h-[44px] max-h-32"
          rows="1"
        ></textarea>
        <button
          class="absolute right-2 bottom-2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
        >
          <SendIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '../../stores/editor-store'
import { XIcon, SendIcon, SparklesIcon, BotIcon } from 'lucide-vue-next'

const store = useEditorStore()
const isOpen = computed(() => store.activeSidebarTab === 'chat')

function close() {
  store.setActiveSidebarTab(null)
}
</script>
