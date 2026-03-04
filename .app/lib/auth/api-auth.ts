/**
 * Fleet API Auth Helper
 *
 * Resolves user + companyId in ONE network round-trip by reading the
 * JWT metadata first (no DB hit). Falls back to a profile DB query only
 * if the JWT doesn't carry companyId (older sessions / super-admins).
 *
 * Usage:
 *   const auth = await getFleetAuthContext();
 *   if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   const { supabase, companyId, userId } = auth;
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export interface FleetAuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  companyId: string;
  userId: string;
}

export async function getFleetAuthContext(): Promise<FleetAuthContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  // ── 1. Determine user type for routing logic ───────────────────────────────
  const userType =
    user.user_metadata?.userType || user.user_metadata?.user_type;
  
  console.log(`[getFleetAuthContext] userId: ${user.id}, userType: ${userType}`);

  // ── 2. Fast path: company_users have a single fixed company in JWT ──────────
  if (userType === "company_user") {
    const metaCompanyId =
      user.user_metadata?.companyId || user.user_metadata?.company_id;
    
    console.log(`[getFleetAuthContext] company_user metaCompanyId: ${metaCompanyId}`);

    if (metaCompanyId) {
      return { supabase, companyId: metaCompanyId as string, userId: user.id };
    }
  }

  // ── 3. Fallback: DB lookup (super_admins switch via profiles, or first login)
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  
  console.log(`[getFleetAuthContext] profile company_id: ${profile?.company_id}`);

  if (!profile?.company_id) return null;

  return { supabase, companyId: profile.company_id, userId: user.id };
}

/** Convenience wrapper that returns a 401 response when auth fails. */
export async function requireFleetAuth(): Promise<
  FleetAuthContext | NextResponse
> {
  const auth = await getFleetAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return auth;
}
