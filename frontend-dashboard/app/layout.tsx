import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashboard de Folios",
  description: "Panel corporativo de folios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
