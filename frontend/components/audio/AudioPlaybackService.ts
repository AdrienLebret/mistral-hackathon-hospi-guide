/**
 * AudioPlaybackService — Agent voice playback for the Triastral patient kiosk.
 *
 * Receives PCM 16-bit mono audio at 24 kHz from the backend, decodes it to
 * Float32, and schedules AudioBuffers for gapless playback via the Web Audio
 * API. Supports barge-in (immediate cancellation of all scheduled audio).
 *
 * Exported helpers (int16ToFloat32) and testability getters (isPlaying,
 * scheduledCount) are public so property-based tests (Property 5, 7, 8) can
 * exercise them independently.
 */

// ---------------------------------------------------------------------------
// int16ToFloat32  (exported for Property 5 — reverse direction)
// ---------------------------------------------------------------------------

/**
 * Convert a single Int16 PCM sample to a Float32 value in [-1, 1].
 *
 * Divides by 32768 so the full Int16 range maps to [-1.0, ~0.99997].
 */
export function int16ToFloat32(sample: number): number {
    return sample / 32768;
}

// ---------------------------------------------------------------------------
// AudioPlaybackService
// ---------------------------------------------------------------------------

export class AudioPlaybackService {
    private audioContext: AudioContext;
    private gainNode: GainNode;
    private nextStartTime: number = 0;
    private scheduledBuffers: Set<AudioBufferSourceNode> = new Set();

    constructor() {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
    }

    // -----------------------------------------------------------------------
    // Testability getters  (Property 7 & 8)
    // -----------------------------------------------------------------------

    /** True when at least one AudioBufferSourceNode is scheduled. */
    get isPlaying(): boolean {
        return this.scheduledBuffers.size > 0;
    }

    /** Number of currently scheduled AudioBufferSourceNode instances. */
    get scheduledCount(): number {
        return this.scheduledBuffers.size;
    }

    /** Current nextStartTime value — exposed for gapless scheduling tests. */
    get currentNextStartTime(): number {
        return this.nextStartTime;
    }

    // -----------------------------------------------------------------------
    // Playback
    // -----------------------------------------------------------------------

    /**
     * Decode an incoming Int16 PCM chunk and schedule it for gapless playback.
     *
     * Steps:
     * 1. Interpret the ArrayBuffer as Int16 PCM samples
     * 2. Convert each sample to Float32 (divide by 32768)
     * 3. Create an AudioBuffer at 24 kHz
     * 4. Schedule via `source.start(nextStartTime)` so buffers play back-to-back
     * 5. Advance `nextStartTime` by the buffer duration
     *
     * @param pcmData ArrayBuffer containing Int16 PCM samples at 24 kHz
     */
    playChunk(pcmData: ArrayBuffer): void {
        const int16Samples = new Int16Array(pcmData);
        const sampleCount = int16Samples.length;

        if (sampleCount === 0) {
            return;
        }

        // 1. Int16 → Float32
        const float32Samples = new Float32Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) {
            float32Samples[i] = int16ToFloat32(int16Samples[i]);
        }

        // 2. Create AudioBuffer (mono, 24 kHz)
        const audioBuffer = this.audioContext.createBuffer(1, sampleCount, 24000);
        audioBuffer.copyToChannel(float32Samples, 0);

        // 3. Create and connect source node
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.gainNode);

        // 4. Schedule for gapless playback
        const now = this.audioContext.currentTime;
        if (this.nextStartTime < now) {
            this.nextStartTime = now;
        }

        source.start(this.nextStartTime);
        this.scheduledBuffers.add(source);

        // 5. Advance nextStartTime by buffer duration
        this.nextStartTime += audioBuffer.duration;

        // Auto-remove from set when playback finishes
        source.onended = () => {
            this.scheduledBuffers.delete(source);
        };
    }

    // -----------------------------------------------------------------------
    // Barge-in  (Requirement 4.3)
    // -----------------------------------------------------------------------

    /**
     * Immediately cancel all scheduled audio — used for barge-in when the
     * patient starts speaking while the agent is still talking.
     */
    stop(): void {
        for (const source of this.scheduledBuffers) {
            try {
                source.stop();
                source.disconnect();
            } catch {
                // Source may have already ended — safe to ignore
            }
        }
        this.scheduledBuffers.clear();
        this.nextStartTime = 0;
    }

    // -----------------------------------------------------------------------
    // Full cleanup  (Requirement 4.4)
    // -----------------------------------------------------------------------

    /**
     * Stop all playback and release the AudioContext.
     *
     * Call this when leaving the conversation phase.
     */
    dispose(): void {
        this.stop();
        this.audioContext.close().catch(() => {
            // Ignore — context may already be closed
        });
    }
}
