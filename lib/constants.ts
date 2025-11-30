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
export const SILENCE_DURATION_MS = 1000;

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
export const MIN_CHUNK_DURATION_MS = 2000;

/**
 * Maximum Chunk Duration (milliseconds)
 *
 * The maximum length of a single audio chunk before it's force-sent
 * for transcription, regardless of speech detection.
 *
 * - Prevents chunks from becoming too large
 * - Ensures continuous speech is processed in manageable segments
 */
export const MAX_CHUNK_DURATION_MS = 10000;

/**
 * Speech Detection Debounce (milliseconds)
 *
 * Delay before updating the UI speech detection state to prevent
 * flickering during brief inter-word pauses.
 *
 * - Lower values (e.g., 150ms): More responsive, may flicker
 * - Higher values (e.g., 500ms): Smoother, maintains "speech detected" during natural pauses
 * - Set to 500ms to keep indicator active during brief word gaps
 */
export const SPEECH_DETECTION_DEBOUNCE_MS = 500;

/**
 * Whisper Model Configuration
 */

/**
 * Model Selection
 *
 * Using Whisper Large V3 Turbo (Transformers.js v3)
 * - Model: onnx-community/whisper-large-v3-turbo
 * - Performance: ~12x faster than large-v3, similar quality
 * - Size: ~1.5GB (encoder: fp16, decoder: q4)
 * - Languages: Multilingual including Dutch
 * - WebGPU: Required for optimal performance
 *
 * Configuration (set in worker.js):
 * - dtype: { encoder_model: 'fp16', decoder_model_merged: 'q4' }
 * - device: 'webgpu'
 *
 * Previous models (v2 API, no longer used):
 * - "tiny" (~40MB): Fastest, lowest quality
 * - "base" (~74MB): Good balance of speed and quality
 * - "small" (~240MB): Higher quality, slower processing
 */
export const WHISPER_MODEL_SIZE = "large-v3-turbo";

/**
 * Whisper Model Name
 *
 * Full model identifier for Transformers.js v3
 * Model is configured in worker.js with proper dtypes
 */
export const WHISPER_MODEL_NAME = "onnx-community/whisper-large-v3-turbo";

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

/**
 * Speaker Color Generation
 *
 * Generates visually distinct colors for speaker identification using
 * a golden ratio-based distribution around the HSL color wheel.
 *
 * Algorithm:
 * - Start at hue 217° (blue)
 * - Use golden angle (~137.5°) for optimal distribution
 * - Maintain consistent saturation (65%) and lightness (55%) for harmony
 *
 * This creates maximally separated colors that remain visually pleasing.
 */

/** Starting hue for first speaker (blue) */
const SPEAKER_HUE_START = 217;

/** Golden angle in degrees for optimal color separation */
const GOLDEN_ANGLE = 137.508;

/** Saturation level for speaker colors (65% for vibrant but not oversaturated) */
const SPEAKER_SATURATION = 65;

/** Lightness level for speaker colors (55% for good contrast) */
const SPEAKER_LIGHTNESS = 55;

/**
 * Get speaker color by index using golden ratio distribution
 * @param index Speaker index (0-based)
 * @returns Hex color string
 */
export function getSpeakerColor(index: number): string {
  const hue = (SPEAKER_HUE_START + index * GOLDEN_ANGLE) % 360;
  return hslToHex(hue, SPEAKER_SATURATION, SPEAKER_LIGHTNESS);
}

/**
 * Convert HSL to hex color
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns Hex color string (e.g., "#3B82F6")
 */
function hslToHex(h: number, s: number, l: number): string {
  const sDecimal = s / 100;
  const lDecimal = l / 100;

  const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lDecimal - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
