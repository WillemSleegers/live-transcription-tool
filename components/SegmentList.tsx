"use client"

import { TranscriptSegment } from "./TranscriptSegment"
import type { TranscriptSegment as TranscriptSegmentType, Speaker } from "@/lib/types"

interface SegmentListProps {
  segments: TranscriptSegmentType[]
  speakers: Speaker[]
  onUpdateSegment: (id: string, text: string) => void
  onDeleteSegment: (id: string) => void
  onMergeSegment: (id: string) => void
  onSplitSegment: (id: string, cursorPosition: number) => void
  onSpeakerChange: (id: string, speaker: number | null) => void
}

export function SegmentList({
  segments,
  speakers,
  onUpdateSegment,
  onDeleteSegment,
  onMergeSegment,
  onSplitSegment,
  onSpeakerChange,
}: SegmentListProps) {
  if (segments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nog geen transcripties...</p>
        <p className="text-sm mt-2">Start met opnemen om transcripties te zien verschijnen</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {segments.map((segment, index) => (
        <TranscriptSegment
          key={segment.id}
          segment={segment}
          speakers={speakers}
          onUpdate={onUpdateSegment}
          onDelete={onDeleteSegment}
          onMerge={onMergeSegment}
          onSplit={onSplitSegment}
          onSpeakerChange={onSpeakerChange}
          showMerge={index < segments.length - 1}
        />
      ))}
    </div>
  )
}
