-- Supabase Schema for Werewolf IRL Assistant

-- 1. Create Rooms Table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  host_name TEXT NOT NULL,
  phase TEXT DEFAULT 'lobby' NOT NULL, -- 'lobby', 'night_transition', 'night', 'day_transition', 'day', 'voting', 'ended'
  round INTEGER DEFAULT 0,
  time_remaining INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Players Table
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'unassigned',
  team TEXT DEFAULT 'unassigned',
  alive BOOLEAN DEFAULT TRUE,
  is_host BOOLEAN DEFAULT FALSE,
  action_target_id UUID REFERENCES players(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, name) -- Prevent duplicate names in the same room
);

-- 3. Create Votes Table
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  voter_id UUID REFERENCES players(id) ON DELETE CASCADE,
  target_id UUID REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, round, voter_id) -- One vote per player per round
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Set up Row Level Security (RLS)
-- For this IRL party game where players use their own devices, we need:
-- 1. Anyone to create/join rooms via standard keys
-- 2. Prevent arbitrary updates of other players' roles
-- (Note: For simplicity in an IRL setting with friends, we'll keep RLS relatively open but restrict full DB access to the API Anon key from the frontend. Given people play face-to-face, strict auth is less of a risk).

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON rooms FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON rooms FOR DELETE USING (true);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON players FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON players FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON players FOR DELETE USING (true);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON votes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON votes FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON votes FOR DELETE USING (true);
