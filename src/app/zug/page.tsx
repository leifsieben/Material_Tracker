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
  const { zugId: eigenerZugId, zugName: eigenerZugName, session, user } = useAuth();
  const istZugfuehrer = !!session;
  const paramZugId = params.get("zug_id");

  const [effectiveZugId, setEffectiveZugId] = useState<string | null>(null);
  const [alleZuege, setAlleZuege] = useState<Zug[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugMitPaletten[]>([]);
  const [zugName, setZugName] = useState<string>("");
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  // Effektiven Zug bestimmen
  useEffect(() => {
    if (istZugfuehrer) {
      setEffectiveZugId(paramZugId ?? eigenerZugId ?? null);
    } else {
      setEffectiveZugId(paramZugId);
    }
  }, [istZugfuehrer, eigenerZugId, paramZugId]);

  // Alle Züge für Switcher (nur Zugführer)
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

      const { data: zugData } = await supabase
        .from("zug")
        .select("name")
        .eq("id", effectiveZugId)
        .single();
      setZugName(zugData?.name ?? eigenerZugName ?? "");
      setLaden(false);
    }
    init();
  }, [effectiveZugId, eigenerZugName]);

  async function abmelden() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

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

  const emailKurz = user?.email
    ? user.email.length > 22
      ? user.email.slice(0, user.email.indexOf("@") + 1) + "…"
      : user.email
    : "";

  const istFremderZug = istZugfuehrer && effectiveZugId !== eigenerZugId;

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header — nur für eingeloggte Zugführer */}
      {istZugfuehrer && (
        <header className="bg-gray-900 text-white px-4 py-2.5 flex justify-between items-center shrink-0">
          <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-gray-400 hover:text-gray-200">
            ← Admin
          </Link>

          <div className="flex items-center gap-2">
            {/* Zug-Switcher */}
            <select
              value={effectiveZugId ?? ""}
              onChange={(e) => {
                const newId = e.target.value;
                const url = new URL(window.location.href);
                url.searchParams.set("zug_id", newId);
                window.history.pushState({}, "", url.toString());
                setEffectiveZugId(newId);
              }}
              className="text-xs bg-gray-700 text-white border border-gray-600 rounded-md px-2 py-1 max-w-[130px] cursor-pointer"
              title="Zug wechseln"
            >
              {alleZuege.length > 0
                ? alleZuege.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))
                : <option value={eigenerZugId ?? ""}>{eigenerZugName ?? "Mein Zug"}</option>
              }
            </select>

            {/* Eigener-Zug-Button wenn fremder Zug */}
            {istFremderZug && (
              <button
                onClick={() => setEffectiveZugId(eigenerZugId ?? null)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Eigener
              </button>
            )}

            <span className="text-xs text-gray-300">👤 {emailKurz}</span>
            <button
              onClick={abmelden}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-md px-2.5 py-1"
            >
              Abmelden
            </button>
          </div>
        </header>
      )}

      <main className="max-w-lg mx-auto p-4 w-full">
        {/* Soldat: Back-Link */}
        {!istZugfuehrer && (
          <Link href="/" className="text-sm text-red-600 mb-4 inline-block">← Startseite</Link>
        )}

        <div className="flex justify-between items-start mb-2 mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Zugübersicht</h1>
            {zugName && (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                {zugName}
                {istFremderZug && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                    Fremdansicht
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Wer hat was — ganz oben */}
        {effectiveZugId && (
          <Link
            href={`/uebersicht/${effectiveZugId}`}
            className="block text-center text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-3 mb-6 mt-4 active:bg-gray-50"
          >
            Wer hat was? →
          </Link>
        )}

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
      </main>
    </div>
  );
}

export default function ZugUebersicht() {
  return (
    <Suspense fallback={<main className="p-4"><p className="text-gray-500">Wird geladen…</p></main>}>
      <ZugUebersichtInner />
    </Suspense>
  );
}
