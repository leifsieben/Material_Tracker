"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, user, laden } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!laden && !session) router.push("/login");
  }, [session, laden, router]);

  async function abmelden() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (laden) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Wird geladen…</p>
      </main>
    );
  }

  if (!session) return null;

  // E-Mail kürzen: leif.sieben@mil.ch → leif.sieben@…
  const emailKurz = user?.email
    ? user.email.length > 22
      ? user.email.slice(0, user.email.indexOf("@") + 1) + "…"
      : user.email
    : "";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Account-Header */}
      <header className="no-print bg-gray-900 text-white px-4 py-2.5 flex justify-between items-center shrink-0">
        <span className="text-xs font-bold tracking-widest uppercase text-gray-400">
          Material Tracker
        </span>
        <div className="flex items-center gap-2">
          <a
            href="mailto:sieben.leif@gmail.com?subject=Material%20Tracker%20Feedback"
            className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded-md transition-colors"
          >
            Feedback
          </a>
          <span className="text-xs text-gray-300">👤 {emailKurz}</span>
          <button
            onClick={abmelden}
            className="text-xs bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white rounded-md px-2.5 py-1 transition-colors"
          >
            Abmelden
          </button>
        </div>
      </header>

      {/* Seiteninhalt */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
