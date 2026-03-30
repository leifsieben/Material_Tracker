"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, getLagerPalette } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Material, Palette, Fahrzeug } from "@/types";
import { MATERIAL_TYP_LABEL, MaterialTyp } from "@/types";

interface PaletteMitFahrzeug extends Palette {
  fahrzeug?: Fahrzeug;
}

interface MaterialMitPalette extends Material {
  palette?: PaletteMitFahrzeug;
}

interface EditForm {
  objekt: string;
  typ: MaterialTyp;
  seriennummer: string;
  bestand_initial: number;
  bestand_aktuell: number;
  palette_id: string;
}

function getLabelForPalette(p: PaletteMitFahrzeug) {
  if (p.is_lager) return "📦 Im Lager";
  const fzLabel = p.fahrzeug
    ? `M+${p.fahrzeug.m_nummer}${p.fahrzeug.name !== `M+${p.fahrzeug.m_nummer}` ? ` (${p.fahrzeug.name})` : ""} – `
    : "";
  return `${fzLabel}${p.name}`;
}

export default function MaterialAdmin() {
  const { zugId } = useAuth();
  const [materialListe, setMaterialListe] = useState<MaterialMitPalette[]>([]);
  const [paletten, setPaletten] = useState<PaletteMitFahrzeug[]>([]);
  const [paletteIds, setPaletteIds] = useState<string[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);

  // Hinzufügen-Formular
  const [form, setForm] = useState({
    palette_id: "",
    typ: "klass" as MaterialTyp,
    objekt: "",
    seriennummer: "",
    bestand: 1,
  });

  // Bearbeiten
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editFehler, setEditFehler] = useState<string | null>(null);
  const [editLaden, setEditLaden] = useState(false);

  async function laden() {
    if (!zugId) return;

    const { data: fz } = await supabase
      .from("fahrzeug")
      .select("id, name, m_nummer, zug_id")
      .eq("zug_id", zugId);

    const fahrzeugIds = (fz ?? []).map((f) => f.id);
    const fahrzeugMap = Object.fromEntries((fz ?? []).map((f) => [f.id, f]));

    // Normal-Paletten + Lager-Palette parallel laden
    const [normalPalRes, lagerPal] = await Promise.all([
      fahrzeugIds.length > 0
        ? supabase.from("palette").select("*").in("fahrzeug_id", fahrzeugIds).order("name")
        : Promise.resolve({ data: [] }),
      getLagerPalette(zugId).catch(() => null),
    ]);

    const normalPaletten: PaletteMitFahrzeug[] = ((normalPalRes.data ?? []) as PaletteMitFahrzeug[]).map((p) => ({
      ...p,
      fahrzeug: fahrzeugMap[p.fahrzeug_id ?? ""],
    }));

    const lagerEintrag: PaletteMitFahrzeug | null = lagerPal
      ? { ...lagerPal, fahrzeug_id: null, qr_token: "", fahrzeug: undefined }
      : null;

    const allePaletten: PaletteMitFahrzeug[] = lagerEintrag
      ? [...normalPaletten, lagerEintrag]
      : normalPaletten;

    const ids = allePaletten.map((p) => p.id);
    setPaletten(allePaletten);
    setPaletteIds(ids);

    setForm((f) => ({
      ...f,
      palette_id: f.palette_id || (normalPaletten[0]?.id ?? lagerEintrag?.id ?? ""),
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
          ? {
              ...m.palette,
              fahrzeug: m.palette.is_lager ? undefined : fahrzeugMap[m.palette.fahrzeug_id],
            }
          : undefined,
      }))
    );
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { laden(); }, [zugId]);

  function setSeriennummer(value: string) {
    setForm((f) => ({
      ...f,
      seriennummer: value,
      bestand: value.trim() ? 1 : f.bestand,
    }));
  }

  async function hinzufuegen(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    if (!form.objekt.trim() || !form.palette_id) return;

    const sn = form.seriennummer.trim();

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
    if (editId === id) { setEditId(null); setEditForm(null); }
    laden();
  }

  async function bestandAnpassen(id: string, delta: number) {
    const item = materialListe.find((m) => m.id === id);
    if (!item || item.seriennummer) return;
    const neu = Math.max(0, item.bestand_aktuell + delta);
    await supabase.from("material").update({ bestand_aktuell: neu }).eq("id", id);
    laden();
  }

  // ── Edit ──
  function editStarten(m: MaterialMitPalette) {
    setEditId(m.id);
    setEditFehler(null);
    setEditForm({
      objekt: m.objekt,
      typ: m.typ,
      seriennummer: m.seriennummer ?? "",
      bestand_initial: m.bestand_initial,
      bestand_aktuell: m.bestand_aktuell,
      palette_id: m.palette_id,
    });
  }

  function editAbbrechen() {
    setEditId(null);
    setEditForm(null);
    setEditFehler(null);
  }

  async function editSpeichern(id: string) {
    if (!editForm) return;
    setEditFehler(null);
    setEditLaden(true);

    const sn = editForm.seriennummer.trim();

    // Seriennummer-Duplikatcheck (exkl. sich selbst)
    if (sn && paletteIds.length > 0) {
      const { data: existing } = await supabase
        .from("material")
        .select("id, objekt")
        .eq("seriennummer", sn)
        .in("palette_id", paletteIds)
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        setEditFehler(`Seriennummer «${sn}» ist bereits bei «${existing.objekt}» erfasst.`);
        setEditLaden(false);
        return;
      }
    }

    const { error } = await supabase
      .from("material")
      .update({
        objekt: editForm.objekt.trim(),
        typ: editForm.typ,
        seriennummer: sn || null,
        bestand_initial: sn ? 1 : editForm.bestand_initial,
        bestand_aktuell: sn ? 1 : editForm.bestand_aktuell,
        palette_id: editForm.palette_id,
      })
      .eq("id", id);

    setEditLaden(false);

    if (error) {
      setEditFehler(`Fehler: ${error.message}`);
      return;
    }

    setEditId(null);
    setEditForm(null);
    laden();
  }

  const hatSeriennummer = form.seriennummer.trim().length > 0;

  return (
    <main className="max-w-lg mx-auto p-4">
      <Link href="/admin" className="text-sm text-red-600 mb-4 inline-block">← Admin</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Material verwalten</h1>

      {paletten.length === 0 && zugId && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3 mb-6">
          Noch keine Lagerorte vorhanden. Zuerst unter{" "}
          <Link href="/admin/fahrzeuge" className="underline">Fahrzeuge & Lagerorte</Link> einen Lagerort anlegen.
        </p>
      )}

      {/* ── Neues Material ── */}
      <form onSubmit={hinzufuegen} className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-col gap-3">
        <h2 className="font-semibold text-gray-800">Neues Material</h2>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Lagerort <span className="text-red-500">*</span></label>
          <select
            value={form.palette_id}
            onChange={(e) => setForm((f) => ({ ...f, palette_id: e.target.value }))}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
          >
            <option value="">— Lagerort wählen —</option>
            {paletten.map((p) => (
              <option key={p.id} value={p.id}>{getLabelForPalette(p)}</option>
            ))}
          </select>
        </div>

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

      {/* ── Materialliste ── */}
      <div className="flex flex-col gap-2">
        {materialListe.map((m) => {
          const label = m.palette?.is_lager
            ? "📦 Im Lager"
            : m.palette
            ? `M+${m.palette.fahrzeug?.m_nummer ?? ""} – ${m.palette.name}`
            : "—";
          const istEdit = editId === m.id;

          if (istEdit && editForm) {
            // ── Edit-Karte ──
            const editHatSn = editForm.seriennummer.trim().length > 0;
            return (
              <div key={m.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Bearbeiten</p>

                {/* Objekt */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Objekt</label>
                  <input
                    value={editForm.objekt}
                    onChange={(e) => setEditForm((f) => f && ({ ...f, objekt: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  />
                </div>

                {/* Typ */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Typ</label>
                  <select
                    value={editForm.typ}
                    onChange={(e) => setEditForm((f) => f && ({ ...f, typ: e.target.value as MaterialTyp }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  >
                    {Object.entries(MATERIAL_TYP_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Seriennummer */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Seriennummer</label>
                  <input
                    value={editForm.seriennummer}
                    onChange={(e) => setEditForm((f) => f && ({
                      ...f,
                      seriennummer: e.target.value,
                      bestand_initial: e.target.value.trim() ? 1 : f.bestand_initial,
                      bestand_aktuell: e.target.value.trim() ? 1 : f.bestand_aktuell,
                    }))}
                    placeholder="optional"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white font-mono text-sm"
                  />
                </div>

                {/* Bestände */}
                {!editHatSn && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Sollbestand</label>
                      <input
                        type="number"
                        min={0}
                        value={editForm.bestand_initial}
                        onChange={(e) => setEditForm((f) => f && ({ ...f, bestand_initial: parseInt(e.target.value) || 0 }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Istbestand</label>
                      <input
                        type="number"
                        min={0}
                        value={editForm.bestand_aktuell}
                        onChange={(e) => setEditForm((f) => f && ({ ...f, bestand_aktuell: parseInt(e.target.value) || 0 }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Palette / Fahrzeug */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Lagerort</label>
                  <select
                    value={editForm.palette_id}
                    onChange={(e) => setEditForm((f) => f && ({ ...f, palette_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  >
                    {paletten.map((p) => (
                      <option key={p.id} value={p.id}>{getLabelForPalette(p)}</option>
                    ))}
                  </select>
                </div>

                {editFehler && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{editFehler}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => editSpeichern(m.id)}
                    disabled={editLaden}
                    className="flex-1 bg-red-600 text-white rounded-xl py-2.5 font-semibold active:bg-red-700 disabled:opacity-50"
                  >
                    {editLaden ? "Speichern…" : "Speichern"}
                  </button>
                  <button
                    onClick={editAbbrechen}
                    className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 font-semibold active:bg-gray-200"
                  >
                    Abbrechen
                  </button>
                </div>

                <button
                  onClick={() => loeschen(m.id)}
                  className="text-xs text-red-500 text-center py-1"
                >
                  Löschen
                </button>
              </div>
            );
          }

          // ── Normal-Karte ──
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
                <button
                  onClick={() => editStarten(m)}
                  className="text-xs text-blue-600 font-medium px-2 py-1 rounded-lg hover:bg-blue-50"
                >
                  Bearbeiten
                </button>
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
