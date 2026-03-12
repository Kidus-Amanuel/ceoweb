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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased font-sans"
        style={{ fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif" }}
      >
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
