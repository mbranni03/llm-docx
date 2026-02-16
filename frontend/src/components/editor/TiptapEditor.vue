<template>
  <div
    v-if="editor"
    class="editor-container w-full h-full outline-none prose prose-slate max-w-none"
  >
    <editor-content :editor="editor" />
    <bubble-menu :editor="editor" :tippy-options="{ duration: 100 }" v-if="editor">
      <div class="bg-white shadow-lg border border-gray-200 rounded-lg p-1 flex gap-1 items-center">
        <button
          @click="editor.chain().focus().toggleBold().run()"
          :class="{ 'is-active': editor.isActive('bold') }"
          class="p-1.5 hover:bg-gray-100 rounded text-gray-600"
          title="Bold"
        >
          <BoldIcon class="w-4 h-4" />
        </button>
        <button
          @click="editor.chain().focus().toggleItalic().run()"
          :class="{ 'is-active': editor.isActive('italic') }"
          class="p-1.5 hover:bg-gray-100 rounded text-gray-600"
          title="Italic"
        >
          <ItalicIcon class="w-4 h-4" />
        </button>
        <button
          @click="editor.chain().focus().toggleStrike().run()"
          :class="{ 'is-active': editor.isActive('strike') }"
          class="p-1.5 hover:bg-gray-100 rounded text-gray-600"
          title="Strikethrough"
        >
          <StrikethroughIcon class="w-4 h-4" />
        </button>
        <div class="w-px h-5 bg-gray-200 mx-0.5"></div>
        <button
          @click="addComment"
          :disabled="editor.state.selection.empty"
          class="p-1.5 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Add comment"
        >
          <MessageSquarePlusIcon class="w-4 h-4" />
        </button>
      </div>
    </bubble-menu>
  </div>
</template>

<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { CommentMark } from './extensions/CommentMark'
import { BoldIcon, ItalicIcon, StrikethroughIcon, MessageSquarePlusIcon } from 'lucide-vue-next'
import { useEditorStore } from '../../stores/editor-store'
import { watch, onBeforeUnmount } from 'vue'

const store = useEditorStore()

const editor = useEditor({
  content: '',
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: 'Write something...',
    }),
    Highlight,
    CommentMark,
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px]',
    },
  },
  onCreate({ editor }) {
    store.setEditor(editor)
  },
  onUpdate({ editor }) {
    // Collect all comment IDs still present in the document
    const activeIds = new Set()
    editor.state.doc.descendants((node) => {
      if (node.isText) {
        node.marks.forEach((mark) => {
          if (mark.type.name === 'comment' && mark.attrs.commentId) {
            activeIds.add(mark.attrs.commentId)
          }
        })
      }
    })

    // Remove any comments whose marks no longer exist in the doc
    const orphaned = store.comments
      .filter((c) => !c.resolved && !activeIds.has(c.id))
      .map((c) => c.id)

    orphaned.forEach((id) => store.removeComment(id))
  },
  onSelectionUpdate({ editor }) {
    if (editor.isActive('comment')) {
      const attrs = editor.getAttributes('comment')
      if (attrs.commentId) {
        store.setFocusedComment(attrs.commentId)
        updateActiveHighlight(attrs.commentId)
      }
    } else {
      store.setFocusedComment(null)
      clearActiveHighlights()
    }
  },
  onDestroy() {
    store.setEditor(null)
  },
})

function updateActiveHighlight(activeId) {
  clearActiveHighlights()
  const spans = document.querySelectorAll(`span[data-comment-id="${activeId}"]`)
  spans.forEach((span) => span.classList.add('comment-highlight-active'))
}

function clearActiveHighlights() {
  document.querySelectorAll('.comment-highlight-active').forEach((el) => {
    el.classList.remove('comment-highlight-active')
  })
}

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

watch(editor, (newEditor) => {
  if (newEditor) {
    store.setEditor(newEditor)
  }
})

onBeforeUnmount(() => {
  store.setEditor(null)
  editor.value?.destroy()
})
</script>

<style lang="scss">
.is-active {
  background-color: #f3f4f6;
  color: #000;
}
</style>
