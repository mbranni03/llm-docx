<template>
  <div class="panel-root" :class="{ 'is-open': isOpen }">
    <div class="panel-inner">
      <!-- Header -->
      <div class="panel-header">
        <div class="header-left">
          <div class="ai-avatar">
            <SparklesIcon class="avatar-icon" />
          </div>
          <div class="header-text">
            <h2 class="header-title">AI Assistant</h2>
            <div class="header-status">
              <span class="status-dot"></span>
              <span class="status-label">Ready</span>
            </div>
          </div>
        </div>
        <button @click="close" class="close-btn" aria-label="Close AI assistant">
          <XIcon class="close-icon" />
        </button>
      </div>

      <!-- Messages Area -->
      <div class="messages-area" ref="messagesRef">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message"
          :class="msg.role === 'ai' ? 'message-ai' : 'message-user'"
        >
          <div class="message-avatar" :class="{ 'user-avatar': msg.role === 'user' }">
            <SparklesIcon v-if="msg.role === 'ai'" class="msg-avatar-icon" />
            <UserIcon v-else class="msg-avatar-icon" />
          </div>
          <div class="message-content">
            <div v-if="msg.isTyping" class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
            <div
              v-else
              class="message-text"
              :class="{ 'text-gray-500 italic': msg.isStatus }"
              v-html="renderMarkdown(msg.content)"
            ></div>
            <span v-if="!msg.isTyping" class="message-time">{{ formatTime(msg.timestamp) }}</span>
          </div>
        </div>

        <!-- Suggestion Chips -->
        <div class="suggestions" v-if="!analysisStore.loading && isLastMessageAi">
          <button
            v-for="suggestion in suggestions"
            :key="suggestion.label"
            class="suggestion-chip"
            @click="handleSuggestionClick(suggestion)"
          >
            <component :is="suggestion.icon" class="chip-icon" />
            <span>{{ suggestion.label }}</span>
          </button>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <div class="input-wrapper" :class="{ 'is-focused': isInputFocused }">
          <textarea
            ref="inputRef"
            v-model="inputText"
            placeholder="Ask anything..."
            class="chat-input"
            rows="1"
            @focus="isInputFocused = true"
            @blur="isInputFocused = false"
            @input="autoResize"
            @keydown.enter.exact.prevent="handleSend"
          ></textarea>
          <button
            class="send-btn"
            :class="{ 'send-btn--active': inputText.trim() }"
            :disabled="!inputText.trim()"
            @click="handleSend"
            aria-label="Send message"
          >
            <ArrowUpIcon class="send-icon" />
          </button>
        </div>
        <p class="input-hint">Press <kbd>Enter</kbd> to send</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, markRaw } from 'vue'
import { useEditorStore } from '../../stores/editor-store'
import { useDocAnalysisStore } from '../../stores/doc-analysis-store'
import * as diff from 'diff'
import {
  XIcon,
  SparklesIcon,
  ArrowUpIcon,
  PenLineIcon,
  WandSparklesIcon,
  ListIcon,
  ScanTextIcon,
  UserIcon,
} from 'lucide-vue-next'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const store = useEditorStore()
const analysisStore = useDocAnalysisStore()
const isOpen = computed(() => store.activeSidebarTab === 'chat')

const inputText = ref('')
const inputRef = ref(null)
const messagesRef = ref(null)
const isInputFocused = ref(false)

const messages = ref([
  {
    id: 1,
    role: 'ai',
    content: 'How can I help you with your document?',
    timestamp: new Date(),
  },
])

const isLastMessageAi = computed(() => {
  if (messages.value.length === 0) return false
  return messages.value[messages.value.length - 1].role === 'ai'
})

const suggestions = [
  {
    label: 'Continue writing',
    prompt: 'Continue writing from where I left off',
    icon: markRaw(PenLineIcon),
  },
  { label: 'Comment criticism', action: runCriticism, icon: markRaw(ScanTextIcon) },
  {
    label: 'Suggest changes',
    action: runTrackChanges,
    icon: markRaw(WandSparklesIcon),
  },
  {
    label: 'Summarize',
    action: runSummarize,
    icon: markRaw(ListIcon),
  },
]

function close() {
  store.setActiveSidebarTab(null)
}

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

function formatTime(date) {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
  }).format(date)
}

function renderMarkdown(text) {
  if (!text) return ''
  const parsed = marked.parse(text)
  return DOMPurify.sanitize(parsed)
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

function addMessage(role, content, isStatus = false, isTyping = false) {
  const newMsg = {
    id: Date.now() + Math.random(),
    role,
    content,
    timestamp: new Date(),
    isStatus,
    isTyping,
  }
  messages.value.push(newMsg)
  scrollToBottom()
  return messages.value[messages.value.length - 1]
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text) return

  addMessage('user', text)
  inputText.value = ''
  nextTick(autoResize)

  // Simulate AI processing generic requests
  const aiMsg = addMessage('ai', '', false, true)
  setTimeout(() => {
    aiMsg.isTyping = false
    aiMsg.content = 'I\'m a demo AI. In a full implementation, I would process: "' + text + '"'
  }, 1000)
}

