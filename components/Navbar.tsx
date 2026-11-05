"use client";

import * as React from "react";
import {
  Menu,
  X,
  Home,
  Ship,
  Info,
  LogOut,
  Heart,
  Hotel,
  BookOpen,
  Mail,
  Phone,
  Whatsapp,
} from "@/components/icons";
import { Link, usePathname } from "@/i18n/routing";
import { ACCOUNT_LINKS } from "@/components/account/account-links";
import { getCurrentUser } from "@/lib/actions/session";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { TripsIcon } from "@/components/icons/TripsIcon";
import { accountLabel, accountName } from "@/lib/utils/account-label";
import { CONTACT, whatsappUrl } from "@/lib/config/contact";
import { SocialLinks } from "@/components/layout/SocialLinks";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { isFeatureEnabled, type FeatureName } from "@/lib/config/features";
import { useUIStore } from "@/lib/stores/use-ui-store";
import { hotelsSearchHref, useSearchStore } from "@/lib/stores/use-search-store";

interface NavbarProps {
  /** When false, the navbar always renders in the solid/opaque state (use on pages without a hero image). */
  transparent?: boolean;
}

export function Navbar({ transparent = true }: NavbarProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const [user, setUser] = React.useState<{ email?: string; label: string; initial: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const mobileOpen = useUIStore((s) => s.mobileMenuOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileMenuOpen);
  const openAuth = useUIStore((s) => s.openAuth);
  const authVersion = useUIStore((s) => s.authVersion);
  const pathname = usePathname();
  // Hotels opens the results for the search box's city, dates and guests (not every hotel)
  const hotelsHref = useSearchStore(hotelsSearchHref);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // solid = always show the opaque state when transparency is disabled, or when user has scrolled
  const solid = !transparent || scrolled;

  // Sign-in/out happen through server actions followed by navigation (or the login popup,
  // which bumps authVersion), so re-reading the session then keeps the menu in sync
  React.useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((current) => {
        if (cancelled) return;
        if (!current) return setUser(null);
        // Name first, else the mobile number, else the email (by request)
        const label = accountLabel(current);
        const initial = (accountName(current) || current.email || "U").charAt(0).toUpperCase();
        setUser({ email: current.email ?? undefined, label, initial });
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, authVersion]);

  // `path` marks the active link; `href` may carry a query (Hotels: the current search).
  // `showIcon`: the icon also shows in the desktop bar (the phone menu shows every icon).
  // `menuOnly`: only in the phone menu's Explore list, not the desktop bar
  const navLinks = [
    { path: "/", href: "/", label: "Home", icon: Home },
    { path: "/hotels", href: hotelsHref, label: "Hotels", icon: Hotel, feature: "hotels" as FeatureName, showIcon: true },
    { path: "/boats", href: "/boats", label: "Boat Trips", icon: Ship, feature: "boats" as FeatureName },
    { path: "/blog", href: "/blog", label: "Travel Blog", icon: BookOpen, feature: "blogs" as FeatureName, menuOnly: true },
    { path: "/about", href: "/about", label: "About", icon: Info },
  ].filter((link) => !("feature" in link) || isFeatureEnabled(link.feature!));

  // Signed-in menu (profile dropdown + mobile sheet): the account sidebar's pages, in the same order
  const accountLinks = ACCOUNT_LINKS;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => { await signOut(); };

  const openTripsSignIn = () =>
    openAuth({ intent: "login", redirectTo: "/bookings", notice: "Sign in to see and manage your bookings." });

  /* ─── scrolled = frosted glass; at-top = transparent ─── */
  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        solid
          ? "bg-background/95 backdrop-blur-md shadow-[0_1px_0_0_var(--border)]"
          : "bg-transparent"
      )}
    >
      <div className="page-container flex h-16 sm:h-[72px] items-center justify-between">

        {/* ── Logo ─────────────────────────────────────────── */}
        <Link href="/" className={cn(
          "flex items-center gap-2 group transition-all",
          solid ? "" : "drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
        )}>
          <Image
            src="/company-logo-only.svg"
            alt="Triplovia"
            width={40}
            height={40}
            className="h-9 w-9 sm:h-10 sm:w-10"
          />
          <Image
            src="/company-logo-text-only.svg"
            alt="Triplovia"
            width={140}
            height={32}
            className={cn("h-7 w-auto hidden sm:block", !solid && "brightness-0 invert")}
          />
        </Link>

        {/* ── Desktop Nav ───────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.filter((link) => !("menuOnly" in link && link.menuOnly)).map((link) => {
            const active = isActive(link.path);
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                href={link.href}
                className={cn(
                  "relative inline-flex items-center gap-1.5 px-3 py-2 text-[15px] font-medium rounded-full transition-colors duration-200",
                  active
                    ? solid
                      ? "text-primary"
                      : "text-white"
                    : solid
                    ? "text-foreground/70 hover:text-primary"
                    : "text-white/80 hover:text-white"
                )}
              >
                {"showIcon" in link && link.showIcon && <Icon className="h-[18px] w-[18px] shrink-0" />}
                {link.label}
                {active && (
                  <span
                    className={cn(
                      "absolute -bottom-px left-3 right-3 h-0.5 rounded-full",
                      solid ? "bg-primary" : "bg-gold"
                    )}
                  />
                )}
              </Link>
            );
          })}

          {/* My Trips: bookings shortcut (signed-out visitors sign in first, then land on it) */}
          <TripsButton
            solid={solid}
            active={isActive("/bookings")}
            signedOut={!loading && !user}
            onSignIn={openTripsSignIn}
            className="ml-1"
          />

          {/* Auth */}
          <div
            className={cn(
              "flex items-center gap-2 ml-2 pl-2 border-l",
              solid ? "border-border" : "border-white/20"
            )}
          >
            {loading ? (
              <div className="h-10 w-24 bg-white/10 animate-pulse rounded-full" />
            ) : user ? (
              <>
                <Link
                  href="/wishlist"
                  title="My Wishlist"
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
                    solid
                      ? "text-muted-foreground hover:text-red-500 hover:bg-red-50"
                      : "text-white/75 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Heart className="h-5 w-5" />
                </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10 ring-2 ring-gold/40">
                      <AvatarFallback
                        className="bg-primary text-white text-sm font-semibold"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {user.initial}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-semibold">My Account</p>
                      <p className="text-xs text-muted-foreground truncate">{user.label}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {accountLinks.map(({ href, label, icon: Icon }) => (
                    <DropdownMenuItem key={href} asChild>
                      <Link href={href} className="cursor-pointer flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-10 rounded-full px-4 font-medium text-[15px]",
                    solid ? "text-foreground" : "text-white hover:bg-white/10 hover:text-white"
                  )}
                  onClick={() => openAuth({ intent: "login" })}
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "h-10 rounded-full px-5 font-semibold text-[15px] shadow-none",
                    solid
                      ? "bg-primary text-white hover:bg-primary-hover"
                      : "bg-white text-primary hover:bg-white/90"
                  )}
                  onClick={() => openAuth({ intent: "signup" })}
                >
                  Register
                </Button>
              </>
            )}
          </div>
        </nav>

        {/* ── Mobile: My Trips icon beside the hamburger ─────── */}
        <TripsButton
          compact
          solid={solid}
          active={isActive("/bookings")}
          signedOut={!loading && !user}
          onSignIn={openTripsSignIn}
          className="ml-auto mr-1 md:hidden"
        />

        {/* ── Mobile hamburger ──────────────────────────────── */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "md:hidden rounded-full h-10 w-10",
                solid ? "text-foreground hover:bg-muted" : "text-white hover:bg-white/15"
              )}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            hideClose
            className="flex w-[86vw] max-w-[360px] flex-col gap-0 border-l border-border bg-card p-0 sm:max-w-[360px]"
          >
            {/* ── Top bar: logo + close ── */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
              <SheetTitle className="flex items-center gap-2">
                <Image src="/company-logo-only.svg" alt="Triplovia" width={28} height={28} className="h-7 w-7" />
                <Image src="/company-logo-text-only.svg" alt="Triplovia" width={96} height={22} className="h-5 w-auto" />
              </SheetTitle>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto pb-3">
              {/* ── Who's signed in, or sign-in buttons ── */}
              <div className="border-b border-border px-5 py-5">
                {loading ? (
                  <div className="h-11 animate-pulse rounded-2xl bg-muted" />
                ) : user ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarFallback className="bg-primary font-heading text-base font-bold text-white">
                        {user.initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-foreground">{user.label}</p>
                      <p className="text-xs text-muted-foreground">Signed in</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Sign in to book faster and manage your trips.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="h-10 rounded-full font-semibold"
                        onClick={() => { setMobileOpen(false); openAuth({ intent: "login" }); }}
                      >
                        Sign in
                      </Button>
                      <Button
                        className="h-10 rounded-full bg-primary font-semibold hover:bg-primary-hover"
                        onClick={() => { setMobileOpen(false); openAuth({ intent: "signup" }); }}
                      >
                        Register
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* ── Your account first, then Explore ── */}
              <MenuSection title="Your account">
                {!loading && !user ? (
                  <MenuRow icon={TripsIcon} label="My Trips" onClick={() => { setMobileOpen(false); openTripsSignIn(); }} />
                ) : (
                  <>
                    <MenuRow icon={TripsIcon} label="My Trips" href="/bookings" active={isActive("/bookings")} onNavigate={() => setMobileOpen(false)} />
                    {accountLinks
                      .filter(({ href }) => href !== "/bookings")
                      .map(({ href, label, icon }) => (
                        <MenuRow key={href} icon={icon} label={label} href={href} active={pathname === href} onNavigate={() => setMobileOpen(false)} />
                      ))}
                  </>
                )}
              </MenuSection>

              <MenuSection title="Explore">
                {navLinks.map((link) => (
                  <MenuRow
                    key={link.path}
                    icon={link.icon}
                    label={link.label}
                    href={link.href}
                    active={isActive(link.path)}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))}
              </MenuSection>

              {user && (
                <div className="mt-2 border-t border-border pt-2">
                  <MenuRow
                    icon={LogOut}
                    label="Sign out"
                    tone="danger"
                    onClick={() => { handleSignOut(); setMobileOpen(false); }}
                  />
                </div>
              )}
            </nav>

            {/* ── Help and social, small ── */}
            <div className="shrink-0 border-t border-border px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <p className="text-xs text-muted-foreground">
                Need help?{" "}
                <a href={`tel:${CONTACT.phone}`} className="font-semibold text-foreground hover:text-primary">
                  {CONTACT.phoneDisplay}
                </a>
              </p>
              <div className="mt-3 flex items-center gap-1.5">
                {[
                  { href: `tel:${CONTACT.phone}`, label: `Call ${CONTACT.phoneDisplay}`, icon: Phone },
                  { href: whatsappUrl(), label: "WhatsApp us", icon: Whatsapp },
                  { href: `mailto:${CONTACT.email}`, label: `Email ${CONTACT.email}`, icon: Mail },
                ].map(({ href, label, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    title={label}
                    {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
                <span aria-hidden="true" className="mx-1.5 h-5 w-px bg-border" />
                <SocialLinks tone="plain" />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <AuthDialog />
    </header>
  );
}

interface TripsButtonProps {
  /** Navbar is opaque (scrolled / no hero) rather than over the hero photo */
  solid: boolean;
  active: boolean;
  /** Not signed in: open the login popup instead of linking */
  signedOut: boolean;
  onSignIn: () => void;
  /** Icon only (phones) */
  compact?: boolean;
  className?: string;
}

/** "My Trips" shortcut to the bookings page: bold suitcase chip, plus a two-line label from lg */
function TripsButton({ solid, active, signedOut, onSignIn, compact = false, className }: TripsButtonProps) {
  const content = (
    <>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-colors duration-200",
          solid
            ? cn("bg-primary text-white group-hover:bg-primary-hover", active && "ring-2 ring-gold ring-offset-1 ring-offset-background")
            : cn("bg-white text-primary group-hover:bg-white/90", active && "ring-2 ring-gold")
        )}
      >
        <TripsIcon className="h-[23px] w-[23px]" />
      </span>
      {!compact && (
        <span className="hidden flex-col text-left leading-tight lg:flex">
          <span className={cn("font-heading text-[15px] font-extrabold", solid ? "text-foreground" : "text-white")}>
            My Trips
          </span>
          <span className={cn("text-xs font-medium", solid ? "text-muted-foreground" : "text-white/75")}>
            Manage bookings
          </span>
        </span>
      )}
    </>
  );
  const classes = cn("group flex items-center gap-2 rounded-xl", !compact && "lg:pr-1", className);

  if (signedOut) {
    return (
      <button type="button" onClick={onSignIn} aria-label="My Trips" title="My Trips: manage your bookings" className={classes}>
        {content}
      </button>
    );
  }
  return (
    <Link
      href="/bookings"
      aria-label="My Trips"
      aria-current={active ? "page" : undefined}
      title="My Trips: manage your bookings"
      className={classes}
    >
      {content}
    </Link>
  );
}

/** A titled group of rows in the phone menu */
function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-4">
      <p className="px-5 pb-1.5 text-xs font-medium text-muted-foreground">{title}</p>
      <div>{children}</div>
    </div>
  );
}

interface MenuRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** A link, or a button when `onClick` is given instead */
  href?: string;
  active?: boolean;
  tone?: "default" | "danger";
  onClick?: () => void;
  /** Runs when the link is followed (closes the menu) */
  onNavigate?: () => void;
}

/** One phone-menu row: plain icon + label; the current page gets a teal bar on the left */
function MenuRow({ icon: Icon, label, href, active = false, tone = "default", onClick, onNavigate }: MenuRowProps) {
  const className = cn(
    "relative flex h-12 w-full items-center gap-3.5 px-5 text-left text-[15px] transition-colors",
    tone === "danger"
      ? "text-destructive hover:bg-red-50"
      : active
        ? "bg-muted/60 font-semibold text-primary"
        : "font-medium text-foreground hover:bg-muted/60"
  );
  const content = (
    <>
      {active && <span aria-hidden="true" className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-primary" />}
      <Icon className={cn("h-5 w-5 shrink-0", tone === "danger" ? "text-destructive" : active ? "text-primary" : "text-muted-foreground")} />
      {label}
    </>
  );
  if (href) {
    return (
      <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
