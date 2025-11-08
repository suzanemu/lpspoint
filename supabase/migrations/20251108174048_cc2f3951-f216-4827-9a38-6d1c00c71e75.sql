-- Enable anonymous auth for access code system
-- Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  total_matches INTEGER NOT NULL DEFAULT 6,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tournament_id, name)
);

-- Create match_screenshots table
CREATE TABLE IF NOT EXISTS public.match_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID,
  match_number INTEGER NOT NULL,
  day INTEGER DEFAULT 1,
  screenshot_url TEXT NOT NULL,
  placement INTEGER,
  kills INTEGER,
  points INTEGER,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sessions table for access code management
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code_used TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'player')),
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create access_codes table
CREATE TABLE IF NOT EXISTS public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'player')),
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create RPC function to validate access codes
CREATE OR REPLACE FUNCTION public.validate_access_code(input_code TEXT)
RETURNS TABLE(code TEXT, role TEXT, team_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ac.code, ac.role, ac.team_id
  FROM public.access_codes ac
  WHERE ac.code = input_code;
END;
$$;

-- Enable RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournaments (everyone can read)
CREATE POLICY "Anyone can view tournaments"
  ON public.tournaments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert tournaments"
  ON public.tournaments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update tournaments"
  ON public.tournaments FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete tournaments"
  ON public.tournaments FOR DELETE
  USING (true);

-- RLS Policies for teams (everyone can read and manage)
CREATE POLICY "Anyone can view teams"
  ON public.teams FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert teams"
  ON public.teams FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update teams"
  ON public.teams FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete teams"
  ON public.teams FOR DELETE
  USING (true);

-- RLS Policies for match_screenshots (everyone can manage)
CREATE POLICY "Anyone can view match screenshots"
  ON public.match_screenshots FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert match screenshots"
  ON public.match_screenshots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update match screenshots"
  ON public.match_screenshots FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete match screenshots"
  ON public.match_screenshots FOR DELETE
  USING (true);

-- RLS Policies for sessions
CREATE POLICY "Users can view their own session"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own session"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for access_codes
CREATE POLICY "Anyone can view access codes"
  ON public.access_codes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert access codes"
  ON public.access_codes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete access codes"
  ON public.access_codes FOR DELETE
  USING (true);

-- Create storage bucket for match screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('match-screenshots', 'match-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for match-screenshots bucket
CREATE POLICY "Anyone can view match screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'match-screenshots');

CREATE POLICY "Anyone can upload match screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'match-screenshots');

CREATE POLICY "Anyone can update match screenshots"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'match-screenshots');

CREATE POLICY "Anyone can delete match screenshots"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'match-screenshots');

-- Insert a default admin access code
INSERT INTO public.access_codes (code, role)
VALUES ('ADMIN2024', 'admin')
ON CONFLICT (code) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_tournament_id ON public.teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_screenshots_team_id ON public.match_screenshots(team_id);
CREATE INDEX IF NOT EXISTS idx_match_screenshots_match_number ON public.match_screenshots(match_number);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);