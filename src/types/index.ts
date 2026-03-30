export type MaterialTyp = "klass" | "tech" | "feld" | "sens";
export type TransaktionTyp = "entnahme" | "rueckgabe" | "verschiebung" | "anpassung";
export type TransaktionStatus = "offen" | "teilweise" | "abgeschlossen";

export const MATERIAL_TYP_LABEL: Record<MaterialTyp, string> = {
  klass: "Klass Mat",
  tech: "Tech Mat",
  feld: "Feld Mat",
  sens: "Sens Mat",
};

export const GRAD_OPTIONEN = [
  "Sdt", "Gfr", "Kpl", "Wm", "Fw", "Adj Uof", "Adj Uof i Gst",
  "S Ten", "Ten", "OLt", "Lt", "Hptm", "Maj", "Obst Lt", "Obst",
];

export interface Zug {
  id: string;
  name: string;
  zugfuehrer_id: string;
}

export const GRUPPE_FARBEN: { label: string; hex: string; tw: string }[] = [
  { label: "Rot",    hex: "#dc2626", tw: "bg-red-600" },
  { label: "Blau",   hex: "#2563eb", tw: "bg-blue-600" },
  { label: "Grün",   hex: "#16a34a", tw: "bg-green-600" },
  { label: "Gelb",   hex: "#ca8a04", tw: "bg-yellow-600" },
  { label: "Orange", hex: "#ea580c", tw: "bg-orange-600" },
  { label: "Lila",   hex: "#9333ea", tw: "bg-purple-600" },
  { label: "Grau",   hex: "#6b7280", tw: "bg-gray-500" },
];

export interface Gruppe {
  id: string;
  zug_id: string;
  name: string;
  farbe: string; // hex
}

export interface Fahrzeug {
  id: string;
  zug_id: string;
  name: string;       // taktische Bezeichnung, z.B. "Puch 1"
  m_nummer: string;   // militärische KFZ-Nummer, z.B. "M+12345"
  gruppe_id?: string | null;
  gruppe?: Gruppe;
}

export interface Palette {
  id: string;
  fahrzeug_id: string;
  name: string;
  qr_token: string;
}

export interface Material {
  id: string;
  palette_id: string;
  typ: MaterialTyp;
  objekt: string;
  seriennummer?: string | null;
  bestand_initial: number;
  bestand_aktuell: number;
}

export interface Transaktion {
  id: string;
  material_id: string;
  typ: TransaktionTyp;
  grad: string;
  vorname: string;
  nachname: string;
  anzahl: number;
  bemerkung?: string;
  timestamp: string;
  status: TransaktionStatus;
  parent_id?: string;
  von_palette_id?: string;
  nach_palette_id?: string;
  // Joined fields
  material?: Material;
}
