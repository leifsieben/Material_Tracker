"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const router = useRouter();
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push("/login");
      else setLaden(false);
    });
  }, [router]);

  async function abmelden() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (laden) return <main className="p-4"><p className="text-gray-500">Wird geladen…</p></main>;

  return (
    <main className="max-w-lg mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
        <button onClick={abmelden} className="text-sm text-gray-500 underline">Abmelden</button>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/admin/fahrzeuge"
          className="block bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm active:bg-gray-50"
        >
          <p className="font-semibold text-gray-900">🚗 Fahrzeuge</p>
          <p className="text-sm text-gray-500">Fahrzeuge und Paletten verwalten</p>
        </Link>
        <Link
          href="/admin/material"
          className="block bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm active:bg-gray-50"
        >
          <p className="font-semibold text-gray-900">📦 Material</p>
          <p className="text-sm text-gray-500">Objekte anlegen, Bestände anpassen</p>
        </Link>
        <Link
          href="/admin/qr"
          className="block bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm active:bg-gray-50"
        >
          <p className="font-semibold text-gray-900">📱 QR-Codes</p>
          <p className="text-sm text-gray-500">QR-Labels für Paletten drucken</p>
        </Link>
        <Link
          href="/zug"
          className="block bg-red-50 border border-red-200 rounded-xl px-4 py-4 active:bg-red-100"
        >
          <p className="font-semibold text-red-700">→ Zugübersicht</p>
        </Link>
      </div>
    </main>
  );
}
