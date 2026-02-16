<template>
  <div class="h-full flex flex-col relative w-full mx-auto items-center">
    <!-- Toolbar Area -->
    <div
      class="w-full px-2 py-1 bg-white border-b border-gray-100 top-0 z-50 sticky"
      style="box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06)"
    >
      <EditorToolbar />
    </div>

    <!-- Scrollable Editor + Margin Area -->
    <div class="flex-1 w-full overflow-y-auto px-8 py-8 scroll-smooth" ref="scrollContainer">
      <div class="flex justify-center gap-0 relative">
        <!-- Document Paper -->
        <div
          ref="paperRef"
          class="min-h-[1000px] w-full bg-white shadow-sm border border-gray-100 p-12 rounded-lg relative max-w-[850px] shrink-0"
        >
          <TiptapEditor />
        </div>

        <!-- Comment Margin (inline, scrolls with document) -->
        <div class="w-72 shrink-0 relative ml-4" ref="marginRef">
          <div
            v-for="comment in comments"
            :key="comment.id"
            :id="`comment-card-${comment.id}`"
            class="comment-card absolute left-0 right-0 transition-all duration-200"
            :class="{
              'comment-card--active': focusedCommentId === comment.id,
              'comment-card--resolved': comment.resolved,
            }"
            :style="{ top: commentPositions[comment.id] + 'px' }"
            @click="handleCardClick(comment)"
          >
            <!-- Connector line -->
            <div
              v-if="focusedCommentId === comment.id"
              class="absolute -left-4 top-4 w-4 h-px bg-blue-300"
            ></div>

            <!-- Resolved banner -->
            <div
              v-if="comment.resolved"
              class="flex items-center gap-1.5 mb-1.5 text-[11px] text-green-600 font-medium"
            >
              <CheckCircle2Icon class="w-3 h-3" />
              <span>Resolved</span>
              <button
                @click.stop="reopenComment(comment.id)"
                class="ml-auto text-[11px] text-gray-400 hover:text-gray-600 underline"
              >
                Re-open
              </button>
            </div>

            <!-- Header -->
            <div class="flex items-center gap-1.5 mb-1">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                :class="
                  comment.resolved ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-700'
                "
              >
                {{ comment.author.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <span class="text-xs font-semibold text-gray-800 leading-tight">{{
                  comment.author
                }}</span>
                <span class="text-[10px] text-gray-400 ml-1">{{
                  formatTime(comment.timestamp)
                }}</span>
              </div>
              <button
                @click.stop="deleteComment(comment.id)"
                class="opacity-0 comment-card-action p-0.5 text-gray-400 hover:text-red-500 transition-all rounded hover:bg-red-50 shrink-0"
              >
                <Trash2Icon class="w-3 h-3" />
              </button>
            </div>

            <!-- Quoted text -->
            <div
              v-if="comment.selectedText"
              class="text-[11px] text-gray-500 bg-gray-50 border-l-2 border-gray-300 px-1.5 py-0.5 mb-1.5 rounded-r line-clamp-2 italic"
            >
              "{{ comment.selectedText }}"
            </div>

            <!-- Comment body / input -->
            <div v-if="!comment.resolved">
              <div v-if="draftCommentIds.has(comment.id) || editingCommentId === comment.id">
                <textarea
                  :ref="
                    (el) => {
                      if (el) commentInputRefs[comment.id] = el
                    }
                  "
                  v-model="draftTexts[comment.id]"
                  placeholder="Add a comment..."
                  class="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none transition-all"
                  rows="2"
                  @click.stop
                  @keydown.ctrl.enter.prevent="submitDraft(comment)"
                  @keydown.meta.enter.prevent="submitDraft(comment)"
                ></textarea>
                <div class="flex justify-end gap-1.5 mt-1.5">
                  <button
                    @click.stop="cancelDraft(comment)"
                    class="text-[11px] text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    @click.stop="submitDraft(comment)"
                    :disabled="!draftTexts[comment.id]?.trim()"
                    class="text-[11px] text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Comment
                  </button>
                </div>
              </div>
              <p
                v-else-if="comment.text"
                class="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed cursor-text"
                @click.stop="startEditing(comment)"
              >
                {{ comment.text }}
              </p>
            </div>

            <!-- Replies -->
            <div
              v-if="comment.replies && comment.replies.length > 0 && !comment.resolved"
              class="mt-2 space-y-2 border-t border-gray-100 pt-2"
            >
              <div v-for="reply in comment.replies" :key="reply.id" class="flex gap-1.5">
                <div
                  class="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5"
                >
                  {{ reply.author.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline gap-1">
                    <span class="text-[11px] font-semibold text-gray-700">{{ reply.author }}</span>
                    <span class="text-[9px] text-gray-400">{{ formatTime(reply.timestamp) }}</span>
                  </div>
                  <p class="text-[11px] text-gray-600 mt-0.5 whitespace-pre-wrap">
                    {{ reply.text }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Reply input -->
            <div
              v-if="comment.text && !comment.resolved"
              class="mt-2 pt-1.5 border-t border-gray-100"
            >
              <div class="flex items-center gap-1">
                <input
                  v-model="replyInputs[comment.id]"
                  @click.stop
                  @keydown.enter.exact.prevent="submitReply(comment.id)"
                  placeholder="Reply..."
                  class="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
                <button
                  @click.stop="submitReply(comment.id)"
                  :disabled="!replyInputs[comment.id]?.trim()"
                  class="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  <SendIcon class="w-3 h-3" />
                </button>
              </div>
            </div>

            <!-- Resolve action -->
            <div
              v-if="comment.text && !comment.resolved"
              class="flex justify-end mt-1.5 opacity-0 comment-card-action transition-opacity"
            >
              <button
                @click.stop="store.resolveComment(comment.id)"
                class="flex items-center gap-1 text-[11px] text-green-600 hover:text-green-700 font-medium hover:bg-green-50 px-1.5 py-0.5 rounded transition-colors"
              >
                <CheckIcon class="w-3 h-3" />
                Resolve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import TiptapEditor from '../components/editor/TiptapEditor.vue'
import EditorToolbar from '../components/editor/EditorToolbar.vue'
import { useEditorStore } from '../stores/editor-store'
import { Trash2Icon, SendIcon, CheckIcon, CheckCircle2Icon } from 'lucide-vue-next'

const store = useEditorStore()
const comments = computed(() => store.comments)
const focusedCommentId = computed(() => store.focusedCommentId)

const scrollContainer = ref(null)
const paperRef = ref(null)
const marginRef = ref(null)
const editingCommentId = ref(null)
const replyInputs = reactive({})
const commentInputRefs = reactive({})
const commentPositions = reactive({})
const draftCommentIds = reactive(new Set())
const draftTexts = reactive({})

// --- Position Computation ---
function updateCommentPositions() {
  if (!paperRef.value) return
  const paperRect = paperRef.value.getBoundingClientRect()

  for (const comment of store.comments) {
    const span = document.querySelector(`span[data-comment-id="${comment.id}"]`)
    if (span) {
      const spanRect = span.getBoundingClientRect()
      // Position relative to the paper top
      commentPositions[comment.id] = spanRect.top - paperRect.top
    }
  }

  // Resolve overlaps: push cards down if they would overlap
  const sortedComments = [...store.comments]
    .filter((c) => commentPositions[c.id] !== undefined)
    .sort((a, b) => commentPositions[a.id] - commentPositions[b.id])

  let lastBottom = -Infinity
  for (const comment of sortedComments) {
    const cardEl = document.getElementById(`comment-card-${comment.id}`)
    const cardHeight = cardEl ? cardEl.offsetHeight + 8 : 80 // 8px gap
    if (commentPositions[comment.id] < lastBottom) {
      commentPositions[comment.id] = lastBottom
    }
    lastBottom = commentPositions[comment.id] + cardHeight
  }
}

let resizeObserver = null
let scrollHandler = null
let rafId = null

function scheduleUpdate() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    updateCommentPositions()
    rafId = null
  })
}

onMounted(() => {
  // Observe paper size changes
  if (paperRef.value) {
    resizeObserver = new ResizeObserver(scheduleUpdate)
    resizeObserver.observe(paperRef.value)
  }

  // Listen for scroll to recalculate (positions are relative so this handles reflows)
  scrollHandler = scheduleUpdate
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener('scroll', scrollHandler, { passive: true })
  }

  scheduleUpdate()
})

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect()
  if (scrollContainer.value && scrollHandler) {
    scrollContainer.value.removeEventListener('scroll', scrollHandler)
  }
  if (rafId) cancelAnimationFrame(rafId)
})

