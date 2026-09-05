const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "../../../lib/ingreso-cliente-marginal.js": path.join(__dirname, "..", "lib", "ingreso-cliente-marginal.js"),
    };
    return config;
  },
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
