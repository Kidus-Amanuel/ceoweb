"use client";
// @ts-ignore
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";

import { AuthProvider } from "@/components/providers/auth-provider";
import { UserProvider } from "@/app/context/UserContext";
import { initI18n } from "@/lib/i18n/config";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n/config";
import { ToastContainer } from "@/components/shared/ui/toast/ToastContainer";

export function Providers({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale?: string;
}) {
  // Sync initialization synchronously for the first render
  useMemo(() => {
    initI18n(locale);
  }, [locale]);

  // Handle language changes via effect to avoid "update while rendering" errors
  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <I18nextProvider i18n={i18n}>
      <UserProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <ToastContainer />
          </QueryClientProvider>
        </AuthProvider>
      </UserProvider>
    </I18nextProvider>
  );
}
