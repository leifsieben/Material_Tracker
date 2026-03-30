"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Fahrzeug, Palette, Zug } from "@/types";

interface FahrzeugMitPaletten extends Fahrzeug {
  paletten: Palette[];
}

function ZugUebersichtInner() {
  const params = useSearchParams();
  const { zugId: eigenerZugId, session } = useAuth();
  const istZugfuehrer = !!session;

  // Welcher Zug wird angezeigt:
  // - Zugführer ohne param → eigener Zug
  // - Zugführer mit param → der gewählte Zug
  // - Soldat → muss zug_id-Param haben (kommt aus Palette-URL)
  const paramZugId = params.get("zug_id");

  const [effectiveZugId, setEffectiveZugId] = useState<string | null>(null);
  const [alleZuege, setAlleZuege] = useState<Zug[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugMitPaletten[]>([]);
  const [zugName, setZugName] = useState<string>("");
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  // Effektiven Zug bestimmen sobald Auth geladen
  useEffect(() => {
    if (istZugfuehrer) {
      // Zugführer: param überschreibt eigenen Zug
      setEffectiveZugId(paramZugId ?? eigenerZugId ?? null);
    } else {
      // Soldat: nur was in der URL steht
      setEffectiveZugId(paramZugId);
    }
  }, [istZugfuehrer, eigenerZugId, paramZugId]);

  // Alle Züge für Dropdown (nur Zugführer)
  useEffect(() => {
    if (!istZugfuehrer) return;
    supabase
      .from("zug")
      .select("*")
      .order("name")
      .then(({ data }) => setAlleZuege(data ?? []));
  }, [istZugfuehrer]);

  // Fahrzeuge des gewählten Zugs laden
  useEffect(() => {
    if (!effectiveZugId) return;
    setLaden(true);
    setFehler(null);

    async function init() {
      const { data: fz, error: fzErr } = await supabase
        .from("fahrzeug")
        .select("*, paletten:palette(*)")
        .eq("zug_id", effectiveZugId)
        .order("m_nummer");

      if (fzErr) {
        setFehler("Daten konnten nicht geladen werden.");
      } else {
        setFahrzeuge(fz ?? []);
      }

      // Zugname laden
      const { data: zugData } = await supabase
        .from("zug")
        .select("name")
        .eq("id", effectiveZugId)
        .single();
      setZugName(zugData?.name ?? "");
      setLaden(false);
    }
    init();
  }, [effectiveZugId]);

  // Soldat ohne zug_id-Param
  if (!istZugfuehrer && !paramZugId) {
    return (
      <main className="max-w-lg mx-auto p-4">
        <Link href="/" className="text-sm text-red-600 mb-4 inline-block">← Startseite</Link>
        <p className="text-gray-500 text-sm mt-8 text-center">
          Bitte scanne den QR-Code auf einer Palette um zur Zugübersicht zu gelangen.
        </p>
      </main>
    );
  }

  const backHref = istZugfuehrer ? "/admin" : "/";

  return (
    <main className="max-w-lg mx-auto p-4">
      <Link href={backHref} className="text-sm text-red-600 mb-4 inline-block">
        ← {istZugfuehrer ? "Admin" : "Startseite"}
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zugübersicht</h1>
          {zugName && <p className="text-sm text-gray-500">{zugName}</p>}
        </div>

        {/* Dropdown nur für Zugführer */}
        {istZugfuehrer && alleZuege.length > 1 && (
          <div className="flex flex-col items-end gap-1">
            <label className="text-xs text-gray-400">Zug wechseln</label>
            <select
              value={effectiveZugId ?? ""}
              onChange={(e) => {
                const newId = e.target.value;
                const url = new URL(window.location.href);
                url.searchParams.set("zug_id", newId);
                window.history.pushState({}, "", url.toString());
                setEffectiveZugId(newId);
              }}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white max-w-[160px]"
            >
              {alleZuege.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
            {effectiveZugId !== eigenerZugId && (
              <button
                onClick={() => setEffectiveZugId(eigenerZugId ?? null)}
                className="text-xs text-red-600"
              >
                Eigener Zug
              </button>
            )}
          </div>
        )}
      </div>

      {laden && <p className="text-gray-500">Wird geladen…</p>}
      {fehler && <p className="text-red-600">{fehler}</p>}

      {fahrzeuge.map((fz) => (
        <section key={fz.id} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            🚗 M+{fz.m_nummer}
            {fz.name !== `M+${fz.m_nummer}` && (
              <span className="text-gray-400 font-normal normal-case">· {fz.name}</span>
            )}
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
        <p className="text-gray-400 text-sm">Keine Fahrzeuge in diesem Zug.</p>
      )}

      {effectiveZugId && (
        <Link
          href={`/uebersicht/${effectiveZugId}`}
          className="block text-center text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-3 mt-4 active:bg-gray-50"
        >
          Wer hat was? →
        </Link>
      )}
    </main>
  );
}

export default function ZugUebersicht() {
  return (
    <Suspense fallback={<main className="p-4"><p className="text-gray-500">Wird geladen…</p></main>}>
      <ZugUebersichtInner />
    </Suspense>
  );
}
