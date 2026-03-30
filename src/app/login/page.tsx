"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function Login() {
  const router = useRouter();
  const { session, laden: authLaden } = useAuth();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  // Bereits eingeloggt → direkt zum Admin
  useEffect(() => {
    if (!authLaden && session) {
      router.push("/admin");
    }
  }, [session, authLaden, router]);

  async function anmelden(e: React.FormEvent) {
    e.preventDefault();
    setLaden(true);
    setFehler(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setFehler("E-Mail noch nicht bestätigt. Bitte zuerst den Link in der Bestätigungsmail klicken — oder E-Mail-Bestätigung in Supabase deaktivieren.");
      } else if (error.message.includes("Invalid login credentials")) {
        setFehler("E-Mail oder Passwort falsch.");
      } else {
        setFehler(`Anmeldung fehlgeschlagen: ${error.message}`);
      }
      setLaden(false);
    } else {
      router.push("/admin");
    }
  }

  if (authLaden) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Wird geladen…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Zugführer Login</h1>
        <p className="text-gray-500 text-sm mb-8">Nur für Zugführer mit Account</p>

        <form onSubmit={anmelden} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
            <input
              type="password"
              required
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
              autoComplete="current-password"
            />
          </div>

          {fehler && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{fehler}</p>
          )}

          <button
            type="submit"
            disabled={laden}
            className="w-full bg-gray-800 text-white rounded-xl py-4 font-semibold mt-2 disabled:opacity-50"
          >
            {laden ? "Wird angemeldet…" : "Anmelden"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Noch kein Konto?{" "}
          <Link href="/signup" className="text-red-600 font-medium">Jetzt registrieren</Link>
        </p>
      </div>
    </main>
  );
}
