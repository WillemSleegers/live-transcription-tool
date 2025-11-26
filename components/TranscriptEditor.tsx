"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { useEffect, useImperativeHandle, forwardRef } from "react"
import { Bold, Italic, List, ListOrdered } from "lucide-react"
import { Button } from "./ui/button"

interface TranscriptEditorProps {
  initialContent?: string
  placeholder?: string
}

export interface TranscriptEditorHandle {
  appendText: (text: string) => void
  getContent: () => string
}

export const TranscriptEditor = forwardRef<
  TranscriptEditorHandle,
  TranscriptEditorProps
>(({ initialContent = "", placeholder = "Transcripties verschijnen hier..." }, ref) => {
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
    ],
    content: initialContent,
    immediatelyRender: false, // Fix SSR hydration mismatch
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[400px] px-4 py-3",
      },
    },
  })

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    appendText: (text: string) => {
      if (!editor) return

      // Get current cursor position
      const { selection } = editor.state
      const cursorPos = selection.anchor

      // Get current document length
      const docSize = editor.state.doc.content.size

      // Insert text at the end
      editor
        .chain()
        .focus(false) // Don't focus (preserve user's focus)
        .insertContentAt(docSize - 1, ` ${text}`)
        .run()

      // Restore cursor position if it wasn't at the end
      if (cursorPos < docSize) {
        editor.commands.setTextSelection(cursorPos)
      }
    },
    getContent: () => {
      return editor?.getText() ?? ""
    },
  }))

  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="border-b bg-muted/50 p-2 flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-muted" : ""}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-muted" : ""}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px bg-border mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-muted" : ""}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-muted" : ""}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div className="bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
})

TranscriptEditor.displayName = "TranscriptEditor"
