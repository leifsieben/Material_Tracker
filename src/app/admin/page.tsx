"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function AdminDashboard() {
  const { zugName } = useAuth();

  return (
    <main className="max-w-lg mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
        {zugName && <p className="text-sm text-gray-500">{zugName}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/admin/fahrzeuge"
          className="block bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm active:bg-gray-50">
          <p className="font-semibold text-gray-900">🚗 Fahrzeuge & Paletten</p>
          <p className="text-sm text-gray-500">Fahrzeuge (M-Nummer), Paletten verwalten</p>
        </Link>
        <Link href="/admin/gruppen"
          className="block bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm active:bg-gray-50">
          <p className="font-semibold text-gray-900">🏷️ Gruppen</p>
          <p className="text-sm text-gray-500">Fahrzeuggruppen mit Farbmarkierung verwalten</p>
        </Link>
        <Link href="/admin/material"
          className="block bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm active:bg-gray-50">
          <p className="font-semibold text-gray-900">📦 Material</p>
          <p className="text-sm text-gray-500">Objekte anlegen, Bestände anpassen</p>
        </Link>
        <Link href="/admin/qr"
          className="block bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm active:bg-gray-50">
          <p className="font-semibold text-gray-900">📱 QR-Codes</p>
          <p className="text-sm text-gray-500">QR-Labels für Paletten drucken</p>
        </Link>
        <Link href="/zug"
          className="block bg-red-50 border border-red-200 rounded-xl px-4 py-4 active:bg-red-100">
          <p className="font-semibold text-red-700">→ Zugübersicht</p>
        </Link>
      </div>
    </main>
  );
}
