import { Navbar } from '@/components/Navbar'
import { Link } from '@/i18n/routing'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar transparent={false} />

      {/* pt accounts for the fixed navbar height */}
      <main className="flex-1 flex flex-col pt-16 sm:pt-[72px]">{children}</main>

      <footer className="border-t border-border bg-muted/50 py-4">
        <div className="page-container flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Triplovia. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/hotels" className="hover:text-foreground transition-colors">
              Hotels
            </Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link href="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
