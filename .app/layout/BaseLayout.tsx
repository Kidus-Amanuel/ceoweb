import type { Metadata } from "next";
import { cookies } from "next/headers";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "CEO Web Project",
  description: "Enterprise Management Platform",
};

export default async function BaseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className="antialiased font-sans"
        style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
      >
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
