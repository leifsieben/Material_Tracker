import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Gibt true zurück wenn Supabase korrekt konfiguriert ist */
export const supabaseKonfiguriert =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co";

/**
 * Gibt die Lager-Palette für einen Zug zurück.
 * Erstellt sie beim ersten Aufruf automatisch (lazy).
 */
export async function getLagerPalette(zugId: string): Promise<{ id: string; name: string; is_lager: true }> {
  const { data: existing } = await supabase
    .from("palette")
    .select("id, name, is_lager")
    .eq("zug_id", zugId)
    .eq("is_lager", true)
    .maybeSingle();

  if (existing) return existing as { id: string; name: string; is_lager: true };

  const { data: created, error } = await supabase
    .from("palette")
    .insert({
      fahrzeug_id: null,
      zug_id: zugId,
      name: "Lager",
      qr_token: `lager_${zugId.slice(0, 12)}`,
      is_lager: true,
    })
    .select("id, name, is_lager")
    .single();

  if (error || !created) throw new Error("Lager-Palette konnte nicht erstellt werden.");
  return created as { id: string; name: string; is_lager: true };
}
