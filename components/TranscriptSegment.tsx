"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { X, ArrowDownUp, ChevronDown, Split } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TranscriptSegment as TranscriptSegmentType, Speaker } from "@/lib/types"
import { formatTimestamp } from "@/lib/utils"

interface TranscriptSegmentProps {
  segment: TranscriptSegmentType
  speakers: Speaker[]
  onUpdate: (id: string, text: string) => void
  onDelete: (id: string) => void
  onMerge: (id: string) => void
  onSplit: (id: string, cursorPosition: number) => void
  onSpeakerChange: (id: string, speaker: number | null) => void
  showMerge: boolean
}

export function TranscriptSegment({
  segment,
  speakers,
  onUpdate,
  onDelete,
  onMerge,
  onSplit,
  onSpeakerChange,
  showMerge,
}: TranscriptSegmentProps) {
  const textRef = useRef<HTMLDivElement>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Find speaker details
  const speaker = speakers.find((s) => s.id === segment.speaker)

  // Handle content editable changes
  const handleInput = () => {
    if (textRef.current) {
      const newText = textRef.current.textContent || ""
      if (newText !== segment.text) {
        onUpdate(segment.id, newText)
      }
    }
  }

  // Handle split segment
  const handleSplit = () => {
    if (!textRef.current) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    // Get cursor position
    const range = selection.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(textRef.current)
    preCaretRange.setEnd(range.endContainer, range.endOffset)
    const cursorPosition = preCaretRange.toString().length

    onSplit(segment.id, cursorPosition)
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ctrl/Cmd + Enter to split
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSplit()
    }
  }

  // Keep contentEditable in sync with segment.text
  useEffect(() => {
    if (textRef.current && textRef.current.textContent !== segment.text) {
      textRef.current.textContent = segment.text
    }
  }, [segment.text])

  return (
    <>
      <div className="border rounded-lg p-3 space-y-2 bg-card hover:border-accent transition-colors">
        {/* Header with timestamp and controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {formatTimestamp(segment.timestamp)}
            </span>

            {/* Speaker assignment - dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-sm px-2 py-0.5 rounded transition-colors hover:bg-accent cursor-pointer">
                  {speaker ? (
                    <>
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: speaker.color }}
                      />
                      <span style={{ color: speaker.color }} className="font-medium">
                        {speaker.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Speaker ?</span>
                  )}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {speakers.length === 0 ? (
                  <DropdownMenuItem disabled>
                    Geen sprekers beschikbaar
                  </DropdownMenuItem>
                ) : (
                  <>
                    {speakers.map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        onClick={() => onSpeakerChange(segment.id, s.id)}
                        className="flex items-center gap-2"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span style={{ color: s.color }}>{s.name}</span>
                      </DropdownMenuItem>
                    ))}
                    {segment.speaker !== null && (
                      <>
                        <DropdownMenuItem
                          onClick={() => onSpeakerChange(segment.id, null)}
                          className="text-muted-foreground"
                        >
                          Verwijder toewijzing
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleSplit}
              title="Split segment (Ctrl+Enter)"
            >
              <Split className="h-3.5 w-3.5" />
            </Button>
            {showMerge && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onMerge(segment.id)}
                title="Samenvoegen met volgende"
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowDeleteDialog(true)}
              title="Verwijder segment"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Always-editable text content */}
        <div
          ref={textRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleInput}
          onKeyDown={handleKeyDown}
          className="text-sm outline-none focus:bg-accent/10 rounded px-2 py-1 -mx-2 -my-1 min-h-6"
        >
          {segment.text}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Segment verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je dit segment wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(segment.id)
                setShowDeleteDialog(false)
              }}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
