import { Mark, mergeAttributes } from '@tiptap/core'

export const DiffMark = Mark.create({
  name: 'diff',

  inclusive: false,

  addAttributes() {
    return {
      diffId: {
        default: null,
      },
      type: {
        default: null, // 'insert' or 'delete'
      },
      reason: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-diff-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const classes = []

    if (HTMLAttributes.type === 'insert') {
      classes.push('diff-insertion')
    } else if (HTMLAttributes.type === 'delete') {
      classes.push('diff-deletion')
    } // fallback to no class if unknown

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-diff-id': HTMLAttributes.diffId,
        'data-diff-type': HTMLAttributes.type,
        title: HTMLAttributes.reason ? `Reason: ${HTMLAttributes.reason}` : undefined,
        class: classes.join(' '),
      }),
      0,
    ]
  },
})
