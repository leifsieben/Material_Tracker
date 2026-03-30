import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Gibt true zurück wenn Supabase korrekt konfiguriert ist */
export const supabaseKonfiguriert =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co";

/**
 * Gibt die Lager-Palette für einen Zug zurück (muss via SQL vorbereitet sein).
 */
export async function getLagerPalette(zugId: string): Promise<{ id: string; name: string; is_lager: true } | null> {
  const { data } = await supabase
    .from("palette")
    .select("id, name, is_lager")
    .eq("zug_id", zugId)
    .eq("is_lager", true)
    .maybeSingle();

  return (data as { id: string; name: string; is_lager: true }) ?? null;
}
