import { useRef, useCallback, useState } from 'react'
import type { WSEvent } from '../types/events'
import type { KioskError } from '../types/kiosk'
import { parseServerEvent, serializeTextInput } from '../lib/eventProtocol'

export interface UseWebSocketOptions {
    url: string
    onEvent: (event: WSEvent) => void
    onBinary: (data: ArrayBuffer) => void
    onError: (error: KioskError) => void
}

export interface UseWebSocketReturn {
    isConnected: boolean
    connect: () => void
    disconnect: () => void
    sendAudio: (pcmData: ArrayBuffer) => void
    sendText: (content: string) => void
}

/**
 * WebSocket hook for the kiosk voice session.
 *
 * - Binary frames → `onBinary` (audio playback)
 * - JSON text frames → parsed via `parseServerEvent` → `onEvent`
 * - 30s timeout for initial `sessionStart` → dispatches KioskError with code `ws_timeout`
 * - `onclose` / `onerror` → dispatches KioskError with code `ws_disconnected`
 * - No automatic reconnection (kiosk resets to welcome on error)
 */
export function useWebSocket({
    url,
    onEvent,
    onBinary,
    onError,
}: UseWebSocketOptions): UseWebSocketReturn {
    const [isConnected, setIsConnected] = useState(false)
    const wsRef = useRef<WebSocket | null>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const sessionStartedRef = useRef(false)

    // Keep latest callbacks in refs to avoid stale closures
    const onEventRef = useRef(onEvent)
    onEventRef.current = onEvent
    const onBinaryRef = useRef(onBinary)
    onBinaryRef.current = onBinary
    const onErrorRef = useRef(onError)
    onErrorRef.current = onError

    const clearSessionTimeout = useCallback(() => {
        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }, [])

    const disconnect = useCallback(() => {
        clearSessionTimeout()
        sessionStartedRef.current = false
        const ws = wsRef.current
        if (ws) {
            // Remove handlers before closing to avoid triggering onclose error dispatch
            ws.onclose = null
            ws.onerror = null
            ws.onmessage = null
            ws.close()
            wsRef.current = null
        }
        setIsConnected(false)
    }, [clearSessionTimeout])

    const connect = useCallback(() => {
        // Clean up any existing connection first
        disconnect()

        const ws = new WebSocket(url)
        ws.binaryType = 'arraybuffer'
        wsRef.current = ws
        sessionStartedRef.current = false

        // 30s timeout for initial sessionStart event
        timeoutRef.current = setTimeout(() => {
            if (!sessionStartedRef.current) {
                onErrorRef.current({
                    code: 'ws_timeout',
                    message:
                        'The service is taking too long to respond. Please try again.',
                })
                disconnect()
            }
        }, 30_000)

        ws.onopen = () => {
            setIsConnected(true)
        }

        ws.onmessage = (event: MessageEvent) => {
            if (event.data instanceof ArrayBuffer) {
                // Binary frame → audio playback
                onBinaryRef.current(event.data)
                return
            }

            // Text frame → parse as JSON event
            try {
                const parsed = parseServerEvent(event.data as string)

                // Clear timeout once sessionStart arrives
                if (parsed.type === 'sessionStart') {
                    sessionStartedRef.current = true
                    clearSessionTimeout()
                }

                onEventRef.current(parsed)
            } catch {
                // Malformed JSON or unknown event type — treat as error event
                onErrorRef.current({
                    code: 'unknown',
                    message:
                        'An unexpected error occurred. Please start over.',
                })
            }
        }

        ws.onclose = () => {
            setIsConnected(false)
            clearSessionTimeout()
            onErrorRef.current({
                code: 'ws_disconnected',
                message:
                    'The connection was interrupted. Please start over.',
            })
        }

        ws.onerror = () => {
            setIsConnected(false)
            clearSessionTimeout()
            onErrorRef.current({
                code: 'ws_disconnected',
                message:
                    'The connection was interrupted. Please start over.',
            })
        }
    }, [url, disconnect, clearSessionTimeout])

    const sendAudio = useCallback((pcmData: ArrayBuffer) => {
        const ws = wsRef.current
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(pcmData)
        }
    }, [])

    const sendText = useCallback((content: string) => {
        const ws = wsRef.current
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(serializeTextInput(content))
        }
    }, [])

    return { isConnected, connect, disconnect, sendAudio, sendText }
}
