<template>
  <div
    v-if="editor"
    class="editor-container w-full h-full outline-none prose prose-slate max-w-none"
  >
    <editor-content :editor="editor" />
    <bubble-menu
      :editor="editor"
      :tippy-options="{ duration: 100, placement: 'bottom' }"
      :should-show="customShouldShow"
      v-if="editor"
      class="bubble-menu-wrapper"
    >
      <div
        v-show="!isCursorInDiff"
        class="bg-white shadow-lg border border-gray-200 rounded-lg p-1 flex gap-1 items-center"
      >
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

      <!-- Track Changes Bubble Menu -->
      <div
        v-show="isCursorInDiff"
        class="bg-white shadow-xl border border-gray-200 rounded-lg p-2 flex flex-col gap-2 min-w-[220px]"
      >
        <div class="text-xs text-gray-600 px-1 flex items-start gap-1.5 leading-snug">
          <SparklesIcon class="w-3.5 h-3.5 mt-0.5 text-indigo-500 flex-shrink-0" />
          <span>{{ activeDiffReason }}</span>
        </div>
        <div class="bg-gray-100 h-px w-full"></div>
        <div class="flex gap-1 justify-end">
          <button
            @click.prevent="acceptDiffChange"
            class="px-2 py-1.5 hover:bg-green-50 rounded text-green-700 flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer"
            title="Accept Change"
          >
            <CheckIcon class="w-3.5 h-3.5" />
            <span>Accept</span>
          </button>
          <button
            @click.prevent="rejectDiffChange"
            class="px-2 py-1.5 hover:bg-red-50 rounded text-red-700 flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer"
            title="Reject Change"
          >
            <XIcon class="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>
        </div>
      </div>
    </bubble-menu>

    <!-- Floating UI for Document-wide Diff Actions -->
    <div
      v-if="hasActiveDiffs"
      class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white shadow-2xl border border-gray-200 rounded-full px-5 py-3 flex items-center gap-4 z-50 animate-[slideUp_0.3s_ease-out]"
    >
      <span class="text-sm font-medium text-gray-700 flex items-center gap-1.5 whitespace-nowrap">
        <SparklesIcon class="w-4 h-4 text-indigo-500" /> Review Suggestions
      </span>
      <div class="h-4 w-px bg-gray-200"></div>
      <button
        @click="acceptAllDiffs"
        class="text-sm font-semibold text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
      >
        <CheckIcon class="w-4 h-4" /> Accept All
      </button>
      <button
        @click="rejectAllDiffs"
        class="text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
      >
        <XIcon class="w-4 h-4" /> Reject All
      </button>
    </div>
  </div>
</template>

<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { CommentMark } from './extensions/CommentMark'
import { DiffMark } from './extensions/DiffMark'
import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  MessageSquarePlusIcon,
  CheckIcon,
  XIcon,
  SparklesIcon,
} from 'lucide-vue-next'
import { useEditorStore } from '../../stores/editor-store'
import { watch, ref, onBeforeUnmount } from 'vue'

const store = useEditorStore()
const isCursorInDiff = ref(false)
const activeDiffReason = ref('')
const hasActiveDiffs = ref(false)

function checkActiveDiffs(ed) {
  let diffsFound = false
  ed.state.doc.descendants((node) => {
    if (diffsFound) return false
    if (node.isText && node.marks.some((m) => m.type.name === 'diff')) {
      diffsFound = true
      return false
    }
  })
  hasActiveDiffs.value = diffsFound
}

function hasDiffMarkAround(state) {
  const { selection } = state
  const { $from, empty } = selection

  if (!empty) {
    let found = false
    state.doc.nodesBetween(selection.from, selection.to, (node) => {
      if (node.marks && node.marks.find((m) => m.type.name === 'diff')) {
        found = true
      }
    })
    return found
  }

  // Check cursor position (if empty) to see if we're directly adjacent to a diff mark.
  // This is critical because DiffMark has inclusive: false, so a 1-char mark won't trigger isActive at its edges.
  const hasMarkBefore = $from.nodeBefore?.marks.find((m) => m.type.name === 'diff')
  const hasMarkAfter = $from.nodeAfter?.marks.find((m) => m.type.name === 'diff')

  return !!(hasMarkBefore || hasMarkAfter)
}