// Recalculate when comments change
watch(
  () => store.comments.length,
  (newLen, oldLen) => {
    nextTick(() => {
      scheduleUpdate()
      // Auto-focus new comment input
      if (newLen > oldLen) {
        const latest = store.comments[store.comments.length - 1]
        if (latest && !latest.text) {
          draftCommentIds.add(latest.id)
          draftTexts[latest.id] = ''
          nextTick(() => {
            const el = commentInputRefs[latest.id]
            if (el) el.focus()
          })
        }
      }
    })
  },
)

// Scroll to focused comment card
watch(
  () => store.focusedCommentId,
  (newId) => {
    if (newId) {
      nextTick(() => {
        const card = document.getElementById(`comment-card-${newId}`)
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      })
    }
  },
)

// --- Helpers ---
function formatTime(date) {
  if (!date) return ''
  const now = new Date()
  const d = new Date(date)
  const diffMin = Math.floor((now - d) / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(d)
}

function handleCardClick(comment) {
  const element = document.querySelector(`span[data-comment-id="${comment.id}"]`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  store.setFocusedComment(comment.id)
  clearActiveHighlights()
  const spans = document.querySelectorAll(`span[data-comment-id="${comment.id}"]`)
  spans.forEach((span) => span.classList.add('comment-highlight-active'))
}

function clearActiveHighlights() {
  document.querySelectorAll('.comment-highlight-active').forEach((el) => {
    el.classList.remove('comment-highlight-active')
  })
}

function submitDraft(comment) {
  const text = draftTexts[comment.id]?.trim()
  if (!text) return
  comment.text = text
  draftCommentIds.delete(comment.id)
  editingCommentId.value = null
  delete draftTexts[comment.id]
  nextTick(scheduleUpdate)
}

function cancelDraft(comment) {
  if (!comment.text) {
    // New comment with no saved text — delete the whole comment
    deleteComment(comment.id)
  } else {
    // Was editing an existing comment — just close
    draftTexts[comment.id] = comment.text
    editingCommentId.value = null
  }
  draftCommentIds.delete(comment.id)
}

function startEditing(comment) {
  editingCommentId.value = comment.id
  draftCommentIds.add(comment.id)
  draftTexts[comment.id] = comment.text
  nextTick(() => {
    const el = commentInputRefs[comment.id]
    if (el) el.focus()
  })
}

function submitReply(commentId) {
  const text = replyInputs[commentId]?.trim()
  if (!text) return
  store.addReply(commentId, { author: 'User Name', text })
  replyInputs[commentId] = ''
  nextTick(scheduleUpdate) // Replies change card height
}

function reopenComment(id) {
  store.reopenComment(id)
}

function deleteComment(id) {
  store.removeComment(id)
}
</script>

<style scoped>
.comment-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  width: 100%;
}

.comment-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.comment-card:hover .comment-card-action {
  opacity: 1 !important;
}

.comment-card--active {
  border-left-color: #4285f4;
  box-shadow: 0 2px 12px rgba(66, 133, 244, 0.18);
  background: #f8faff;
}

.comment-card--resolved {
  opacity: 0.65;
  border-left-color: #22c55e;
  background: #fafafa;
}

.comment-card--resolved:hover {
  opacity: 1;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
