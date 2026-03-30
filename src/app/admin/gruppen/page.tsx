"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Gruppe } from "@/types";
import { GRUPPE_FARBEN } from "@/types";

export default function GruppenAdmin() {
  const { zugId } = useAuth();
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [name, setName] = useState("");
  const [farbe, setFarbe] = useState(GRUPPE_FARBEN[0].hex);
  const [fehler, setFehler] = useState<string | null>(null);

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

    if (error) {
      setFehler(`Fehler: ${error.message}`);
      return;
    }
    setName("");
    laden();
  }

  async function loeschen(id: string, gruppenName: string) {
    if (!confirm(`Gruppe «${gruppenName}» löschen? Fahrzeuge bleiben erhalten, verlieren aber ihre Gruppe.`)) return;
    await supabase.from("gruppe").delete().eq("id", id);
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
          <div className="flex gap-2 flex-wrap">
            {GRUPPE_FARBEN.map((f) => (
              <button
                key={f.hex}
                type="button"
                onClick={() => setFarbe(f.hex)}
                title={f.label}
                className={`w-9 h-9 rounded-full border-4 transition-all ${farbe === f.hex ? "border-gray-900 scale-110" : "border-transparent"}`}
                style={{ backgroundColor: f.hex }}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Gewählt: <span className="font-semibold" style={{ color: farbe }}>
              {GRUPPE_FARBEN.find((f) => f.hex === farbe)?.label}
            </span>
          </p>
        </div>

        {/* Vorschau */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Vorschau:</span>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
            style={{ backgroundColor: farbe }}
          >
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

      <div className="flex flex-col gap-2">
        {gruppen.map((g) => (
          <div key={g.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: g.farbe }} />
              <span
                className="text-sm font-semibold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: g.farbe }}
              >
                {g.name}
              </span>
            </div>
            <button onClick={() => loeschen(g.id, g.name)} className="text-xs text-red-500">
              Löschen
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
