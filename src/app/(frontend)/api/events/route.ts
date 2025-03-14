import { NextRequest } from 'next/server'

import { sub } from '@/lib/redis'

export const config = {
  runtime: 'nodejs', // Ensures it runs in a proper Node environment
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const duplicateSubscriber = sub.duplicate()

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (channel: string, message: string) => {
        controller.enqueue(encoder.encode(`data: ${message}\n\n`))
      }

      // Subscribe to a Redis channel
      duplicateSubscriber.subscribe('my-channel', err => {
        if (err) console.error('Redis Subscribe Error:', err)
      })

      duplicateSubscriber.on('message', sendEvent)

      req.signal.addEventListener('abort', () => {
        duplicateSubscriber.unsubscribe('my-channel')
        duplicateSubscriber.off('message', sendEvent)
        controller.close()
      })
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
