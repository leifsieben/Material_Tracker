"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function parseZugName(name: string): { zug: string; kompanie: string } {
  // "Zug Wyss, Kp 3" → { zug: "Wyss", kompanie: "3" }
  const match = name.match(/^Zug (.+?),\s*Kp (.+)$/);
  if (match) return { zug: match[1], kompanie: match[2] };
  // "Zug Wyss" → { zug: "Wyss", kompanie: "" }
  const matchOhneKp = name.match(/^Zug (.+)$/);
  if (matchOhneKp) return { zug: matchOhneKp[1], kompanie: "" };
  return { zug: name, kompanie: "" };
}

function baueName(zug: string, kompanie: string): string {
  const z = zug.trim();
  const kp = kompanie.trim();
  if (!z) return "";
  if (kp) return `Zug ${z}, Kp ${kp}`;
  return `Zug ${z}`;
}

export default function ZugSetup() {
  const router = useRouter();
  const [zugFeld, setZugFeld] = useState("");
  const [kompanieFeld, setKompanieFeld] = useState("");
  const [laden, setLaden] = useState(false);
  const [pruefe, setPruefe] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [vorhandeneZugId, setVorhandeneZugId] = useState<string | null>(null);

  useEffect(() => {
    async function pruefen() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: zug } = await supabase
        .from("zug")
        .select("id, name")
        .eq("zugfuehrer_id", session.user.id)
        .single();

      if (zug) {
        // Zug existiert → Felder vorausfüllen für Bearbeitung
        const parsed = parseZugName(zug.name);
        setZugFeld(parsed.zug);
        setKompanieFeld(parsed.kompanie);
        setVorhandeneZugId(zug.id);
      }
      setPruefe(false);
    }
    pruefen();
  }, [router]);

  async function speichern(e: React.FormEvent) {
    e.preventDefault();
    const name = baueName(zugFeld, kompanieFeld);
    if (!name) return;
    setLaden(true);
    setFehler(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    if (vorhandeneZugId) {
      // Bestehenden Zug updaten
      const { error } = await supabase
        .from("zug")
        .update({ name })
        .eq("id", vorhandeneZugId);

      if (error) {
        setFehler("Zug konnte nicht gespeichert werden.");
        setLaden(false);
      } else {
        router.push("/admin");
      }
    } else {
      // Neuen Zug erstellen
      const { error } = await supabase.from("zug").insert({
        name,
        zugfuehrer_id: session.user.id,
      });

      if (error) {
        setFehler("Zug konnte nicht erstellt werden. Bitte nochmals versuchen.");
        setLaden(false);
      } else {
        router.push("/admin");
      }
    }
  }

  if (pruefe) {
    return <main className="p-6"><p className="text-gray-500">Wird geladen…</p></main>;
  }

  const istBearbeitung = vorhandeneZugId !== null;
  const vorschau = baueName(zugFeld, kompanieFeld);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-sm">
        <Link href={istBearbeitung ? "/admin" : "/login"} className="text-sm text-red-600 mb-6 inline-block">
          ← {istBearbeitung ? "Admin" : "Abbrechen"}
        </Link>

        {!istBearbeitung && (
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
        )}

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {istBearbeitung ? "Zug bearbeiten" : "Zug einrichten"}
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          {istBearbeitung
            ? "Name wird auf QR-Labels und im Admin-Bereich angezeigt."
            : "Wie heisst dein Zug und deine Kompanie?"}
        </p>

        <form onSubmit={speichern} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zug <span className="text-red-500">*</span>
            </label>
            <div className="flex items-stretch border border-gray-300 rounded-lg overflow-hidden">
              <span className="bg-gray-100 px-3 flex items-center text-gray-600 border-r border-gray-300 text-sm select-none font-medium">
                Zug
              </span>
              <input
                type="text"
                required
                value={zugFeld}
                onChange={(e) => setZugFeld(e.target.value)}
                className="flex-1 px-3 py-2.5 outline-none"
                placeholder="Wyss / 2 / 3. Zug"
                autoFocus={!istBearbeitung}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kompanie <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <div className="flex items-stretch border border-gray-300 rounded-lg overflow-hidden">
              <span className="bg-gray-100 px-3 flex items-center text-gray-600 border-r border-gray-300 text-sm select-none font-medium">
                Kp
              </span>
              <input
                type="text"
                value={kompanieFeld}
                onChange={(e) => setKompanieFeld(e.target.value)}
                className="flex-1 px-3 py-2.5 outline-none"
                placeholder="3 / Abbadessa / Sch 42"
              />
            </div>
          </div>

          {vorschau && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Vorschau</p>
              <p className="font-semibold text-gray-900">{vorschau}</p>
            </div>
          )}

          {fehler && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{fehler}</p>
          )}

          <button
            type="submit"
            disabled={laden || !zugFeld.trim()}
            className="w-full bg-red-600 text-white rounded-xl py-4 font-semibold mt-2 disabled:opacity-50 active:bg-red-700"
          >
            {laden ? "Wird gespeichert…" : istBearbeitung ? "Speichern" : "Zug erstellen & weiter →"}
          </button>
        </form>
      </div>
    </main>
  );
}
