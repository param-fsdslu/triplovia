const isDev = process.env.NODE_ENV === 'development'

function ts() {
  return new Date().toISOString().slice(11, 23) // HH:MM:SS.mmm
}

export const logger = {
  /** Dev-only: general informational log */
  info(context: string, message: string, data?: object) {
    if (!isDev) return
    console.log(`[${ts()}] [INFO] [${context}] ${message}`, data !== undefined ? data : '')
  },

  /** Dev-only: outgoing network / external API call */
  network(context: string, method: string, endpoint: string, meta?: object) {
    if (!isDev) return
    console.log(`[${ts()}] [NET ] [${context}] ${method} ${endpoint}`, meta !== undefined ? meta : '')
  },

  /** Always logs — errors must be visible in production */
  error(context: string, message: string, error?: unknown, data?: object) {
    console.error(
      `[${ts()}] [ERR ] [${context}] ${message}`,
      error !== undefined ? error : '',
      data !== undefined ? data : ''
    )
  },

  /**
   * Always logs in all environments — use for temporary production tracing.
   * Remove calls once the issue is diagnosed.
   */
  always(context: string, message: string, data?: object) {
    console.log(`[${ts()}] [TRACE] [${context}] ${message}`, data !== undefined ? data : '')
  },

  /** Dev-only: warnings */
  warn(context: string, message: string, data?: object) {
    if (!isDev) return
    console.warn(`[${ts()}] [WARN] [${context}] ${message}`, data !== undefined ? data : '')
  },

  /** Dev-only: verbose debug output */
  debug(context: string, message: string, data?: object) {
    if (!isDev) return
    console.debug(`[${ts()}] [DBG ] [${context}] ${message}`, data !== undefined ? data : '')
  },
}
