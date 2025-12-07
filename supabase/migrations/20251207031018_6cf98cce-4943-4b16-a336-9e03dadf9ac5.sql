-- Create tournament_history table to store standings and MVP data after tournament deletion
CREATE TABLE public.tournament_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_name TEXT NOT NULL,
  tournament_description TEXT,
  total_matches INTEGER NOT NULL DEFAULT 6,
  standings JSONB NOT NULL DEFAULT '[]'::jsonb,
  mvp_player_name TEXT,
  mvp_total_kills INTEGER DEFAULT 0,
  mvp_matches_count INTEGER DEFAULT 0,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  original_tournament_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournament_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view tournament history (public data)
CREATE POLICY "Anyone can view tournament history"
  ON public.tournament_history
  FOR SELECT
  USING (true);

-- Only admins can insert tournament history (handled via backend)
CREATE POLICY "Anyone can insert tournament history"
  ON public.tournament_history
  FOR INSERT
  WITH CHECK (true);

-- Only admins can delete tournament history
CREATE POLICY "Anyone can delete tournament history"
  ON public.tournament_history
  FOR DELETE
  USING (true);