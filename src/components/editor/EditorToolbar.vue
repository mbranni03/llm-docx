<template>
  <div class="flex items-center gap-2 p-1 overflow-x-auto" v-if="editor">
    <div class="flex items-center gap-1 border-r pr-2 mr-2 border-gray-200">
      <button
        @click="editor.chain().focus().undo().run()"
        :disabled="!editor.can().undo()"
        class="p-2 hover:bg-gray-100 rounded text-gray-700 disabled:opacity-50"
      >
        <UndoIcon class="w-4 h-4" />
      </button>
      <button
        @click="editor.chain().focus().redo().run()"
        :disabled="!editor.can().redo()"
        class="p-2 hover:bg-gray-100 rounded text-gray-700 disabled:opacity-50"
      >
        <RedoIcon class="w-4 h-4" />
      </button>
    </div>

    <div class="flex items-center gap-1 border-r pr-2 mr-2 border-gray-200">
      <button
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'is-active': editor.isActive('bold') }"
        class="p-2 hover:bg-gray-100 rounded text-gray-700 font-bold w-8 h-8 flex items-center justify-center"
      >
        B
      </button>
      <button
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'is-active': editor.isActive('italic') }"
        class="p-2 hover:bg-gray-100 rounded text-gray-700 italic w-8 h-8 flex items-center justify-center"
      >
        I
      </button>
      <button
        @click="editor.chain().focus().toggleStrike().run()"
        :class="{ 'is-active': editor.isActive('strike') }"
        class="p-2 hover:bg-gray-100 rounded text-gray-700 line-through w-8 h-8 flex items-center justify-center"
      >
        S
      </button>
      <button
        @click="addComment"
        :disabled="editor.state.selection.empty"
        class="p-2 hover:bg-gray-100 rounded text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Add comment"
      >
        <MessageSquarePlusIcon class="w-4 h-4" />
      </button>
    </div>

    <div class="flex items-center gap-1 ml-auto">
      <button
        @click="store.setActiveSidebarTab('chat')"
        :class="{ 'bg-indigo-50 text-indigo-600': store.activeSidebarTab === 'chat' }"
        class="p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center gap-2 text-sm font-medium"
      >
        <SparklesIcon class="w-4 h-4" />
        <span class="hidden sm:inline">AI Assistant</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { UndoIcon, RedoIcon, SparklesIcon, MessageSquarePlusIcon } from 'lucide-vue-next'
import { useEditorStore } from '../../stores/editor-store'
import { computed } from 'vue'

const store = useEditorStore()
const editor = computed(() => store.editor)

function addComment() {
  if (!editor.value || editor.value.state.selection.empty) return

  const { from, to } = editor.value.state.selection
  const selectedText = editor.value.state.doc.textBetween(from, to, ' ')
  const commentId = crypto.randomUUID()

  editor.value.chain().focus().setMark('comment', { commentId }).run()

  store.addComment({
    id: commentId,
    author: 'User Name',
    timestamp: new Date(),
    text: '',
    selectedText,
  })
}
</script>

<style scoped>
.is-active {
  background-color: #e2e8f0;
  color: #0f172a;
}
</style>