function handleSuggestionClick(suggestion) {
  if (suggestion.action) {
    suggestion.action()
  } else if (suggestion.prompt) {
    addMessage('user', suggestion.prompt)
    const aiMsg = addMessage('ai', '', false, true)
    setTimeout(() => {
      aiMsg.isTyping = false
      aiMsg.content =
        'In a fully connected backend, I would run the action for: ' + suggestion.label
    }, 1000)
  }
}

watch(isOpen, (val) => {
  if (val) {
    nextTick(() => inputRef.value?.focus())
  }
})

// === Actions ===

async function runCriticism() {
  addMessage('user', 'Can you review this document and add comments?')
  const statusMsg = addMessage('ai', '', false, true)

  const editor = store.editor
  if (!editor) {
    statusMsg.isTyping = false
    statusMsg.content = 'Editor not found.'
    return
  }

  const text = editor.getText()
  if (!text.trim()) {
    statusMsg.isTyping = false
    statusMsg.content = 'The document is empty.'
    return
  }

  // Run the API call
  const criticisms = await analysisStore.generateCriticisms(text)

  if (!criticisms || criticisms.length === 0) {
    statusMsg.isTyping = false
    statusMsg.content = "I couldn't find any specific criticisms or an error occurred."
    return
  }

  // Programmatically iterate through the doc and add comments for exact matches
  const { doc, tr } = editor.state
  let addedCount = 0

  for (const crit of criticisms) {
    if (!crit.quote || !crit.criticism) continue

    const matches = []
    doc.descendants((node, pos) => {
      if (node.isText) {
        let textPart = node.text
        let matchIdx = textPart.indexOf(crit.quote)
        while (matchIdx !== -1) {
          matches.push({
            from: pos + matchIdx,
            to: pos + matchIdx + crit.quote.length,
            text: crit.quote,
          })
          matchIdx = textPart.indexOf(crit.quote, matchIdx + 1)
        }
      }
    })

    if (matches.length > 0) {
      const match = matches[0] // take the first occurrence
      const commentId = crypto.randomUUID()

      tr.addMark(match.from, match.to, editor.schema.marks.comment.create({ commentId }))

      store.addComment({
        id: commentId,
        author: 'AI Reviewer',
        timestamp: new Date(),
        text: crit.criticism,
        selectedText: crit.quote,
      })
      addedCount++
    }
  }

  editor.view.dispatch(tr)

  statusMsg.isTyping = false
  statusMsg.content = `I've reviewed the document and attached ${addedCount} comment(s)`
}

async function runTrackChanges() {
  addMessage('user', 'Can you suggest textual improvements to this document?')
  const statusMsg = addMessage('ai', '', false, true)

  const editor = store.editor
  if (!editor) {
    statusMsg.isTyping = false
    statusMsg.content = 'Editor not found.'
    return
  }

  const text = editor.getText()
  if (!text.trim()) {
    statusMsg.isTyping = false
    statusMsg.content = 'The document is empty.'
    return
  }

  // Run the API call
  const suggestions = await analysisStore.generateSuggestions(text)

  if (!suggestions || suggestions.length === 0) {
    statusMsg.isTyping = false
    statusMsg.content = "I didn't find any necessary changes."
    return
  }

  let addedCount = 0

  for (const sug of suggestions) {
    if (!sug.quote || !sug.suggestion) continue

    const currentState = editor.state
    const { tr } = currentState

    let matchPos = -1
    currentState.doc.descendants((node, pos) => {
      if (node.isText && matchPos === -1) {
        let textPart = node.text
        let matchIdx = textPart.indexOf(sug.quote)
        if (matchIdx !== -1) {
          matchPos = pos + matchIdx
        }
      }
    })

    if (matchPos !== -1) {
      const diffId = crypto.randomUUID()
      const from = matchPos
      const to = matchPos + sug.quote.length

      // Delete old block and insert the diff chunks
      tr.delete(from, to)

      const diffChunks = diff.diffWordsWithSpace(sug.quote, sug.suggestion)

      let currentInsertPos = from
      diffChunks.forEach((chunk) => {
        if (chunk.added) {
          tr.insertText(chunk.value, currentInsertPos)
          tr.addMark(
            currentInsertPos,
            currentInsertPos + chunk.value.length,
            editor.schema.marks.diff.create({
              diffId,
              type: 'insert',
              reason: sug.reason,
            }),
          )
          currentInsertPos += chunk.value.length
        } else if (chunk.removed) {
          tr.insertText(chunk.value, currentInsertPos)
          tr.addMark(
            currentInsertPos,
            currentInsertPos + chunk.value.length,
            editor.schema.marks.diff.create({
              diffId,
              type: 'delete',
              reason: sug.reason,
            }),
          )
          currentInsertPos += chunk.value.length
        } else {
          tr.insertText(chunk.value, currentInsertPos)
          currentInsertPos += chunk.value.length
        }
      })

      editor.view.dispatch(tr)
      addedCount++
    }
  }

  statusMsg.isTyping = false
  statusMsg.content = `I have suggested ${addedCount} text changes. You can see the unified diffs in the editor, and accept or reject them individually or all at once.`
}

