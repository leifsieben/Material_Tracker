"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

function EinzelLabel({ token }: { token: string }) {
  const params = useSearchParams();
  const zug = params.get("zug") ?? "Zug";
  const fahrzeug = params.get("fahrzeug") ?? "";
  const palette = params.get("palette") ?? "Palette";

  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/palette/${token}`);
  }, [token]);

  return (
    <>
      {/* Navigations-Header (wird beim Drucken ausgeblendet) */}
      <div className="no-print max-w-lg mx-auto p-4">
        <Link href="/admin/qr" className="text-sm text-red-600 mb-4 inline-block">← QR-Übersicht</Link>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Label: {palette}</h1>
            <p className="text-sm text-gray-500">{zug} · {fahrzeug}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-red-600 text-white rounded-xl px-4 py-2 font-semibold text-sm active:bg-red-700"
          >
            Drucken / PDF
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Vorschau des Labels. «Drucken / PDF» öffnet den Druckdialog — dort «Als PDF speichern» wählen.
        </p>
      </div>

      {/* Das eigentliche Label — auch auf dem Screen sichtbar als Vorschau */}
      <div className="flex justify-center px-4">
        <div className="qr-label">
          <div className="qr-label-header">
            <span className="qr-label-app">MATERIAL TRACKER</span>
            <span className="qr-label-zug">{zug}</span>
          </div>

          <div className="qr-label-qr">
            {url && <QRCodeSVG value={url} size={220} level="M" includeMargin={false} />}
          </div>

          <div className="qr-label-info">
            <div className="qr-label-row">
              <span className="qr-label-field">Fahrzeug</span>
              <span className="qr-label-value">{fahrzeug || "—"}</span>
            </div>
            <div className="qr-label-divider" />
            <div className="qr-label-row">
              <span className="qr-label-field">Palette</span>
              <span className="qr-label-value">{palette}</span>
            </div>
            <div className="qr-label-divider" />
            <div className="qr-label-row">
              <span className="qr-label-field">ID</span>
              <span className="qr-label-value qr-label-mono">{token}</span>
            </div>
          </div>

          <div className="qr-label-footer">
            Einscannen → Materialentnahme / Rückgabe
          </div>
        </div>
      </div>
    </>
  );
}

interface Props {
  params: Promise<{ token: string }>;
}

export default function EinzelLabelPage({ params }: Props) {
  const { token } = React.use(params);
  return (
    <Suspense fallback={<main className="p-4"><p className="text-gray-500">Wird geladen…</p></main>}>
      <EinzelLabel token={token} />
    </Suspense>
  );
}
