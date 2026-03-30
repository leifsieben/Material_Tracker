import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Material Tracker</h1>
        <p className="text-gray-500 text-sm">Schweizer Armee · Zugmaterial</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/zug"
          className="block text-center bg-red-600 text-white rounded-xl px-6 py-4 font-semibold text-lg shadow active:bg-red-700"
        >
          Zugübersicht
        </Link>
        <Link
          href="/admin"
          className="block text-center bg-gray-800 text-white rounded-xl px-6 py-4 font-semibold text-lg shadow active:bg-gray-900"
        >
          Admin (Zugführer)
        </Link>
      </div>
    </main>
  );
}
