/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Menor huella en RAM en producción (Render Starter 512MB): evita cargar todo node_modules al arrancar. */
  output: "standalone",
  // Evita que el build falle por warnings/errores de ESLint en Render
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:10000";
    return [
      { source: "/api-backend/:path*", destination: `${apiUrl}/:path*` },
    ];
  },
};

module.exports = nextConfig;
