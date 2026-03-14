import { createContext, createElement, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

type AuthContextValue = {
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const checkAdminRole = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Set up auth listener FIRST, then get initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;

      setSession(nextSession);

      if (nextSession?.user?.id) {
        const adminStatus = await checkAdminRole(nextSession.user.id);
        if (active) {
          setIsAdmin(adminStatus);
          setLoading(false);
        }
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    // Get initial session
    const initSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (!active) return;

      setSession(initialSession);

      if (initialSession?.user?.id) {
        const adminStatus = await checkAdminRole(initialSession.user.id);
        if (active) {
          setIsAdmin(adminStatus);
          setLoading(false);
        }
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    };

    initSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo(() => ({ session, isAdmin, loading, signOut }), [session, isAdmin, loading, signOut]);

  return createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
