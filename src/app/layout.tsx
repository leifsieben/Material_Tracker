import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

// Alle Seiten dynamisch rendern — verhindert Prerender-Fehler
// wenn Supabase-Env-Variablen beim Build noch nicht gesetzt sind.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Material Tracker",
  description: "Materialverwaltung für Züge der Schweizer Armee",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Material Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#dc2626",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
