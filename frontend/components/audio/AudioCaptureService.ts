/**
 * AudioCaptureService — Microphone capture for the Triastral patient kiosk.
 *
 * Captures PCM 16-bit mono audio at 16 kHz, buffers into 3200-sample (200 ms)
 * chunks via a RollingBuffer, and delivers each filled chunk to a callback.
 *
 * Exported helpers (float32ToInt16, RollingBuffer) are public so property-based
 * tests (Property 5 & 6) can exercise them independently.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Samples per chunk: 3200 = 200 ms at 16 kHz */
const CHUNK_SAMPLES = 3200;

/** ScriptProcessorNode buffer size — must be a power of two */
const SCRIPT_PROCESSOR_BUFFER = 512;

/** Mic constraints matching Requirement 3.1 / 3.2 */
const MIC_CONSTRAINTS: MediaStreamConstraints = {
    audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
    },
};

// ---------------------------------------------------------------------------
// float32ToInt16  (exported for Property 5)
// ---------------------------------------------------------------------------

/**
 * Convert a single Float32 sample in [-1, 1] to a clamped Int16 value.
 *
 * Multiply by 32767, clamp to [-32768, 32767].
 */
export function float32ToInt16(sample: number): number {
    const clamped = Math.max(-1, Math.min(1, sample));
    return clamped < 0
        ? Math.max(-32768, Math.round(clamped * 32768))
        : Math.min(32767, Math.round(clamped * 32767));
}

/**
 * Bulk-convert a Float32Array to an Int16Array.
 */
function float32ArrayToInt16Array(input: Float32Array): Int16Array {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        out[i] = float32ToInt16(input[i]);
    }
    return out;
}

// ---------------------------------------------------------------------------
// RollingBuffer  (exported for Property 6)
// ---------------------------------------------------------------------------

/**
 * Accumulates Int16 PCM samples and emits fixed-size chunks.
 *
 * Every time enough samples have been written to fill a chunk the provided
 * `onChunk` callback is invoked with an ArrayBuffer containing exactly
 * `chunkSize` Int16 samples (i.e. chunkSize * 2 bytes).
 */
export class RollingBuffer {
    private buffer: Int16Array;
    private writePos = 0;
    readonly chunkSize: number;

    constructor(chunkSize: number = CHUNK_SAMPLES) {
        this.chunkSize = chunkSize;
        this.buffer = new Int16Array(chunkSize);
    }

    /**
     * Write samples into the buffer. For every full chunk accumulated the
     * `onChunk` callback is called with a *copy* of the chunk as an ArrayBuffer.
     */
    write(samples: Int16Array, onChunk: (chunk: ArrayBuffer) => void): void {
        let offset = 0;

        while (offset < samples.length) {
            const remaining = this.chunkSize - this.writePos;
            const toCopy = Math.min(remaining, samples.length - offset);

            this.buffer.set(samples.subarray(offset, offset + toCopy), this.writePos);
            this.writePos += toCopy;
            offset += toCopy;

            if (this.writePos === this.chunkSize) {
                // Emit a copy so the caller owns the data
                onChunk(this.buffer.slice().buffer);
                this.writePos = 0;
            }
        }
    }

    /** Reset internal state without emitting a partial chunk. */
    clear(): void {
        this.writePos = 0;
        this.buffer.fill(0);
    }
}

// ---------------------------------------------------------------------------
// AudioCaptureService
// ---------------------------------------------------------------------------

export class AudioCaptureService {
    private mediaStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private processorNode: ScriptProcessorNode | null = null;
    private rollingBuffer: RollingBuffer;

    constructor() {
        this.rollingBuffer = new RollingBuffer(CHUNK_SAMPLES);
    }

    /**
     * Request the microphone and begin streaming PCM chunks.
     *
     * Uses ScriptProcessorNode as the primary capture path.
     * AudioWorklet support can be layered on top later without changing the
     * public API — the `onChunk` callback contract stays the same.
     *
     * @param onChunk Called with an ArrayBuffer of 3200 Int16 samples (6400 bytes)
     *                each time 200 ms of audio has been buffered.
     */
    async start(onChunk: (pcm: ArrayBuffer) => void): Promise<void> {
        // Prevent double-start
        if (this.audioContext) {
            return;
        }

        // 1. Request mic  (Requirement 3.1)
        this.mediaStream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);

        // 2. Create AudioContext at 16 kHz  (Requirement 3.2)
        this.audioContext = new AudioContext({ sampleRate: 16000 });

        const source = this.audioContext.createMediaStreamSource(this.mediaStream);

        // 3. ScriptProcessorNode capture path
        this.processorNode = this.audioContext.createScriptProcessor(
            SCRIPT_PROCESSOR_BUFFER,
            1, // input channels
            1, // output channels
        );

        this.rollingBuffer.clear();

        this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
            const float32 = event.inputBuffer.getChannelData(0);
            const int16 = float32ArrayToInt16Array(float32);
            this.rollingBuffer.write(int16, onChunk);
        };

        // Connect the graph: mic → processor → destination (required for onaudioprocess)
        source.connect(this.processorNode);
        this.processorNode.connect(this.audioContext.destination);
    }

    /**
     * Stop capturing and release all browser resources.
     *
     * Safe to call multiple times or when not started.
     */
    stop(): void {
        // Disconnect processor
        if (this.processorNode) {
            this.processorNode.onaudioprocess = null;
            this.processorNode.disconnect();
            this.processorNode = null;
        }

        // Stop all mic tracks  (Requirement 3.4)
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
        }

        // Close AudioContext
        if (this.audioContext) {
            this.audioContext.close().catch(() => {
                // Ignore — context may already be closed
            });
            this.audioContext = null;
        }

        // Reset buffer state
        this.rollingBuffer.clear();
    }
}
