const STATUS_API_URL = process.env.STATUS_API_URL ?? 'http://localhost:3001'

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let lastData = ''

      const sendUpdate = async () => {
        try {
          const res = await fetch(`${STATUS_API_URL}/status.json`, {
            signal: AbortSignal.timeout(4000),
          })
          if (!res.ok) return

          const raw = await res.text()
          if (raw === lastData) return
          lastData = raw

          controller.enqueue(encoder.encode(`data: ${raw}\n\n`))
        } catch {
          // Fetch failed, skip
        }
      }

      // Send initial data immediately
      await sendUpdate()

      // Poll every 5 seconds
      const interval = setInterval(sendUpdate, 5000)

      // Keep-alive ping every 30s
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(interval)
          clearInterval(keepAlive)
        }
      }, 30000)

      // Cleanup after 5 minutes (client should reconnect)
      setTimeout(() => {
        clearInterval(interval)
        clearInterval(keepAlive)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      }, 300000)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
