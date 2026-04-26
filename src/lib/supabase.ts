import { createClient } from "@supabase/supabase-js";

// Ensure dummy values in case they aren't provided yet so the app still builds.
// Realtime will fail gracefully or show errors if these are invalid.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types matching the SQL schema
export type RoomPhase = 'lobby' | 'settings' | 'night_transition' | 'night' | 'day_transition' | 'day' | 'voting' | 'hunter_revenge' | 'ended';

export interface Room {
  id: string;
  code: string;
  host_name: string;
  phase: RoomPhase;
  round: number;
  time_remaining: number;
  settings: any; // Could be typed stricter later
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  role: string;
  team: string;
  alive: boolean;
  is_host: boolean;
  action_target_id: string | null;
  joined_at: string;
}

export interface Vote {
  id: string;
  room_id: string;
  round: number;
  voter_id: string;
  target_id: string;
  created_at: string;
}
