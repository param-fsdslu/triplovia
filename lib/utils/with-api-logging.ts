import type { NextRequest } from 'next/server'
import { logger } from './logger'

type RouteHandler = (req: NextRequest, ctx?: any) => Promise<Response>

/**
 * Wraps a Next.js route handler with dev-only request/response logging.
 *
 * Usage:
 *   const handler = async (req: NextRequest) => { ... }
 *   export const GET = withApiLogging(handler, 'hotels/featured')
 */
export function withApiLogging(handler: RouteHandler, route: string): RouteHandler {
  return async (req, ctx) => {
    const start = Date.now()
    logger.info('api', `→ ${req.method} ${route}`)
    try {
      const res = await handler(req, ctx)
      logger.info('api', `← ${req.method} ${route} ${res.status} (${Date.now() - start}ms)`)
      return res
    } catch (err: any) {
      logger.error('api', `← ${req.method} ${route} ERROR (${Date.now() - start}ms)`, err)
      throw err
    }
  }
}
