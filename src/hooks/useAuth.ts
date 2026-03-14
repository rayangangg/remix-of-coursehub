import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
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
    const result = await Promise.race([
      supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);

    if (!result) return false;
    if (result.error) return false;
    return !!result.data;
  } catch {
    return false;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasInitialized = useRef(false);
  const syncVersion = useRef(0);

  useEffect(() => {
    let active = true;

    const syncSessionState = async (nextSession: Session | null, finishLoading: boolean) => {
      const currentVersion = ++syncVersion.current;
      setSession(nextSession);

      if (!nextSession?.user?.id) {
        if (!active || currentVersion !== syncVersion.current) return;
        setIsAdmin(false);
        if (finishLoading) setLoading(false);
        return;
      }

      const adminStatus = await checkAdminRole(nextSession.user.id);
      if (!active || currentVersion !== syncVersion.current) return;

      setIsAdmin(adminStatus);
      if (finishLoading) setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSessionState(nextSession, hasInitialized.current);
    });

    const initSession = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!active) return;
      hasInitialized.current = true;
      await syncSessionState(initialSession, true);
    };

    void initSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setLoading(false);
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
