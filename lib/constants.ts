/**
 * Voice Activity Detection (VAD) and Audio Processing Constants
 *
 * These parameters control how the application detects speech,
 * segments audio into chunks, and triggers transcription.
 */

/**
 * Speech Detection Threshold (RMS amplitude)
 *
 * The minimum audio level (Root Mean Square amplitude) required to be
 * considered "speech" rather than silence or background noise.
 *
 * - Range: 0.0 to 1.0
 * - Lower values (e.g., 0.01): More sensitive, picks up quieter sounds
 * - Higher values (e.g., 0.05): Less sensitive, only detects louder speech
 * - Increased from 0.02 to 0.04 to reduce false positives on background noise
 */
export const SPEECH_THRESHOLD = 0.04;

/**
 * Silence Duration (milliseconds)
 *
 * The duration of continuous silence required to trigger the end of
 * an utterance and send the audio chunk for transcription.
 *
 * - Lower values (e.g., 1500ms): Faster response, may cut off speech
 * - Higher values (e.g., 4000ms): More lenient pauses, slower response
 */
export const SILENCE_DURATION_MS = 500;

/**
 * Minimum Chunk Duration (milliseconds)
 *
 * The minimum length of audio required before a chunk can be sent
 * for transcription, even if silence is detected.
 *
 * - Prevents very short audio snippets from being transcribed
 * - Must be long enough to contain meaningful speech
 * - Lower = faster response, but may transcribe incomplete phrases
 */
export const MIN_CHUNK_DURATION_MS = 1000;

/**
 * Maximum Chunk Duration (milliseconds)
 *
 * The maximum length of a single audio chunk before it's force-sent
 * for transcription, regardless of speech detection.
 *
 * - Prevents chunks from becoming too large
 * - Ensures continuous speech is processed in manageable segments
 */
export const MAX_CHUNK_DURATION_MS = 30000;

/**
 * Whisper Model Configuration
 */

/**
 * Model Selection
 *
 * Standard Whisper models:
 * - "tiny" (~40MB): Fastest, lowest quality
 * - "base" (~74MB): Good balance of speed and quality
 * - "small" (~240MB): Higher quality, slower processing
 * - "medium" (~1.5GB): Best quality, very slow
 *
 * Alternative models (better performance):
 * - "distil-medium.en" - Distil-Whisper for English (6x faster than small)
 * - "distil-large-v3" - Multilingual Distil-Whisper (faster + better quality)
 *
 * Current: Using standard Whisper base model
 */
export const WHISPER_MODEL_SIZE = "base" as const;

/**
 * Alternative: Use Distil-Whisper for better speed and quality
 * Uncomment to use Distil-Whisper instead of standard Whisper
 */
// export const WHISPER_MODEL_NAME = "distil-whisper/distil-large-v3" as const;
export const WHISPER_MODEL_NAME = null; // null = use standard Whisper

/**
 * Transcription Language
 *
 * ISO 639-1 language code for transcription
 */
export const TRANSCRIPTION_LANGUAGE = "nl";

/**
 * Audio Processing Configuration
 */

/**
 * Sample Rate (Hz)
 *
 * The audio sampling rate for recording
 * 16kHz is the standard for Whisper models
 */
export const SAMPLE_RATE = 16000;

/**
 * ONNX Runtime Threads
 *
 * Number of threads to use for WASM processing
 * - Higher values: Faster processing (if CPU supports it)
 * - Lower values: Less CPU usage
 */
export const ONNX_NUM_THREADS = 4;

/**
 * Whisper Chunk Length (seconds)
 *
 * Maximum audio length processed by Whisper in a single pass
 * Should match MAX_CHUNK_DURATION_MS / 1000
 */
export const WHISPER_CHUNK_LENGTH_S = 30;

/**
 * Whisper Stride Length (seconds)
 *
 * Overlap between consecutive chunks in Whisper processing
 * - 0: No overlap (faster, may miss words at boundaries)
 * - 5: 5-second overlap (slower, better accuracy at boundaries)
 */
export const WHISPER_STRIDE_LENGTH_S = 0;
