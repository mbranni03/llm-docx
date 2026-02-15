<template>
  <div class="toolbar-root" v-if="editor">
    <!-- Row 1: Title Bar -->
    <div class="title-bar">
      <div class="title-bar-left">
        <div class="doc-icon-wrap">
          <FileTextIcon class="doc-icon" />
        </div>
        <div class="doc-meta">
          <span class="doc-title">Untitled document</span>
          <div class="doc-menu">
            <button class="menu-item">File</button>
            <button class="menu-item">Edit</button>
            <button class="menu-item">View</button>
            <button class="menu-item">Insert</button>
            <button class="menu-item">Format</button>
            <button class="menu-item">Tools</button>
          </div>
        </div>
      </div>
      <div class="title-bar-right">
        <button
          @click="addComment"
          :disabled="editor.state.selection.empty"
          class="action-btn"
          title="Add comment (⌘⌥M)"
        >
          <MessageSquarePlusIcon class="action-icon" />
        </button>
        <button
          @click="store.setActiveSidebarTab('chat')"
          :class="{ 'ai-btn--active': store.activeSidebarTab === 'chat' }"
          class="ai-btn"
          title="AI Assistant"
        >
          <SparklesIcon class="action-icon" />
          <span>AI</span>
        </button>
      </div>
    </div>

    <!-- Row 2: Formatting Toolbar -->
    <div class="format-bar">
      <div class="fmt-group">
        <button
          @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
          class="fmt-btn"
          title="Undo (⌘Z)"
        >
          <Undo2Icon class="fmt-icon" />
        </button>
        <button
          @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
          class="fmt-btn"
          title="Redo (⌘⇧Z)"
        >
          <Redo2Icon class="fmt-icon" />
        </button>
      </div>

      <div class="fmt-divider" />

      <div class="fmt-group">
        <select
          class="fmt-select"
          :value="currentHeadingLevel"
          @change="setHeading($event.target.value)"
          title="Text style"
        >
          <option value="paragraph">Normal text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
      </div>

      <div class="fmt-divider" />

      <div class="fmt-group">
        <button
          @click="editor.chain().focus().toggleBold().run()"
          :class="{ 'is-active': editor.isActive('bold') }"
          class="fmt-btn"
          title="Bold (⌘B)"
        >
          <BoldIcon class="fmt-icon" />
        </button>
        <button
          @click="editor.chain().focus().toggleItalic().run()"
          :class="{ 'is-active': editor.isActive('italic') }"
          class="fmt-btn"
          title="Italic (⌘I)"
        >
          <ItalicIcon class="fmt-icon" />
        </button>
        <button
          @click="editor.chain().focus().toggleStrike().run()"
          :class="{ 'is-active': editor.isActive('strike') }"
          class="fmt-btn"
          title="Strikethrough (⌘⇧X)"
        >
          <StrikethroughIcon class="fmt-icon" />
        </button>
        <button
          @click="editor.chain().focus().toggleHighlight().run()"
          :class="{ 'is-active': editor.isActive('highlight') }"
          class="fmt-btn"
          title="Highlight"
        >
          <HighlighterIcon class="fmt-icon" />
        </button>
      </div>

      <div class="fmt-divider" />

      <div class="fmt-group">
        <button
          @click="editor.chain().focus().toggleBulletList().run()"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          class="fmt-btn"
          title="Bullet list"
        >
          <ListIcon class="fmt-icon" />
        </button>
        <button
          @click="editor.chain().focus().toggleOrderedList().run()"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          class="fmt-btn"
          title="Numbered list"
        >
          <ListOrderedIcon class="fmt-icon" />
        </button>
        <button
          @click="editor.chain().focus().toggleBlockquote().run()"
          :class="{ 'is-active': editor.isActive('blockquote') }"
          class="fmt-btn"
          title="Quote"
        >
          <QuoteIcon class="fmt-icon" />
        </button>
        <button
          @click="editor.chain().focus().setHorizontalRule().run()"
          class="fmt-btn"
          title="Horizontal rule"
        >
          <MinusIcon class="fmt-icon" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  FileTextIcon,
  Undo2Icon,
  Redo2Icon,
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  HighlighterIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  MinusIcon,
  SparklesIcon,
  MessageSquarePlusIcon,
} from 'lucide-vue-next'
import { useEditorStore } from '../../stores/editor-store'
import { computed } from 'vue'

