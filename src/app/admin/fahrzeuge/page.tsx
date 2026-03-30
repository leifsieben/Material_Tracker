"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Fahrzeug, Palette } from "@/types";

interface FahrzeugMitPaletten extends Fahrzeug {
  paletten: Palette[];
}

export default function FahrzeugeAdmin() {
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugMitPaletten[]>([]);
  const [zugName, setZugName] = useState<string>("");
  const [formFz, setFormFz] = useState({ m_nummer: "", name: "" });
  const [neuePalette, setNeuePalette] = useState<Record<string, string>>({});

  async function laden() {
    // Zug-Name für Kontext
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: zug } = await supabase
        .from("zug").select("name").eq("zugfuehrer_id", session.user.id).single();
      if (zug) setZugName(zug.name);
    }

    const { data } = await supabase
      .from("fahrzeug")
      .select("*, paletten:palette(*)")
      .order("m_nummer");
    setFahrzeuge(data ?? []);
  }

  useEffect(() => { laden(); }, []);

  async function fahrzeugHinzufuegen(e: React.FormEvent) {
    e.preventDefault();
    if (!formFz.m_nummer.trim()) return;
    await supabase.from("fahrzeug").insert({
      m_nummer: formFz.m_nummer.trim().toUpperCase(),
      name: formFz.name.trim() || formFz.m_nummer.trim().toUpperCase(),
    });
    setFormFz({ m_nummer: "", name: "" });
    laden();
  }

  async function paletteHinzufuegen(fahrzeugId: string) {
    const name = neuePalette[fahrzeugId];
    if (!name?.trim()) return;
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    await supabase.from("palette").insert({
      fahrzeug_id: fahrzeugId,
      name: name.trim(),
      qr_token: token,
    });
    setNeuePalette((p) => ({ ...p, [fahrzeugId]: "" }));
    laden();
  }

  async function fahrzeugLoeschen(id: string) {
    if (!confirm("Fahrzeug und alle Paletten löschen?")) return;
    await supabase.from("fahrzeug").delete().eq("id", id);
    laden();
  }

  async function paletteLoeschen(id: string) {
    if (!confirm("Palette löschen?")) return;
    await supabase.from("palette").delete().eq("id", id);
    laden();
  }

  return (
    <main className="max-w-lg mx-auto p-4">
      <Link href="/admin" className="text-sm text-red-600 mb-4 inline-block">← Admin</Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fahrzeuge & Paletten</h1>
        {zugName && <p className="text-sm text-gray-500">{zugName}</p>}
      </div>

      {/* Neues Fahrzeug */}
      <form onSubmit={fahrzeugHinzufuegen} className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-col gap-3">
        <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Fahrzeug hinzufügen</h2>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            M-Nummer <span className="text-red-500">*</span>
          </label>
          <input
            value={formFz.m_nummer}
            onChange={(e) => setFormFz((f) => ({ ...f, m_nummer: e.target.value }))}
            placeholder="M+12345"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 font-mono uppercase tracking-wider"
          />
          <p className="text-xs text-gray-400 mt-1">Militärische KFZ-Nummer (einzigartig)</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Bezeichnung <span className="text-gray-400">(optional)</span>
          </label>
          <input
            value={formFz.name}
            onChange={(e) => setFormFz((f) => ({ ...f, name: e.target.value }))}
            placeholder="z.B. Puch 1, LKW Küche"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
          />
          <p className="text-xs text-gray-400 mt-1">Taktische Bezeichnung für interne Anzeige</p>
        </div>
        <button
          type="submit"
          className="w-full bg-gray-800 text-white rounded-xl py-3 font-semibold active:bg-gray-900"
        >
          Fahrzeug hinzufügen
        </button>
      </form>

      {/* Fahrzeugliste */}
      {fahrzeuge.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">Noch keine Fahrzeuge angelegt.</p>
      )}

      {fahrzeuge.map((fz) => (
        <section key={fz.id} className="mb-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Fahrzeug-Header */}
          <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
            <div>
              <p className="font-bold font-mono tracking-wider">{fz.m_nummer}</p>
              {fz.name !== fz.m_nummer && (
                <p className="text-xs text-gray-300 mt-0.5">{fz.name}</p>
              )}
            </div>
            <button
              onClick={() => fahrzeugLoeschen(fz.id)}
              className="text-xs text-red-300 underline"
            >
              Löschen
            </button>
          </div>

          <div className="p-4">
            {/* Palettenliste */}
            <div className="flex flex-col gap-2 mb-3">
              {fz.paletten.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.qr_token}</p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <Link
                      href={`/admin/qr/${p.qr_token}?zug=${encodeURIComponent(zugName)}&fahrzeug=${encodeURIComponent(fz.m_nummer)}&bezeichnung=${encodeURIComponent(fz.name)}&palette=${encodeURIComponent(p.name)}`}
                      className="text-xs text-blue-600 font-medium"
                    >
                      QR
                    </Link>
                    <button onClick={() => paletteLoeschen(p.id)} className="text-xs text-red-500">
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
              {fz.paletten.length === 0 && (
                <p className="text-xs text-gray-400 py-1">Noch keine Paletten</p>
              )}
            </div>

            {/* Neue Palette */}
            <div className="flex gap-2">
              <input
                value={neuePalette[fz.id] ?? ""}
                onChange={(e) => setNeuePalette((p) => ({ ...p, [fz.id]: e.target.value }))}
                placeholder="Neue Palette, z.B. Palette A"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === "Enter" && paletteHinzufuegen(fz.id)}
              />
              <button
                onClick={() => paletteHinzufuegen(fz.id)}
                className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium active:bg-red-700"
              >
                +
              </button>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
