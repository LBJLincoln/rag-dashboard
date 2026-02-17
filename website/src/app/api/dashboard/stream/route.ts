const STATUS_API_URL = process.env.STATUS_API_URL ?? 'http://34.136.180.66:8080/status.json'

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let lastData = ''

      const sendUpdate = async () => {
        try {
          const res = await fetch(STATUS_API_URL, {
            signal: AbortSignal.timeout(10000),
            cache: 'no-store',
          })
          if (!res.ok) return

          const json = await res.json()
          const payload = Array.isArray(json) ? json[0] : json
          const raw = JSON.stringify(payload)
          if (raw === lastData) return
          lastData = raw

          controller.enqueue(encoder.encode(`data: ${raw}\n\n`))
        } catch {
          // Fetch failed, skip
        }
      }

      // Send initial data immediately
      await sendUpdate()

      // Poll every 10 seconds (reduced from 5s to save VM resources)
      const interval = setInterval(sendUpdate, 10000)

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
      'Access-Control-Allow-Origin': '*',
    },
  })
}