function getActiveDiffMark(state) {
  const { $from } = state.selection
  const markBefore = $from.nodeBefore?.marks.find((m) => m.type.name === 'diff')
  if (markBefore) return markBefore

  const markAfter = $from.nodeAfter?.marks.find((m) => m.type.name === 'diff')
  return markAfter || null
}

function customShouldShow({ state, editor }) {
  if (editor.isActive('diff') || hasDiffMarkAround(state)) {
    return true
  }

  const { selection } = state
  if (!selection.empty) {
    return true
  }

  return false
}

const initialContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Project Nova: Launch Strategy' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Welcome to the ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'Project Nova' },
        {
          type: 'text',
          text: ' launch strategy document. This initiative aims to redefine our core offering and expand into new markets.',
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Executive Summary' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Our focus for Q3 is to drive adoption among enterprise clients. We have identified key friction points in the current onboarding process ',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'diff',
              attrs: {
                diffId: 'diff-1',
                type: 'delete',
                reason: 'Slightly too informal for an executive summary.',
              },
            },
          ],
          text: 'that are super annoying',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'diff',
              attrs: { diffId: 'diff-1', type: 'insert', reason: 'More professional terminology.' },
            },
          ],
          text: 'that are causing high drop-off rates',
        },
        { type: 'text', text: '.' },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Action Items' }],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Revamp the landing page to feature enterprise success stories. ',
                },
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'diff',
                      attrs: {
                        diffId: 'diff-2',
                        type: 'insert',
                        reason: 'Specific metrics provide better direction for the marketing team.',
                      },
                    },
                  ],
                  text: 'Target a 15% increase in conversion rate.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'diff',
                      attrs: {
                        diffId: 'diff-3',
                        type: 'delete',
                        reason:
                          'This seems unrelated to the executive summary and should go in the team wiki.',
                      },
                    },
                  ],
                  text: 'Organize the weekly team lunch schedule.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Finalize the pricing ' },
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'diff',
                      attrs: { diffId: 'diff-4', type: 'delete', reason: 'Repetitive.' },
                    },
                  ],
                  text: 'tiers and tiers structure',
                },
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'diff',
                      attrs: {
                        diffId: 'diff-4',
                        type: 'insert',
                        reason: 'Clearer phrasing about the pricing model.',
                      },
                    },
                  ],
                  text: 'structure',
                },
                { type: 'text', text: ' for annual subscriptions' },
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'diff',
                      attrs: { diffId: 'diff-5', type: 'delete', reason: 'Punctuation update.' },
                    },
                  ],
                  text: '.',
                },
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'diff',
                      attrs: { diffId: 'diff-5', type: 'insert', reason: 'Punctuation update.' },
                    },
                  ],
                  text: '!',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

