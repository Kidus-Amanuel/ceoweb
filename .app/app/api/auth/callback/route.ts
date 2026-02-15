import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;

      // Sync metadata on login/verification
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, company_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        const metadata: Record<string, any> = {
          userType: profile.user_type,
          name: user.email?.split("@")[0] || "User",
        };

        if (profile.user_type === "company_user") {
          metadata.companyId = profile.company_id;

          // Fetch roleId
          const { data: companyUser } = await supabase
            .from("company_users")
            .select("role_id")
            .eq("user_id", user.id)
            .eq("company_id", profile.company_id)
            .single();

          if (companyUser) {
            metadata.roleId = companyUser.role_id;
          }
        }

        // Use admin client to update metadata
        const supabaseAdmin = await createAdminClient();
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: metadata,
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=AuthCodeError`);
}
