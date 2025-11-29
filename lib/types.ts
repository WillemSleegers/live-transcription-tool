/**
 * Type definitions for transcription segments and speakers
 */

export interface TranscriptSegment {
  id: string
  text: string
  speaker: number | null // null = unassigned
  timestamp: number // absolute timestamp (Date.now())
  isEdited: boolean // whether user has edited this segment
  createdAt: number // timestamp when segment was created
}

export interface Speaker {
  id: number
  name: string // "Speaker 1" or custom name
  color: string // for visual coding
}

export type ViewMode = 'editor' | 'segments'
