import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// A custom domain in front of the Bunny pull zone (BUNNY_CDN_URL), if it isn't *.b-cdn.net
const bunnyCdnHost = (() => {
  const url = process.env.BUNNY_CDN_URL?.trim();
  if (!url) return null;
  try {
    const { hostname } = new URL(url.includes('://') ? url : `https://${url}`);
    return hostname.endsWith('.b-cdn.net') ? null : hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      // Bunny CDN: the image pull zone (BUNNY_CDN_URL)
      {
        protocol: 'https',
        hostname: '**.b-cdn.net',
        port: '',
        pathname: '/**',
      },
      ...(bunnyCdnHost
        ? [{ protocol: 'https' as const, hostname: bunnyCdnHost, port: '', pathname: '/**' }]
        : []),
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/**',
      },
      // Legacy Supabase Storage URLs — remove once scripts/migrate-supabase-to-firebase.mjs has run
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
  },
};

export default withNextIntl(nextConfig);
