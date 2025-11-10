import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TeamManager from "./TeamManager";
import TournamentManager from "./TournamentManager";
import TeamScreenshotExplorer from "./TeamScreenshotExplorer";
import Standings from "./Standings";
import ManualPointEntry from "./ManualPointEntry";
import { Team, Tournament } from "@/types/tournament";

interface AdminDashboardProps {
  userId: string;
}

const AdminDashboard = ({ userId }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>("");

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTeams();
      const interval = setInterval(fetchTeams, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tournaments:", error);
      return;
    }

    setTournaments(data || []);

    if (!data || data.length === 0) {
      setSelectedTournament("");
      return;
    }

    const selectedExists = data.some(t => t.id === selectedTournament);
    if (!selectedTournament || !selectedExists) {
      setSelectedTournament(data[0].id);
    }
  };

  const fetchTeams = async () => {
    if (!selectedTournament) return;

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, created_at, logo_url")
      .eq("tournament_id", selectedTournament);

    if (teamsError) {
      console.error("Error fetching teams:", teamsError);
      return;
    }

    if (teamsData) {
      const { data: matchData, error: matchError } = await supabase
        .from("match_screenshots")
        .select("team_id, placement, kills, points");

      if (matchError) {
        console.error("Error fetching match data:", matchError);
      }

      const teamsWithStats: Team[] = teamsData.map((team) => {
        const teamMatches = matchData?.filter((m) => m.team_id === team.id) || [];
        const totalPoints = teamMatches.reduce((sum, m) => sum + (m.points || 0), 0);
        const totalKills = teamMatches.reduce((sum, m) => sum + (m.kills || 0), 0);
        const firstPlaceWins = teamMatches.filter((m) => m.placement === 1).length;

        let placementPoints = 0;
        teamMatches.forEach((match) => {
          const PLACEMENT_POINTS: Record<number, number> = {
            1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1,
            9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0,
            17: 0, 18: 0, 19: 0, 20: 0, 21: 0, 22: 0, 23: 0, 24: 0,
            25: 0, 26: 0, 27: 0, 28: 0, 29: 0, 30: 0, 31: 0, 32: 0,
          };
          placementPoints += PLACEMENT_POINTS[match.placement || 0] || 0;
        });

        return {
          id: team.id,
          name: team.name,
          totalPoints,
          placementPoints,
          killPoints: totalKills,
          totalKills,
          matchesPlayed: teamMatches.length,
          firstPlaceWins,
          logo_url: team.logo_url,
        };
      });

      setTeams(teamsWithStats);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Manage teams and view standings</p>
          </div>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="border-primary/50 hover:bg-primary/10 shrink-0"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
            <span className="sm:hidden">Logout</span>
          </Button>
        </div>

        {tournaments.length > 0 && (
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-full sm:max-w-md bg-card border-primary/30 text-sm">
              <SelectValue placeholder="Select a tournament" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((tournament) => (
                <SelectItem key={tournament.id} value={tournament.id} className="text-sm">
                  {tournament.name} ({tournament.total_matches} matches)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="h-auto flex flex-wrap md:inline-flex w-full bg-card border border-primary/30 p-1 gap-1">
            <TabsTrigger value="standings" className="text-xs md:text-sm flex-1 min-w-[calc(33.333%-0.25rem)] md:min-w-0">Standings</TabsTrigger>
            <TabsTrigger value="manual" className="text-xs md:text-sm flex-1 min-w-[calc(33.333%-0.25rem)] md:min-w-0">Add Points</TabsTrigger>
            <TabsTrigger value="screenshots" className="text-xs md:text-sm flex-1 min-w-[calc(33.333%-0.25rem)] md:min-w-0">Verify Screenshots</TabsTrigger>
            <TabsTrigger value="teams" className="text-xs md:text-sm flex-1 min-w-[calc(50%-0.25rem)] md:min-w-0">Manage Teams</TabsTrigger>
            <TabsTrigger value="tournaments" className="text-xs md:text-sm flex-1 min-w-[calc(50%-0.25rem)] md:min-w-0">Tournaments</TabsTrigger>
          </TabsList>

          <TabsContent value="standings" className="mt-6">
            {teams.length > 0 && selectedTournament ? (
              <Standings
                teams={teams}
                isAdmin={true}
                tournamentName={tournaments.find(t => t.id === selectedTournament)?.name}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>
                  {!selectedTournament
                    ? "Please create a tournament first."
                    : "No teams added yet. Go to Manage Teams to create teams."}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-6">
            {selectedTournament ? (
              <ManualPointEntry selectedTournament={selectedTournament} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Please select a tournament first.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="screenshots" className="mt-6">
            {selectedTournament ? (
              <TeamScreenshotExplorer selectedTournament={selectedTournament} userId={userId} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Please select a tournament first.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="teams" className="mt-6">
            <TeamManager />
          </TabsContent>

          <TabsContent value="tournaments" className="mt-6">
            <TournamentManager onTournamentSelect={(id) => {
              setSelectedTournament(id || "");
              fetchTournaments();
            }} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
