"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Gruppe } from "@/types";
import { GRUPPE_FARBEN } from "@/types";

/** Stellt sicher dass immer ein gültiger Hex-Wert zurückkommt.
 *  Alte Einträge haben u.U. den Tailwind-Klassennamen gespeichert. */
function resolveHex(farbe: string): string {
  if (farbe?.startsWith("#")) return farbe;
  const match = GRUPPE_FARBEN.find((f) => f.tw === farbe || f.label === farbe);
  return match?.hex ?? "#6b7280";
}

function FarbPicker({ farbe, onChange }: { farbe: string; onChange: (hex: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {GRUPPE_FARBEN.map((f) => (
        <button
          key={f.hex}
          type="button"
          onClick={() => onChange(f.hex)}
          title={f.label}
          className={`w-8 h-8 rounded-full border-4 transition-all ${farbe === f.hex ? "border-gray-900 scale-110" : "border-transparent"}`}
          style={{ backgroundColor: f.hex }}
        />
      ))}
    </div>
  );
}

interface EditState {
  id: string;
  name: string;
  farbe: string;
  speichern: boolean;
}

export default function GruppenAdmin() {
  const { zugId } = useAuth();
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [name, setName] = useState("");
  const [farbe, setFarbe] = useState(GRUPPE_FARBEN[0].hex);
  const [fehler, setFehler] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [editFehler, setEditFehler] = useState<string | null>(null);

  async function laden() {
    if (!zugId) return;
    const { data } = await supabase.from("gruppe").select("*").eq("zug_id", zugId).order("name");
    setGruppen(data ?? []);
  }

  useEffect(() => { laden(); }, [zugId]);

  async function hinzufuegen(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    if (!name.trim() || !zugId) return;

    const { error } = await supabase.from("gruppe").insert({
      zug_id: zugId,
      name: name.trim(),
      farbe,
    });

    if (error) { setFehler(`Fehler: ${error.message}`); return; }
    setName("");
    laden();
  }

  function editStarten(g: Gruppe) {
    setEdit({ id: g.id, name: g.name, farbe: resolveHex(g.farbe), speichern: false });
    setEditFehler(null);
  }

  async function editSpeichern() {
    if (!edit || !edit.name.trim()) return;
    setEdit((e) => e ? { ...e, speichern: true } : null);
    setEditFehler(null);

    const { error } = await supabase
      .from("gruppe")
      .update({ name: edit.name.trim(), farbe: edit.farbe })
      .eq("id", edit.id);

    if (error) {
      setEditFehler(`Fehler: ${error.message}`);
      setEdit((e) => e ? { ...e, speichern: false } : null);
      return;
    }
    setEdit(null);
    laden();
  }

  async function loeschen(id: string, gruppenName: string) {
    if (!confirm(`Gruppe «${gruppenName}» löschen? Fahrzeuge bleiben erhalten, verlieren aber ihre Gruppe.`)) return;
    await supabase.from("gruppe").delete().eq("id", id);
    if (edit?.id === id) setEdit(null);
    laden();
  }

  return (
    <main className="max-w-lg mx-auto p-4">
      <Link href="/admin" className="text-sm text-red-600 mb-4 inline-block">← Admin</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gruppen</h1>

      {/* Neue Gruppe */}
      <form onSubmit={hinzufuegen} className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-col gap-4">
        <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Gruppe hinzufügen</h2>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Name <span className="text-red-500">*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Kampfzug, Versorgung"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Farbe</label>
          <FarbPicker farbe={farbe} onChange={setFarbe} />
          <p className="text-xs text-gray-400 mt-1">
            Gewählt: <span className="font-semibold" style={{ color: farbe }}>
              {GRUPPE_FARBEN.find((f) => f.hex === farbe)?.label}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Vorschau:</span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: farbe }}>
            {name || "Gruppenname"}
          </span>
        </div>

        {fehler && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{fehler}</p>}

        <button type="submit" className="w-full bg-gray-800 text-white rounded-xl py-3 font-semibold active:bg-gray-900">
          Gruppe erstellen
        </button>
      </form>

      {/* Gruppenliste */}
      {gruppen.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">
          Noch keine Gruppen. Erstelle eine Gruppe und weise sie dann Fahrzeugen zu.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {gruppen.map((g) => {
          const isEditing = edit?.id === g.id;

          return (
            <div key={g.id} className={`bg-white border rounded-xl overflow-hidden transition-all ${isEditing ? "border-gray-400 shadow-md" : "border-gray-200"}`}>
              {/* Kopfzeile — immer sichtbar */}
              <div className="px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shrink-0 transition-colors"
                    style={{ backgroundColor: isEditing ? edit.farbe : resolveHex(g.farbe) }}
                  />
                  <span
                    className="text-sm font-semibold px-2.5 py-1 rounded-full text-white transition-colors"
                    style={{ backgroundColor: isEditing ? edit.farbe : resolveHex(g.farbe) }}
                  >
                    {isEditing ? (edit.name || "Gruppenname") : g.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => isEditing ? setEdit(null) : editStarten(g)}
                    className="text-xs text-gray-500 font-medium"
                  >
                    {isEditing ? "Abbrechen" : "Bearbeiten"}
                  </button>
                  <button onClick={() => loeschen(g.id, g.name)} className="text-xs text-red-500 font-medium">
                    Löschen
                  </button>
                </div>
              </div>

              {/* Edit-Bereich — aufklappbar */}
              {isEditing && (
                <div className="border-t border-gray-100 px-4 py-4 flex flex-col gap-4 bg-gray-50">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                    <input
                      value={edit.name}
                      onChange={(e) => setEdit((prev) => prev ? { ...prev, name: e.target.value } : null)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">Farbe</label>
                    <FarbPicker
                      farbe={edit.farbe}
                      onChange={(hex) => setEdit((prev) => prev ? { ...prev, farbe: hex } : null)}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Gewählt: <span className="font-semibold" style={{ color: edit.farbe }}>
                        {GRUPPE_FARBEN.find((f) => f.hex === edit.farbe)?.label ?? edit.farbe}
                      </span>
                    </p>
                  </div>

                  {editFehler && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{editFehler}</p>
                  )}

                  <button
                    onClick={editSpeichern}
                    disabled={edit.speichern || !edit.name.trim()}
                    className="w-full bg-gray-800 text-white rounded-xl py-3 font-semibold active:bg-gray-900 disabled:opacity-50"
                  >
                    {edit.speichern ? "Speichern…" : "Speichern"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
