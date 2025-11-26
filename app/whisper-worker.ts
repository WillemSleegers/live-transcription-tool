// Polyfill process.env for the worker
if (typeof process === 'undefined') {
    (globalThis as any).process = { env: {} };
}

import {
    AutoTokenizer,
    AutoProcessor,
    WhisperForConditionalGeneration,
} from '@huggingface/transformers';

// Import configuration constants
const TRANSCRIPTION_LANGUAGE = 'nl';

/**
 * Singleton class for managing Whisper model instance
 * Uses Transformers.js v3 API with WhisperForConditionalGeneration
 */
type ProgressCallback = (progress: unknown) => void;

class WhisperPipeline {
    static model_id = 'onnx-community/whisper-large-v3-turbo';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static tokenizer: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static processor: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static model: any = null;

    static async getInstance(progress_callback?: ProgressCallback) {
        // Load tokenizer, processor, and model in parallel
        if (this.tokenizer === null) {
            this.tokenizer = AutoTokenizer.from_pretrained(this.model_id, {
                ...(progress_callback && { progress_callback }),
            });
        }

        if (this.processor === null) {
            this.processor = AutoProcessor.from_pretrained(this.model_id, {
                ...(progress_callback && { progress_callback }),
            });
        }

        if (this.model === null) {
            this.model = WhisperForConditionalGeneration.from_pretrained(this.model_id, {
                // Use fp16 for encoder, q4 for decoder as per issue #989 resolution
                dtype: {
                    encoder_model: 'fp16',
                    decoder_model_merged: 'q4',
                },
                // Enable external data format for large model files
                device: 'webgpu',
                ...(progress_callback && { progress_callback }),
            });
        }

        // Wait for all to load
        return Promise.all([this.tokenizer, this.processor, this.model]);
    }

    static async load(progress_callback?: ProgressCallback) {
        const [tokenizer, processor, model] = await this.getInstance(progress_callback);

        console.log('[Worker] Model loaded, performing warmup inference to compile shaders...');

        // Perform a dummy inference to compile shaders (improves first real inference time)
        const dummy_input = new Float32Array(16000); // 1 second of silence at 16kHz
        const inputs = await processor(dummy_input);
        await model.generate({
            ...inputs,
            max_new_tokens: 1,
        });

        console.log('[Worker] Warmup complete, model ready for transcription');
    }

    static async transcribe(audio: Float32Array, language: string = TRANSCRIPTION_LANGUAGE) {
        const [tokenizer, processor, model] = await this.getInstance();
        const startTime = performance.now();

        console.log(`[Worker] Starting transcription of ${audio.length} samples...`);

        // Process audio to model inputs
        const inputs = await processor(audio);

        // Generate transcription
        const outputs = await model.generate({
            ...inputs,
            language: language,
            task: 'transcribe',
            return_timestamps: false,
            max_new_tokens: 448, // Reasonable max for turbo model
        });

        // Decode output tokens to text
        const text = tokenizer.batch_decode(outputs, {
            skip_special_tokens: true,
        })[0];

        const durationMs = performance.now() - startTime;
        const audioDurationSec = audio.length / 16000;
        const rtf = (durationMs / 1000) / audioDurationSec;
        console.log(`[Worker] Transcription completed in ${durationMs.toFixed(0)}ms (${audioDurationSec.toFixed(1)}s audio, RTF: ${rtf.toFixed(2)}x)`);

        return text;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    if (type === 'load') {
        try {
            await WhisperPipeline.load((progress) => {
                // Send progress updates back to the main thread
                self.postMessage({ type: 'progress', data: progress });
            });
            self.postMessage({ type: 'loaded' });
        } catch (error) {
            console.error('[Worker] Error loading model:', error);
            const message = error instanceof Error ? error.message : 'Failed to load model';
            self.postMessage({
                type: 'error',
                data: { message }
            });
        }
    } else if (type === 'transcribe') {
        try {
            const text = await WhisperPipeline.transcribe(
                data.audio,
                data.language || TRANSCRIPTION_LANGUAGE
            );

            // Post-process to remove common hallucinations
            let cleanedText = text || '';

            // Remove common Dutch subtitle/TV hallucinations (case-insensitive)
            const hallucinationPatterns = [
                /\(C\)\s*TV\s+GELDERLAND\s+\d{4}/gi,
                /TV\s+GELDERLAND\s+\d{4}/gi,
                /Ondertiteling\s*.*$/gi,
                /Ondertitels\s*.*$/gi,
                /Bijdrage\s*.*$/gi,
            ];

            for (const pattern of hallucinationPatterns) {
                cleanedText = cleanedText.replace(pattern, '').trim();
            }

            // Filter out empty or meaningless transcriptions
            const cleanedForCheck = cleanedText.replace(/^[\s.,!?;:-]+|[\s.,!?;:-]+$/g, '').trim();

            // Only send if there's actual content (at least one alphanumeric character)
            if (cleanedForCheck.length === 0 || !/[a-zA-Z0-9]/.test(cleanedForCheck)) {
                console.log('[Worker] Filtered out empty/punctuation-only transcription:', cleanedText);
                cleanedText = ''; // Send empty string to indicate no meaningful content
            }

            self.postMessage({
                type: 'result',
                data: { text: cleanedText }
            });
        } catch (error) {
            console.error('[Worker] Error during transcription:', error);

            // Reset model instance on error to recover from GPU memory issues
            console.log('[Worker] Resetting model due to error...');
            WhisperPipeline.model = null;
            WhisperPipeline.tokenizer = null;
            WhisperPipeline.processor = null;

            const message = error instanceof Error ? error.message :
                           typeof error === 'string' ? error :
                           'Transcription failed';

            self.postMessage({
                type: 'error',
                data: {
                    message,
                    needsReload: true
                }
            });
        }
    }
});
