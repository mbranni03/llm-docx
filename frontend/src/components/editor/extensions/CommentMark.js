import { Mark, mergeAttributes } from '@tiptap/core'

export const CommentMark = Mark.create({
  name: 'comment',

  inclusive: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
      },
      resolved: {
        default: false,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const classes = ['comment-highlight']
    if (HTMLAttributes.resolved) {
      classes.push('comment-highlight-resolved')
    }

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-comment-id': HTMLAttributes.commentId,
        class: classes.join(' '),
      }),
      0,
    ]
  },
})
