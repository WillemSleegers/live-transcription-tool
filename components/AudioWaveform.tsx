"use client"

import { useEffect, useRef } from "react"
import WaveSurfer from "wavesurfer.js"
import RecordPlugin from "wavesurfer.js/dist/plugins/record.js"

interface AudioWaveformProps {
  mediaStream: MediaStream | null
  isRecording: boolean
}

export function AudioWaveform({
  mediaStream,
  isRecording,
}: AudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const recordPluginRef = useRef<RecordPlugin | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "hsl(var(--primary) / 0.3)",
      progressColor: "hsl(var(--primary))",
      barWidth: 10,
      barGap: 5,
      barRadius: 10,
      normalize: false,
      barHeight: 1,
      height: 64,
    })

    wavesurferRef.current = wavesurfer

    // Load empty audio to show baseline - simple approach
    const silentAudio = new Float32Array(16000) // 1 second at 16kHz, all zeros
    wavesurfer.load('', [silentAudio], 16000)

    // Create and register the record plugin
    const record = wavesurfer.registerPlugin(
      RecordPlugin.create({
        scrollingWaveform: true,
        renderRecordedAudio: false,
      })
    )
    recordPluginRef.current = record

    // Cleanup on unmount
    return () => {
      if (recordPluginRef.current) {
        recordPluginRef.current.destroy()
      }
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy()
      }
    }
  }, [])

  useEffect(() => {
    const record = recordPluginRef.current
    if (!record) return

    if (isRecording) {
      if (mediaStream) {
        // Media stream is ready - start recording
        if (record.isPaused()) {
          record.resumeRecording()
        } else if (!record.isRecording()) {
          record.renderMicStream(mediaStream)
          record.startRecording()
        }
      }
      // If isRecording but no mediaStream yet, just wait for it
    } else if (!isRecording && record.isRecording()) {
      record.pauseRecording()
    }
  }, [mediaStream, isRecording])

  return (
    <div className="relative w-full overflow-hidden">
      <div ref={containerRef} className="w-full" />
    </div>
  )
}
