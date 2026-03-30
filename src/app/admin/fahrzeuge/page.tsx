"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Fahrzeug, Palette, Gruppe } from "@/types";

interface FahrzeugMitPaletten extends Fahrzeug {
  paletten: Palette[];
  gruppe?: Gruppe;
}

export default function FahrzeugeAdmin() {
  const { zugId, zugName } = useAuth();
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugMitPaletten[]>([]);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [formFz, setFormFz] = useState({ m_nummer: "", name: "", gruppe_id: "" });
  const [neuePalette, setNeuePalette] = useState<Record<string, string>>({});
  const [fehler, setFehler] = useState<string | null>(null);

  async function laden() {
    if (!zugId) return;
    const { data: fz } = await supabase
      .from("fahrzeug")
      .select("*, paletten:palette(*), gruppe(*)")
      .eq("zug_id", zugId)
      .order("m_nummer");
    const { data: gr } = await supabase
      .from("gruppe")
      .select("*")
      .eq("zug_id", zugId)
      .order("name");
    setFahrzeuge(fz ?? []);
    setGruppen(gr ?? []);
  }

  useEffect(() => { laden(); }, [zugId]);

  async function fahrzeugHinzufuegen(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    if (!zugId) {
      setFehler("Kein Zug gefunden. Stelle sicher dass dein Account einem Zug zugeordnet ist (/admin/setup).");
      return;
    }
    if (!formFz.m_nummer.trim()) return;

    if (!/^\d+$/.test(formFz.m_nummer.trim())) {
      setFehler("M-Nummer darf nur Ziffern enthalten (z.B. 12345).");
      return;
    }

    const mNummerInt = parseInt(formFz.m_nummer.trim(), 10);
    const mNummerAnzeige = `M+${mNummerInt}`;

    // Pre-Check: M-Nummer bereits vorhanden?
    const { data: existing } = await supabase
      .from("fahrzeug")
      .select("id")
      .eq("m_nummer", mNummerInt)
      .eq("zug_id", zugId)
      .maybeSingle();

    if (existing) {
      setFehler(`M-Nummer ${mNummerAnzeige} existiert bereits.`);
      return;
    }

    const { error } = await supabase.from("fahrzeug").insert({
      zug_id: zugId,
      m_nummer: mNummerInt,
      name: formFz.name.trim() || mNummerAnzeige,
      gruppe_id: formFz.gruppe_id || null,
    });

    if (error) {
      setFehler(`Fehler: ${error.message}`);
      return;
    }
    setFormFz({ m_nummer: "", name: "", gruppe_id: "" });
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

  async function gruppeAendern(fahrzeugId: string, gruppeId: string) {
    await supabase.from("fahrzeug").update({ gruppe_id: gruppeId || null }).eq("id", fahrzeugId);
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
          <label className="block text-xs font-medium text-gray-500 mb-1">M-Nummer <span className="text-red-500">*</span></label>
          <div className="flex items-stretch border border-gray-300 rounded-lg overflow-hidden">
            <span className="bg-gray-100 px-3 flex items-center font-mono font-bold text-gray-600 border-r border-gray-300 text-sm select-none">
              M+
            </span>
            <input
              value={formFz.m_nummer}
              onChange={(e) => setFormFz((f) => ({ ...f, m_nummer: e.target.value.replace(/\D/g, "") }))}
              placeholder="12345"
              inputMode="numeric"
              required
              className="flex-1 px-3 py-2.5 font-mono tracking-wider outline-none min-w-0"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Bezeichnung <span className="text-gray-400">(optional)</span></label>
          <input
            value={formFz.name}
            onChange={(e) => setFormFz((f) => ({ ...f, name: e.target.value }))}
            placeholder="z.B. Puch 1, LKW Küche"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Gruppe <span className="text-gray-400">(optional)</span></label>
          <select
            value={formFz.gruppe_id}
            onChange={(e) => setFormFz((f) => ({ ...f, gruppe_id: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
          >
            <option value="">— Keine Gruppe —</option>
            {gruppen.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          {gruppen.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">Noch keine Gruppen — unter <Link href="/admin/gruppen" className="underline">Gruppen</Link> anlegen</p>
          )}
        </div>

        {fehler && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{fehler}</p>}

        <button type="submit" className="w-full bg-gray-800 text-white rounded-xl py-3 font-semibold active:bg-gray-900">
          Fahrzeug hinzufügen
        </button>
      </form>

      {fahrzeuge.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">Noch keine Fahrzeuge angelegt.</p>
      )}

      {fahrzeuge.map((fz) => (
        <section key={fz.id} className="mb-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div>
                <p className="font-bold font-mono tracking-wider">M+{fz.m_nummer}</p>
                {fz.name !== `M+${fz.m_nummer}` && <p className="text-xs text-gray-300 mt-0.5">{fz.name}</p>}
              </div>
              {fz.gruppe && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full text-white ml-1"
                  style={{ backgroundColor: fz.gruppe.farbe }}
                >
                  {fz.gruppe.name}
                </span>
              )}
            </div>
            <button onClick={() => fahrzeugLoeschen(fz.id)} className="text-xs text-red-300 underline">Löschen</button>
          </div>

          <div className="p-4">
            {/* Gruppe ändern */}
            {gruppen.length > 0 && (
              <div className="mb-3">
                <select
                  value={fz.gruppe_id ?? ""}
                  onChange={(e) => gruppeAendern(fz.id, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-600"
                >
                  <option value="">— Keine Gruppe —</option>
                  {gruppen.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Paletten */}
            <div className="flex flex-col gap-2 mb-3">
              {fz.paletten.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.qr_token}</p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <Link
                      href={`/admin/qr/${p.qr_token}?zug=${encodeURIComponent(zugName ?? "")}&fahrzeug=${encodeURIComponent(`M+${fz.m_nummer}`)}&bezeichnung=${encodeURIComponent(fz.name)}&palette=${encodeURIComponent(p.name)}${fz.gruppe ? `&gruppe=${encodeURIComponent(fz.gruppe.name)}&gruppefarbe=${encodeURIComponent(fz.gruppe.farbe)}` : ""}`}
                      className="text-xs text-blue-600 font-medium"
                    >QR</Link>
                    <button onClick={() => paletteLoeschen(p.id)} className="text-xs text-red-500">Löschen</button>
                  </div>
                </div>
              ))}
              {fz.paletten.length === 0 && <p className="text-xs text-gray-400 py-1">Noch keine Paletten</p>}
            </div>

            {/* Neue Palette */}
            <div className="flex gap-2">
              <input
                value={neuePalette[fz.id] ?? ""}
                onChange={(e) => setNeuePalette((p) => ({ ...p, [fz.id]: e.target.value }))}
                placeholder="Neue Palette, z.B. Palette A"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), paletteHinzufuegen(fz.id))}
              />
              <button onClick={() => paletteHinzufuegen(fz.id)}
                className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium active:bg-red-700">+</button>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