const store = useEditorStore()
const editor = computed(() => store.editor)

const currentHeadingLevel = computed(() => {
  if (!editor.value) return 'paragraph'
  for (let level = 1; level <= 3; level++) {
    if (editor.value.isActive('heading', { level })) return String(level)
  }
  return 'paragraph'
})

function setHeading(value) {
  if (!editor.value) return
  if (value === 'paragraph') {
    editor.value.chain().focus().setParagraph().run()
  } else {
    editor.value
      .chain()
      .focus()
      .toggleHeading({ level: parseInt(value) })
      .run()
  }
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
</script>

<style scoped>
/* ===== Title Bar ===== */
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px 2px;
}

.title-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.doc-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: #4285f4;
  flex-shrink: 0;
  transition: background 0.15s ease;
}

.doc-icon-wrap:hover {
  background: #f1f3f4;
}

.doc-icon {
  width: 22px;
  height: 22px;
  stroke-width: 1.8;
}

.doc-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.doc-title {
  font-size: 16px;
  font-weight: 500;
  color: #202124;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.doc-menu {
  display: flex;
  align-items: center;
  gap: 0;
}

.menu-item {
  font-size: 12px;
  font-weight: 400;
  color: #5f6368;
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;
  line-height: 1.5;
}

.menu-item:hover {
  background: #f1f3f4;
  color: #202124;
}

/* --- Title Bar Right --- */
.title-bar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #5f6368;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  background: #f1f3f4;
  color: #202124;
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-icon {
  width: 18px;
  height: 18px;
  stroke-width: 1.8;
}

.ai-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 10px;
  border-radius: 18px;
  border: none;
  background: #f1f3f4;
  color: #5f6368;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.01em;
}

.ai-btn:hover {
  background: #e8eaed;
  color: #202124;
}

.ai-btn--active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.35);
}

.ai-btn--active:hover {
  background: linear-gradient(135deg, #5a70d6 0%, #6a4393 100%);
  color: #fff;
}

/* ===== Formatting Bar ===== */
.format-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 12px 4px;
}

.fmt-group {
  display: flex;
  align-items: center;
  gap: 1px;
}

.fmt-divider {
  width: 1px;
  height: 18px;
  background: #dadce0;
  margin: 0 5px;
  flex-shrink: 0;
}

/* --- Format Buttons --- */
.fmt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: #5f6368;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;
  flex-shrink: 0;
}

.fmt-btn:hover:not(:disabled) {
  background: #f1f3f4;
  color: #202124;
}

.fmt-btn:active:not(:disabled) {
  background: #e8eaed;
}

.fmt-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.fmt-btn.is-active {
  background: #d3e3fd;
  color: #1967d2;
}

.fmt-btn.is-active:hover {
  background: #c1d6f7;
}

.fmt-icon {
  width: 15px;
  height: 15px;
  stroke-width: 2.2;
}

/* --- Heading Select --- */
.fmt-select {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: none;
  border-radius: 5px;
  padding: 4px 20px 4px 8px;
  height: 28px;
  font-size: 12px;
  font-weight: 500;
  color: #5f6368;
  cursor: pointer;
  transition: background 0.12s ease;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235f6368' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 5px center;
  min-width: 100px;
}

.fmt-select:hover {
  background-color: #f1f3f4;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235f6368' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 5px center;
}

.fmt-select:focus {
  outline: none;
  box-shadow: 0 0 0 2px #a8c7fa;
}
</style>
