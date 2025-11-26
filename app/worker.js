// Polyfill process.env for the worker
if (typeof process === 'undefined') {
    globalThis.process = { env: {} };
}

import { pipeline, env } from '@xenova/transformers';

// Import configuration constants
// Note: In workers, we need to define these inline since we can't import from TypeScript files
const ONNX_NUM_THREADS = 4;
const WHISPER_CHUNK_LENGTH_S = 30;
const WHISPER_STRIDE_LENGTH_S = 0;
const TRANSCRIPTION_LANGUAGE = 'nl';

// Skip local model check
env.allowLocalModels = false;

// Suppress ONNX Runtime logging by setting log level to error only
env.onnx = {
    wasm: {
        numThreads: ONNX_NUM_THREADS
    },
    logLevel: 'error'
};

// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
    static task = 'automatic-speech-recognition';
    static model = null;
    static instance = null;

    static async getInstance(modelSize = 'base', progress_callback = null) {
        // Set model if not already set
        if (!this.model) {
            this.model = `Xenova/whisper-${modelSize}`;
        }

        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }

        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    if (type === 'load') {
        // Load the pipeline with specified model size
        const modelSize = data?.modelSize || 'base';
        const transcriber = await PipelineSingleton.getInstance(modelSize, (progress) => {
            // Send progress updates back to the main thread
            self.postMessage({ type: 'progress', data: progress });
        });

        self.postMessage({ type: 'loaded' });
    } else if (type === 'transcribe') {
        // Perform transcription
        const transcriber = await PipelineSingleton.getInstance();

        const output = await transcriber(data.audio, {
            language: data.language || TRANSCRIPTION_LANGUAGE,
            task: 'transcribe',
            chunk_length_s: WHISPER_CHUNK_LENGTH_S,
            stride_length_s: WHISPER_STRIDE_LENGTH_S,
            return_timestamps: false,
        });

        // Post-process to remove common hallucinations
        let text = output.text || '';

        // Remove common Dutch subtitle/TV hallucinations (case-insensitive)
        const hallucinationPatterns = [
            /\(C\)\s*TV\s+GELDERLAND\s+\d{4}/gi,
            /TV\s+GELDERLAND\s+\d{4}/gi,
            /Ondertiteling\s*.*$/gi,
            /Ondertitels\s*.*$/gi,
            /Bijdrage\s*.*$/gi,
        ];

        for (const pattern of hallucinationPatterns) {
            text = text.replace(pattern, '').trim();
        }

        // Filter out empty or meaningless transcriptions
        // Remove leading/trailing punctuation and whitespace for checking
        const cleanedForCheck = text.replace(/^[\s.,!?;:-]+|[\s.,!?;:-]+$/g, '').trim();

        // Only send if there's actual content (at least one alphanumeric character)
        if (cleanedForCheck.length === 0 || !/[a-zA-Z0-9]/.test(cleanedForCheck)) {
            console.log('[Worker] Filtered out empty/punctuation-only transcription:', text);
            text = ''; // Send empty string to indicate no meaningful content
        }

        self.postMessage({
            type: 'result',
            data: { text }
        });
    }
});
