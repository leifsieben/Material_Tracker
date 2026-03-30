"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Fahrzeug, Palette } from "@/types";

interface FahrzeugMitPaletten extends Fahrzeug {
  paletten: Palette[];
}

export default function ZugUebersicht() {
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugMitPaletten[]>([]);
  const [zugId, setZugId] = useState<string | null>(null);
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    async function laden() {
      const { data: fz, error: fzErr } = await supabase
        .from("fahrzeug")
        .select("*, paletten:palette(*)");
      if (fzErr) {
        setFehler("Daten konnten nicht geladen werden.");
      } else {
        setFahrzeuge(fz ?? []);
        if (fz?.[0]) setZugId(fz[0].zug_id);
      }
      setLaden(false);
    }
    laden();
  }, []);

  return (
    <main className="max-w-lg mx-auto p-4">
      <Link href="/" className="text-sm text-red-600 mb-4 inline-block">← Startseite</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Zugübersicht</h1>

      {laden && <p className="text-gray-500">Wird geladen…</p>}
      {fehler && <p className="text-red-600">{fehler}</p>}

      {fahrzeuge.map((fz) => (
        <section key={fz.id} className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>🚗</span> {fz.name}
          </h2>
          <div className="flex flex-col gap-2">
            {fz.paletten.map((p) => (
              <Link
                key={p.id}
                href={`/palette/${p.qr_token}`}
                className="block bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm active:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{p.name}</span>
                <span className="text-xs text-gray-400 ml-2">→ öffnen</span>
              </Link>
            ))}
            {fz.paletten.length === 0 && (
              <p className="text-sm text-gray-400 pl-1">Keine Paletten</p>
            )}
          </div>
        </section>
      ))}

      {!laden && fahrzeuge.length === 0 && !fehler && (
        <p className="text-gray-400 text-sm">Noch keine Fahrzeuge angelegt.</p>
      )}

      {zugId && (
        <Link
          href={`/uebersicht/${zugId}`}
          className="block text-center text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-3 mt-4 active:bg-gray-50"
        >
          Wer hat was? →
        </Link>
      )}
    </main>
  );
}
