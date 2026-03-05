/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: { unoptimized: true },
  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
