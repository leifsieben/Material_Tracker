# Material Tracker – Schweizer Armee

Eine mobile Web-Applikation zur Verwaltung von Materialentnahmen und -rückgaben für Züge der Schweizer Armee.

---

## Projektübersicht

Soldaten scannen einen QR-Code auf einer Palette und können ohne Konto direkt erfassen was sie entnehmen oder zurückgeben. Der Zugführer hat einen eigenen Account mit erweiterten Verwaltungsrechten. Die App funktioniert auch ohne Internet (Offline-first via PWA).

---

## Systemarchitektur

### Tech Stack

| Schicht | Technologie | Begründung |
|---|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS | React, API-Routes im gleichen Repo, grosses Ökosystem |
| PWA / Offline | `next-pwa` + IndexedDB (via `idb`) | Service Worker cached die App; Transaktionen lokal speichern |
| Datenbank & Auth | Supabase (PostgreSQL + Auth + RLS) | Kostenloses Tier, Row Level Security für Zug-Isolation |
| Hosting | Vercel (Free Tier) | Nahtlose Next.js-Integration, HTTPS, globales CDN |
| QR-Code | `qrcode.react` | QR-Codes client-seitig generieren und drucken |

**Kostenprognose: ~0 CHF/Monat** (Supabase Free: 500 MB DB, 50k aktive Nutzer; Vercel Free: unlimitierte Deployments)

---

### Datenmodell

```
Zug
├── id (uuid)
├── name                          z.B. "3. Zug / Kp X"
└── zugführer_id (FK → auth.users)

Fahrzeug
├── id (uuid)
├── zug_id (FK → Zug)
└── name                          z.B. "Puch 1", "LKW 2"

Palette
├── id (uuid)
├── fahrzeug_id (FK → Fahrzeug)
├── name                          z.B. "Palette A"
└── qr_token (unique)             URL-Token für QR-Link

Material
├── id (uuid)
├── palette_id (FK → Palette)
├── typ (enum: klass|tech|feld|sens)
├── objekt                        z.B. "SE-235"
├── bestand_initial (integer)
└── bestand_aktuell (integer)     aktualisiert durch Transaktionen

Transaktion
├── id (uuid)
├── material_id (FK → Material)
├── typ (enum: entnahme|rückgabe|verschiebung|anpassung)
├── grad                          z.B. "Wm"
├── vorname
├── nachname
├── anzahl (integer)              negativ = Entnahme, positiv = Rückgabe
├── bemerkung (optional)
├── timestamp (auto)
├── status (enum: offen|teilweise|abgeschlossen)
├── parent_id (FK → Transaktion)  für Teilrückgaben
├── von_palette_id                nur bei Verschiebung
└── nach_palette_id               nur bei Verschiebung
```

**Row Level Security:** RLS-Policies stellen sicher, dass Zugführer ausschliesslich Daten ihres eigenen Zugs sehen/bearbeiten können. QR-Tokens ermöglichen anonymen Lesezugriff auf die zugehörige Palette.

---

### Offline-Strategie

1. App beim ersten Besuch vollständig cachen (Service Worker)
2. Neue Transaktionen offline in IndexedDB speichern
3. Beim Wiederverbinden: automatischer Sync
4. Sync-Status-Anzeige in der UI (grüner/roter Punkt)
5. Konfliktlösung: Timestamp-basiert (last-write-wins)

---

## Benutzerrollen

### Soldat (anonym, via QR-Code)
- Palette scannen → direkte Palettenansicht + Zurück-Button zur Zugübersicht
- **Entnehmen:** Grad, Vorname, Nachname, Typ, Objekt, Anzahl, optionale Bemerkung
- **Zurückgeben:** Liste offener Entnahmen → vollständig oder teilweise zurückgeben
- **Verschieben:** Material zwischen Paletten/Fahrzeugen verschieben

### Zugführer (eingeloggt)
- Alles was Soldaten können
- Fahrzeuge und Paletten verwalten (erstellen, umbenennen, löschen)
- QR-Codes generieren und als Etikett drucken
- Material anlegen und Bestände anpassen (erzeugen/vernichten)
- Transaktionen korrigieren oder löschen
- Dashboard: Gesamtübersicht aller Bestände und offenen Entnahmen

---

## URL-Struktur

```
/                             Startseite (Weiterleitung je nach Status)
/login                        Zugführer-Login
/zug                          Zugübersicht (Fahrzeuge & Paletten)
/palette/[token]              Palettenansicht via QR-Code (anonym)
/palette/[token]/entnehmen    Entnahme-Formular
/palette/[token]/zurueck      Rückgabe-Flow
/palette/[token]/verschieben  Verschiebung
/admin                        Admin-Dashboard (Zugführer)
/admin/fahrzeuge              Fahrzeugverwaltung
/admin/paletten               Palettenverwaltung + QR
/admin/material               Materialverwaltung
```

---

## Entwicklungs-Roadmap

### Phase 1 – Setup & Infrastruktur
- [ ] **T01** – Next.js Projekt initialisieren (TypeScript, Tailwind, ESLint)
- [ ] **T02** – Supabase Projekt anlegen, DB-Schema (Migrations) erstellen
- [ ] **T03** – Supabase Auth konfigurieren (Email/Passwort für Zugführer)
- [ ] **T04** – Row Level Security Policies schreiben und testen
- [ ] **T05** – PWA Setup (`next-pwa`, Manifest, Icons)
- [ ] **T06** – IndexedDB Sync-Layer implementieren (`idb`)
- [ ] **T07** – Deployment auf Vercel (Preview + Production)

### Phase 2 – Kernfunktionen (Soldat)
- [ ] **T08** – Zugübersicht: alle Fahrzeuge und Paletten anzeigen
- [ ] **T09** – Palettenansicht via QR-Token (anonym, mobil-optimiert)
- [ ] **T10** – Entnahme-Formular
- [ ] **T11** – Rückgabe-Flow: vollständige Rückgabe
- [ ] **T12** – Rückgabe-Flow: Teilrückgabe
- [ ] **T13** – Verschiebung zwischen Paletten/Fahrzeugen

### Phase 3 – Admin-Bereich (Zugführer)
- [ ] **T14** – Login/Logout, geschützte Admin-Routen
- [ ] **T15** – Fahrzeug- und Palettenverwaltung (CRUD)
- [ ] **T16** – QR-Code Generierung und Druckansicht
- [ ] **T17** – Materialverwaltung: Objekte anlegen, Bestände anpassen
- [ ] **T18** – Transaktionen bearbeiten/löschen
- [ ] **T19** – Admin Dashboard: Gesamtübersicht, offene Entnahmen

### Phase 4 – Polish & Deployment
- [ ] **T20** – Online/Offline Indikator
- [ ] **T21** – Offline Konfliktlösung und Fehlerbehandlung
- [ ] **T22** – Deutsche Fehlermeldungen und Bestätigungsdialoge
- [ ] **T23** – Responsive Testing (iOS Safari, Android Chrome)
- [ ] **T24** – Erster Zug einrichten (Testdaten)
- [ ] **T25** – Setup-Anleitung für weitere Zugführer

---

## Lokale Entwicklung (nach Setup)

```bash
npm install
npm run dev        # http://localhost:3000
```

Umgebungsvariablen (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Wichtige Dateien (nach Umsetzung)

```
src/
├── app/                    Next.js App Router Pages
├── lib/
│   ├── supabase.ts         Supabase Client
│   └── db-sync.ts          IndexedDB Offline-Sync
supabase/
└── migrations/             DB Schema als SQL Migrations
public/
└── manifest.json           PWA Manifest
```
