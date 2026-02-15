<template>
  <Transition name="panel-slide">
    <div v-if="isOpen" class="panel-root">
      <!-- Ambient glow behind panel -->
      <div class="panel-glow"></div>

      <!-- Panel content -->
      <div class="panel-inner">
        <!-- Header -->
        <div class="panel-header">
          <div class="header-left">
            <div class="ai-avatar">
              <SparklesIcon class="avatar-icon" />
              <div class="avatar-pulse"></div>
            </div>
            <div class="header-text">
              <h2 class="header-title">AI</h2>
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
          <!-- Welcome Message -->
          <div class="message message-ai">
            <div class="message-avatar">
              <SparklesIcon class="msg-avatar-icon" />
            </div>
            <div class="message-content">
              <p class="message-text">How can I help you with your document?</p>
              <span class="message-time">Just now</span>
            </div>
          </div>

          <!-- Suggestion Chips -->
          <div class="suggestions">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion.label"
              class="suggestion-chip"
              @click="handleSuggestion(suggestion.prompt)"
            >
              <component :is="suggestion.icon" class="chip-icon" />
              <span>{{ suggestion.label }}</span>
            </button>
          </div>
        </div>

        <!-- Input Area -->
        <div class="input-area">
          <div class="input-wrapper">
            <textarea
              ref="inputRef"
              v-model="inputText"
              placeholder="Ask anything..."
              class="chat-input"
              rows="1"
              @input="autoResize"
              @keydown.enter.exact.prevent="sendMessage"
            ></textarea>
            <button
              class="send-btn"
              :class="{ 'send-btn--active': inputText.trim() }"
              :disabled="!inputText.trim()"
              @click="sendMessage"
              aria-label="Send message"
            >
              <ArrowUpIcon class="send-icon" />
            </button>
          </div>
          <p class="input-hint">Press <kbd>Enter</kbd> to send</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, nextTick, watch, markRaw } from 'vue'
import { useEditorStore } from '../../stores/editor-store'
import {
  XIcon,
  SparklesIcon,
  ArrowUpIcon,
  PenLineIcon,
  CheckCheckIcon,
  WandSparklesIcon,
  ListIcon,
} from 'lucide-vue-next'

const store = useEditorStore()
const isOpen = computed(() => store.activeSidebarTab === 'chat')

const inputText = ref('')
const inputRef = ref(null)
const messagesRef = ref(null)

const suggestions = [
  {
    label: 'Improve writing',
    prompt: 'Improve the writing quality of this document',
    icon: markRaw(WandSparklesIcon),
  },
  {
    label: 'Fix grammar',
    prompt: 'Fix all grammar and spelling errors',
    icon: markRaw(CheckCheckIcon),
  },
  {
    label: 'Summarize',
    prompt: 'Summarize the key points in this document',
    icon: markRaw(ListIcon),
  },
  {
    label: 'Continue writing',
    prompt: 'Continue writing from where I left off',
    icon: markRaw(PenLineIcon),
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

function sendMessage() {
  if (!inputText.value.trim()) return
  // Future: integrate with AI backend
  inputText.value = ''
  nextTick(autoResize)
}

function handleSuggestion(prompt) {
  inputText.value = prompt
  nextTick(() => {
    autoResize()
    inputRef.value?.focus()
  })
}

watch(isOpen, (val) => {
  if (val) {
    nextTick(() => inputRef.value?.focus())
  }
})
</script>

<style scoped>
/* ── Transition ────────────────────────────── */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition:
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.25s ease;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* ── Root ──────────────────────────────────── */
.panel-root {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 380px;
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.panel-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.03) 100%);
  pointer-events: none;
  border-radius: 0;
}

.panel-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(15, 15, 20, 0.96);
  backdrop-filter: blur(40px) saturate(1.5);
  -webkit-backdrop-filter: blur(40px) saturate(1.5);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

/* ── Header ────────────────────────────────── */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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
  box-shadow:
    0 0 20px rgba(99, 102, 241, 0.3),
    0 0 60px rgba(139, 92, 246, 0.1);
}

.avatar-icon {
  width: 18px;
  height: 18px;
  color: white;
}

.avatar-pulse {
  position: absolute;
  inset: -3px;
  border-radius: 13px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  animation: pulse-ring 3s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%,
  100% {
    opacity: 0;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
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
  background: #34d399;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.5);
}

.status-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
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
  color: rgba(255, 255, 255, 0.35);
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
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
  gap: 16px;
}

.messages-area::-webkit-scrollbar {
  width: 4px;
}
.messages-area::-webkit-scrollbar-track {
  background: transparent;
}
.messages-area::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
}
.messages-area::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

.message {
  display: flex;
  gap: 10px;
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

.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(99, 102, 241, 0.15);
}

.msg-avatar-icon {
  width: 14px;
  height: 14px;
  color: #a78bfa;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-text {
  font-size: 13.5px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.78);
  margin: 0;
  letter-spacing: -0.005em;
}

.message-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.2);
  margin-top: 4px;
  display: block;
}

/* ── Suggestions ───────────────────────────── */
.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.suggestion-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: -0.005em;
  white-space: nowrap;
}

.suggestion-chip:hover {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.25);
  color: rgba(255, 255, 255, 0.85);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
}

.suggestion-chip:active {
  transform: translateY(0);
}

.chip-icon {
  width: 13px;
  height: 13px;
  opacity: 0.7;
}

.suggestion-chip:hover .chip-icon {
  opacity: 1;
}

/* ── Input Area ────────────────────────────── */
.input-area {
  padding: 16px 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: flex-end;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  transition: all 0.25s ease;
  padding: 4px;
}

.input-wrapper:focus-within {
  border-color: rgba(99, 102, 241, 0.35);
  background: rgba(255, 255, 255, 0.07);
  box-shadow:
    0 0 0 3px rgba(99, 102, 241, 0.08),
    0 0 20px rgba(99, 102, 241, 0.05);
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  padding: 10px 12px;
  font-size: 13.5px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.88);
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  min-height: 40px;
  max-height: 120px;
}

.chat-input::placeholder {
  color: rgba(255, 255, 255, 0.22);
}

.send-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;
  margin-bottom: 2px;
}

.send-btn--active {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  box-shadow: 0 0 16px rgba(99, 102, 241, 0.3);
}

.send-btn--active:hover {
  box-shadow: 0 0 24px rgba(99, 102, 241, 0.45);
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
  margin: 8px 0 0;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.15);
  text-align: center;
}

.input-hint kbd {
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-family: inherit;
  font-size: 10px;
}
</style>
