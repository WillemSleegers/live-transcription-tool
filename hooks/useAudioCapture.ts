"use client";

import { useState, useRef, useCallback } from "react";
import {
  SPEECH_THRESHOLD,
  SILENCE_DURATION_MS,
  MIN_CHUNK_DURATION_MS,
  MAX_CHUNK_DURATION_MS,
  SAMPLE_RATE,
} from "@/lib/constants";

export interface UseAudioCaptureReturn {
  isRecording: boolean;
  error: string | null;
  mediaStream: MediaStream | null;
  startRecording: (onAudioChunk: (audioData: Float32Array) => void) => Promise<void>;
  stopRecording: () => void;
}

export function useAudioCapture(
  minChunkDurationMs: number = MIN_CHUNK_DURATION_MS,
  maxChunkDurationMs: number = MAX_CHUNK_DURATION_MS
): UseAudioCaptureReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioBufferRef = useRef<Float32Array>(new Float32Array(0));
  const onAudioChunkRef = useRef<((audioData: Float32Array) => void) | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const pendingChunksRef = useRef<Float32Array[]>([]);

  // VAD state
  const lastSpeechTimeRef = useRef<number>(0);
  const chunkStartTimeRef = useRef<number>(0);
  const silenceDurationMs = SILENCE_DURATION_MS;
  const speechThreshold = SPEECH_THRESHOLD;

  const startRecording = useCallback(
    async (onAudioChunk: (audioData: Float32Array) => void) => {
      setError(null);
      onAudioChunkRef.current = onAudioChunk;

      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: SAMPLE_RATE,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        streamRef.current = stream;

        // Create AudioContext with configured sample rate
        const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
        audioContextRef.current = audioContext;

        // Create source from microphone stream
        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        // Create ScriptProcessorNode to capture raw PCM audio
        // Buffer size of 4096 gives us chunks every ~256ms at 16kHz
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        // Reset audio buffer and VAD state
        audioBufferRef.current = new Float32Array(0);
        chunkStartTimeRef.current = Date.now();
        lastSpeechTimeRef.current = Date.now();

        // Helper to calculate RMS (Root Mean Square) for audio level
        const calculateRMS = (data: Float32Array): number => {
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
          }
          return Math.sqrt(sum / data.length);
        };

        // Helper to process queue
        const processQueue = async () => {
          if (isProcessingRef.current || pendingChunksRef.current.length === 0 || !onAudioChunkRef.current) {
            return;
          }

          isProcessingRef.current = true;
          const chunkToSend = pendingChunksRef.current.shift()!;

          try {
            await onAudioChunkRef.current(chunkToSend);
          } catch (err) {
            console.error('Error processing audio chunk:', err);
          } finally {
            isProcessingRef.current = false;
            // Process next chunk in queue if any
            processQueue();
          }
        };

        // Helper to send chunk
        const sendChunk = () => {
          if (audioBufferRef.current.length > 0) {
            // Add to queue
            pendingChunksRef.current.push(audioBufferRef.current);

            // Reset buffer and timer
            audioBufferRef.current = new Float32Array(0);
            chunkStartTimeRef.current = Date.now();

            // Start processing if not already processing
            processQueue();
          }
        };

        // Process audio in real-time
        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const now = Date.now();

          // Calculate audio level and detect speech
          const rms = calculateRMS(inputData);
          const hasSpeech = rms > speechThreshold;

          if (hasSpeech) {
            lastSpeechTimeRef.current = now;
          }

          // Append new audio data to buffer
          const newBuffer = new Float32Array(
            audioBufferRef.current.length + inputData.length
          );
          newBuffer.set(audioBufferRef.current);
          newBuffer.set(inputData, audioBufferRef.current.length);
          audioBufferRef.current = newBuffer;

          // Check if we should send chunk
          const chunkDuration = now - chunkStartTimeRef.current;
          const timeSinceLastSpeech = now - lastSpeechTimeRef.current;

          // Send chunk if:
          // 1. We've had silence for silenceDurationMs AND we've recorded at least minChunkDurationMs
          // 2. OR we've reached maxChunkDurationMs
          const shouldSendDueToSilence = timeSinceLastSpeech >= silenceDurationMs && chunkDuration >= minChunkDurationMs;
          const shouldSendDueToMaxLength = chunkDuration >= maxChunkDurationMs;

          if (shouldSendDueToSilence || shouldSendDueToMaxLength) {
            sendChunk();
          }
        };

        // Connect the audio graph
        source.connect(processor);
        processor.connect(audioContext.destination);

        setIsRecording(true);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to access microphone";
        setError(errorMessage);
        console.error("Error starting recording:", err);
        throw err;
      }
    },
    [minChunkDurationMs, maxChunkDurationMs, silenceDurationMs, speechThreshold]
  );

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    audioBufferRef.current = new Float32Array(0);
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    error,
    mediaStream: streamRef.current,
    startRecording,
    stopRecording,
  };
}
