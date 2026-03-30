"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MATERIAL_TYP_LABEL } from "@/types";

interface OffeneEntnahme {
  id: string;
  grad: string;
  vorname: string;
  nachname: string;
  anzahl: number;
  timestamp: string;
  objekt: string;
  typ: string;
  paletteName: string;
  mNummer: number;
}

interface Props {
  params: Promise<{ zugId: string }>;
}

function zeitAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return `vor ${d} Tag${d !== 1 ? "en" : ""}`;
}

export default function UebersichtPage({ params }: Props) {
  const { zugId } = React.use(params);
  const router = useRouter();
  const [entnahmen, setEntnahmen] = useState<OffeneEntnahme[]>([]);
  const [zugName, setZugName] = useState("");
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: zug } = await supabase
        .from("zug").select("name").eq("id", zugId).single();
      if (!zug) { router.push("/"); return; }
      setZugName(zug.name);

      const { data: fahrzeuge } = await supabase
        .from("fahrzeug").select("id, m_nummer").eq("zug_id", zugId);
      const fzIds = (fahrzeuge ?? []).map((f) => f.id);
      const fzMap: Record<string, number> = Object.fromEntries(
        (fahrzeuge ?? []).map((f) => [f.id, f.m_nummer])
      );
      if (fzIds.length === 0) { setLaden(false); return; }

      const { data: paletten } = await supabase
        .from("palette").select("id, name, fahrzeug_id").in("fahrzeug_id", fzIds);
      const palIds = (paletten ?? []).map((p) => p.id);
      const palMap: Record<string, { name: string; fahrzeug_id: string }> = Object.fromEntries(
        (paletten ?? []).map((p) => [p.id, { name: p.name, fahrzeug_id: p.fahrzeug_id }])
      );
      if (palIds.length === 0) { setLaden(false); return; }

      const { data: materialListe } = await supabase
        .from("material").select("id, objekt, typ, palette_id").in("palette_id", palIds);
      const matIds = (materialListe ?? []).map((m) => m.id);
      const matMap: Record<string, { objekt: string; typ: string; palette_id: string }> = Object.fromEntries(
        (materialListe ?? []).map((m) => [m.id, { objekt: m.objekt, typ: m.typ, palette_id: m.palette_id }])
      );
      if (matIds.length === 0) { setLaden(false); return; }

      const { data: trans } = await supabase
        .from("transaktion")
        .select("id, grad, vorname, nachname, anzahl, timestamp, material_id")
        .in("material_id", matIds)
        .in("status", ["offen", "teilweise"])
        .eq("typ", "entnahme")
        .order("timestamp", { ascending: false });

      setEntnahmen(
        (trans ?? []).map((t) => {
          const mat = matMap[t.material_id];
          const pal = mat ? palMap[mat.palette_id] : null;
          return {
            id: t.id,
            grad: t.grad,
            vorname: t.vorname,
            nachname: t.nachname,
            anzahl: Math.abs(t.anzahl),
            timestamp: t.timestamp,
            objekt: mat?.objekt ?? "—",
            typ: mat?.typ ?? "klass",
            paletteName: pal?.name ?? "—",
            mNummer: pal ? fzMap[pal.fahrzeug_id] : 0,
          };
        })
      );
      setLaden(false);
    }
    init();
  }, [zugId, router]);

  const nachPerson = entnahmen.reduce<Record<string, OffeneEntnahme[]>>((acc, e) => {
    const key = `${e.grad} ${e.vorname} ${e.nachname}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  if (laden) return <main className="p-4"><p className="text-gray-500">Wird geladen…</p></main>;

  return (
    <main className="max-w-lg mx-auto p-4">
      <Link href="/zug" className="text-sm text-red-600 mb-4 inline-block">← Zurück</Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Wer hat was?</h1>
        {zugName && <p className="text-sm text-gray-500">{zugName}</p>}
      </div>

      {entnahmen.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-500 font-medium">Alles zurückgegeben</p>
          <p className="text-sm text-gray-400 mt-1">Keine offenen Entnahmen im Zug</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(nachPerson).map(([person, items]) => (
            <div key={person} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-800 text-white px-4 py-2.5 flex justify-between items-center">
                <p className="font-semibold">{person}</p>
                <p className="text-xs text-gray-400">
                  {items.reduce((s, i) => s + i.anzahl, 0)} Stück total
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((e) => (
                  <div key={e.id} className="px-4 py-3 flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{e.objekt}</p>
                      <p className="text-xs text-gray-400">
                        {MATERIAL_TYP_LABEL[e.typ as keyof typeof MATERIAL_TYP_LABEL]}
                        {" · "}M+{e.mNummer} / {e.paletteName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{e.anzahl}×</p>
                      <p className="text-xs text-gray-400">{zeitAgo(e.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
