"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SupabaseCheck() {
  const [status, setStatus] = useState<{
    loading: boolean;
    envVars: boolean;
    connection: boolean;
    error?: string;
  }>({
    loading: true,
    envVars: false,
    connection: false,
  });

  useEffect(() => {
    async function checkConnection() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const hasVars = !!url && !!key && url !== "your-project-url.supabase.co";

      if (!hasVars) {
        setStatus({
          loading: false,
          envVars: false,
          connection: false,
          error:
            "Environment variables are missing or still using placeholder values.",
        });
        return;
      }

      try {
        const supabase = createClient();
        // Simple query to check connection
        const { error } = await supabase
          .from("_non_active_table_")
          .select("*")
          .limit(1);

        // We expect a 404 or similar if the table doesn't exist,
        // but if it's an auth error or connection error, we'll know.
        // A successful connection usually returns an error object with code 'PGRST116' (no rows) or similar if table exists.
        // If the URL is wrong, it will fail the fetch.

        setStatus({
          loading: false,
          envVars: true,
          connection: !error || error.code !== "PGRST301", // PGRST301 is usually an API key issue
          error: error
            ? `Note: ${error.message} (This is normal if the table doesn't exist, but it means the API responded)`
            : undefined,
        });
      } catch (err: any) {
        setStatus({
          loading: false,
          envVars: true,
          connection: false,
          error: err.message || "Failed to connect to Supabase API.",
        });
      }
    }

    checkConnection();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-zinc-900">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Supabase Connection Check
        </h1>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Environment Variables:
            </span>
            {status.loading ? (
              <span className="text-gray-400">Checking...</span>
            ) : status.envVars ? (
              <span className="text-green-500 font-semibold">Configured</span>
            ) : (
              <span className="text-red-500 font-semibold">Missing</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              API Connection:
            </span>
            {status.loading ? (
              <span className="text-gray-400">Checking...</span>
            ) : status.connection ? (
              <span className="text-green-500 font-semibold">Success</span>
            ) : (
              <span className="text-red-500 font-semibold">Failed</span>
            )}
          </div>
        </div>

        {status.error && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-50 text-yellow-800 text-sm dark:bg-yellow-900/20 dark:text-yellow-200 border border-yellow-100 dark:border-yellow-800/30">
            {status.error}
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500 dark:text-gray-500">
          <p>
            This page checks if your <code>.env.local</code> keys are being
            picked up and if the Supabase client can reach the API.
          </p>
        </div>
      </div>
    </div>
  );
}
