import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Hedon | Erotismo Guiado",
  description: "Conecta, explora y siente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased text-foreground min-h-screen flex flex-col`} suppressHydrationWarning>
        {/* Global Background Layer - Eros Theme (Simpler, Robust) */}
        <div
          className="fixed inset-0 -z-50 pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at 50% -20%, #450a0a 0%, #000000 60%),
              radial-gradient(circle at 100% 100%, #1f0505 0%, transparent 50%)
            `,
            backgroundColor: '#000000'
          }}
        />

        {children}
      </body>
    </html>
  );
}
