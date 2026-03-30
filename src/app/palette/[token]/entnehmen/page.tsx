"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { speicherLokal } from "@/lib/db-sync";
import type { Material, Palette, Fahrzeug, Gruppe, Transaktion } from "@/types";
import { MATERIAL_TYP_LABEL, GRAD_OPTIONEN } from "@/types";

interface FahrzeugMitPaletten extends Fahrzeug {
  paletten: Palette[];
  gruppe?: Gruppe;
}

interface Props {
  params: Promise<{ token: string }>;
}

export default function Entnehmen({ params }: Props) {
  const { token } = React.use(params);
  const router = useRouter();

  // Zug-Kontext
  const [zugId, setZugId] = useState<string | null>(null);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugMitPaletten[]>([]);

  // Auswahl-Filter
  const [selectedGruppeId, setSelectedGruppeId] = useState<string>("");
  const [selectedFahrzeugId, setSelectedFahrzeugId] = useState<string>("");
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>("");

  // Material in gewählter Palette
  const [material, setMaterial] = useState<Material[]>([]);

  // Formular
  const [form, setForm] = useState({
    grad: "Sdt",
    vorname: "",
    nachname: "",
    material_id: "",
    anzahl: 1,
    bemerkung: "",
  });

  const [laden, setLaden] = useState(true);
  const [senden, setSenden] = useState(false);
  const [erfolg, setErfolg] = useState(false);
  const [bestandFehler, setBestandFehler] = useState<string | null>(null);

  // Initial laden: token → palette → fahrzeug → zug → alles
  useEffect(() => {
    async function init() {
      // Palette aus Token
      const { data: pal } = await supabase
        .from("palette")
        .select("id, fahrzeug_id")
        .eq("qr_token", token)
        .single();
      if (!pal) { setLaden(false); return; }

      // Fahrzeug → Zug
      const { data: fz } = await supabase
        .from("fahrzeug")
        .select("zug_id")
        .eq("id", pal.fahrzeug_id)
        .single();
      if (!fz) { setLaden(false); return; }

      const zId = fz.zug_id;
      setZugId(zId);

      // Alle Gruppen und Fahrzeuge des Zugs laden
      const [{ data: gr }, { data: fahrzeugeData }] = await Promise.all([
        supabase.from("gruppe").select("*").eq("zug_id", zId).order("name"),
        supabase.from("fahrzeug")
          .select("*, paletten:palette(*), gruppe(*)")
          .eq("zug_id", zId)
          .order("m_nummer"),
      ]);

      setGruppen(gr ?? []);
      setFahrzeuge(fahrzeugeData ?? []);

      // Vorauswahl: Fahrzeug und Palette aus QR-Token
      setSelectedFahrzeugId(pal.fahrzeug_id);
      setSelectedPaletteId(pal.id);

      setLaden(false);
    }
    init();
  }, [token]);

  // Material laden wenn Palette gewählt
  useEffect(() => {
    if (!selectedPaletteId) { setMaterial([]); return; }
    supabase
      .from("material")
      .select("*")
      .eq("palette_id", selectedPaletteId)
      .gt("bestand_aktuell", 0)
      .then(({ data }) => {
        const mat = data ?? [];
        setMaterial(mat);
        if (mat[0]) {
          setForm((f) => ({ ...f, material_id: mat[0].id, anzahl: mat[0].bestand_aktuell }));
        } else {
          setForm((f) => ({ ...f, material_id: "", anzahl: 1 }));
        }
      });
  }, [selectedPaletteId]);

  // Gefilterte Fahrzeuge (nach Gruppe)
  const gefilterteFahrzeuge = selectedGruppeId
    ? fahrzeuge.filter((f) => f.gruppe_id === selectedGruppeId)
    : fahrzeuge;

  // Sichtbare Paletten
  const sichtbarePaletten = selectedFahrzeugId
    ? fahrzeuge.find((f) => f.id === selectedFahrzeugId)?.paletten ?? []
    : gefilterteFahrzeuge.flatMap((f) => f.paletten);

  const gewaehlteMat = material.find((m) => m.id === form.material_id);

  function waehleFahrzeug(fzId: string) {
    setSelectedFahrzeugId(fzId);
    setSelectedPaletteId("");
    setMaterial([]);
  }

  function waehlePalette(palId: string) {
    setSelectedPaletteId(palId);
  }

  function waehleGruppe(grId: string) {
    setSelectedGruppeId(grId);
    setSelectedFahrzeugId("");
    setSelectedPaletteId("");
    setMaterial([]);
  }

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vorname || !form.nachname || !form.material_id) return;
    setBestandFehler(null);

    if (gewaehlteMat && form.anzahl > gewaehlteMat.bestand_aktuell) {
      setBestandFehler(`Nicht genug Bestand. Verfügbar: ${gewaehlteMat.bestand_aktuell} Stück.`);
      return;
    }
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

      {/* ── Stufe 1: Gruppe (optional) ── */}
      {gruppen.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Gruppe</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            <button
              type="button"
              onClick={() => waehleGruppe("")}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors shrink-0 ${
                selectedGruppeId === ""
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-300"
              }`}
            >
              Alle
            </button>
            {gruppen.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => waehleGruppe(g.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors shrink-0 ${
                  selectedGruppeId === g.id
                    ? "text-white border-transparent"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
                style={selectedGruppeId === g.id ? { backgroundColor: g.farbe, borderColor: g.farbe } : {}}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Stufe 2: Fahrzeug (optional) ── */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Fahrzeug</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => waehleFahrzeug("")}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors shrink-0 ${
              selectedFahrzeugId === ""
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-600 border-gray-300"
            }`}
          >
            Alle
          </button>
          {gefilterteFahrzeuge.map((fz) => (
            <button
              key={fz.id}
              type="button"
              onClick={() => waehleFahrzeug(fz.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-mono font-medium border transition-colors ${
                selectedFahrzeugId === fz.id
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-300"
              }`}
            >
              M+{fz.m_nummer}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stufe 3: Palette ── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Palette</p>
        {sichtbarePaletten.length === 0 ? (
          <p className="text-sm text-gray-400">Keine Paletten gefunden.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {sichtbarePaletten.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => waehlePalette(p.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors shrink-0 ${
                  selectedPaletteId === p.id
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Formular (erscheint sobald Palette gewählt) ── */}
      {selectedPaletteId && (
        <form onSubmit={absenden} className="flex flex-col gap-4">
          {/* Grad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grad</label>
            <select
              value={form.grad}
              onChange={(e) => setForm((f) => ({ ...f, grad: e.target.value }))}
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
                onChange={(e) => setForm((f) => ({ ...f, vorname: e.target.value }))}
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
                onChange={(e) => setForm((f) => ({ ...f, nachname: e.target.value }))}
                placeholder="Sieben"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
              />
            </div>
          </div>

          {/* Material */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
            {material.length === 0 ? (
              <p className="text-sm text-red-500">Kein Material verfügbar in dieser Palette.</p>
            ) : (
              <select
                value={form.material_id}
                onChange={(e) => {
                  const gew = material.find((m) => m.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    material_id: e.target.value,
                    anzahl: gew?.bestand_aktuell ?? 1,
                  }));
                  setBestandFehler(null);
                }}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
              >
                {material.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.objekt} ({MATERIAL_TYP_LABEL[m.typ]}) — {m.bestand_aktuell} Stück
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Anzahl */}
          {material.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anzahl</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, anzahl: Math.max(1, f.anzahl - 1) }));
                    setBestandFehler(null);
                  }}
                  className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-800 text-3xl font-bold flex items-center justify-center active:bg-gray-200 shrink-0"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <p className="text-4xl font-bold text-gray-900">{form.anzahl}</p>
                  {gewaehlteMat && (
                    <p className="text-sm text-gray-400 mt-1">von {gewaehlteMat.bestand_aktuell} verfügbar</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const max = gewaehlteMat?.bestand_aktuell ?? 99;
                    setForm((f) => ({ ...f, anzahl: Math.min(max, f.anzahl + 1) }));
                    setBestandFehler(null);
                  }}
                  className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-800 text-3xl font-bold flex items-center justify-center active:bg-gray-200 shrink-0"
                >
                  +
                </button>
              </div>
              {bestandFehler && (
                <p className="text-sm text-red-600 mt-2">{bestandFehler}</p>
              )}
            </div>
          )}

          {/* Bemerkung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bemerkung <span className="text-gray-400">(optional)</span></label>
            <input
              type="text"
              value={form.bemerkung}
              onChange={(e) => setForm((f) => ({ ...f, bemerkung: e.target.value }))}
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
      )}

      {!selectedPaletteId && sichtbarePaletten.length > 0 && (
        <p className="text-sm text-gray-400 text-center py-4">← Palette auswählen um fortzufahren</p>
      )}
    </main>
  );
}
