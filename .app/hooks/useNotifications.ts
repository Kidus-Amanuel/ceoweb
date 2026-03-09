"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Notification } from "@/types/notifications";

export const useNotifications = () => {
  const { user } = useAuth();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache for user's roles to check role-based notifications locally
  // However, Supabase RLS should handle this if we subscribe correctly
  // But standard table subscription doesn't apply RLS the same way for INSERT filters on payload,
  // though Supabase Realtime now supports RLS on the broadcast side.

  const fetchInitialData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch unread count via RPC
      const { data: count, error: countError } = await supabase.rpc(
        "get_unread_notification_count",
      );
      if (countError) throw countError;
      setUnreadCount(count || 0);

      // 2. Fetch latest 20 notifications from our convenience view
      const { data: initialNotifications, error: fetchError } = await supabase
        .from("user_notifications_view")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;
      setNotifications(initialNotifications || []);
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const { error: rpcError } = await supabase.rpc(
          "mark_notification_as_read",
          {
            p_notification_id: notificationId,
          },
        );

        if (rpcError) throw rpcError;

        // Local update for responsiveness
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err: any) {
        console.error("Error marking as read:", err);
      }
    },
    [supabase],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const { error: rpcError } = await supabase.rpc(
        "mark_all_notifications_as_read",
      );
      if (rpcError) throw rpcError;

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.error("Error marking all as read:", err);
    }
  }, [supabase]);

  useEffect(() => {
    if (!user) return;

    fetchInitialData();

    // Set up real-time subscription
    // Listening to changes on notifications table
    // Note: In my schema, new notifications appear in the notifications table.
    // RLS in Supabase Realtime will ensure users only receive notifications they have permission to see.
    // Make the channel name unique to this user to avoid any connection collisions
    const channelName = `notifications_realtime_${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT (new notifications) and potentially UPDATE
          schema: "public",
          table: "notifications",
        },
        async (payload) => {
          console.log("Real-time notification payload:", payload);
          // When a change happens, we refresh the data to ensure view logic (joins) is applied correctly
          // Or we can smartly update if payload matches our user
          // Re-fetching is the most reliable way to get joined actor info and read status correctly
          await fetchInitialData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_user_states",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // If a user state changes (e.g. read status), refresh
          await fetchInitialData();
        },
      )
      .subscribe((status, err) => {
        console.log("Supabase Realtime Status:", status);
        if (err) {
          console.error("Supabase Realtime Error:", err);
        }
      });

    // FALLBACK: Since WebSockets are being blocked in your environment,
    // let's add a polling interval to fetch data every 10 seconds automatically.
    const pollInterval = setInterval(() => {
      fetchInitialData();
    }, 10000); // 10 seconds

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user, fetchInitialData, supabase]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchInitialData,
  };
};
