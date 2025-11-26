"use client"

import { useState, useCallback } from "react"
import { Mic, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useWhisperTranscription } from "@/hooks/useWhisperTranscription"
import { useAudioCapture } from "@/hooks/useAudioCapture"
import { AudioWaveform } from "@/components/AudioWaveform"
import { WHISPER_MODEL_SIZE, TRANSCRIPTION_LANGUAGE } from "@/lib/constants"

export default function Home() {
  const [transcriptions, setTranscriptions] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

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
          setTranscriptions((prev) => [...prev, text.trim()])
        }
      } catch (err) {
        console.error("Transcription error:", err)
      } finally {
        setIsProcessing(false)
      }
    },
    [isModelLoaded, transcribe]
  )

  const handleStartRecording = async () => {
    try {
      await startRecording(handleAudioChunk)
    } catch (err) {
      console.error("Failed to start recording:", err)
    }
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

            {/* Waveform */}
            <div className="shrink-0 w-full">
              <AudioWaveform mediaStream={mediaStream} isRecording={isRecording} />
            </div>
          </aside>

          {/* Right Column - Transcriptions */}
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-semibold mb-4">Transcriptie</h2>
              <div className="space-y-2">
                {transcriptions.map((text, index) => (
                  <p key={index} className="leading-relaxed">
                    {text}
                  </p>
                ))}

                {/* Typing indicator */}
                {isProcessing && (
                  <div className="flex items-center gap-1 text-muted-foreground">
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
                )}

                {transcriptions.length === 0 && !isProcessing && (
                  <p className="text-muted-foreground">
                    Transcripties verschijnen hier...
                  </p>
                )}
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  )
}
