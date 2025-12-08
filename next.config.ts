import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ydwmcthdjvhmiewwnpfo.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      // Add fallback for any Supabase project
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      }
    ],
  },
};

export default nextConfig;