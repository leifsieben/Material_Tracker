"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Fahrzeug, Palette, Material, Zug } from "@/types";
import { MATERIAL_TYP_LABEL, type MaterialTyp } from "@/types";

interface PaletteMitMaterial extends Palette {
  material: Material[];
}

interface FahrzeugMitPaletten extends Fahrzeug {
  paletten: PaletteMitMaterial[];
}

interface MaterialZeile extends Material {
  paletteName: string;
  fahrzeugLabel: string;
  imLager?: boolean;
}

type Tab = "fahrzeuge" | "material";

const TYP_ORDER: MaterialTyp[] = ["klass", "tech", "feld", "sens"];

function ZugUebersichtInner() {
  const params = useSearchParams();
  const { zugId: eigenerZugId, zugName: eigenerZugName, session, user } = useAuth();
  const istZugfuehrer = !!session;
  const paramZugId = params.get("zug_id");

  const [effectiveZugId, setEffectiveZugId] = useState<string | null>(null);
  const [alleZuege, setAlleZuege] = useState<Zug[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugMitPaletten[]>([]);
  const [lagerMaterial, setLagerMaterial] = useState<Material[]>([]);
  const [zugName, setZugName] = useState<string>("");
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("fahrzeuge");

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

  // Fahrzeuge + Paletten + Material laden
  useEffect(() => {
    if (!effectiveZugId) return;
    setLaden(true);
    setFehler(null);

    async function init() {
      // Fahrzeuge mit Paletten + Zug-Name + Lager-Palette parallel
      const [fzRes, zugRes, lagerRes] = await Promise.all([
        supabase
          .from("fahrzeug")
          .select("*, paletten:palette(*)")
          .eq("zug_id", effectiveZugId)
          .order("m_nummer"),
        supabase.from("zug").select("name").eq("id", effectiveZugId).single(),
        supabase
          .from("palette")
          .select("id")
          .eq("zug_id", effectiveZugId)
          .eq("is_lager", true)
          .maybeSingle(),
      ]);

      if (fzRes.error) {
        setFehler("Daten konnten nicht geladen werden.");
        setLaden(false);
        return;
      }

      const fzListe = (fzRes.data ?? []) as FahrzeugMitPaletten[];

      // Material für Fahrzeug-Paletten
      const allePalettenIds = fzListe.flatMap((fz) => fz.paletten.map((p) => p.id));
      if (allePalettenIds.length > 0) {
        const { data: matData } = await supabase
          .from("material")
          .select("*")
          .in("palette_id", allePalettenIds)
          .order("objekt");

        const matMap: Record<string, Material[]> = {};
        for (const m of matData ?? []) {
          if (!matMap[m.palette_id]) matMap[m.palette_id] = [];
          matMap[m.palette_id].push(m);
        }
        for (const fz of fzListe) {
          for (const p of fz.paletten) p.material = matMap[p.id] ?? [];
        }
      } else {
        for (const fz of fzListe) {
          for (const p of fz.paletten) p.material = [];
        }
      }

      // Material aus Lager-Palette
      if (lagerRes.data?.id) {
        const { data: lagerMat } = await supabase
          .from("material")
          .select("*")
          .eq("palette_id", lagerRes.data.id)
          .order("objekt");
        setLagerMaterial(lagerMat ?? []);
      } else {
        setLagerMaterial([]);
      }

      setFahrzeuge(fzListe);
      setZugName(zugRes.data?.name ?? eigenerZugName ?? "");
      setLaden(false);
    }
    init();
  }, [effectiveZugId, eigenerZugName]);

  async function abmelden() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // Flache Materialliste für den Material-Tab (inkl. Lager)
  const alleMaterialien = useMemo<MaterialZeile[]>(() => {
    const zeilen: MaterialZeile[] = [];
    for (const fz of fahrzeuge) {
      const fzLabel = fz.name !== `M+${fz.m_nummer}` ? `M+${fz.m_nummer} · ${fz.name}` : `M+${fz.m_nummer}`;
      for (const p of fz.paletten) {
        for (const m of p.material) {
          zeilen.push({ ...m, paletteName: p.name, fahrzeugLabel: fzLabel });
        }
      }
    }
    // Lager-Material
    for (const m of lagerMaterial) {
      zeilen.push({ ...m, paletteName: "Im Lager", fahrzeugLabel: "—", imLager: true });
    }
    return zeilen;
  }, [fahrzeuge, lagerMaterial]);

  const materialNachTyp = useMemo(() => {
    const grouped: Record<string, MaterialZeile[]> = {};
    for (const m of alleMaterialien) {
      if (!grouped[m.typ]) grouped[m.typ] = [];
      grouped[m.typ].push(m);
    }
    return grouped;
  }, [alleMaterialien]);

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
      <style>{`
        @media print {
          header, .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; }
          a { text-decoration: none; color: inherit; }
        }
        .print-only { display: none; }
      `}</style>

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

      <main className="max-w-2xl mx-auto p-4 w-full">
        {/* Soldat: Back-Link */}
        {!istZugfuehrer && (
          <Link href="/" className="text-sm text-red-600 mb-4 inline-block no-print">← Startseite</Link>
        )}

        {/* Titel */}
        <div className="flex justify-between items-start mb-4 mt-4">
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
          {/* Drucken-Button für Material-Tab */}
          {tab === "material" && !laden && (
            <button
              onClick={() => window.print()}
              className="no-print text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5"
            >
              🖨 Drucken
            </button>
          )}
        </div>

        {/* Wer hat was — ganz oben */}
        {effectiveZugId && (
          <Link
            href={`/uebersicht/${effectiveZugId}`}
            className="no-print block text-center text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-3 mb-5 active:bg-gray-50"
          >
            👁 Wer hat was? →
          </Link>
        )}

        {/* Tab-Switcher */}
        <div className="no-print flex rounded-xl border border-gray-200 overflow-hidden mb-6 bg-gray-50">
          <button
            onClick={() => setTab("fahrzeuge")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "fahrzeuge"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🚗 Nach Fahrzeugen
          </button>
          <button
            onClick={() => setTab("material")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "material"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📦 Nach Material
          </button>
        </div>

        {laden && <p className="text-gray-500">Wird geladen…</p>}
        {fehler && <p className="text-red-600">{fehler}</p>}

        {/* ── Tab: Nach Fahrzeugen ── */}
        {tab === "fahrzeuge" && !laden && (
          <>
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
            {!laden && fahrzeuge.length === 0 && !fehler && lagerMaterial.length === 0 && (
              <p className="text-gray-400 text-sm">Keine Fahrzeuge in diesem Zug.</p>
            )}

            {/* ── Im Lager ── */}
            {lagerMaterial.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  📦 Im Lager
                </h2>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {lagerMaterial.map((m, i) => (
                    <div
                      key={m.id}
                      className={`px-4 py-3 flex justify-between items-center ${
                        i < lagerMaterial.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.objekt}</p>
                        {m.seriennummer && (
                          <p className="text-xs font-mono text-gray-400">{m.seriennummer}</p>
                        )}
                        <p className="text-xs text-gray-400">{MATERIAL_TYP_LABEL[m.typ]}</p>
                      </div>
                      <span className={`text-sm font-semibold ${
                        m.bestand_aktuell < m.bestand_initial ? "text-orange-600" : "text-gray-700"
                      }`}>
                        {m.bestand_aktuell}
                        <span className="text-xs text-gray-400 font-normal"> / {m.bestand_initial}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── Tab: Nach Material ── */}
        {tab === "material" && !laden && (
          <>
            {/* Druckkopf */}
            <div className="print-only mb-6">
              <h1 className="text-xl font-bold">Materialliste — {zugName}</h1>
              <p className="text-sm text-gray-500">Stand: {new Date().toLocaleDateString("de-CH")}</p>
            </div>

            {alleMaterialien.length === 0 ? (
              <p className="text-gray-400 text-sm">Kein Material erfasst.</p>
            ) : (
              TYP_ORDER.filter((t) => materialNachTyp[t]?.length > 0).map((typ) => (
                <section key={typ} className="mb-8">
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 border-b border-gray-200 pb-1">
                    {MATERIAL_TYP_LABEL[typ]}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                          <th className="pb-2 pr-4 font-medium">Objekt</th>
                          {typ === "sens" && (
                            <th className="pb-2 pr-4 font-medium">Seriennummer</th>
                          )}
                          <th className="pb-2 pr-4 font-medium text-right">Bestand</th>
                          <th className="pb-2 font-medium text-gray-400">Lager</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materialNachTyp[typ]
                          .sort((a, b) => a.objekt.localeCompare(b.objekt))
                          .map((m) => (
                            <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2 pr-4 font-medium text-gray-900">{m.objekt}</td>
                              {typ === "sens" && (
                                <td className="py-2 pr-4 text-gray-500 font-mono text-xs">
                                  {m.seriennummer ?? "—"}
                                </td>
                              )}
                              <td className="py-2 pr-4 text-right">
                                <span className={`font-semibold ${
                                  m.bestand_aktuell < m.bestand_initial
                                    ? "text-orange-600"
                                    : "text-gray-900"
                                }`}>
                                  {m.bestand_aktuell}
                                </span>
                                <span className="text-gray-400 text-xs"> / {m.bestand_initial}</span>
                              </td>
                              <td className="py-2 text-xs text-gray-400">
                                {m.imLager ? (
                                  <span className="text-amber-600 font-medium">📦 Im Lager</span>
                                ) : (
                                  <>
                                    <span>{m.fahrzeugLabel}</span>
                                    <span className="text-gray-300 mx-1">/</span>
                                    <span>{m.paletteName}</span>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            )}

            {/* Zusammenfassung für Druck */}
            <div className="print-only mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500">
              <p>Total Objekte: {alleMaterialien.length} ·
                Fahrzeuge: {fahrzeuge.length} ·
                Paletten: {fahrzeuge.reduce((s, fz) => s + fz.paletten.length, 0)}
              </p>
            </div>
          </>
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
