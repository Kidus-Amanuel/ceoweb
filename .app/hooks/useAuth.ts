/**
 * useAuth Hook
 * Provides authentication state and utilities
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthSession } from "@/lib/auth/types";
import { getSession, signOut as authSignOut } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Load session on mount
    loadSession();

    // Subscribe to auth state changes
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        router.push("/login");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await loadSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const loadSession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const authSession = await getSession();
      setSession(authSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await authSignOut();
      setSession(null);
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign out");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    session,
    user: session,
    isLoading,
    error,
    isAuthenticated: session !== null,
    isSuperAdmin: session?.userType === "super_admin",
    isCompanyUser: session?.userType === "company_user",
    signOut,
    reload: loadSession,
  };
}
