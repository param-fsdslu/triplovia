/**
 * Server-side logging straight to the process's stdout / stderr (the terminal, Netlify function logs).
 *
 * Not `console.*`: in development React replays server console calls made while it renders or runs a
 * server action in the browser, and that replay crashed the admin panel ("frame.join is not a
 * function", React's dev-only stack rebuilding) for some errors. Writing to the streams directly
 * keeps the logs in the terminal only, and also keeps server details out of visitors' consoles.
 * Server code only (it uses node:util).
 */
import { formatWithOptions } from 'node:util'

function write(stream: NodeJS.WriteStream, level: string, args: unknown[]) {
  stream.write(`${level} ${formatWithOptions({ colors: false, depth: 6 }, ...args)}\n`)
}

export const serverLog = {
  error: (...args: unknown[]) => write(process.stderr, '[error]', args),
  warn: (...args: unknown[]) => write(process.stderr, '[warn]', args),
  info: (...args: unknown[]) => write(process.stdout, '[info]', args),
}
