import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Only signed URLs of our own Supabase Storage (any query string: the signature token).
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
            hostname: supabaseUrl.hostname,
            port: supabaseUrl.port,
            pathname: "/storage/v1/object/sign/board-media/**",
          },
        ]
      : [],
    // Local Supabase (127.0.0.1) during E2E only; never in production.
    dangerouslyAllowLocalIP: process.env.ALLOW_LOCAL_IMAGE_IP === "1",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Board links are capabilities: never leak them through the Referer header.
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/b/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
