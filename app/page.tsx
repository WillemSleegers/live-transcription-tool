"use client"

import { useState, useCallback, useRef } from "react"
import { Mic, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useWhisperTranscription } from "@/hooks/useWhisperTranscription"
import { useAudioCapture } from "@/hooks/useAudioCapture"
import { AudioWaveform } from "@/components/AudioWaveform"
import { TranscriptEditor, TranscriptEditorHandle } from "@/components/TranscriptEditor"
import { WHISPER_MODEL_SIZE, TRANSCRIPTION_LANGUAGE } from "@/lib/constants"

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false)
  const editorRef = useRef<TranscriptEditorHandle>(null)

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
            // Append to editor instead of state array
            editorRef.current?.appendText(filtered)
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
        /* Two-Column Layout */
        <div className="flex w-full">
          {/* Left Column - Controls */}
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

          {/* Right Column - Transcriptions */}
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

              <TranscriptEditor ref={editorRef} />
            </div>
          </main>
        </div>
      )}
    </div>
  )
}
