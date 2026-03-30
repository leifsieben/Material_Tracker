/**
 * IndexedDB Offline-Sync Layer
 *
 * Ausstehende Transaktionen werden lokal gespeichert wenn offline
 * und beim Wiederverbinden automatisch an Supabase gesendet.
 */
import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Transaktion } from "@/types";
import { supabase } from "./supabase";

interface MaterialTrackerDB extends DBSchema {
  pending_transaktionen: {
    key: string;
    value: Transaktion & { _local_id: string };
  };
}

let db: IDBPDatabase<MaterialTrackerDB> | null = null;

async function getDB() {
  if (!db) {
    db = await openDB<MaterialTrackerDB>("material-tracker", 1, {
      upgrade(db) {
        db.createObjectStore("pending_transaktionen", { keyPath: "_local_id" });
      },
    });
  }
  return db;
}

/** Speichert eine Transaktion lokal (offline) */
export async function speicherLokal(transaktion: Transaktion) {
  const database = await getDB();
  const lokal = { ...transaktion, _local_id: crypto.randomUUID() };
  await database.add("pending_transaktionen", lokal);
  return lokal;
}

/** Gibt alle ausstehenden lokalen Transaktionen zurück */
export async function holeAusstehende() {
  const database = await getDB();
  return database.getAll("pending_transaktionen");
}

/** Synchronisiert ausstehende Transaktionen mit Supabase */
export async function synchronisieren(): Promise<{ erfolgreich: number; fehler: number }> {
  const ausstehende = await holeAusstehende();
  if (ausstehende.length === 0) return { erfolgreich: 0, fehler: 0 };

  const database = await getDB();
  let erfolgreich = 0;
  let fehler = 0;

  for (const t of ausstehende) {
    const { _local_id, ...transaktion } = t;
    const { error } = await supabase.from("transaktion").insert(transaktion);
    if (error) {
      fehler++;
    } else {
      await database.delete("pending_transaktionen", _local_id);
      erfolgreich++;
    }
  }

  return { erfolgreich, fehler };
}
