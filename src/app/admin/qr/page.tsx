"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

function QRDruck() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const name = params.get("name") ?? "Palette";
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/palette/${token}`);
  }, [token]);

  return (
    <main className="max-w-sm mx-auto p-6 text-center">
      <Link href="/admin/fahrzeuge" className="text-sm text-red-600 mb-6 inline-block">← Zurück</Link>

      <h1 className="text-xl font-bold text-gray-900 mb-1">{name}</h1>
      <p className="text-xs text-gray-400 mb-6 font-mono break-all">{url}</p>

      {url && (
        <div className="inline-block p-4 bg-white border-2 border-gray-900 rounded-xl mb-6">
          <QRCodeSVG value={url} size={240} level="M" />
        </div>
      )}

      <p className="text-sm font-bold text-gray-900 mb-1">{name}</p>
      <p className="text-xs text-gray-500 mb-6">Material Tracker · Schweizer Armee</p>

      <button
        onClick={() => window.print()}
        className="w-full bg-gray-800 text-white rounded-xl py-3 font-semibold"
      >
        Drucken
      </button>
    </main>
  );
}

export default function QRPage() {
  return (
    <Suspense fallback={<main className="p-4"><p className="text-gray-500">Wird geladen…</p></main>}>
      <QRDruck />
    </Suspense>
  );
}
