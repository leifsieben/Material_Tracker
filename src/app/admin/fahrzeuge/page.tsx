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
  const [neuesFz, setNeuesFz] = useState("");
  const [neuePalette, setNeuePalette] = useState<Record<string, string>>({});

  async function laden() {
    const { data } = await supabase
      .from("fahrzeug")
      .select("*, paletten:palette(*)");
    setFahrzeuge(data ?? []);
  }

  useEffect(() => { laden(); }, []);

  async function fahrzeugHinzufuegen() {
    if (!neuesFz.trim()) return;
    await supabase.from("fahrzeug").insert({ name: neuesFz.trim() });
    setNeuesFz("");
    laden();
  }

  async function paletteHinzufuegen(fahrzeugId: string) {
    const name = neuePalette[fahrzeugId];
    if (!name?.trim()) return;
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    await supabase.from("palette").insert({ fahrzeug_id: fahrzeugId, name: name.trim(), qr_token: token });
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fahrzeuge & Paletten</h1>

      {/* Neues Fahrzeug */}
      <div className="flex gap-2 mb-6">
        <input
          value={neuesFz}
          onChange={(e) => setNeuesFz(e.target.value)}
          placeholder="Neues Fahrzeug, z.B. Puch 1"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
        />
        <button
          onClick={fahrzeugHinzufuegen}
          className="bg-gray-800 text-white rounded-lg px-4 py-2 font-medium"
        >
          +
        </button>
      </div>

      {fahrzeuge.map((fz) => (
        <section key={fz.id} className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-900">🚗 {fz.name}</h2>
            <button
              onClick={() => fahrzeugLoeschen(fz.id)}
              className="text-xs text-red-500"
            >
              Löschen
            </button>
          </div>

          {/* Paletten */}
          <div className="flex flex-col gap-2 mb-3">
            {fz.paletten.map((p) => (
              <div key={p.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-800">{p.name}</span>
                <div className="flex gap-3 items-center">
                  <Link href={`/admin/qr?token=${p.qr_token}&name=${p.name}`} className="text-xs text-blue-600">QR</Link>
                  <button onClick={() => paletteLoeschen(p.id)} className="text-xs text-red-500">Löschen</button>
                </div>
              </div>
            ))}
          </div>

          {/* Neue Palette */}
          <div className="flex gap-2">
            <input
              value={neuePalette[fz.id] ?? ""}
              onChange={(e) => setNeuePalette((p) => ({ ...p, [fz.id]: e.target.value }))}
              placeholder="Neue Palette"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={() => paletteHinzufuegen(fz.id)}
              className="bg-red-600 text-white rounded-lg px-3 py-2 text-sm"
            >
              +
            </button>
          </div>
        </section>
      ))}
    </main>
  );
}
