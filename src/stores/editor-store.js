import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useEditorStore = defineStore('editor', () => {
  const editor = ref(null)
  const activeSidebarTab = ref(null) // 'chat' or null (comments are always visible)

  const comments = ref([])
  const focusedCommentId = ref(null)

  function setEditor(instance) {
    editor.value = instance
  }

  function setActiveSidebarTab(tab) {
    activeSidebarTab.value = activeSidebarTab.value === tab ? null : tab
  }

  function setFocusedComment(id) {
    focusedCommentId.value = id
  }

  function addComment(comment) {
    comments.value.push({
      ...comment,
      replies: [],
      resolved: false,
    })
    focusedCommentId.value = comment.id
  }

  function addReply(commentId, reply) {
    const comment = comments.value.find((c) => c.id === commentId)
    if (comment) {
      comment.replies.push({
        id: crypto.randomUUID(),
        author: reply.author || 'User Name',
        text: reply.text,
        timestamp: new Date(),
      })
    }
  }

  function resolveComment(id) {
    const comment = comments.value.find((c) => c.id === id)
    if (comment) {
      comment.resolved = true
    }
  }

  function reopenComment(id) {
    const comment = comments.value.find((c) => c.id === id)
    if (comment) {
      comment.resolved = false
    }
  }

  function removeComment(id) {
    const index = comments.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      comments.value.splice(index, 1)
    }

    // Remove the mark from the editor document
    if (editor.value) {
      const { doc, tr } = editor.value.state
      doc.descendants((node, pos) => {
        if (node.isText) {
          const commentMark = node.marks.find(
            (m) => m.type.name === 'comment' && m.attrs.commentId === id,
          )
          if (commentMark) {
            tr.removeMark(pos, pos + node.nodeSize, commentMark.type.create({ commentId: id }))
          }
        }
      })
      editor.value.view.dispatch(tr)
    }

    if (focusedCommentId.value === id) {
      focusedCommentId.value = null
    }
  }

  return {
    editor,
    activeSidebarTab,
    comments,
    focusedCommentId,
    setEditor,
    setActiveSidebarTab,
    setFocusedComment,
    addComment,
    addReply,
    resolveComment,
    reopenComment,
    removeComment,
  }
})
