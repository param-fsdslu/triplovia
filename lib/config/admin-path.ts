/**
 * URL of the admin panel: a hashed segment instead of /admin, so it isn't found by scanning
 * common paths (the layout still checks the session and role). It must match the route folder
 * (app/console-b69ece1a1dc2); to change it, rename that folder and this constant together.
 *
 * Middleware imports this, so keep it dependency-free. Don't import it from code that ships to
 * public pages (navbar, auth panel): the path would end up in their JavaScript.
 */
export const ADMIN_PATH = '/console-b69ece1a1dc2'

export function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`)
}
