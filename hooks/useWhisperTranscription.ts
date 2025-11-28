"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { SAMPLE_RATE, MIN_CHUNK_DURATION_MS } from "@/lib/constants";
import { calculateWeightedProgress } from "@/lib/utils";

export type WhisperModelSize = "tiny" | "base" | "small" | "medium" | "large-v3-turbo";

export interface UseWhisperTranscriptionReturn {
  isModelLoading: boolean;
  isModelLoaded: boolean;
  loadingProgress: number;
  error: string | null;
  loadModel: () => Promise<void>;
  transcribe: (audioData: Float32Array) => Promise<string>;
}

export function useWhisperTranscription(
  modelSize: WhisperModelSize = "base",
  language: string = "nl"
): UseWhisperTranscriptionReturn {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const fileProgressRef = useRef<Map<string, { loaded: number; total: number }>>(new Map());

  useEffect(() => {
    // Cleanup worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const loadModel = useCallback(async () => {
    if (workerRef.current || isModelLoading) {
      return;
    }

    // Ensure we're in a browser environment
    if (typeof window === "undefined") {
      setError("Model can only be loaded in browser environment");
      return;
    }

    setIsModelLoading(true);
    setError(null);
    setLoadingProgress(0);
    fileProgressRef.current.clear();

    try {
      // Create the Web Worker
      workerRef.current = new Worker(
        new URL("../app/whisper-worker.ts", import.meta.url),
        { type: "module" }
      );

      // Set up message handler
      workerRef.current.onmessage = (event) => {
        const { type, data } = event.data;

        if (type === "progress") {
          if (data.status === "progress" && data.file) {
            // Track loaded/total bytes per file
            fileProgressRef.current.set(data.file, {
              loaded: data.loaded,
              total: data.total
            });

            // Calculate overall progress weighted by file size
            setLoadingProgress(calculateWeightedProgress(fileProgressRef.current));
          }
        } else if (type === "loaded") {
          setIsModelLoaded(true);
          setLoadingProgress(100);
          setIsModelLoading(false);
        }
      };

      workerRef.current.onerror = (error) => {
        setError("Worker error: " + error.message);
        setIsModelLoading(false);
      };

      // Send load message to worker (v3 API - model configured in worker)
      workerRef.current.postMessage({
        type: "load"
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load Whisper model";
      setError(errorMessage);
      setIsModelLoading(false);
      console.error("Error loading Whisper model:", err);
    }
  }, [isModelLoading, modelSize]);

  const transcribe = useCallback(
    async (audioData: Float32Array): Promise<string> => {
      if (!workerRef.current) {
        throw new Error("Model not loaded. Call loadModel() first.");
      }

      // Validate audio data - must have sufficient samples to avoid tokenizer errors
      // Calculate minimum samples from configured MIN_CHUNK_DURATION_MS
      const MIN_SAMPLES = Math.floor((MIN_CHUNK_DURATION_MS / 1000) * SAMPLE_RATE);
      if (!audioData || audioData.length < MIN_SAMPLES) {
        console.warn(
          `[Whisper] Skipping chunk with insufficient audio data: ${audioData?.length || 0} samples ` +
          `(minimum: ${MIN_SAMPLES} samples = ${MIN_CHUNK_DURATION_MS}ms at ${SAMPLE_RATE}Hz)`
        );
        return Promise.resolve(""); // Return empty string for invalid chunks
      }

      return new Promise((resolve) => {
        const handleMessage = (event: MessageEvent) => {
          const { type, data } = event.data;

          if (type === "result") {
            workerRef.current?.removeEventListener("message", handleMessage);
            resolve(data.text);
          } else if (type === "error") {
            workerRef.current?.removeEventListener("message", handleMessage);

            // If model needs reload, trigger it automatically
            if (data.needsReload) {
              console.log('[Whisper] Model error detected, will auto-reload on next request');
              // Model will be reloaded automatically on next transcribe call
            }

            // Return empty string instead of rejecting to keep transcription going
            resolve("");
          }
        };

        const handleError = (error: ErrorEvent) => {
          workerRef.current?.removeEventListener("message", handleMessage);
          workerRef.current?.removeEventListener("error", handleError);
          console.error('[Whisper] Worker error:', error);
          // Return empty string instead of rejecting
          resolve("");
        };

        workerRef.current?.addEventListener("message", handleMessage);
        workerRef.current?.addEventListener("error", handleError);

        // Send transcription request
        workerRef.current?.postMessage({
          type: "transcribe",
          data: {
            audio: audioData,
            language: language,
          },
        });
      });
    },
    [language]
  );

  return {
    isModelLoading,
    isModelLoaded,
    loadingProgress,
    error,
    loadModel,
    transcribe,
  };
}
