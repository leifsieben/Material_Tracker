"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Palette, Material } from "@/types";
import { MATERIAL_TYP_LABEL } from "@/types";

interface Props {
  params: Promise<{ token: string }>;
}

export default function PalettenAnsicht({ params }: Props) {
  const { token } = React.use(params);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [material, setMaterial] = useState<Material[]>([]);
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    async function laden() {
      const { data: pal, error: palErr } = await supabase
        .from("palette")
        .select("*")
        .eq("qr_token", token)
        .single();

      if (palErr || !pal) {
        setFehler("Palette nicht gefunden.");
        setLaden(false);
        return;
      }

      setPalette(pal);

      const { data: mat } = await supabase
        .from("material")
        .select("*")
        .eq("palette_id", pal.id);

      setMaterial(mat ?? []);
      setLaden(false);
    }
    laden();
  }, [token]);

  if (laden) return <main className="p-4"><p className="text-gray-500">Wird geladen…</p></main>;
  if (fehler) return <main className="p-4"><p className="text-red-600">{fehler}</p></main>;

  return (
    <main className="max-w-lg mx-auto p-4">
      <Link href="/zug" className="text-sm text-red-600 mb-4 inline-block">← Zurück</Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">{palette?.name}</h1>
      <p className="text-gray-500 text-sm mb-6">{material.length} Materialposten</p>

      {/* Aktionsbuttons */}
      <div className="flex gap-3 mb-3">
        <Link
          href={`/palette/${token}/entnehmen`}
          className="flex-1 text-center bg-red-600 text-white rounded-xl px-4 py-3 font-semibold active:bg-red-700"
        >
          Entnehmen
        </Link>
        <Link
          href={`/palette/${token}/zurueck`}
          className="flex-1 text-center bg-gray-700 text-white rounded-xl px-4 py-3 font-semibold active:bg-gray-800"
        >
          Zurückgeben
        </Link>
      </div>
      <Link
        href={`/palette/${token}/uebersicht`}
        className="block text-center text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-2.5 mb-6 active:bg-gray-50"
      >
        Wer hat was? →
      </Link>

      {/* Materialliste */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Bestand</h2>
        <div className="flex flex-col gap-2">
          {material.map((m) => (
            <div key={m.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{m.objekt}</p>
                <p className="text-xs text-gray-400">{MATERIAL_TYP_LABEL[m.typ]}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-lg ${m.bestand_aktuell < m.bestand_initial * 0.2 ? "text-red-600" : "text-gray-900"}`}>
                  {m.bestand_aktuell}
                </p>
                <p className="text-xs text-gray-400">/ {m.bestand_initial}</p>
              </div>
            </div>
          ))}
          {material.length === 0 && (
            <p className="text-gray-400 text-sm">Kein Material auf dieser Palette.</p>
          )}
        </div>
      </section>
    </main>
  );
}
