"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, laden } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!laden && !session) {
      router.push("/login");
    }
  }, [session, laden, router]);

  if (laden) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Wird geladen…</p>
      </main>
    );
  }

  if (!session) {
    // Wird per useEffect auf /login umgeleitet — kurz nichts anzeigen
    return null;
  }

  return <>{children}</>;
}
