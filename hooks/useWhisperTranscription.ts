"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type WhisperModelSize = "tiny" | "base" | "small" | "medium";

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
  const fileProgressRef = useRef<Map<string, number>>(new Map());

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
      workerRef.current = new Worker(new URL("../app/worker.js", import.meta.url), {
        type: "module",
      });

      // Set up message handler
      workerRef.current.onmessage = (event) => {
        const { type, data } = event.data;

        if (type === "progress") {
          if (data.status === "progress" && data.file) {
            // Track progress per file
            const fileProgress = (data.loaded / data.total) * 100;
            fileProgressRef.current.set(data.file, fileProgress);

            // Calculate overall progress as average of all files
            const files = Array.from(fileProgressRef.current.values());
            const totalProgress = files.reduce((sum, p) => sum + p, 0) / files.length;
            setLoadingProgress(Math.round(totalProgress));
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

      // Send load message to worker with model size
      workerRef.current.postMessage({
        type: "load",
        data: { modelSize }
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

      return new Promise((resolve, reject) => {
        const handleMessage = (event: MessageEvent) => {
          const { type, data } = event.data;

          if (type === "result") {
            workerRef.current?.removeEventListener("message", handleMessage);
            resolve(data.text);
          }
        };

        const handleError = (error: ErrorEvent) => {
          workerRef.current?.removeEventListener("message", handleMessage);
          workerRef.current?.removeEventListener("error", handleError);
          reject(new Error("Transcription failed: " + error.message));
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
