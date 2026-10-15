/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // The backend is plain HTTP; calling it from an HTTPS page is blocked as mixed content.
  // Proxy /api through this server so the browser only talks same-origin HTTPS.
  async rewrites() {
    const backend = (process.env.BACKEND_URL ?? "http://64.181.201.53").replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

module.exports = nextConfig;
