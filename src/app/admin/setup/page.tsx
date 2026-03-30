"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ZugSetup() {
  const router = useRouter();
  const [zugName, setZugName] = useState("");
  const [laden, setLaden] = useState(false);
  const [pruefe, setPruefe] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    // Prüfen: eingeloggt? Zug schon vorhanden?
    async function pruefen() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const { data: zug } = await supabase
        .from("zug")
        .select("id")
        .eq("zugfuehrer_id", session.user.id)
        .single();

      if (zug) {
        // Zug schon angelegt → direkt zum Admin
        router.push("/admin");
        return;
      }
      setPruefe(false);
    }
    pruefen();
  }, [router]);

  async function zugErstellen(e: React.FormEvent) {
    e.preventDefault();
    if (!zugName.trim()) return;
    setLaden(true);
    setFehler(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { error } = await supabase.from("zug").insert({
      name: zugName.trim(),
      zugfuehrer_id: session.user.id,
    });

    if (error) {
      setFehler("Zug konnte nicht erstellt werden. Bitte nochmals versuchen.");
      setLaden(false);
    } else {
      router.push("/admin");
    }
  }

  if (pruefe) {
    return <main className="p-6"><p className="text-gray-500">Wird geladen…</p></main>;
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-sm">
        <Link href="/login" className="text-sm text-red-600 mb-6 inline-block">← Abbrechen</Link>

        {/* Fortschrittsanzeige */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">✓</div>
            <span className="text-xs text-green-600 font-medium">Konto</span>
          </div>
          <div className="flex-1 h-px bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">2</div>
            <span className="text-xs text-red-600 font-medium">Zug</span>
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center font-bold">3</div>
            <span className="text-xs text-gray-400 font-medium">Fahrzeuge</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Zug einrichten</h1>
        <p className="text-gray-500 text-sm mb-8">
          Wie heisst dein Zug? Du kannst den Namen später ändern.
        </p>

        <form onSubmit={zugErstellen} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zugbezeichnung</label>
            <input
              type="text"
              required
              value={zugName}
              onChange={(e) => setZugName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-lg"
              placeholder="z.B. 3. Zug / Kp Sch 42"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">
              Erscheint auf den QR-Labels deiner Paletten
            </p>
          </div>

          {fehler && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{fehler}</p>
          )}

          <button
            type="submit"
            disabled={laden || !zugName.trim()}
            className="w-full bg-red-600 text-white rounded-xl py-4 font-semibold mt-2 disabled:opacity-50 active:bg-red-700"
          >
            {laden ? "Wird erstellt…" : "Zug erstellen & weiter →"}
          </button>
        </form>
      </div>
    </main>
  );
}
