import localFont from 'next/font/local'

// Self-hosted rather than next/font/google: Google Fonts sometimes answers with
// `fonts.gstatic.com/l/font?kit=…&skey=…` URLs, which Turbopack can't resolve ("next/font/google
// queries have exactly one entry"), and builds then also need no network. Made from
// google/fonts ofl/inter/Inter[opsz,wght].ttf and ofl/manrope/Manrope[wght].ttf with fontTools:
// `fontTools.varLib.instancer` (Inter opsz=14 wght=400:600, Manrope wght=600:800), then
// `fontTools.subset --flavor=woff2 --layout-features+=tnum,pnum,case,frac,zero` to Google's
// latin + latin-ext unicode ranges (keeps ₹ and accented letters)

/** Body text, navigation, buttons and forms */
export const inter = localFont({
  src: '../app/fonts/inter-latin-wght-400-600.woff2',
  variable: '--font-inter',
  weight: '400 600',
  display: 'swap',
})

/** Headings, titles and hotel names */
export const manrope = localFont({
  src: '../app/fonts/manrope-latin-wght-600-800.woff2',
  variable: '--font-manrope',
  weight: '600 800',
  display: 'swap',
})

/**
 * Put on <html>: Tailwind declares --font-sans/--font-heading on :root, so the next/font
 * variables they reference must be defined there too
 */
export const fontVariables = `${inter.variable} ${manrope.variable}`
