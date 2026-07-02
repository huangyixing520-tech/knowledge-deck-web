/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: new URL(".", import.meta.url).pathname
  }
};

export default nextConfig;
