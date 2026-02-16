import { readFile, stat } from 'fs/promises'
import { join } from 'path'

const ROOT = join(process.cwd(), '..')

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let lastMtime = 0

      const sendUpdate = async () => {
        try {
          const statusPath = join(ROOT, 'docs/status.json')
          const fileInfo = await stat(statusPath).catch(() => null)
          if (!fileInfo) return

          const mtime = fileInfo.mtimeMs
          if (mtime <= lastMtime) return
          lastMtime = mtime

          const raw = await readFile(statusPath, 'utf-8')
          const data = JSON.parse(raw)

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          )
        } catch {
          // File not ready, skip
        }
      }

      // Send initial data immediately
      await sendUpdate()

      // Poll file changes every 3 seconds
      const interval = setInterval(sendUpdate, 3000)

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
