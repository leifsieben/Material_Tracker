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

interface FzEditForm {
  m_nummer: string;
  name: string;
  gruppe_id: string;
}

interface PaletteEditForm {
  name: string;
}

export default function FahrzeugeAdmin() {
  const { zugId, zugName } = useAuth();
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugMitPaletten[]>([]);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [formFz, setFormFz] = useState({ m_nummer: "", name: "", gruppe_id: "" });
  const [neuePalette, setNeuePalette] = useState<Record<string, string>>({});
  const [fehler, setFehler] = useState<string | null>(null);

  // Fahrzeug-Edit
  const [editFzId, setEditFzId] = useState<string | null>(null);
  const [editFzForm, setEditFzForm] = useState<FzEditForm | null>(null);
  const [editFzFehler, setEditFzFehler] = useState<string | null>(null);
  const [editFzLaden, setEditFzLaden] = useState(false);

  // Palette-Edit
  const [editPaletteId, setEditPaletteId] = useState<string | null>(null);
  const [editPaletteForm, setEditPaletteForm] = useState<PaletteEditForm | null>(null);
  const [editPaletteLaden, setEditPaletteLaden] = useState(false);

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

  // ── Fahrzeug hinzufügen ──
  async function fahrzeugHinzufuegen(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    if (!zugId) {
      setFehler("Kein Zug gefunden. Setup unter /admin/setup.");
      return;
    }
    if (!formFz.m_nummer.trim()) return;
    if (!/^\d+$/.test(formFz.m_nummer.trim())) {
      setFehler("M-Nummer darf nur Ziffern enthalten (z.B. 12345).");
      return;
    }
    const mNummerInt = parseInt(formFz.m_nummer.trim(), 10);
    const { data: existing } = await supabase
      .from("fahrzeug").select("id").eq("m_nummer", mNummerInt).eq("zug_id", zugId).maybeSingle();
    if (existing) {
      setFehler(`M-Nummer M+${mNummerInt} existiert bereits.`);
      return;
    }
    const { error } = await supabase.from("fahrzeug").insert({
      zug_id: zugId,
      m_nummer: mNummerInt,
      name: formFz.name.trim() || `M+${mNummerInt}`,
      gruppe_id: formFz.gruppe_id || null,
    });
    if (error) { setFehler(`Fehler: ${error.message}`); return; }
    setFormFz({ m_nummer: "", name: "", gruppe_id: "" });
    laden();
  }

  // ── Fahrzeug bearbeiten ──
  function fzEditStarten(fz: FahrzeugMitPaletten) {
    setEditFzId(fz.id);
    setEditFzFehler(null);
    setEditFzForm({
      m_nummer: String(fz.m_nummer),
      name: fz.name === `M+${fz.m_nummer}` ? "" : fz.name,
      gruppe_id: fz.gruppe_id ?? "",
    });
  }

  function fzEditAbbrechen() {
    setEditFzId(null);
    setEditFzForm(null);
    setEditFzFehler(null);
  }

  async function fzEditSpeichern(id: string) {
    if (!editFzForm) return;
    setEditFzFehler(null);
    setEditFzLaden(true);

    if (!/^\d+$/.test(editFzForm.m_nummer.trim())) {
      setEditFzFehler("M-Nummer darf nur Ziffern enthalten.");
      setEditFzLaden(false);
      return;
    }
    const mNummerInt = parseInt(editFzForm.m_nummer.trim(), 10);

    // Duplikat-Check (exkl. sich selbst)
    const { data: existing } = await supabase
      .from("fahrzeug").select("id").eq("m_nummer", mNummerInt).eq("zug_id", zugId).neq("id", id).maybeSingle();
    if (existing) {
      setEditFzFehler(`M-Nummer M+${mNummerInt} ist bereits vergeben.`);
      setEditFzLaden(false);
      return;
    }

    const { error } = await supabase.from("fahrzeug").update({
      m_nummer: mNummerInt,
      name: editFzForm.name.trim() || `M+${mNummerInt}`,
      gruppe_id: editFzForm.gruppe_id || null,
    }).eq("id", id);

    setEditFzLaden(false);
    if (error) { setEditFzFehler(`Fehler: ${error.message}`); return; }
    setEditFzId(null);
    setEditFzForm(null);
    laden();
  }

  // ── Palette bearbeiten ──
  function paletteEditStarten(p: Palette) {
    setEditPaletteId(p.id);
    setEditPaletteForm({ name: p.name });
  }

  function paletteEditAbbrechen() {
    setEditPaletteId(null);
    setEditPaletteForm(null);
  }

  async function paletteEditSpeichern(id: string) {
    if (!editPaletteForm?.name.trim()) return;
    setEditPaletteLaden(true);
    await supabase.from("palette").update({ name: editPaletteForm.name.trim() }).eq("id", id);
    setEditPaletteLaden(false);
    setEditPaletteId(null);
    setEditPaletteForm(null);
    laden();
  }

  // ── Palette hinzufügen ──
  async function paletteHinzufuegen(fahrzeugId: string) {
    const name = neuePalette[fahrzeugId];
    if (!name?.trim()) return;
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    await supabase.from("palette").insert({ fahrzeug_id: fahrzeugId, name: name.trim(), qr_token: token });
    setNeuePalette((p) => ({ ...p, [fahrzeugId]: "" }));
    laden();
  }

  // ── Löschen ──
  async function fahrzeugLoeschen(id: string) {
    if (!confirm("Fahrzeug und alle Lagerorte löschen?")) return;
    await supabase.from("fahrzeug").delete().eq("id", id);
    if (editFzId === id) fzEditAbbrechen();
    laden();
  }

  async function paletteLoeschen(id: string) {
    if (!confirm("Lagerort löschen?")) return;
    await supabase.from("palette").delete().eq("id", id);
    if (editPaletteId === id) paletteEditAbbrechen();
    laden();
  }

  return (
    <main className="max-w-lg mx-auto p-4">
      <Link href="/admin" className="text-sm text-red-600 mb-4 inline-block">← Admin</Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fahrzeuge & Lagerorte</h1>
        {zugName && <p className="text-sm text-gray-500">{zugName}</p>}
      </div>

      {/* ── Neues Fahrzeug ── */}
      <form onSubmit={fahrzeugHinzufuegen} className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-col gap-3">
        <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Fahrzeug hinzufügen</h2>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">M-Nummer <span className="text-red-500">*</span></label>
          <div className="flex items-stretch border border-gray-300 rounded-lg overflow-hidden">
            <span className="bg-gray-100 px-3 flex items-center font-mono font-bold text-gray-600 border-r border-gray-300 text-sm select-none">M+</span>
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
            {gruppen.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
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

      {/* ── Fahrzeugliste ── */}
      {fahrzeuge.map((fz) => (
        <section key={fz.id} className="mb-4 bg-white border border-gray-200 rounded-xl overflow-hidden">

          {/* Header: Normal oder Edit */}
          {editFzId === fz.id && editFzForm ? (
            <div className="bg-blue-900 text-white px-4 py-3 flex flex-col gap-3">
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Fahrzeug bearbeiten</p>

              {/* M-Nummer */}
              <div>
                <label className="block text-xs text-blue-300 mb-1">M-Nummer</label>
                <div className="flex items-stretch border border-blue-600 rounded-lg overflow-hidden">
                  <span className="bg-blue-800 px-3 flex items-center font-mono font-bold text-blue-300 border-r border-blue-600 text-sm select-none">M+</span>
                  <input
                    value={editFzForm.m_nummer}
                    onChange={(e) => setEditFzForm((f) => f && ({ ...f, m_nummer: e.target.value.replace(/\D/g, "") }))}
                    inputMode="numeric"
                    className="flex-1 px-3 py-2 bg-blue-800 text-white font-mono outline-none min-w-0"
                  />
                </div>
              </div>

              {/* Bezeichnung */}
              <div>
                <label className="block text-xs text-blue-300 mb-1">Bezeichnung</label>
                <input
                  value={editFzForm.name}
                  onChange={(e) => setEditFzForm((f) => f && ({ ...f, name: e.target.value }))}
                  placeholder="optional"
                  className="w-full px-3 py-2 bg-blue-800 text-white border border-blue-600 rounded-lg outline-none"
                />
              </div>

              {/* Gruppe */}
              <div>
                <label className="block text-xs text-blue-300 mb-1">Gruppe</label>
                <select
                  value={editFzForm.gruppe_id}
                  onChange={(e) => setEditFzForm((f) => f && ({ ...f, gruppe_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-blue-800 text-white border border-blue-600 rounded-lg outline-none"
                >
                  <option value="">— Keine Gruppe —</option>
                  {gruppen.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              {editFzFehler && (
                <p className="text-xs text-red-300 bg-red-900/40 rounded px-2 py-1">{editFzFehler}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => fzEditSpeichern(fz.id)}
                  disabled={editFzLaden}
                  className="flex-1 bg-white text-blue-900 rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {editFzLaden ? "Speichern…" : "Speichern"}
                </button>
                <button
                  onClick={fzEditAbbrechen}
                  className="flex-1 bg-blue-800 text-white rounded-lg py-2 text-sm"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => fahrzeugLoeschen(fz.id)}
                  className="text-red-300 text-xs px-2"
                >
                  Löschen
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div>
                  <p className="font-bold font-mono tracking-wider">M+{fz.m_nummer}</p>
                  {fz.name !== `M+${fz.m_nummer}` && <p className="text-xs text-gray-300 mt-0.5">{fz.name}</p>}
                </div>
                {fz.gruppe && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white ml-1" style={{ backgroundColor: fz.gruppe.farbe }}>
                    {fz.gruppe.name}
                  </span>
                )}
              </div>
              <button
                onClick={() => fzEditStarten(fz)}
                className="text-xs text-blue-300 font-medium px-2 py-1 rounded hover:bg-white/10"
              >
                Bearbeiten
              </button>
            </div>
          )}

          <div className="p-4">
            {/* ── Palettenliste ── */}
            <div className="flex flex-col gap-2 mb-3">
              {fz.paletten.map((p) => (
                <div key={p.id}>
                  {editPaletteId === p.id && editPaletteForm ? (
                    // Palette Edit-Zeile
                    <div className="flex gap-2 items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <input
                        value={editPaletteForm.name}
                        onChange={(e) => setEditPaletteForm({ name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); paletteEditSpeichern(p.id); }
                          if (e.key === "Escape") paletteEditAbbrechen();
                        }}
                        autoFocus
                        className="flex-1 text-sm bg-white border border-blue-300 rounded px-2 py-1 outline-none"
                      />
                      <button
                        onClick={() => paletteEditSpeichern(p.id)}
                        disabled={editPaletteLaden}
                        className="text-xs bg-red-600 text-white rounded px-2 py-1 font-medium disabled:opacity-50"
                      >
                        {editPaletteLaden ? "…" : "OK"}
                      </button>
                      <button onClick={paletteEditAbbrechen} className="text-xs text-gray-500 px-1">✕</button>
                      <button onClick={() => paletteLoeschen(p.id)} className="text-xs text-red-400">Löschen</button>
                    </div>
                  ) : (
                    // Palette Normal-Zeile
                    <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{p.qr_token}</p>
                      </div>
                      <div className="flex gap-3 items-center">
                        <button
                          onClick={() => paletteEditStarten(p)}
                          className="text-xs text-blue-600 font-medium"
                        >
                          Bearbeiten
                        </button>
                        <Link
                          href={`/admin/qr/${p.qr_token}?zug=${encodeURIComponent(zugName ?? "")}&fahrzeug=${encodeURIComponent(`M+${fz.m_nummer}`)}&bezeichnung=${encodeURIComponent(fz.name)}&palette=${encodeURIComponent(p.name)}${fz.gruppe ? `&gruppe=${encodeURIComponent(fz.gruppe.name)}&gruppefarbe=${encodeURIComponent(fz.gruppe.farbe)}` : ""}`}
                          className="text-xs text-gray-500 font-medium"
                        >
                          QR
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {fz.paletten.length === 0 && <p className="text-xs text-gray-400 py-1">Noch keine Lagerorte</p>}
            </div>

            {/* Neue Palette */}
            <div className="flex gap-2">
              <input
                value={neuePalette[fz.id] ?? ""}
                onChange={(e) => setNeuePalette((p) => ({ ...p, [fz.id]: e.target.value }))}
                placeholder="Neuer Lagerort, z.B. Lagerort A"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), paletteHinzufuegen(fz.id))}
              />
              <button
                onClick={() => paletteHinzufuegen(fz.id)}
                className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium active:bg-red-700"
              >+</button>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
