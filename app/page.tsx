"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Mic, Square, Loader2, Bold, Italic, List, ListOrdered, Clock, FileText, ListTree, Download, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { useWhisperTranscription } from "@/hooks/useWhisperTranscription"
import { useAudioCapture } from "@/hooks/useAudioCapture"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { AudioWaveform } from "@/components/AudioWaveform"
import { TranscriptEditor, TranscriptEditorHandle } from "@/components/TranscriptEditor"
import { SegmentList } from "@/components/SegmentList"
import { SpeakerManagement } from "@/components/SpeakerManagement"
import { WHISPER_MODEL_SIZE, TRANSCRIPTION_LANGUAGE } from "@/lib/constants"
import { exportToTxt, exportToDocx, exportToJson, downloadFile } from "@/lib/export"
import { summarizeText, type SummarizationMethod } from "@/lib/summarization"
import type { ViewMode, TranscriptSegment, Speaker } from "@/lib/types"

// Browser detection
function isChrome() {
  if (typeof window === 'undefined') return true // SSR
  const isChromium = (window as never)['chrome']
  const winNav = window.navigator
  const vendorName = winNav.vendor
  const isOpera = winNav.userAgent.indexOf("OPR") > -1
  const isEdge = winNav.userAgent.indexOf("Edg") > -1

  return (
    isChromium !== null &&
    typeof isChromium !== "undefined" &&
    vendorName === "Google Inc." &&
    !isOpera &&
    !isEdge
  )
}

