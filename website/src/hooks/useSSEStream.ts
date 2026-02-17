'use client'

// useSSEStream — generic SSE client hook with automatic reconnection.
//
// Usage:
//   const { data, status, error } = useSSEStream('/api/eval/stream')
//
// The hook opens an EventSource to `url`, parses each message as JSON,
// and stores it as `data`. On disconnect it reconnects automatically using
// exponential backoff (1s → 2s → 4s … capped at 30s).
//
// For the eval dashboard specifically, prefer `useEvalStream` from
// hooks/useEvalStream.ts which wires SSE events into the Zustand store.

import { useState, useEffect, useRef, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SSEStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'error'

export interface SSEStreamResult<T = unknown> {
  /** Most recent parsed message payload (null until first message received) */
  data: T | null
  /** Current connection status */
  status: SSEStatus
  /** Last error message, if any */
  error: string | null
  /** Sequence counter — increments on each received message */
  seq: number
}

interface UseSSEStreamOptions {
  /** Whether to start the connection immediately (default: true) */
  enabled?: boolean
  /** Initial reconnect delay in ms (default: 1000) */
  baseReconnectDelayMs?: number
  /** Maximum reconnect delay in ms (default: 30000) */
  maxReconnectDelayMs?: number
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSSEStream<T = unknown>(
  url: string,
  options: UseSSEStreamOptions = {}
): SSEStreamResult<T> {
  const {
    enabled = true,
    baseReconnectDelayMs = 1_000,
    maxReconnectDelayMs = 30_000,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<SSEStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [seq, setSeq] = useState(0)

  // Stable refs so the connect callback doesn't change on every render
  const esRef = useRef<EventSource | null>(null)
  const reconnectDelayRef = useRef(baseReconnectDelayMs)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    // Close any existing connection before opening a new one
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    setStatus('connecting')
    setError(null)

    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      if (!mountedRef.current) return
      setStatus('live')
      // Reset backoff on successful connection
      reconnectDelayRef.current = baseReconnectDelayMs
    }

    es.onmessage = (event: MessageEvent<string>) => {
      if (!mountedRef.current) return
      try {
        const parsed = JSON.parse(event.data) as T
        setData(parsed)
        setSeq((s) => s + 1)
      } catch {
        // Malformed JSON — ignore the message but stay connected
      }
    }

    es.onerror = () => {
      if (!mountedRef.current) return

      // EventSource readyState: 0=CONNECTING, 1=OPEN, 2=CLOSED
      // onerror fires both for transient errors (auto-reconnects) and
      // for permanent close. We always close manually and handle reconnect.
      es.close()
      esRef.current = null

      setStatus('reconnecting')
      setError('Connection lost — reconnecting…')

      clearReconnectTimer()
      reconnectTimerRef.current = setTimeout(() => {
        // Exponential backoff, capped at maxReconnectDelayMs
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * 2,
          maxReconnectDelayMs
        )
        connect()
      }, reconnectDelayRef.current)
    }
  }, [url, baseReconnectDelayMs, maxReconnectDelayMs, clearReconnectTimer])

  useEffect(() => {
    mountedRef.current = true

    if (!enabled) {
      setStatus('idle')
      return
    }

    connect()

    return () => {
      mountedRef.current = false
      clearReconnectTimer()
      esRef.current?.close()
      esRef.current = null
    }
  }, [enabled, connect, clearReconnectTimer])

  return { data, status, error, seq }
}
