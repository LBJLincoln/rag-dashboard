import { useEffect, useRef, useCallback } from 'react'
import { useEvalStore } from '@/stores/evalStore'

const SSE_URL = '/api/eval/stream'
const MAX_RECONNECT_DELAY = 30000  // 30s ceiling
const BASE_RECONNECT_DELAY = 1000

export function useEvalStream() {
  const esRef = useRef<EventSource | null>(null)
  const reconnectDelay = useRef(BASE_RECONNECT_DELAY)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted = useRef(true)

  const setConnectionStatus = useEvalStore(s => s.setConnectionStatus)
  const appendQuestion = useEvalStore(s => s.appendQuestion)
  const setCurrentIteration = useEvalStore(s => s.setCurrentIteration)
  const setIsRunning = useEvalStore(s => s.setIsRunning)

  const connect = useCallback(() => {
    if (!isMounted.current) return

    // Close existing connection
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    setConnectionStatus('connecting')

    const seq = useEvalStore.getState().sseSeq
    const url = `${SSE_URL}?since=${seq}`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      if (!isMounted.current) return
      setConnectionStatus('live')
      reconnectDelay.current = BASE_RECONNECT_DELAY
    }

    es.onmessage = (event) => {
      if (!isMounted.current) return
      try {
        const msg = JSON.parse(event.data)
        switch (msg.type) {
          case 'question':
            if (msg.data) appendQuestion(msg.data)
            break
          case 'iteration_start':
            if (msg.data) setCurrentIteration(msg.data)
            setIsRunning(true)
            break
          case 'iteration_end':
            setIsRunning(false)
            break
          case 'heartbeat':
            // Keep-alive, no action needed
            break
          default:
            break
        }
      } catch {
        // Ignore malformed events
      }
    }

    es.onerror = () => {
      if (!isMounted.current) return
      es.close()
      esRef.current = null
      setConnectionStatus('reconnecting')

      // Exponential backoff reconnect
      reconnectTimeout.current = setTimeout(() => {
        reconnectDelay.current = Math.min(
          reconnectDelay.current * 2,
          MAX_RECONNECT_DELAY
        )
        connect()
      }, reconnectDelay.current)
    }
  }, [appendQuestion, setConnectionStatus, setCurrentIteration, setIsRunning])

  useEffect(() => {
    isMounted.current = true
    connect()

    return () => {
      isMounted.current = false
      esRef.current?.close()
      esRef.current = null
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = null
      }
    }
  }, [connect])

  // Expose a manual reconnect function
  const reconnect = useCallback(() => {
    reconnectDelay.current = BASE_RECONNECT_DELAY
    connect()
  }, [connect])

  return { reconnect }
}
