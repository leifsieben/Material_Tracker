"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContext {
  session: Session | null;
  user: User | null;
  zugId: string | null;
  zugName: string | null;
  laden: boolean;
}

const AuthContext = createContext<AuthContext>({
  session: null,
  user: null,
  zugId: null,
  zugName: null,
  laden: true,
});

async function holZug(userId: string) {
  const { data } = await supabase
    .from("zug")
    .select("id, name")
    .eq("zugfuehrer_id", userId)
    .single();
  return data ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [zugId, setZugId] = useState<string | null>(null);
  const [zugName, setZugName] = useState<string | null>(null);
  const [laden, setLaden] = useState(true);

  async function aktualisiereZug(userId: string | undefined) {
    if (!userId) { setZugId(null); setZugName(null); return; }
    const zug = await holZug(userId);
    setZugId(zug?.id ?? null);
    setZugName(zug?.name ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await aktualisiereZug(data.session?.user.id);
      setLaden(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      await aktualisiereZug(session?.user.id);
      setLaden(false);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, zugId, zugName, laden }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
