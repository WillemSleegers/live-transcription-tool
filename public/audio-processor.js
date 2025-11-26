/**
 * AudioWorklet Processor for Voice Activity Detection (VAD)
 *
 * Runs in a separate audio thread for better performance than ScriptProcessorNode.
 * Processes audio in 128-frame chunks at the audio context sample rate.
 */

class AudioVADProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // VAD configuration (will be set via messages)
    this.speechThreshold = 0.02;
    this.silenceDurationMs = 1500;
    this.minChunkDurationMs = 3000;
    this.maxChunkDurationMs = 30000;
    this.maxBufferSizeBytes = 10 * 1024 * 1024; // 10MB limit

    // Audio buffer and timing
    this.audioBuffer = [];
    this.chunkStartTime = currentTime;
    this.lastSpeechTime = currentTime;
    this.chunkHasSpeech = false; // Track if current chunk contains speech

    // Listen for configuration messages
    this.port.onmessage = (event) => {
      const { type, data } = event.data;

      if (type === 'configure') {
        this.speechThreshold = data.speechThreshold ?? this.speechThreshold;
        this.silenceDurationMs = data.silenceDurationMs ?? this.silenceDurationMs;
        this.minChunkDurationMs = data.minChunkDurationMs ?? this.minChunkDurationMs;
        this.maxChunkDurationMs = data.maxChunkDurationMs ?? this.maxChunkDurationMs;
        this.maxBufferSizeBytes = data.maxBufferSizeBytes ?? this.maxBufferSizeBytes;
      } else if (type === 'reset') {
        this.audioBuffer = [];
        this.chunkStartTime = currentTime;
        this.lastSpeechTime = currentTime;
        this.chunkHasSpeech = false;
      }
    };
  }

  /**
   * Calculate RMS (Root Mean Square) audio level
   */
  calculateRMS(audioData) {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  /**
   * Send audio chunk to main thread
   */
  sendChunk() {
    // Only send chunks that contain speech AND have sufficient audio data
    if (this.audioBuffer.length === 0 || !this.chunkHasSpeech) {
      if (this.audioBuffer.length === 0) {
        console.log('[AudioVADProcessor] Skipping empty chunk');
      } else {
        const durationMs = (currentTime - this.chunkStartTime) * 1000;
        console.log(`[AudioVADProcessor] Skipping ${durationMs.toFixed(0)}ms chunk without speech`);
      }
      this.audioBuffer = [];
      this.chunkStartTime = currentTime;
      this.chunkHasSpeech = false;
      return;
    }

    // Convert buffer array to Float32Array
    const audioData = new Float32Array(this.audioBuffer);
    const durationMs = (currentTime - this.chunkStartTime) * 1000;
    const durationSec = (durationMs / 1000).toFixed(1);
    console.log(`[AudioVADProcessor] Sending ${durationSec}s audio chunk (${audioData.length} samples)`);

    // Send to main thread
    this.port.postMessage({
      type: 'audioChunk',
      data: audioData,
      timestamp: currentTime
    });

    // Reset buffer and timing
    this.audioBuffer = [];
    this.chunkStartTime = currentTime;
    this.chunkHasSpeech = false;
  }

  /**
   * Process audio in 128-frame chunks
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];

    // If no input, just return
    if (!input || !input[0]) {
      return true;
    }

    const inputChannel = input[0]; // Mono channel
    const now = currentTime;

    // Calculate audio level and detect speech
    const rms = this.calculateRMS(inputChannel);
    const hasSpeech = rms > this.speechThreshold;

    if (hasSpeech) {
      this.lastSpeechTime = now;
      this.chunkHasSpeech = true; // Mark that this chunk contains speech
    }

    // Append new samples to buffer FIRST
    for (let i = 0; i < inputChannel.length; i++) {
      this.audioBuffer.push(inputChannel[i]);
    }

    // Check buffer size limit AFTER appending
    const bytesPerSample = 4; // Float32Array uses 4 bytes per sample
    const currentBufferBytes = this.audioBuffer.length * bytesPerSample;

    if (currentBufferBytes > this.maxBufferSizeBytes) {
      // Buffer is full - force send chunk
      console.warn('[AudioVADProcessor] Buffer size limit reached, forcing chunk send');
      this.sendChunk();
    }

    // Calculate durations
    const chunkDurationMs = (now - this.chunkStartTime) * 1000;
    const timeSinceLastSpeechMs = (now - this.lastSpeechTime) * 1000;

    // Determine if we should send chunk
    const shouldSendDueToSilence =
      timeSinceLastSpeechMs >= this.silenceDurationMs &&
      chunkDurationMs >= this.minChunkDurationMs;
    const shouldSendDueToMaxLength = chunkDurationMs >= this.maxChunkDurationMs;

    if (shouldSendDueToSilence || shouldSendDueToMaxLength) {
      this.sendChunk();
    }

    // Send RMS level for visualization (every 128 frames)
    this.port.postMessage({
      type: 'audioLevel',
      rms: rms,
      hasSpeech: hasSpeech
    });

    // Keep processor alive
    return true;
  }
}

registerProcessor('audio-vad-processor', AudioVADProcessor);
