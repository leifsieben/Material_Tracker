"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Fahrzeug, Palette } from "@/types";

interface FahrzeugMitPaletten extends Fahrzeug {
  paletten: Palette[];
}

export default function QRUebersicht() {
  const { zugId, zugName: zugNameAuth } = useAuth();
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugMitPaletten[]>([]);
  const [zugName, setZugName] = useState<string>("");
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    if (zugNameAuth) setZugName(zugNameAuth);
  }, [zugNameAuth]);

  useEffect(() => {
    if (!zugId) return;
    async function init() {
      const { data: fz } = await supabase
        .from("fahrzeug")
        .select("*, paletten:palette(*)")
        .eq("zug_id", zugId)
        .order("m_nummer");
      setFahrzeuge(fz ?? []);
      setLaden(false);
    }
    init();
  }, [zugId]);

  const allePaletten = fahrzeuge.flatMap((fz) => fz.paletten);

  return (
    <main className="max-w-lg mx-auto p-4">
      <Link href="/admin" className="text-sm text-red-600 mb-4 inline-block">← Admin</Link>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR-Codes</h1>
          {zugName && <p className="text-sm text-gray-500">{zugName}</p>}
        </div>
        {allePaletten.length > 0 && (
          <Link
            href={`/admin/qr/print?zug=${encodeURIComponent(zugName)}`}
            className="bg-red-600 text-white rounded-xl px-4 py-2 text-sm font-semibold active:bg-red-700"
          >
            Alle drucken
          </Link>
        )}
      </div>

      {laden && <p className="text-gray-500">Wird geladen…</p>}

      {fahrzeuge.map((fz) => (
        <section key={fz.id} className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              🚗 M+{fz.m_nummer}{fz.name !== `M+${fz.m_nummer}` ? ` · ${fz.name}` : ""}
            </h2>
            {fz.paletten.length > 0 && (
              <Link
                href={`/admin/qr/print?zug=${encodeURIComponent(zugName)}&fahrzeug_id=${fz.id}`}
                className="text-xs text-gray-500 border border-gray-300 rounded-lg px-2.5 py-1 active:bg-gray-100"
              >
                Fahrzeug drucken
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {fz.paletten.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{p.qr_token}</p>
                </div>
                <Link
                  href={`/admin/qr/${p.qr_token}?zug=${encodeURIComponent(zugName)}&fahrzeug=${encodeURIComponent(`M+${fz.m_nummer}`)}&bezeichnung=${encodeURIComponent(fz.name)}&palette=${encodeURIComponent(p.name)}`}
                  className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm font-medium active:bg-gray-900"
                >
                  Label
                </Link>
              </div>
            ))}
            {fz.paletten.length === 0 && (
              <p className="text-sm text-gray-400 pl-1">Keine Paletten</p>
            )}
          </div>
        </section>
      ))}

      {!laden && fahrzeuge.length === 0 && (
        <p className="text-gray-400 text-sm">
          Noch keine Fahrzeuge. Erst unter{" "}
          <Link href="/admin/fahrzeuge" className="text-red-600 underline">Fahrzeuge</Link>
          {" "}anlegen.
        </p>
      )}
    </main>
  );
}
