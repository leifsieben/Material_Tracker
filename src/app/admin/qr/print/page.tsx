"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Fahrzeug, Palette } from "@/types";

interface PaletteMitKontext extends Palette {
  fahrzeugMNummer: string;
  fahrzeugName: string;
  url: string;
}

function AlleLabels() {
  const params = useSearchParams();
  const zugName = params.get("zug") ?? "Mein Zug";
  const fahrzeugIdFilter = params.get("fahrzeug_id") ?? null;

  const { zugId } = useAuth();
  const [paletten, setPaletten] = useState<PaletteMitKontext[]>([]);
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
        .select("*, paletten:palette(*)")
        .eq("zug_id", zugId)
        .order("m_nummer");

      const { data: fz } = await (
        fahrzeugIdFilter ? baseQuery.eq("id", fahrzeugIdFilter) : baseQuery
      ) as { data: (Fahrzeug & { paletten: Palette[] })[] | null };

      if (fahrzeugIdFilter && fz?.[0]) {
        const mAnzeige = `M+${fz[0].m_nummer}`;
        setFahrzeugName(mAnzeige + (fz[0].name !== mAnzeige ? ` · ${fz[0].name}` : ""));
      }

      const liste: PaletteMitKontext[] = (fz ?? []).flatMap((f) =>
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

  return (
    <>
      {/* Header — nur auf Screen, nicht gedruckt */}
      <div className="no-print max-w-2xl mx-auto p-4 mb-4">
        <Link href="/admin/qr" className="text-sm text-red-600 mb-4 inline-block">← QR-Übersicht</Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{titel}</h1>
            <p className="text-sm text-gray-500">{untertitel}</p>
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
          <p className="text-gray-400 mt-4">Keine Paletten gefunden.</p>
        )}
      </div>

      {/* Label-Raster — wird gedruckt */}
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
                <span className="qr-label-field">Palette</span>
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
