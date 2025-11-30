import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import type { TranscriptSegment, Speaker } from '@/lib/types'
import { formatTimestamp } from '@/lib/utils'

/**
 * Get speaker name by ID
 */
function getSpeakerName(speakerId: number | null, speakers: Speaker[]): string {
  if (speakerId === null) return 'Onbekende spreker'
  const speaker = speakers.find(s => s.id === speakerId)
  return speaker?.name || `Speaker ${speakerId}`
}

/**
 * Export segments to plain text format
 */
export function exportToTxt(segments: TranscriptSegment[], speakers: Speaker[]): string {
  if (segments.length === 0) {
    return 'Geen transcriptie beschikbaar.'
  }

  const lines: string[] = []

  // Add header
  lines.push('TRANSCRIPTIE')
  lines.push('=' .repeat(50))
  lines.push(`Gegenereerd op: ${new Date().toLocaleString('nl-NL')}`)
  lines.push(`Aantal segmenten: ${segments.length}`)
  lines.push('')

  // Add segments
  segments.forEach((segment, index) => {
    const timestamp = formatTimestamp(segment.timestamp)
    const speaker = getSpeakerName(segment.speaker, speakers)

    lines.push(`[${timestamp}] ${speaker}`)
    lines.push(segment.text)

    // Add blank line between segments (except after last one)
    if (index < segments.length - 1) {
      lines.push('')
    }
  })

  return lines.join('\n')
}

/**
 * Export segments to DOCX format
 */
export async function exportToDocx(segments: TranscriptSegment[], speakers: Speaker[]): Promise<Blob> {
  const children: Paragraph[] = []

  // Add title
  children.push(
    new Paragraph({
      text: 'TRANSCRIPTIE',
      heading: HeadingLevel.HEADING_1,
    })
  )

  // Add metadata
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Gegenereerd op: ${new Date().toLocaleString('nl-NL')}`,
          size: 20, // 10pt
        }),
      ],
      spacing: { after: 100 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Aantal segmenten: ${segments.length}`,
          size: 20,
        }),
      ],
      spacing: { after: 400 }, // Extra space before content
    })
  )

  // Add segments
  segments.forEach((segment, index) => {
    const timestamp = formatTimestamp(segment.timestamp)
    const speaker = getSpeakerName(segment.speaker, speakers)

    // Speaker and timestamp line
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `[${timestamp}] `,
            size: 20,
            color: '666666',
          }),
          new TextRun({
            text: speaker,
            size: 20,
            bold: true,
          }),
        ],
        spacing: { before: 200 },
      })
    )

    // Transcript text
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: segment.text,
            size: 22, // 11pt
          }),
        ],
        spacing: { after: index < segments.length - 1 ? 200 : 0 },
      })
    )
  })

  // Create document
  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  })

  // Generate blob
  const blob = await Packer.toBlob(doc)
  return blob
}

/**
 * Export segments to JSON format
 */
export function exportToJson(segments: TranscriptSegment[], speakers: Speaker[]): string {
  const data = {
    metadata: {
      exportedAt: new Date().toISOString(),
      segmentCount: segments.length,
      speakerCount: speakers.length,
    },
    speakers,
    segments,
  }

  return JSON.stringify(data, null, 2)
}

/**
 * Trigger browser download of a file
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = typeof content === 'string'
    ? new Blob([content], { type: mimeType })
    : content

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
