-- 1. Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- 2. Fix access_codes table - prevent public reading
DROP POLICY IF EXISTS "Anyone can view access codes" ON public.access_codes;
CREATE POLICY "No direct access to codes"
ON public.access_codes
FOR SELECT
USING (false);

-- 3. Fix tournaments table - restrict write operations to admins
DROP POLICY IF EXISTS "Anyone can insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Anyone can update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Anyone can delete tournaments" ON public.tournaments;

CREATE POLICY "Admins can insert tournaments"
ON public.tournaments
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update tournaments"
ON public.tournaments
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete tournaments"
ON public.tournaments
FOR DELETE
USING (public.is_admin(auth.uid()));

-- 4. Fix teams table - restrict write operations to admins
DROP POLICY IF EXISTS "Anyone can insert teams" ON public.teams;
DROP POLICY IF EXISTS "Anyone can update teams" ON public.teams;
DROP POLICY IF EXISTS "Anyone can delete teams" ON public.teams;

CREATE POLICY "Admins can insert teams"
ON public.teams
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update teams"
ON public.teams
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete teams"
ON public.teams
FOR DELETE
USING (public.is_admin(auth.uid()));

-- 5. Fix match_screenshots table - allow authenticated users to insert (for players uploading), admins for update/delete
DROP POLICY IF EXISTS "Anyone can insert match screenshots" ON public.match_screenshots;
DROP POLICY IF EXISTS "Anyone can update match screenshots" ON public.match_screenshots;
DROP POLICY IF EXISTS "Anyone can delete match screenshots" ON public.match_screenshots;

CREATE POLICY "Authenticated users can insert match screenshots"
ON public.match_screenshots
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update match screenshots"
ON public.match_screenshots
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete match screenshots"
ON public.match_screenshots
FOR DELETE
USING (public.is_admin(auth.uid()));

-- 6. Fix player_stats table - allow authenticated users to insert, admins for update/delete
DROP POLICY IF EXISTS "Anyone can insert player stats" ON public.player_stats;
DROP POLICY IF EXISTS "Anyone can update player stats" ON public.player_stats;
DROP POLICY IF EXISTS "Anyone can delete player stats" ON public.player_stats;

CREATE POLICY "Authenticated users can insert player stats"
ON public.player_stats
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update player stats"
ON public.player_stats
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete player stats"
ON public.player_stats
FOR DELETE
USING (public.is_admin(auth.uid()));

-- 7. Fix tournament_history table - only admins can insert/delete
DROP POLICY IF EXISTS "Anyone can insert tournament history" ON public.tournament_history;
DROP POLICY IF EXISTS "Anyone can delete tournament history" ON public.tournament_history;

CREATE POLICY "Admins can insert tournament history"
ON public.tournament_history
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete tournament history"
ON public.tournament_history
FOR DELETE
USING (public.is_admin(auth.uid()));

-- 8. Add DELETE policy for sessions table (cleanup)
CREATE POLICY "Users can delete their own session"
ON public.sessions
FOR DELETE
USING (auth.uid() = user_id);