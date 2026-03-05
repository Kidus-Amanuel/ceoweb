"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AuthProvider } from "@/components/providers/auth-provider";
import { UserProvider } from "@/app/context/UserContext";

const isDev = process.env.NODE_ENV === "development";

const classifyRetryableError = (error: unknown) => {
  const status =
    (error as { status?: number } | undefined)?.status ??
    (error as { response?: { status?: number } } | undefined)?.response?.status;
  if (typeof status === "number") {
    if (status >= 500) return true;
    if (status >= 400 && status < 500) return false;
  }
  const message = String(
    (error as { message?: string } | undefined)?.message ?? "",
  ).toLowerCase();
  if (!message) return false;
  if (
    /(fetch failed|failed to fetch|network error|timeout|timed out|econn|enotfound|econnreset|5\d\d)/.test(
      message,
    )
  ) {
    return true;
  }
  if (
    /(validation|required|invalid|not-null|constraint|duplicate|uuid|coerce|4\d\d)/.test(
      message,
    )
  ) {
    return false;
  }
  return false;
};

const shouldRetry = (failureCount: number, error: unknown) =>
  failureCount < 2 && classifyRetryableError(error);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (isDev) {
              console.debug("[RQ][QueryError]", query.queryKey, error);
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            if (isDev) {
              console.debug(
                "[RQ][MutationError]",
                mutation.options.mutationKey,
                error,
              );
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 10 * 60 * 1000,
            networkMode: "online",
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: shouldRetry,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 8000),
          },
          mutations: {
            networkMode: "online",
            retry: false,
          },
        },
      }),
  );

  useEffect(() => {
    if (!isDev) return;
    const unsubscribeQuery = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated") {
        const key = event.query.queryKey;
        const state = event.query.state.status;
        console.debug("[RQ][QueryUpdated]", key, state);
      }
    });
    const unsubscribeMutation = queryClient
      .getMutationCache()
      .subscribe((event) => {
        if (event.type === "updated") {
          const key = event.mutation.options.mutationKey;
          const state = event.mutation.state.status;
          console.debug("[RQ][MutationUpdated]", key, state);
        }
      });
    return () => {
      unsubscribeQuery();
      unsubscribeMutation();
    };
  }, [queryClient]);

  return (
    <UserProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </AuthProvider>
    </UserProvider>
  );
}
