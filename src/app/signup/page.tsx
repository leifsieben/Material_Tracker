"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [passwortWdh, setPasswortWdh] = useState("");
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function registrieren(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);

    if (passwort !== passwortWdh) {
      setFehler("Passwörter stimmen nicht überein.");
      return;
    }
    if (passwort.length < 8) {
      setFehler("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    setLaden(true);
    const { error } = await supabase.auth.signUp({ email, password: passwort });

    if (error) {
      setFehler(error.message === "User already registered"
        ? "Diese E-Mail ist bereits registriert."
        : "Registrierung fehlgeschlagen. Bitte nochmals versuchen.");
      setLaden(false);
    } else {
      // Weiterleitung zum Zug-Setup
      router.push("/admin/setup");
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Konto erstellen</h1>
        <p className="text-gray-500 text-sm mb-8">Für Zugführer mit eigenem Zug</p>

        <form onSubmit={registrieren} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
              autoComplete="email"
              placeholder="name@example.com"
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
              autoComplete="new-password"
              placeholder="Mindestens 8 Zeichen"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passwort wiederholen</label>
            <input
              type="password"
              required
              value={passwortWdh}
              onChange={(e) => setPasswortWdh(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
              autoComplete="new-password"
              placeholder="Passwort bestätigen"
            />
          </div>

          {fehler && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{fehler}</p>}

          <button
            type="submit"
            disabled={laden}
            className="w-full bg-red-600 text-white rounded-xl py-4 font-semibold mt-2 disabled:opacity-50 active:bg-red-700"
          >
            {laden ? "Wird registriert…" : "Konto erstellen"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Bereits ein Konto?{" "}
          <Link href="/login" className="text-red-600 font-medium">Anmelden</Link>
        </p>
      </div>
    </main>
  );
}
