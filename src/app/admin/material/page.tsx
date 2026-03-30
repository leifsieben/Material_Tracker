"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Material, Palette } from "@/types";
import { MATERIAL_TYP_LABEL, MaterialTyp } from "@/types";

interface MaterialMitPalette extends Material {
  palette?: Palette;
}

export default function MaterialAdmin() {
  const [materialListe, setMaterialListe] = useState<MaterialMitPalette[]>([]);
  const [paletten, setPaletten] = useState<Palette[]>([]);
  const [form, setForm] = useState({
    palette_id: "",
    typ: "klass" as MaterialTyp,
    objekt: "",
    bestand: 1,
  });

  async function laden() {
    const { data: mat } = await supabase
      .from("material")
      .select("*, palette(*)");
    const { data: pal } = await supabase.from("palette").select("*");
    setMaterialListe(mat ?? []);
    setPaletten(pal ?? []);
    if (pal?.[0] && !form.palette_id) {
      setForm((f) => ({ ...f, palette_id: pal[0].id }));
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { laden(); }, []);

  const set = (key: string, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function hinzufuegen(e: React.FormEvent) {
    e.preventDefault();
    if (!form.objekt.trim() || !form.palette_id) return;
    await supabase.from("material").insert({
      palette_id: form.palette_id,
      typ: form.typ,
      objekt: form.objekt.trim(),
      bestand_initial: form.bestand,
      bestand_aktuell: form.bestand,
    });
    setForm((f) => ({ ...f, objekt: "", bestand: 1 }));
    laden();
  }

  async function loeschen(id: string) {
    if (!confirm("Material löschen? Alle Transaktionen bleiben erhalten.")) return;
    await supabase.from("material").delete().eq("id", id);
    laden();
  }

  async function bestandAnpassen(id: string, delta: number) {
    const item = materialListe.find((m) => m.id === id);
    if (!item) return;
    const neu = Math.max(0, item.bestand_aktuell + delta);
    await supabase.from("material").update({ bestand_aktuell: neu }).eq("id", id);
    laden();
  }

  return (
    <main className="max-w-lg mx-auto p-4">
      <Link href="/admin" className="text-sm text-red-600 mb-4 inline-block">← Admin</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Material verwalten</h1>

      {/* Neues Material */}
      <form onSubmit={hinzufuegen} className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-col gap-3">
        <h2 className="font-semibold text-gray-800">Neues Material</h2>
        <select
          value={form.palette_id}
          onChange={(e) => set("palette_id", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
        >
          {paletten.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.typ}
            onChange={(e) => set("typ", e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            {Object.entries(MATERIAL_TYP_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={form.bestand}
            onChange={(e) => set("bestand", parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Bestand"
          />
        </div>
        <input
          value={form.objekt}
          onChange={(e) => set("objekt", e.target.value)}
          placeholder="Objekt, z.B. SE-235"
          required
          className="border border-gray-300 rounded-lg px-3 py-2"
        />
        <button type="submit" className="bg-red-600 text-white rounded-xl py-3 font-semibold">
          Hinzufügen
        </button>
      </form>

      {/* Materialliste */}
      <div className="flex flex-col gap-2">
        {materialListe.map((m) => (
          <div key={m.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-gray-900">{m.objekt}</p>
                <p className="text-xs text-gray-400">
                  {MATERIAL_TYP_LABEL[m.typ]} · {m.palette?.name ?? "—"}
                </p>
              </div>
              <button onClick={() => loeschen(m.id)} className="text-xs text-red-500">Löschen</button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => bestandAnpassen(m.id, -1)}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
              >−</button>
              <span className="font-bold text-lg w-12 text-center">{m.bestand_aktuell}</span>
              <button
                onClick={() => bestandAnpassen(m.id, 1)}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
              >+</button>
              <span className="text-xs text-gray-400">/ {m.bestand_initial}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
