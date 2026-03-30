# Material Tracker — Entwicklungsnotizen

## Grundsätze (immer einhalten)

### ✅ Inline-Edit überall im Admin-Bereich
Jedes Admin-Element das angezeigt wird, muss auch bearbeitbar sein — **inline**, ohne Seitenwechsel.

Muster:
- Normalkarte mit **„Bearbeiten"**-Button (blau, rechts)
- Klick → Karte wird zum Edit-Formular (blaues Styling zur Unterscheidung)
- Felder: alle relevanten Eigenschaften des Objekts
- Buttons: **Speichern** · **Abbrechen** · **Löschen** (nur im Edit-Modus)
- Duplikat-/Validierungschecks vor dem Speichern
- Nur eine Edit-Karte gleichzeitig offen

Bereits umgesetzt:
- [x] Material (objekt, typ, seriennummer, bestände, palette/lagerort)
- [x] Fahrzeuge (m_nummer, bezeichnung, gruppe)
- [x] Paletten (name)
- [ ] Gruppen (name, farbe) — TODO

---

## Offene Feature-Todos

- [ ] **Gruppen Inline-Edit** — Name und Farbe nachträglich ändern
- [ ] **Verladeliste als Seite 2** im QR-PDF (Klass Mat / Sens Mat mit Seriennummern)
- [ ] **Rückgabe-Flow** verbessern — offene Transaktionen direkt abschliessen
- [ ] **Inventur-Modus** — schnell alle Bestände kontrollieren / korrigieren
- [ ] **Verschiebung** Material zwischen Paletten direkt im Admin

---

## Architektur-Entscheide

- `m_nummer` = INTEGER in Supabase, im UI immer mit Prefix "M+" angezeigt
- Seriennummer → Bestand wird auf 1 gesperrt (jedes Objekt ist weltweit einzigartig)
- Zugführer sieht eigenen Zug default + Dropdown für fremde Züge
- Soldat (QR-Zugang) sieht nur Zug des gescannten QR-Codes, kein Dropdown
- Supabase Free Tier: pausiert nach 1 Woche Inaktivität → manuell aufwecken auf supabase.com
