-- Create table for player stats from match screenshots
CREATE TABLE public.player_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  screenshot_id UUID REFERENCES public.match_screenshots(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  damage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view player stats" 
ON public.player_stats 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert player stats" 
ON public.player_stats 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update player stats" 
ON public.player_stats 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete player stats" 
ON public.player_stats 
FOR DELETE 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_player_stats_team_id ON public.player_stats(team_id);
CREATE INDEX idx_player_stats_screenshot_id ON public.player_stats(screenshot_id);