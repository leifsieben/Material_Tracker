"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Fahrzeug, Palette, Material, MaterialTyp } from "@/types";
import { MATERIAL_TYP_LABEL } from "@/types";

interface MaterialInPalette extends Material {}

interface PaletteMitMaterial extends Palette {
  material: MaterialInPalette[];
}

interface PaletteMitKontext extends PaletteMitMaterial {
  fahrzeugMNummer: string;
  fahrzeugName: string;
  url: string;
}

interface FahrzeugMitPaletten extends Fahrzeug {
  paletten: PaletteMitMaterial[];
}

const TYP_REIHENFOLGE: MaterialTyp[] = ["sens", "klass", "tech", "feld"];

function AlleLabels() {
  const params = useSearchParams();
  const zugName = params.get("zug") ?? "Mein Zug";
  const fahrzeugIdFilter = params.get("fahrzeug_id") ?? null;

  const { zugId } = useAuth();
  const [paletten, setPaletten] = useState<PaletteMitKontext[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugMitPaletten[]>([]);
  const [fahrzeugName, setFahrzeugName] = useState<string | null>(null);
  const [laden, setLaden] = useState(true);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!zugId) return;

    async function init() {
      const baseQuery = supabase
        .from("fahrzeug")
        .select("*, paletten:palette(*, material(*))")
        .eq("zug_id", zugId)
        .order("m_nummer");

      const { data: fz } = await (
        fahrzeugIdFilter ? baseQuery.eq("id", fahrzeugIdFilter) : baseQuery
      ) as { data: FahrzeugMitPaletten[] | null };

      const fzListe = fz ?? [];
      setFahrzeuge(fzListe);

      if (fahrzeugIdFilter && fzListe[0]) {
        const mAnzeige = `M+${fzListe[0].m_nummer}`;
        setFahrzeugName(mAnzeige + (fzListe[0].name !== mAnzeige ? ` · ${fzListe[0].name}` : ""));
      }

      const liste: PaletteMitKontext[] = fzListe.flatMap((f) =>
        f.paletten.map((p) => ({
          ...p,
          fahrzeugMNummer: `M+${f.m_nummer}`,
          fahrzeugName: f.name,
          url: `${window.location.origin}/palette/${p.qr_token}`,
        }))
      );

      setPaletten(liste);
      setLaden(false);
    }
    init();
  }, [zugId, fahrzeugIdFilter]);

  const titel = fahrzeugName ? `Labels: ${fahrzeugName}` : "Alle Labels";
  const untertitel = `${paletten.length} Palette${paletten.length !== 1 ? "n" : ""} · ${zugName}`;

  // Verladeliste: zähle gesamtes Material
  const gesamtMaterial = fahrzeuge.flatMap((fz) =>
    fz.paletten.flatMap((p) => p.material)
  );
  const hatMaterial = gesamtMaterial.length > 0;

  return (
    <>
      {/* Header — nur auf Screen */}
      <div className="no-print max-w-2xl mx-auto p-4 mb-4">
        <Link href="/admin/qr" className="text-sm text-red-600 mb-4 inline-block">← QR-Übersicht</Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{titel}</h1>
            <p className="text-sm text-gray-500">{untertitel}</p>
            {hatMaterial && (
              <p className="text-xs text-gray-400 mt-1">
                Seite 2: Verladeliste mit {gesamtMaterial.length} Material-Positionen
              </p>
            )}
          </div>
          <button
            onClick={() => window.print()}
            className="bg-red-600 text-white rounded-xl px-5 py-2.5 font-semibold active:bg-red-700"
          >
            Drucken / PDF
          </button>
        </div>
        {laden && <p className="text-gray-500 mt-4">Wird geladen…</p>}
        {!laden && paletten.length === 0 && (
          <p className="text-gray-400 mt-4">Keine Lagerorte gefunden.</p>
        )}
      </div>

      {/* Seite 1: QR-Label-Raster */}
      <div className="qr-print-grid">
        {paletten.map((p) => (
          <div key={p.id} className="qr-label">
            <div className="qr-label-header">
              <span className="qr-label-app">MATERIAL TRACKER</span>
              <span className="qr-label-zug">{zugName}</span>
            </div>

            <div className="qr-label-qr">
              {origin && (
                <QRCodeSVG value={p.url} size={180} level="M" includeMargin={false} />
              )}
            </div>

            <div className="qr-label-info">
              <div className="qr-label-row">
                <span className="qr-label-field">Fahrzeug</span>
                <span className="qr-label-value">{p.fahrzeugMNummer}</span>
              </div>
              <div className="qr-label-divider" />
              <div className="qr-label-row">
                <span className="qr-label-field">Lagerort</span>
                <span className="qr-label-value">{p.name}</span>
              </div>
              <div className="qr-label-divider" />
              <div className="qr-label-row">
                <span className="qr-label-field">ID</span>
                <span className="qr-label-value qr-label-mono">{p.qr_token}</span>
              </div>
            </div>

            <div className="qr-label-footer">
              Einscannen → Materialentnahme / Rückgabe
            </div>
          </div>
        ))}
      </div>

      {/* Harter Seitenumbruch als eigenes Block-Element */}
      {hatMaterial && (
        <div style={{ display: "block", pageBreakAfter: "always", breakAfter: "page", height: 0, overflow: "hidden" }} aria-hidden="true" />
      )}

      {/* Seite 2: Verladeliste */}
      {hatMaterial && (
        <div className="verladeliste" style={{ pageBreakBefore: "always", breakBefore: "page" }}>
          {/* Header */}
          <div className="vl-header">
            <div>
              <div className="vl-title">VERLADELISTE</div>
              <div className="vl-subtitle">{zugName}</div>
            </div>
            <div className="vl-meta">
              <div>Datum: ___________</div>
              <div>Unterschrift: ___________</div>
            </div>
          </div>

          {/* Pro Fahrzeug */}
          {fahrzeuge.map((fz) => {
            const hatPaletten = fz.paletten.some((p) => p.material.length > 0);
            if (!hatPaletten) return null;
            return (
              <div key={fz.id} className="vl-fahrzeug">
                <div className="vl-fahrzeug-header">
                  🚗 M+{fz.m_nummer}
                  {fz.name !== `M+${fz.m_nummer}` ? ` · ${fz.name}` : ""}
                </div>

                {fz.paletten.map((p) => {
                  if (p.material.length === 0) return null;

                  // Gruppiere Material nach Typ
                  const nachTyp = TYP_REIHENFOLGE.reduce<Record<string, MaterialInPalette[]>>(
                    (acc, typ) => {
                      const items = p.material.filter((m) => m.typ === typ);
                      if (items.length > 0) acc[typ] = items;
                      return acc;
                    },
                    {}
                  );

                  return (
                    <div key={p.id} className="vl-palette">
                      <div className="vl-palette-name">📦 {p.name}</div>

                      {Object.entries(nachTyp).map(([typ, items]) => (
                        <div key={typ} className="vl-typ-block">
                          <div className="vl-typ-label">
                            {MATERIAL_TYP_LABEL[typ as MaterialTyp]}
                          </div>
                          <table className="vl-table">
                            <thead>
                              <tr>
                                <th className="vl-th vl-th-check">✓</th>
                                <th className="vl-th vl-th-objekt">Objekt</th>
                                {typ === "sens" && (
                                  <th className="vl-th vl-th-sn">Seriennummer</th>
                                )}
                                <th className="vl-th vl-th-menge">Soll</th>
                                <th className="vl-th vl-th-menge">Ist</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((m) => (
                                <tr key={m.id} className="vl-tr">
                                  <td className="vl-td vl-td-check">☐</td>
                                  <td className="vl-td vl-td-objekt">{m.objekt}</td>
                                  {typ === "sens" && (
                                    <td className="vl-td vl-td-sn">
                                      {m.seriennummer
                                        ? <span className="vl-sn">{m.seriennummer}</span>
                                        : <span className="vl-sn-leer">—</span>
                                      }
                                    </td>
                                  )}
                                  <td className="vl-td vl-td-menge">{m.bestand_initial}</td>
                                  <td className="vl-td vl-td-menge vl-td-ist">___</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Footer */}
          <div className="vl-footer">
            Material Tracker · Automatisch generiert · {new Date().toLocaleDateString("de-CH")}
          </div>
        </div>
      )}
    </>
  );
}

export default function AlleLabelsPage() {
  return (
    <Suspense fallback={<main className="p-4"><p className="text-gray-500">Wird geladen…</p></main>}>
      <AlleLabels />
    </Suspense>
  );
}
