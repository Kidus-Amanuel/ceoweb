/**
 * Session Management Utilities
 * Handles Supabase session verification and user data extraction
 */

import { createClient } from "@/lib/supabase/client";
import { AuthSession, UserType } from "./types";

/**
 * Get current session from Supabase
 * Returns null if no session or session is invalid
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const userType = (user.user_metadata?.user_type ||
      user.user_metadata?.userType) as UserType;

    if (!userType) {
      console.error("User type not found in user metadata", user.user_metadata);
      return null;
    }

    // Build auth session object
    const authSession: AuthSession = {
      userId: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.email!.split("@")[0],
      userType,
    };

    // Add company user specific fields
    if (userType === "company_user") {
      authSession.companyId =
        user.user_metadata?.company_id || user.user_metadata?.companyId;
      authSession.roleId =
        user.user_metadata?.role_id || user.user_metadata?.roleId;

      if (!authSession.companyId || !authSession.roleId) {
        console.error("Company user missing companyId or roleId");
        return null;
      }
    }

    // Add super admin specific fields
    if (userType === "super_admin") {
      authSession.companyScope = user.user_metadata?.companyScope || "all";
      authSession.companyId =
        user.user_metadata?.company_id || user.user_metadata?.companyId; // Current active company
      authSession.companyIds =
        user.user_metadata?.company_ids ||
        user.user_metadata?.companyIds ||
        (authSession.companyId ? [authSession.companyId] : []);

      if (authSession.companyScope === "limited") {
        authSession.companyIds =
          user.user_metadata?.company_ids ||
          user.user_metadata?.companyIds ||
          [];
      }
    }

    return authSession;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Check if session is valid
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Sign out user
 */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

/**
 * Refresh session
 */
export async function refreshSession(): Promise<AuthSession | null> {
  try {
    const supabase = createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession();

    if (error || !session) {
      return null;
    }

    return getSession();
  } catch (error) {
    console.error("Error refreshing session:", error);
    return null;
  }
}
