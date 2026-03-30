"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Material, Palette, Fahrzeug } from "@/types";
import { MATERIAL_TYP_LABEL, MaterialTyp } from "@/types";

interface PaletteMitFahrzeug extends Palette {
  fahrzeug?: Fahrzeug;
}

interface MaterialMitPalette extends Material {
  palette?: PaletteMitFahrzeug;
}

export default function MaterialAdmin() {
  const { zugId } = useAuth();
  const [materialListe, setMaterialListe] = useState<MaterialMitPalette[]>([]);
  const [paletten, setPaletten] = useState<PaletteMitFahrzeug[]>([]);
  const [paletteIds, setPaletteIds] = useState<string[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [form, setForm] = useState({
    palette_id: "",
    typ: "klass" as MaterialTyp,
    objekt: "",
    seriennummer: "",
    bestand: 1,
  });

  async function laden() {
    if (!zugId) return;

    const { data: fz } = await supabase
      .from("fahrzeug")
      .select("id, name, m_nummer, zug_id")
      .eq("zug_id", zugId);

    const fahrzeugIds = (fz ?? []).map((f) => f.id);

    if (fahrzeugIds.length === 0) {
      setPaletten([]);
      setPaletteIds([]);
      setMaterialListe([]);
      return;
    }

    const { data: pal } = await supabase
      .from("palette")
      .select("*")
      .in("fahrzeug_id", fahrzeugIds)
      .order("name");

    const fahrzeugMap = Object.fromEntries((fz ?? []).map((f) => [f.id, f]));
    const palettenMitFz: PaletteMitFahrzeug[] = (pal ?? []).map((p) => ({
      ...p,
      fahrzeug: fahrzeugMap[p.fahrzeug_id],
    }));

    const ids = palettenMitFz.map((p) => p.id);
    setPaletten(palettenMitFz);
    setPaletteIds(ids);

    setForm((f) => ({
      ...f,
      palette_id: f.palette_id || (palettenMitFz[0]?.id ?? ""),
    }));

    if (ids.length === 0) {
      setMaterialListe([]);
      return;
    }

    const { data: mat } = await supabase
      .from("material")
      .select("*, palette(*)")
      .in("palette_id", ids)
      .order("objekt");

    setMaterialListe(
      (mat ?? []).map((m) => ({
        ...m,
        palette: m.palette
          ? { ...m.palette, fahrzeug: fahrzeugMap[m.palette.fahrzeug_id] }
          : undefined,
      }))
    );
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { laden(); }, [zugId]);

  function setPaletteId(value: string) {
    setForm((f) => ({ ...f, palette_id: value }));
  }

  function setSeriennummer(value: string) {
    setForm((f) => ({
      ...f,
      seriennummer: value,
      // Seriennummer → Bestand muss 1 sein (eindeutiges Objekt)
      bestand: value.trim() ? 1 : f.bestand,
    }));
  }

  function getLabelForPalette(p: PaletteMitFahrzeug) {
    const fzLabel = p.fahrzeug
      ? `M+${p.fahrzeug.m_nummer}${p.fahrzeug.name !== `M+${p.fahrzeug.m_nummer}` ? ` (${p.fahrzeug.name})` : ""} – `
      : "";
    return `${fzLabel}${p.name}`;
  }

  async function hinzufuegen(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    if (!form.objekt.trim() || !form.palette_id) return;

    const sn = form.seriennummer.trim();

    // Seriennummer-Duplikatcheck innerhalb des Zugs
    if (sn && paletteIds.length > 0) {
      const { data: existing } = await supabase
        .from("material")
        .select("id, objekt")
        .eq("seriennummer", sn)
        .in("palette_id", paletteIds)
        .maybeSingle();

      if (existing) {
        setFehler(`Seriennummer «${sn}» ist bereits erfasst (${existing.objekt}).`);
        return;
      }
    }

    const { error } = await supabase.from("material").insert({
      palette_id: form.palette_id,
      typ: form.typ,
      objekt: form.objekt.trim(),
      seriennummer: sn || null,
      bestand_initial: sn ? 1 : form.bestand,
      bestand_aktuell: sn ? 1 : form.bestand,
    });

    if (error) {
      setFehler(`Fehler: ${error.message}`);
      return;
    }

    setForm((f) => ({ ...f, objekt: "", seriennummer: "", bestand: 1 }));
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
    // Objekte mit Seriennummer haben immer Bestand 1 — kein Anpassen
    if (item.seriennummer) return;
    const neu = Math.max(0, item.bestand_aktuell + delta);
    await supabase.from("material").update({ bestand_aktuell: neu }).eq("id", id);
    laden();
  }

  const hatSeriennummer = form.seriennummer.trim().length > 0;

  return (
    <main className="max-w-lg mx-auto p-4">
      <Link href="/admin" className="text-sm text-red-600 mb-4 inline-block">← Admin</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Material verwalten</h1>

      {paletten.length === 0 && zugId && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3 mb-6">
          Noch keine Paletten vorhanden. Zuerst unter{" "}
          <Link href="/admin/fahrzeuge" className="underline">Fahrzeuge & Paletten</Link> eine Palette anlegen.
        </p>
      )}

      {/* Neues Material */}
      <form onSubmit={hinzufuegen} className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-col gap-3">
        <h2 className="font-semibold text-gray-800">Neues Material</h2>

        {/* Palette */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Palette <span className="text-red-500">*</span></label>
          <select
            value={form.palette_id}
            onChange={(e) => setPaletteId(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
          >
            <option value="">— Palette wählen —</option>
            {paletten.map((p) => (
              <option key={p.id} value={p.id}>{getLabelForPalette(p)}</option>
            ))}
          </select>
        </div>

        {/* Typ + Bestand */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Typ</label>
            <select
              value={form.typ}
              onChange={(e) => setForm((f) => ({ ...f, typ: e.target.value as MaterialTyp }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
            >
              {Object.entries(MATERIAL_TYP_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Bestand {hatSeriennummer && <span className="text-gray-400">(fix: 1)</span>}
            </label>
            <input
              type="number"
              min={1}
              value={hatSeriennummer ? 1 : form.bestand}
              onChange={(e) => setForm((f) => ({ ...f, bestand: parseInt(e.target.value) }))}
              disabled={hatSeriennummer}
              className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 ${hatSeriennummer ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}`}
            />
          </div>
        </div>

        {/* Objekt */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Objekt <span className="text-red-500">*</span></label>
          <input
            value={form.objekt}
            onChange={(e) => setForm((f) => ({ ...f, objekt: e.target.value }))}
            placeholder="z.B. SE-235, Funkgerät"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
          />
        </div>

        {/* Seriennummer */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Seriennummer <span className="text-gray-400">(optional – sperrt Bestand auf 1)</span>
          </label>
          <input
            value={form.seriennummer}
            onChange={(e) => setSeriennummer(e.target.value)}
            placeholder="z.B. CH-1234567"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 font-mono"
          />
        </div>

        {fehler && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{fehler}</p>}

        <button type="submit" className="bg-red-600 text-white rounded-xl py-3 font-semibold active:bg-red-700">
          Hinzufügen
        </button>
      </form>

      {/* Materialliste */}
      <div className="flex flex-col gap-2">
        {materialListe.map((m) => {
          const label = m.palette
            ? `M+${m.palette.fahrzeug?.m_nummer ?? ""} – ${m.palette.name}`
            : "—";
          return (
            <div key={m.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{m.objekt}</p>
                  {m.seriennummer && (
                    <p className="text-xs font-mono text-gray-500">{m.seriennummer}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {MATERIAL_TYP_LABEL[m.typ]} · {label}
                  </p>
                </div>
                <button onClick={() => loeschen(m.id)} className="text-xs text-red-500">Löschen</button>
              </div>
              {m.seriennummer ? (
                <p className="text-xs text-gray-400">Einzelobjekt (Bestand: {m.bestand_aktuell})</p>
              ) : (
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
              )}
            </div>
          );
        })}
        {materialListe.length === 0 && zugId && paletten.length > 0 && (
          <p className="text-gray-400 text-sm text-center py-8">Noch kein Material erfasst.</p>
        )}
      </div>
    </main>
  );
}
