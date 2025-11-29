"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { useImperativeHandle, forwardRef } from "react"
import { TimestampNode, UneditedMark } from "@/lib/tiptap-extensions"
import type { Editor } from "@tiptap/react"

interface TranscriptEditorProps {
  initialContent?: string
  placeholder?: string
  currentRecordingTime?: number
}

export interface TranscriptEditorHandle {
  appendText: (text: string, timestampMs?: number) => void
  getContent: () => string
  insertTimestampAtCursor: () => void
  getEditor: () => Editor | null
}

export const TranscriptEditor = forwardRef<
  TranscriptEditorHandle,
  TranscriptEditorProps
>(({ initialContent = "", placeholder = "Transcripties verschijnen hier...", currentRecordingTime = 0 }, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      UneditedMark,
      TimestampNode,
    ],
    content: initialContent,
    immediatelyRender: false, // Fix SSR hydration mismatch
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[400px]",
      },
    },
  })

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    appendText: (text: string, timestampMs?: number) => {
      if (!editor) return

      // Create single mark with both attributes
      const markAttrs: { edited: boolean; time?: number } = { edited: false }
      if (timestampMs !== undefined) {
        markAttrs.time = timestampMs
      }
      const uneditedMark = editor.schema.marks.unedited.create(markAttrs)

      // Use direct transaction for better performance
      const { state } = editor
      const tr = state.tr

      // Mark as programmatic to prevent unedited mark removal
      tr.setMeta('preventUneditedRemoval', true)

      // Get the end position (before the closing paragraph)
      const endPos = state.doc.content.size - 1

      // Insert text with mark (add space only if not first content)
      const hasContent = state.doc.textContent.trim().length > 0
      const textToInsert = hasContent ? ` ${text}` : text
      tr.insertText(textToInsert, endPos)

      // Apply mark to the inserted text
      const from = endPos
      const to = endPos + textToInsert.length
      tr.addMark(from, to, uneditedMark)

      // Dispatch transaction directly (faster than .chain())
      editor.view.dispatch(tr)
    },
    getContent: () => {
      return editor?.getText() ?? ""
    },
    insertTimestampAtCursor: () => {
      if (!editor) return

      // Find the timestamp from the unedited mark at current cursor position
      const { selection } = editor.state
      const { from } = selection

      // Get the node at cursor position
      let timestampMs = 0
      editor.state.doc.nodesBetween(from, from, (node) => {
        // Check if this node has the unedited mark with time attribute
        const uneditedMark = node.marks.find(mark => mark.type.name === 'unedited')
        if (uneditedMark && uneditedMark.attrs.time) {
          timestampMs = uneditedMark.attrs.time
        }
      })

      // Insert the timestamp node
      editor.chain().focus().insertTimestamp(timestampMs).run()
    },
    getEditor: () => editor,
  }))

  if (!editor) {
    return null
  }

  return <EditorContent editor={editor} />
})

TranscriptEditor.displayName = "TranscriptEditor"
