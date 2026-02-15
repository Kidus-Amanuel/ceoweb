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
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    // Extract user data from session
    let user = session.user;
    let userType = user.user_metadata?.userType as UserType;

    // If userType is missing in session metadata, fetch the latest user data from server
    // This happens immediately after login before metadata propagates to local session
    if (!userType) {
      const {
        data: { user: latestUser },
      } = await supabase.auth.getUser();
      if (latestUser) {
        user = latestUser;
        userType = user.user_metadata?.userType as UserType;
      }
    }

    if (!userType) {
      console.error("User type not found in session or server metadata");
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
      authSession.companyId = user.user_metadata?.companyId;
      authSession.roleId = user.user_metadata?.roleId;

      if (!authSession.companyId || !authSession.roleId) {
        console.error("Company user missing companyId or roleId");
        return null;
      }
    }

    // Add super admin specific fields
    if (userType === "super_admin") {
      authSession.companyScope = user.user_metadata?.companyScope || "all";
      authSession.companyId = user.user_metadata?.companyId; // Current active company
      authSession.companyIds =
        user.user_metadata?.companyIds ||
        (authSession.companyId ? [authSession.companyId] : []);

      if (authSession.companyScope === "limited") {
        authSession.companyIds = user.user_metadata?.companyIds || [];
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
