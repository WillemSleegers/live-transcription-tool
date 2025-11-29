import { Mark, mergeAttributes } from '@tiptap/core'
import { Node } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * Unedited mark - marks text that hasn't been edited yet
 * Also stores timestamp metadata
 * Single mark with both attributes = single span element
 */
export const UneditedMark = Mark.create({
  name: 'unedited',

  addAttributes() {
    return {
      edited: {
        default: false,
        parseHTML: element => element.getAttribute('data-edited') === 'true',
        renderHTML: attributes => {
          return {
            'data-edited': attributes.edited ? 'true' : 'false',
          }
        },
      },
      time: {
        default: null,
        parseHTML: element => {
          const time = element.getAttribute('data-time')
          return time ? parseInt(time, 10) : null
        },
        renderHTML: attributes => {
          if (!attributes.time) return {}
          return {
            'data-time': attributes.time,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-edited]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('uneditedUpdater'),
        appendTransaction: (transactions, oldState, newState) => {
          // Check if this was from programmatic insertion (our appendText)
          const isProgrammatic = transactions.some(tr => tr.getMeta('preventUneditedRemoval'))
          if (isProgrammatic) return null

          const uneditedMarkType = newState.schema.marks.unedited
          const tr = newState.tr
          let modified = false

          // Check if selection changed (cursor moved)
          const selectionChanged = !oldState.selection.eq(newState.selection)
          if (selectionChanged) {
            const { from, to } = newState.selection
            newState.doc.nodesBetween(from, to, (node, pos) => {
              if (node.isText) {
                const uneditedMark = node.marks.find(m => m.type === uneditedMarkType)
                if (uneditedMark && uneditedMark.attrs.edited === false) {
                  // Update the mark to set edited=true, PRESERVING the time attribute
                  tr.removeMark(pos, pos + node.nodeSize, uneditedMarkType)
                  tr.addMark(pos, pos + node.nodeSize, uneditedMarkType.create({
                    edited: true,
                    time: uneditedMark.attrs.time // Preserve timestamp
                  }))
                  modified = true
                }
              }
            })
          }

          // Also handle document changes (typing, deletions, etc.)
          const hasDocChanges = transactions.some(tr => tr.docChanged)
          if (hasDocChanges) {
            let changedFrom = Infinity
            let changedTo = -Infinity

            transactions.forEach(transaction => {
              if (!transaction.docChanged) return

              transaction.steps.forEach((step) => {
                // @ts-ignore - accessing private _map property for performance
                const map = step.getMap?.() || step._map
                if (map) {
                  map.forEach((oldStart: number, oldEnd: number, newStart: number, newEnd: number) => {
                    changedFrom = Math.min(changedFrom, newStart)
                    changedTo = Math.max(changedTo, newEnd)
                  })
                }
              })
            })

            if (changedFrom !== Infinity) {
              newState.doc.nodesBetween(changedFrom, changedTo, (node, pos) => {
                if (node.isText) {
                  const uneditedMark = node.marks.find(m => m.type === uneditedMarkType)
                  if (uneditedMark && uneditedMark.attrs.edited === false) {
                    // Update the mark to set edited=true, PRESERVING the time attribute
                    tr.removeMark(pos, pos + node.nodeSize, uneditedMarkType)
                    tr.addMark(pos, pos + node.nodeSize, uneditedMarkType.create({
                      edited: true,
                      time: uneditedMark.attrs.time // Preserve timestamp
                    }))
                    modified = true
                  }
                }
              })
            }
          }

          return modified ? tr : null
        },
      }),
    ]
  },
})


/**
 * Timestamp node - visible timestamp badge like [00:05:23]
 * User can insert these on-demand with Cmd+T
 */
export const TimestampNode = Node.create({
  name: 'timestampNode',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      time: {
        default: 0,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-timestamp-node]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const time = HTMLAttributes.time || 0
    const formatted = formatTimestamp(time)

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-timestamp-node': '',
        class: 'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-muted text-muted-foreground mx-1',
      }),
      formatted,
    ]
  },

  addCommands() {
    return {
      insertTimestamp: (time?: number) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { time: time || 0 },
        })
      },
    }
  },
})

/**
 * Format milliseconds to HH:MM:SS
 */
function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map(num => num.toString().padStart(2, '0'))
    .join(':')
}
