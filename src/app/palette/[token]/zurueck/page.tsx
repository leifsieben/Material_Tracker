"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Transaktion } from "@/types";
import { MATERIAL_TYP_LABEL } from "@/types";

interface Props {
  params: Promise<{ token: string }>;
}

type Schritt = "liste" | "detail" | "erfolg";

export default function Rueckgabe({ params }: Props) {
  const { token } = React.use(params);
  const router = useRouter();

  const [offene, setOffene] = useState<Transaktion[]>([]);
  const [laden, setLaden] = useState(true);
  const [schritt, setSchritt] = useState<Schritt>("liste");
  const [ausgewaehlt, setAusgewaehlt] = useState<Transaktion | null>(null);
  const [menge, setMenge] = useState(0);
  const [senden, setSenden] = useState(false);

  useEffect(() => {
    async function laden() {
      const { data: pal } = await supabase
        .from("palette")
        .select("id")
        .eq("qr_token", token)
        .single();
      if (!pal) { setLaden(false); return; }

      const { data } = await supabase
        .from("transaktion")
        .select("*, material(*)")
        .eq("typ", "entnahme")
        .in("status", ["offen", "teilweise"])
        .eq("material.palette_id", pal.id);

      setOffene(data ?? []);
      setLaden(false);
    }
    laden();
  }, [token]);

  function waehleAus(t: Transaktion) {
    setAusgewaehlt(t);
    setMenge(Math.abs(t.anzahl));
    setSchritt("detail");
  }

  async function zurueckgeben(alles: boolean) {
    if (!ausgewaehlt) return;
    setSenden(true);

    const anzahl = alles ? Math.abs(ausgewaehlt.anzahl) : menge;
    const neuerStatus = anzahl >= Math.abs(ausgewaehlt.anzahl) ? "abgeschlossen" : "teilweise";

    // Rückgabe-Transaktion erstellen
    await supabase.from("transaktion").insert({
      material_id: ausgewaehlt.material_id,
      typ: "rueckgabe",
      grad: ausgewaehlt.grad,
      vorname: ausgewaehlt.vorname,
      nachname: ausgewaehlt.nachname,
      anzahl: anzahl,
      timestamp: new Date().toISOString(),
      status: "abgeschlossen",
      parent_id: ausgewaehlt.id,
    });

    // Original-Transaktion updaten
    await supabase
      .from("transaktion")
      .update({ status: neuerStatus })
      .eq("id", ausgewaehlt.id);

    setSenden(false);
    setSchritt("erfolg");
    setTimeout(() => router.push(`/palette/${token}`), 1500);
  }

  if (laden) return <main className="p-4"><p className="text-gray-500">Wird geladen…</p></main>;

  if (schritt === "erfolg") {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900">Rückgabe erfasst</h2>
        <p className="text-gray-500 text-sm">Wird weitergeleitet…</p>
      </main>
    );
  }

  if (schritt === "detail" && ausgewaehlt) {
    const maxMenge = Math.abs(ausgewaehlt.anzahl);
    return (
      <main className="max-w-lg mx-auto p-4">
        <button onClick={() => setSchritt("liste")} className="text-sm text-red-600 mb-4 inline-block">← Zurück</button>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Rückgabe bestätigen</h1>
        <p className="text-gray-500 text-sm mb-6">
          {ausgewaehlt.grad} {ausgewaehlt.nachname} {ausgewaehlt.vorname} — {ausgewaehlt.material?.objekt}
        </p>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-500 mb-1">Entnommene Menge</p>
          <p className="text-2xl font-bold text-gray-900">{maxMenge} Stück</p>
        </div>

        {/* Vollständige Rückgabe */}
        <button
          onClick={() => zurueckgeben(true)}
          disabled={senden}
          className="w-full bg-gray-800 text-white rounded-xl py-4 font-semibold mb-3 active:bg-gray-900 disabled:opacity-50"
        >
          Alles zurückgeben ({maxMenge} Stück)
        </button>

        {/* Teilrückgabe */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Teilrückgabe</p>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="number"
              min={1}
              max={maxMenge}
              value={menge}
              onChange={(e) => setMenge(Math.min(maxMenge, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-center text-lg font-bold"
            />
            <span className="text-gray-500 text-sm">von {maxMenge} Stück</span>
          </div>
          <button
            onClick={() => zurueckgeben(false)}
            disabled={senden || menge >= maxMenge}
            className="w-full bg-red-600 text-white rounded-xl py-3 font-semibold active:bg-red-700 disabled:opacity-50"
          >
            {menge} Stück zurückgeben
          </button>
        </div>
      </main>
    );
  }

  // Liste aller offenen Entnahmen
  return (
    <main className="max-w-lg mx-auto p-4">
      <Link href={`/palette/${token}`} className="text-sm text-red-600 mb-4 inline-block">← Zurück</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Rückgabe</h1>

      {offene.length === 0 && (
        <p className="text-gray-400 text-sm">Keine offenen Entnahmen.</p>
      )}

      <div className="flex flex-col gap-3">
        {offene.map((t) => (
          <button
            key={t.id}
            onClick={() => waehleAus(t)}
            className="text-left bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm active:bg-gray-50 w-full"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">
                  {t.grad} {t.nachname} {t.vorname}
                </p>
                <p className="text-sm text-gray-500">
                  {t.material?.objekt} · {t.material ? MATERIAL_TYP_LABEL[t.material.typ] : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{Math.abs(t.anzahl)} Stück</p>
                <p className={`text-xs ${t.status === "teilweise" ? "text-orange-500" : "text-gray-400"}`}>
                  {t.status === "teilweise" ? "Teilweise zurück" : "Offen"}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