const editor = useEditor({
  content: initialContent,
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: 'Write something...',
    }),
    Highlight,
    CommentMark,
    DiffMark,
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px]',
    },
  },
  onCreate({ editor }) {
    store.setEditor(editor)
    checkActiveDiffs(editor)
  },
  onUpdate({ editor }) {
    checkActiveDiffs(editor)

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
    const isAdjacentDiff = hasDiffMarkAround(editor.state)
    const isInsideDiff = editor.isActive('diff')

    isCursorInDiff.value = isInsideDiff || isAdjacentDiff

    if (isInsideDiff) {
      activeDiffReason.value = editor.getAttributes('diff').reason || 'AI suggestion'
    } else if (isAdjacentDiff) {
      const mark = getActiveDiffMark(editor.state)
      activeDiffReason.value = mark?.attrs?.reason || 'AI suggestion'
    } else {
      activeDiffReason.value = ''
    }

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

function processDiffAction(actionType) {
  if (!editor.value) return

  const { state } = editor.value
  const { tr } = state
  let processed = false

  let targetDiffId = editor.value.getAttributes('diff').diffId

  if (!targetDiffId) {
    const mark = getActiveDiffMark(state)
    if (mark) targetDiffId = mark.attrs.diffId
  }

  if (!targetDiffId) return

  // Collect all ranges in the document with this diffId (since we might have multiple chunks for one suggestion)
  const ranges = []

  state.doc.descendants((node, pos) => {
    if (node.isText) {
      const mark = node.marks.find((m) => m.type.name === 'diff' && m.attrs.diffId === targetDiffId)
      if (mark) {
        ranges.push({
          from: pos,
          to: pos + node.nodeSize,
          type: mark.attrs.type,
        })
      }
    }
  })

  // Process from back to front to avoid position shifts ruining the rest!
  ranges.reverse().forEach((range) => {
    if (actionType === 'accept') {
      if (range.type === 'insert') {
        // Accept insertion: Remove the diff mark, keep the text
        tr.removeMark(range.from, range.to, state.schema.marks.diff)
        processed = true
      } else if (range.type === 'delete') {
        // Accept deletion: Delete the text
        tr.delete(range.from, range.to)
        processed = true
      }
    } else if (actionType === 'reject') {
      if (range.type === 'insert') {
        // Reject insertion: Delete the newly added text
        tr.delete(range.from, range.to)
        processed = true
      } else if (range.type === 'delete') {
        // Reject deletion: Remove the diff mark (it just becomes plain text again)
        tr.removeMark(range.from, range.to, state.schema.marks.diff)
        processed = true
      }
    }
  })

  if (processed) {
    editor.value.view.dispatch(tr)
  }
}

function acceptDiffChange() {
  processDiffAction('accept')
}

function rejectDiffChange() {
  processDiffAction('reject')
}

function acceptAllDiffs() {
  if (!editor.value) return
  const { state } = editor.value
  const { tr } = state

  const ranges = []
  state.doc.descendants((node, pos) => {
    if (node.isText) {
      const mark = node.marks.find((m) => m.type.name === 'diff')
      if (mark) {
        ranges.push({
          from: pos,
          to: pos + node.nodeSize,
          type: mark.attrs.type,
        })
      }
    }
  })

  ranges.reverse().forEach((range) => {
    if (range.type === 'insert') {
      tr.removeMark(range.from, range.to, state.schema.marks.diff)
    } else if (range.type === 'delete') {
      tr.delete(range.from, range.to)
    }
  })

  editor.value.view.dispatch(tr)
  hasActiveDiffs.value = false
}

function rejectAllDiffs() {
  if (!editor.value) return
  const { state } = editor.value
  const { tr } = state

  const ranges = []
  state.doc.descendants((node, pos) => {
    if (node.isText) {
      const mark = node.marks.find((m) => m.type.name === 'diff')
      if (mark) {
        ranges.push({
          from: pos,
          to: pos + node.nodeSize,
          type: mark.attrs.type,
        })
      }
    }
  })

  ranges.reverse().forEach((range) => {
    if (range.type === 'insert') {
      tr.delete(range.from, range.to)
    } else if (range.type === 'delete') {
      tr.removeMark(range.from, range.to, state.schema.marks.diff)
    }
  })

  editor.value.view.dispatch(tr)
  hasActiveDiffs.value = false
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

.diff-insertion {
  color: #2563eb;
  border-radius: 2px;
  cursor: pointer;
  border-bottom: 2px solid #2563eb;
}

.diff-deletion {
  color: #60a5fa;
  text-decoration: line-through;
  border-radius: 2px;
  cursor: pointer;
}

.diff-insertion:hover,
.diff-deletion:hover {
  background-color: rgba(37, 99, 235, 0.08); /* Faint highlight just for hover feedback */
}

.bubble-menu-wrapper {
  z-index: 50; /* ensure menus pop over text */
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 15px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}
</style>