async function runSummarize() {
  addMessage('user', 'Can you summarize this document for me?')
  const statusMsg = addMessage('ai', '', false, true)

  const editor = store.editor
  if (!editor) {
    statusMsg.isTyping = false
    statusMsg.content = 'Editor not found.'
    return
  }

  const text = editor.getText()
  if (!text.trim()) {
    statusMsg.isTyping = false
    statusMsg.content = 'The document is empty.'
    return
  }

  // Run the API call
  const response = await analysisStore.generateSummary(text)

  if (!response || !response.summary) {
    statusMsg.isTyping = false
    statusMsg.content = "I couldn't generate a summary or an error occurred."
    return
  }

  statusMsg.isTyping = false
  statusMsg.content = response.summary
}
</script>

<style scoped>
/* ── Root ──────────────────────────────────── */
.panel-root {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 380px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.25s ease,
    visibility 0s linear 0.35s;
}

.panel-root.is-open {
  transform: translateX(0);
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition:
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.25s ease,
    visibility 0s linear 0s;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.05);
}

.panel-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  border-left: 1px solid #f3f4f6;
  overflow: hidden;
}

/* ── Header ────────────────────────────────── */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #f3f4f6;
  background: #fafafa;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.avatar-icon {
  width: 18px;
  height: 18px;
  color: white;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  letter-spacing: -0.01em;
  line-height: 1;
  margin: 0;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 5px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.status-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #9ca3af;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #4b5563;
}

.close-icon {
  width: 16px;
  height: 16px;
}

/* ── Messages ──────────────────────────────── */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: #ffffff;
}

.messages-area::-webkit-scrollbar {
  width: 4px;
}
.messages-area::-webkit-scrollbar-track {
  background: transparent;
}
.messages-area::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 4px;
}

.message {
  display: flex;
  gap: 12px;
  animation: message-in 0.3s ease-out;
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-ai {
  flex-direction: row;
}

.message-user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.user-avatar {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
}

.msg-avatar-icon {
  width: 15px;
  height: 15px;
  color: #6366f1;
}

.user-avatar .msg-avatar-icon {
  color: #6b7280;
}

.message-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.message-user .message-content {
  align-items: flex-end;
}

.message-text {
  font-size: 13.5px;
  line-height: 1.55;
  color: #374151;
  margin: 0;
  background: #f9fafb;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid #f3f4f6;
  display: inline-block;
  white-space: pre-wrap;
}

.message-user .message-text {
  background: #6366f1;
  color: #ffffff;
  border-color: #6366f1;
}

.message-time {
  font-size: 10px;
  color: #9ca3af;
  margin-top: 6px;
  display: block;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px 16px;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #f3f4f6;
  width: fit-content;
  min-height: 48px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background-color: #9ca3af;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* ── Actions ───────────────────────────── */
.diff-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  margin-left: 42px; /* align with text */
}

.diff-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.diff-accept {
  background: #f0fdf4;
  color: #166534;
  border-color: #bbf7d0;
}

.diff-accept:hover {
  background: #dcfce7;
}

.diff-reject {
  background: #fef2f2;
  color: #991b1b;
  border-color: #fecaca;
}

.diff-reject:hover {
  background: #fee2e2;
}

.action-icon {
  width: 14px;
  height: 14px;
}

/* ── Suggestions ───────────────────────────── */
.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  margin-left: 42px; /* align with text */
}

.suggestion-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #4b5563;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.suggestion-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.suggestion-chip:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #111827;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.suggestion-chip:active:not(:disabled) {
  transform: translateY(0);
}

.chip-icon {
  width: 14px;
  height: 14px;
  color: #6366f1;
}

/* ── Input Area ────────────────────────────── */
.input-area {
  padding: 16px 20px 20px;
  border-top: 1px solid #f3f4f6;
  background: #fafafa;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: flex-end;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  transition: all 0.25s ease;
  padding: 6px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
}

.input-wrapper.is-focused {
  border-color: #a5b4fc;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  padding: 8px 10px;
  font-size: 13.5px;
  line-height: 1.5;
  color: #111827;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  min-height: 38px;
  max-height: 120px;
}

.chat-input::placeholder {
  color: #9ca3af;
}

.send-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: none;
  background: #f3f4f6;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;
  margin-bottom: 3px;
  margin-right: 3px;
}

.send-btn--active {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.send-btn--active:hover {
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.45);
  transform: scale(1.05);
}

.send-btn:disabled {
  cursor: default;
}

.send-icon {
  width: 16px;
  height: 16px;
}

.input-hint {
  margin: 10px 0 0;
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
}

.input-hint kbd {
  padding: 2px 6px;
  border-radius: 4px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  font-family: inherit;
  font-size: 10px;
  color: #6b7280;
}
</style>
