import { redirect } from "next/navigation";

/**
 * Senior Dev Note:
 * This directory holds sub-routes like /settings/billing and /settings/profile,
 * but did not have a root page.tsx, causing /settings to 404.
 * Instead of showing a 404, we redirect the user to their profile settings.
 */
export default function SettingsRedirectPage() {
  redirect("/coming-soon");
}
