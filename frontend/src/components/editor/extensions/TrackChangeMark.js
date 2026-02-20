import { Mark, mergeAttributes } from '@tiptap/core'

export const TrackChangeMark = Mark.create({
  name: 'trackChange',

  inclusive: false,

  addAttributes() {
    return {
      trackChangeId: {
        default: null,
      },
      originalText: {
        default: null,
      },
      reason: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-track-change-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const classes = ['track-change-highlight']

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-track-change-id': HTMLAttributes.trackChangeId,
        title: HTMLAttributes.reason ? `Reason: ${HTMLAttributes.reason}` : undefined,
        class: classes.join(' '),
      }),
      0,
    ]
  },
})
