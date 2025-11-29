"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Mic, Square, Loader2, Bold, Italic, List, ListOrdered, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useWhisperTranscription } from "@/hooks/useWhisperTranscription"
import { useAudioCapture } from "@/hooks/useAudioCapture"
import { AudioWaveform } from "@/components/AudioWaveform"
import { TranscriptEditor, TranscriptEditorHandle } from "@/components/TranscriptEditor"
import { WHISPER_MODEL_SIZE, TRANSCRIPTION_LANGUAGE } from "@/lib/constants"

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
  const [isProcessing, setIsProcessing] = useState(false)
  const [isChromeDetected, setIsChromeDetected] = useState(true)
  const [editorActiveStates, setEditorActiveStates] = useState({
    bold: false,
    italic: false,
    bulletList: false,
    orderedList: false,
  })
  const editorRef = useRef<TranscriptEditorHandle>(null)
  const recordingStartTimeRef = useRef<number>(0)

  // Detect browser on mount
  useEffect(() => {
    setIsChromeDetected(isChrome())
  }, [])

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
    editor.on("transaction", updateActiveStates)

    return () => {
      editor.off("transaction", updateActiveStates)
    }
  }, [editorRef.current?.getEditor()])

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

  const handleAudioChunk = useCallback(
    async (audioData: Float32Array) => {
      if (!isModelLoaded) return

      try {
        setIsProcessing(true)
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
            // Calculate elapsed time since recording started
            const elapsedMs = Date.now() - recordingStartTimeRef.current

            // Append to editor with timestamp metadata
            editorRef.current?.appendText(filtered, elapsedMs)
          }
        }
      } catch (err) {
        console.error("Transcription error:", err)
      } finally {
        setIsProcessing(false)
      }
    },
    [isModelLoaded, transcribe]
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

      {!isModelLoaded ? (
        /* Model Loading Screen - Centered */
        <main className="container mx-auto flex items-center justify-center min-h-screen px-4">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">LTT</h1>
              <p className="text-lg text-muted-foreground">
                Live Transcription Tool
              </p>
            </div>
            {!isChromeDetected && (
              <Alert variant="destructive" className="max-w-md mx-auto">
                <AlertDescription>
                  Deze applicatie werkt alleen in Chrome vanwege de gebruikte AI-modellen en WebGPU-ondersteuning.
                </AlertDescription>
              </Alert>
            )}
            <Button
              onClick={loadModel}
              size="lg"
              disabled={isModelLoading}
              className="min-w-[200px]"
            >
              {isModelLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Laden... {loadingProgress}%
                </>
              ) : (
                <>Start</>
              )}
            </Button>
          </div>
        </main>
      ) : (
        /* Three-Column Layout */
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
          </aside>

          {/* Middle Column - Live Editable Transcription */}
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Transcriptie</h2>
                {isProcessing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex gap-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                    <span>Transcriberen...</span>
                  </div>
                )}
              </div>

              <TranscriptEditor
                ref={editorRef}
              />
            </div>
          </main>

          {/* Right Column - Vertical Toolbar */}
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
        </div>
      )}
    </div>
  )
}
