"use client";

import { useState, useRef, useCallback } from "react";
import {
  SPEECH_THRESHOLD,
  SILENCE_DURATION_MS,
  MIN_CHUNK_DURATION_MS,
  MAX_CHUNK_DURATION_MS,
  SAMPLE_RATE,
  SPEECH_DETECTION_DEBOUNCE_MS,
} from "@/lib/constants";

// Maximum buffer size in bytes (10MB)
const MAX_BUFFER_SIZE_BYTES = 10 * 1024 * 1024;

export interface UseAudioCaptureReturn {
  isRecording: boolean;
  error: string | null;
  mediaStream: MediaStream | null;
  hasSpeech: boolean;
  startRecording: (onAudioChunk: (audioData: Float32Array) => void) => Promise<void>;
  stopRecording: () => void;
}

export function useAudioCapture(
  minChunkDurationMs: number = MIN_CHUNK_DURATION_MS,
  maxChunkDurationMs: number = MAX_CHUNK_DURATION_MS
): UseAudioCaptureReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [hasSpeech, setHasSpeech] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const onAudioChunkRef = useRef<((audioData: Float32Array) => void) | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const pendingChunksRef = useRef<Float32Array[]>([]);
  const workletLoadedRef = useRef<boolean>(false);
  const speechDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechStateRef = useRef<boolean>(false);

  const startRecording = useCallback(
    async (onAudioChunk: (audioData: Float32Array) => void) => {
      setError(null);
      onAudioChunkRef.current = onAudioChunk;

      // Set recording state immediately for instant UI feedback
      setIsRecording(true);

      try {
        // Request microphone access (getUserMedia is the main delay - browser limitation)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: SAMPLE_RATE,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true, // Help normalize volume
          },
        });

        setMediaStream(stream);

        // Create AudioContext with configured sample rate (or reuse existing)
        let audioContext = audioContextRef.current;
        if (!audioContext || audioContext.state === 'closed') {
          audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
          audioContextRef.current = audioContext;
        }

        // Resume context if suspended
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        // Load and register the AudioWorklet processor (only once)
        if (!workletLoadedRef.current) {
          await audioContext.audioWorklet.addModule('/audio-processor.js');
          workletLoadedRef.current = true;
        }

        // Create AudioWorklet node
        const workletNode = new AudioWorkletNode(audioContext, 'audio-vad-processor');
        workletNodeRef.current = workletNode;

        // Configure the processor
        workletNode.port.postMessage({
          type: 'configure',
          data: {
            speechThreshold: SPEECH_THRESHOLD,
            silenceDurationMs: SILENCE_DURATION_MS,
            minChunkDurationMs: minChunkDurationMs,
            maxChunkDurationMs: maxChunkDurationMs,
            maxBufferSizeBytes: MAX_BUFFER_SIZE_BYTES,
          },
        });

        // Helper to process queue
        const processQueue = async () => {
          if (isProcessingRef.current || pendingChunksRef.current.length === 0 || !onAudioChunkRef.current) {
            return;
          }

          isProcessingRef.current = true;
          const chunkToSend = pendingChunksRef.current.shift()!;
          const startTime = performance.now();

          try {
            console.log(`[useAudioCapture] Processing chunk (${chunkToSend.length} samples)...`);
            await onAudioChunkRef.current(chunkToSend);
            const duration = (performance.now() - startTime).toFixed(0);
            console.log(`[useAudioCapture] Chunk processed in ${duration}ms, queue: ${pendingChunksRef.current.length}`);
          } catch (err) {
            console.error('Error processing audio chunk:', err);
          } finally {
            isProcessingRef.current = false;
            // Process next chunk in queue if any
            processQueue();
          }
        };

        // Listen for messages from the processor
        workletNode.port.onmessage = (event) => {
          const { type, data } = event.data;

          if (type === 'audioChunk') {
            const queueLength = pendingChunksRef.current.length;
            console.log(`[useAudioCapture] Received chunk, queue length: ${queueLength}`);
            // Add to queue
            pendingChunksRef.current.push(data);
            // Start processing if not already processing
            processQueue();
          } else if (type === 'audioLevel') {
            // Debounce speech detection state updates to reduce re-renders
            // Only update if state changed or after 150ms debounce period
            const newSpeechState = event.data.hasSpeech;

            if (newSpeechState !== lastSpeechStateRef.current) {
              lastSpeechStateRef.current = newSpeechState;

              // Clear any pending debounce timer
              if (speechDebounceTimerRef.current) {
                clearTimeout(speechDebounceTimerRef.current);
              }

              // Debounce the state update
              speechDebounceTimerRef.current = setTimeout(() => {
                setHasSpeech(newSpeechState);
                speechDebounceTimerRef.current = null;
              }, SPEECH_DETECTION_DEBOUNCE_MS);
            }
          }
        };

        // Create source from microphone stream
        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        // Connect the audio graph
        source.connect(workletNode);
        // Note: We don't connect to destination to avoid feedback
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to access microphone";
        setError(errorMessage);
        setIsRecording(false); // Revert optimistic update on error
        console.error("Error starting recording:", err);
        throw err;
      }
    },
    [minChunkDurationMs, maxChunkDurationMs]
  );

  const stopRecording = useCallback(() => {
    // Clear any pending speech detection debounce timer
    if (speechDebounceTimerRef.current) {
      clearTimeout(speechDebounceTimerRef.current);
      speechDebounceTimerRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current.port.close();
      workletNodeRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Don't close AudioContext - keep it warm for next recording
    // Only suspend it to save resources
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend();
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }

    pendingChunksRef.current = [];
    setIsRecording(false);
    setHasSpeech(false);
    lastSpeechStateRef.current = false;
  }, [mediaStream]);

  return {
    isRecording,
    error,
    mediaStream,
    hasSpeech,
    startRecording,
    stopRecording,
  };
}
