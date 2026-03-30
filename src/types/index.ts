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

export interface Fahrzeug {
  id: string;
  zug_id: string;
  name: string;       // taktische Bezeichnung, z.B. "Puch 1"
  m_nummer: string;   // militärische KFZ-Nummer, z.B. "M+12345"
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