export default function Home() {
  const [isChromeDetected, setIsChromeDetected] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('editor')

  // Use localStorage for persistence with 500ms debounce
  const [segments, setSegments] = useLocalStorage<TranscriptSegment[]>('ltt-segments', [])
  const [speakers, setSpeakers] = useLocalStorage<Speaker[]>('ltt-speakers', [])
  const [editorActiveStates, setEditorActiveStates] = useState({
    bold: false,
    italic: false,
    bulletList: false,
    orderedList: false,
  })
  const editorRef = useRef<TranscriptEditorHandle>(null)
  const recordingStartTimeRef = useRef<number>(0)

  // Summary state
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [showPromptDialog, setShowPromptDialog] = useState(false)
  const [summary, setSummary] = useState<string>('')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summarizationProgress, setSummarizationProgress] = useState(0)
  const [summarizationStatus, setSummarizationStatus] = useState('')
  const [summarizationMethod, setSummarizationMethod] = useState<SummarizationMethod | null>(null)
  const [customPrompt, setCustomPrompt] = useState<string>('')

  const {
    isModelLoading,
    isModelLoaded,
    loadingProgress,
    error: whisperError,
    loadModel,
    transcribe,
  } = useWhisperTranscription(WHISPER_MODEL_SIZE, TRANSCRIPTION_LANGUAGE)

  const {
    isRecording,
    error: audioError,
    mediaStream,
    hasSpeech,
    startRecording,
    stopRecording,
  } = useAudioCapture()

  // Detect browser and auto-load model on mount
  useEffect(() => {
    setIsChromeDetected(isChrome())
    // Auto-load the Whisper model on page load
    loadModel()
  }, [loadModel])

  // Update active states when editor changes
  useEffect(() => {
    const editor = editorRef.current?.getEditor()
    if (!editor) return

    const updateActiveStates = () => {
      setEditorActiveStates({
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
      })
    }

    // Update on transaction
    const handleTransaction = () => {
      updateActiveStates()
    }

    editor.on("transaction", handleTransaction)

    return () => {
      editor.off("transaction", handleTransaction)
    }
  }, [editorRef.current?.getEditor()])

  // Segment handlers
  const handleUpdateSegment = useCallback((id: string, text: string) => {
    setSegments((prev) =>
      prev.map((seg) =>
        seg.id === id ? { ...seg, text, isEdited: true } : seg
      )
    )
  }, [])

  const handleDeleteSegment = useCallback((id: string) => {
    setSegments((prev) => prev.filter((seg) => seg.id !== id))
  }, [])

  const handleMergeSegment = useCallback((id: string) => {
    setSegments((prev) => {
      const index = prev.findIndex((seg) => seg.id === id)
      if (index === -1 || index === prev.length - 1) return prev

      const current = prev[index]
      const next = prev[index + 1]
      const merged: TranscriptSegment = {
        ...current,
        text: `${current.text} ${next.text}`,
        isEdited: true,
      }

      return [...prev.slice(0, index), merged, ...prev.slice(index + 2)]
    })
  }, [])

  const handleSplitSegment = useCallback((id: string, cursorPosition: number) => {
    setSegments((prev) => {
      const index = prev.findIndex((seg) => seg.id === id)
      if (index === -1) return prev

      const segment = prev[index]
      const textBefore = segment.text.slice(0, cursorPosition).trim()
      const textAfter = segment.text.slice(cursorPosition).trim()

      // Don't split if either part would be empty
      if (!textBefore || !textAfter) return prev

      const now = Date.now()
      const firstSegment: TranscriptSegment = {
        ...segment,
        text: textBefore,
        isEdited: true,
      }
      const secondSegment: TranscriptSegment = {
        id: `segment-${now}-${Math.random()}`,
        text: textAfter,
        speaker: segment.speaker, // Inherit speaker
        timestamp: segment.timestamp, // Keep same timestamp as original
        isEdited: false,
        createdAt: now,
      }

      return [
        ...prev.slice(0, index),
        firstSegment,
        secondSegment,
        ...prev.slice(index + 1)
      ]
    })
  }, [])

  const handleSpeakerChange = useCallback((id: string, speaker: number | null) => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === id ? { ...seg, speaker } : seg))
    )
  }, [])

  // Speaker management handlers
  const SPEAKER_COLORS = [
    "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
    "#EC4899", "#14B8A6", "#F97316", "#6366F1",
  ]

  const handleAddSpeaker = useCallback((name: string) => {
    const newId = speakers.length > 0 ? Math.max(...speakers.map(s => s.id)) + 1 : 1
    const newSpeaker: Speaker = {
      id: newId,
      name: name || `Speaker ${newId}`,
      color: SPEAKER_COLORS[(newId - 1) % SPEAKER_COLORS.length],
    }
    setSpeakers((prev) => [...prev, newSpeaker])
  }, [speakers])

  const handleRemoveSpeaker = useCallback((id: number) => {
    setSpeakers((prev) => prev.filter((s) => s.id !== id))
    // Unassign this speaker from all segments
    setSegments((prev) =>
      prev.map((seg) => (seg.speaker === id ? { ...seg, speaker: null } : seg))
    )
  }, [])

  const handleRenameSpeaker = useCallback((id: number, name: string) => {
    setSpeakers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    )
  }, [])

  // Export handlers
  const handleExportTxt = useCallback(() => {
    const content = viewMode === 'editor'
      ? editorRef.current?.getEditor()?.getText() || 'Geen tekst beschikbaar'
      : exportToTxt(segments, speakers)

    const timestamp = new Date().toISOString().slice(0, 10)
    downloadFile(content, `transcriptie-${timestamp}.txt`, 'text/plain')
  }, [viewMode, segments, speakers])

  const handleExportDocx = useCallback(async () => {
    if (viewMode === 'editor') {
      // For editor mode, export plain text as DOCX
      const text = editorRef.current?.getEditor()?.getText() || 'Geen tekst beschikbaar'
      const blob = await exportToDocx([
        {
          id: 'editor-content',
          text,
          speaker: null,
          timestamp: Date.now(),
          isEdited: false,
          createdAt: Date.now(),
        }
      ], speakers)
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadFile(blob, `transcriptie-${timestamp}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    } else {
      // For segments mode, export with full speaker/timestamp info
      const blob = await exportToDocx(segments, speakers)
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadFile(blob, `transcriptie-${timestamp}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    }
  }, [viewMode, segments, speakers])

  const handleExportJson = useCallback(() => {
    const content = exportToJson(segments, speakers)
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadFile(content, `transcriptie-${timestamp}.json`, 'application/json')
  }, [segments, speakers])

  // Summary handlers
  const handleOpenPromptDialog = useCallback(() => {
    setShowPromptDialog(true)
  }, [])

  const handleSummarize = useCallback(async (useCustomPrompt = false) => {
    // Get text to summarize based on view mode
    const textToSummarize = viewMode === 'editor'
      ? editorRef.current?.getEditor()?.getText() || ''
      : exportToTxt(segments, speakers)

    if (!textToSummarize.trim()) {
      alert('Geen tekst om samen te vatten')
      return
    }

    setShowPromptDialog(false)
    setIsSummarizing(true)
    setSummarizationProgress(0)
    setSummarizationStatus('Voorbereiden...')
    setShowSummaryDialog(true)

    try {
      const result = await summarizeText(
        textToSummarize,
        'key-points',
        (progress, status) => {
          setSummarizationProgress(progress)
          if (status) setSummarizationStatus(status)
        },
        useCustomPrompt && customPrompt ? customPrompt : undefined
      )

      setSummary(result.summary)
      setSummarizationMethod(result.method)
    } catch (error) {
      console.error('Summarization error:', error)
      setSummary(`Fout bij samenvatten: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
      setSummarizationMethod('unsupported')
    } finally {
      setIsSummarizing(false)
      setSummarizationProgress(100)
      setSummarizationStatus('Klaar!')
    }
  }, [viewMode, segments, speakers, customPrompt])

  const handleAudioChunk = useCallback(
    async (audioData: Float32Array) => {
      if (!isModelLoaded) return

      try {
        const text = await transcribe(audioData)

        if (text && text.trim()) {
          // Filter out Whisper hallucinations
          const filtered = text
            .trim()
            .replace(/\[muziek\]/gi, "")
            .replace(/\[music\]/gi, "")
            .replace(/\[applaus\]/gi, "")
            .replace(/\[laughter\]/gi, "")
            .replace(/\[gelach\]/gi, "")
            .trim()

          if (filtered) {
            const now = Date.now()
            // Calculate elapsed time for editor mode only
            const elapsedMs = now - recordingStartTimeRef.current

            if (viewMode === 'editor') {
              // Append text directly to editor
              editorRef.current?.appendText(filtered, elapsedMs)
            } else {
              // Add as new segment with absolute timestamp
              const newSegment: TranscriptSegment = {
                id: `segment-${now}-${Math.random()}`,
                text: filtered,
                speaker: null,
                timestamp: now, // Absolute timestamp
                isEdited: false,
                createdAt: now,
              }
              setSegments((prev) => [...prev, newSegment])
            }
          }
        }
      } catch (err) {
        console.error("Transcription error:", err)
      }
    },
    [isModelLoaded, transcribe, viewMode]
  )

  const handleStartRecording = () => {
    // Record the start time
    recordingStartTimeRef.current = Date.now()

    // Start recording without awaiting - let it happen in background
    // This makes the UI feel instant
    startRecording(handleAudioChunk).catch((err) => {
      console.error("Failed to start recording:", err)
    })
  }

  const handleStopRecording = () => {
    stopRecording()
  }

  // Add demo text for testing
  const handleAddDemoText = useCallback(() => {
    const demoTexts = [
      "Welkom bij de vergadering van vandaag. We gaan het hebben over de voortgang van het project.",
      "Ik denk dat we goed op schema liggen met de planning. Het team heeft hard gewerkt.",
      "Er zijn wel enkele uitdagingen waar we tegenaan lopen met de nieuwe functionaliteit.",
      "Misschien moeten we een extra sprint inplannen om alles af te krijgen voor de deadline.",
      "Wat denken jullie? Zijn er nog andere punten die we moeten bespreken?",
    ]

    if (viewMode === 'editor') {
      // Add to editor
      const fullText = demoTexts.join(' ')
      editorRef.current?.appendText(fullText, 0)
    } else {
      // Add as segments
      const now = Date.now()
      const newSegments: TranscriptSegment[] = demoTexts.map((text, index) => ({
        id: `demo-${now}-${index}`,
        text,
        speaker: null,
        timestamp: now + index * 1000,
        isEdited: false,
        createdAt: now + index * 1000,
      }))
      setSegments((prev) => [...prev, ...newSegments])
    }
  }, [viewMode, setSegments])

  const error = whisperError || audioError

  return (
    <div className="flex min-h-screen bg-background">
      {/* Error Display */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Model Loading Overlay */}
      {!isModelLoaded && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div className="space-y-1">
              <p className="text-lg font-medium">Model wordt geladen...</p>
              <p className="text-sm text-muted-foreground">{loadingProgress}%</p>
            </div>
            {!isChromeDetected && (
              <Alert variant="destructive" className="max-w-md mx-auto">
                <AlertDescription>
                  Deze applicatie werkt alleen in Chrome vanwege de gebruikte AI-modellen en WebGPU-ondersteuning.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Three-Column Layout */}
      <div className="flex w-full">
          {/* Left Column - Controls & Waveform */}
          <aside className="w-80 border-r bg-card p-6 flex flex-col gap-6">
            {/* Compact Header */}
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">LTT</h1>
              <p className="text-sm text-muted-foreground">
                Live Transcription Tool
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant={viewMode === 'editor' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setViewMode('editor')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Editor
              </Button>
              <Button
                variant={viewMode === 'segments' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setViewMode('segments')}
              >
                <ListTree className="h-4 w-4 mr-2" />
                Segmenten
              </Button>
            </div>

            {/* Recording Button */}
            <div className="flex flex-col gap-2">
              {!isRecording ? (
                <Button
                  onClick={handleStartRecording}
                  size="lg"
                  className="w-full"
                >
                  <Mic className="mr-2 h-5 w-5" />
                  Start Opname
                </Button>
              ) : (
                <Button
                  onClick={handleStopRecording}
                  size="lg"
                  variant="destructive"
                  className="w-full"
                >
                  <Square className="mr-2 h-5 w-5" />
                  Stop Opname
                </Button>
              )}

              {/* Demo Text Button */}
              <Button
                onClick={handleAddDemoText}
                size="sm"
                variant="outline"
                className="w-full"
              >
                Demo tekst toevoegen
              </Button>
            </div>

            {/* Waveform - Always visible */}
            <div className="shrink-0 w-full">
              <AudioWaveform
                mediaStream={mediaStream}
                isRecording={isRecording}
              />

              {/* Speech Detection Indicator */}
              {isRecording && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors ${
                      hasSpeech ? "bg-green-500" : "bg-muted-foreground/30"
                    }`}
                  />
                  <span className="text-muted-foreground">
                    {hasSpeech ? "Spraak gedetecteerd" : "Aan het luisteren..."}
                  </span>
                </div>
              )}
            </div>

            {/* Summary and Export */}
            <div className="mt-auto pt-4 border-t space-y-2">
              {/* Summarize Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    disabled={isSummarizing || (viewMode === 'segments' && segments.length === 0)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isSummarizing ? 'Samenvatten...' : 'Samenvatten'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => handleSummarize(false)}>
                    Standaard samenvatting
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenPromptDialog}>
                    Custom prompt
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Exporteer
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={handleExportTxt}>
                    Exporteer als TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportDocx}>
                    Exporteer als DOCX
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportJson}>
                    Exporteer als JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </aside>

          {/* Middle Column - Live Editable Transcription */}
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-4">
              <h2 className="text-xl font-semibold">Transcriptie</h2>

              {viewMode === 'editor' ? (
                <TranscriptEditor ref={editorRef} />
              ) : (
                <SegmentList
                  segments={segments}
                  speakers={speakers}
                  onUpdateSegment={handleUpdateSegment}
                  onDeleteSegment={handleDeleteSegment}
                  onMergeSegment={handleMergeSegment}
                  onSplitSegment={handleSplitSegment}
                  onSpeakerChange={handleSpeakerChange}
                />
              )}
            </div>
          </main>

          {/* Right Column - Toolbar or Speaker Management */}
          {viewMode === 'editor' ? (
            <aside className="w-20 border-l bg-card p-4 flex flex-col gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const editor = editorRef.current?.getEditor()
                if (editor) {
                  editor.chain().focus().toggleBold().run()
                }
              }}
              className={editorActiveStates.bold ? "bg-accent" : ""}
              title="Vet"
            >
              <Bold className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const editor = editorRef.current?.getEditor()
                if (editor) {
                  editor.chain().focus().toggleItalic().run()
                }
              }}
              className={editorActiveStates.italic ? "bg-accent" : ""}
              title="Cursief"
            >
              <Italic className="h-4 w-4" />
            </Button>

            <div className="h-2" />

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const editor = editorRef.current?.getEditor()
                if (editor) {
                  editor.chain().focus().toggleBulletList().run()
                }
              }}
              className={editorActiveStates.bulletList ? "bg-accent" : ""}
              title="Opsommingstekens"
            >
              <List className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const editor = editorRef.current?.getEditor()
                if (editor) {
                  editor.chain().focus().toggleOrderedList().run()
                }
              }}
              className={editorActiveStates.orderedList ? "bg-accent" : ""}
              title="Genummerde lijst"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <div className="h-2" />

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const editor = editorRef.current?.getEditor()
                if (!editor) return

                // Find timestamp metadata at cursor position
                const { selection } = editor.state
                const { from } = selection

                let timestampMs: number | null = null
                editor.state.doc.nodesBetween(from, from, (node) => {
                  const uneditedMark = node.marks.find(mark => mark.type.name === 'unedited')
                  if (uneditedMark && uneditedMark.attrs.time !== null && uneditedMark.attrs.time !== undefined) {
                    timestampMs = uneditedMark.attrs.time
                  }
                })

                // Insert timestamp if we found valid metadata
                if (timestampMs !== null && timestampMs >= 0) {
                  editor.chain().focus().insertTimestamp(timestampMs).run()
                }
              }}
              title="Voeg tijdstempel in"
            >
              <Clock className="h-4 w-4" />
            </Button>
          </aside>
          ) : (
            <aside className="w-64 border-l bg-card p-6">
              <SpeakerManagement
                speakers={speakers}
                onAddSpeaker={handleAddSpeaker}
                onRemoveSpeaker={handleRemoveSpeaker}
                onRenameSpeaker={handleRenameSpeaker}
              />
            </aside>
          )}
        </div>

        {/* Prompt Dialog */}
        <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Custom Prompt</DialogTitle>
              <DialogDescription>
                Geef instructies voor hoe de samenvatting gegenereerd moet worden
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Bijv: Vat deze transcriptie samen in 3 korte paragrafen..."
              rows={6}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPromptDialog(false)}>
                Annuleren
              </Button>
              <Button onClick={() => handleSummarize(true)}>
                Samenvatten
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Summary Dialog */}
        <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Samenvatting</DialogTitle>
              <DialogDescription>
                {summarizationMethod === 'chrome-api' && 'Gegenereerd met Chrome AI'}
                {summarizationMethod === 'webllm' && 'Gegenereerd met WebLLM'}
                {summarizationMethod === 'unsupported' && 'Samenvatting mislukt'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Progress indicator */}
              {isSummarizing && (
                <div className="space-y-2">
                  <Progress value={summarizationProgress} />
                  <p className="text-sm text-muted-foreground text-center">
                    {summarizationStatus}
                  </p>
                </div>
              )}

              {/* Summary content */}
              {!isSummarizing && summary && (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
                    {summary}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!isSummarizing && summary && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(summary)
                    }}
                  >
                    Kopieer
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => setShowSummaryDialog(false)}
                  >
                    Sluiten
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}
