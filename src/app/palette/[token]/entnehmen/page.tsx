"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { speicherLokal } from "@/lib/db-sync";
import type { Material, Transaktion } from "@/types";
import { MATERIAL_TYP_LABEL, GRAD_OPTIONEN } from "@/types";

interface Props {
  params: Promise<{ token: string }>;
}

export default function Entnehmen({ params }: Props) {
  const { token } = React.use(params);
  const router = useRouter();

  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [material, setMaterial] = useState<Material[]>([]);
  const [laden, setLaden] = useState(true);
  const [senden, setSenden] = useState(false);
  const [erfolg, setErfolg] = useState(false);

  const [form, setForm] = useState({
    grad: "Wm",
    vorname: "",
    nachname: "",
    material_id: "",
    anzahl: 1,
    bemerkung: "",
  });

  useEffect(() => {
    async function init() {
      const { data: pal } = await supabase
        .from("palette")
        .select("id")
        .eq("qr_token", token)
        .single();
      if (!pal) { setLaden(false); return; }
      setPaletteId(pal.id);

      const { data: mat } = await supabase
        .from("material")
        .select("*")
        .eq("palette_id", pal.id)
        .gt("bestand_aktuell", 0);
      setMaterial(mat ?? []);
      if (mat?.[0]) setForm((f) => ({ ...f, material_id: mat[0].id }));
      setLaden(false);
    }
    init();
  }, [token]);

  const set = (key: string, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vorname || !form.nachname || !form.material_id) return;
    setSenden(true);

    const transaktion: Omit<Transaktion, "id"> = {
      material_id: form.material_id,
      typ: "entnahme",
      grad: form.grad,
      vorname: form.vorname,
      nachname: form.nachname,
      anzahl: -Math.abs(form.anzahl),
      bemerkung: form.bemerkung || undefined,
      timestamp: new Date().toISOString(),
      status: "offen",
    };

    if (navigator.onLine) {
      await supabase.from("transaktion").insert(transaktion);
    } else {
      await speicherLokal(transaktion as Transaktion);
    }

    setErfolg(true);
    setSenden(false);
    setTimeout(() => router.push(`/palette/${token}`), 1500);
  }

  if (laden) return <main className="p-4"><p className="text-gray-500">Wird geladen…</p></main>;

  if (erfolg) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900">Entnahme erfasst</h2>
        <p className="text-gray-500 text-sm">Wird weitergeleitet…</p>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto p-4">
      <Link href={`/palette/${token}`} className="text-sm text-red-600 mb-4 inline-block">← Zurück</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Material entnehmen</h1>

      <form onSubmit={absenden} className="flex flex-col gap-4">
        {/* Grad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grad</label>
          <select
            value={form.grad}
            onChange={(e) => set("grad", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
          >
            {GRAD_OPTIONEN.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
            <input
              type="text"
              required
              value={form.vorname}
              onChange={(e) => set("vorname", e.target.value)}
              placeholder="Leif"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
            <input
              type="text"
              required
              value={form.nachname}
              onChange={(e) => set("nachname", e.target.value)}
              placeholder="Sieben"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
            />
          </div>
        </div>

        {/* Material */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
          <select
            value={form.material_id}
            onChange={(e) => set("material_id", e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
          >
            {material.map((m) => (
              <option key={m.id} value={m.id}>
                {m.objekt} ({MATERIAL_TYP_LABEL[m.typ]}) — Bestand: {m.bestand_aktuell}
              </option>
            ))}
          </select>
          {material.length === 0 && (
            <p className="text-sm text-red-500 mt-1">Kein Material verfügbar.</p>
          )}
        </div>

        {/* Anzahl */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Anzahl</label>
          <input
            type="number"
            min={1}
            required
            value={form.anzahl}
            onChange={(e) => set("anzahl", parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
          />
        </div>

        {/* Bemerkung */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bemerkung <span className="text-gray-400">(optional)</span></label>
          <input
            type="text"
            value={form.bemerkung}
            onChange={(e) => set("bemerkung", e.target.value)}
            placeholder="z.B. für Übung XY"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
          />
        </div>

        <button
          type="submit"
          disabled={senden || material.length === 0}
          className="w-full bg-red-600 text-white rounded-xl py-4 font-semibold text-lg mt-2 disabled:opacity-50 active:bg-red-700"
        >
          {senden ? "Wird gespeichert…" : "Entnahme bestätigen"}
        </button>
      </form>
    </main>
  );
}
