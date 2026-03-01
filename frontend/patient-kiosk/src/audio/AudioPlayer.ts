/**
 * Gapless PCM audio playback via Web Audio API.
 *
 * Receives Int16 PCM chunks (16 kHz, mono) from the WebSocket and schedules
 * them for sequential playback with no gaps between chunks.
 */
export class AudioPlayer {
  private context: AudioContext
  private nextStartTime = 0
  private readonly sampleRate = 16000

  constructor() {
    this.context = new AudioContext({ sampleRate: this.sampleRate })
  }

  /** Enqueue a PCM Int16 chunk for gapless playback. */
  playChunk(pcmData: ArrayBuffer): void {
    const int16 = new Int16Array(pcmData)
    if (int16.length === 0) return

    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i]! / (int16[i]! < 0 ? 0x8000 : 0x7fff)
    }

    const buffer = this.context.createBuffer(1, float32.length, this.sampleRate)
    buffer.copyToChannel(float32, 0)

    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.connect(this.context.destination)

    const now = this.context.currentTime
    const startTime = Math.max(now, this.nextStartTime)
    source.start(startTime)
    this.nextStartTime = startTime + buffer.duration
  }

  /** Reset the playback queue (e.g. on interruption). */
  flush(): void {
    this.nextStartTime = 0
  }

  /** Resume AudioContext if suspended (autoplay policy). */
  async resume(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
  }

  /** Close the AudioContext and release resources. */
  close(): void {
    this.context.close()
  }
}
