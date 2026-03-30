"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContext {
  session: Session | null;
  user: User | null;
  laden: boolean;
}

const AuthContext = createContext<AuthContext>({
  session: null,
  user: null,
  laden: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    // Aktuelle Session laden
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLaden(false);
    });

    // Auf Login/Logout/Token-Refresh reagieren
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLaden(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, laden }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
