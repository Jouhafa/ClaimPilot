// Real-time subscription hook for Supabase
// Subscribes to changes in user data and calls callbacks when data changes

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeOptions {
  table: string;
  userId: string | null;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  enabled?: boolean;
}

export function useRealtime({
  table,
  userId,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    // Don't subscribe if disabled, no userId, or no session
    if (!enabled || !userId || !session) {
      return;
    }

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("Supabase not configured, skipping real-time subscription");
      return;
    }

    const supabase = createClient();

    // Create channel for this table, filtered by user_id
    const channel = supabase
      .channel(`${table}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log(`Real-time ${payload.eventType} on ${table}:`, payload);

          switch (payload.eventType) {
            case "INSERT":
              onInsert?.(payload);
              break;
            case "UPDATE":
              onUpdate?.(payload);
              break;
            case "DELETE":
              onDelete?.(payload);
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Subscribed to real-time updates for ${table}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`Error subscribing to ${table}:`, status);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, userId, enabled, session, onInsert, onUpdate, onDelete]);
}


