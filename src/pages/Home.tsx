import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Shield, Trophy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Team, Tournament } from "@/types/tournament";

interface PlayerStat {
  player_name: string;
  total_kills: number;
  total_damage: number;
  matches_count: number;
}

const Home = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [mvpPlayer, setMvpPlayer] = useState<PlayerStat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTeams();
      fetchPlayerStats();
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tournaments:", error);
      setLoading(false);
      return;
    }

    setTournaments(data || []);
    if (data && data.length > 0) {
      setSelectedTournament(data[0].id);
    }
    setLoading(false);
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

      setTeams(teamsWithStats.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return b.placementPoints - a.placementPoints;
      }));
    }
  };

  const fetchPlayerStats = async () => {
    if (!selectedTournament) return;

    const { data: teamsData } = await supabase
      .from("teams")
      .select("id")
      .eq("tournament_id", selectedTournament);

    if (!teamsData || teamsData.length === 0) return;

    const teamIds = teamsData.map((t) => t.id);

    const { data: playerStats, error } = await supabase
      .from("player_stats")
      .select("player_name, kills, damage, team_id")
      .in("team_id", teamIds);

    if (error || !playerStats || playerStats.length === 0) {
      setMvpPlayer(null);
      return;
    }

    const aggregatedStats: Record<string, { kills: number; damage: number; count: number }> = {};
    playerStats.forEach((stat) => {
      const name = stat.player_name;
      if (!aggregatedStats[name]) {
        aggregatedStats[name] = { kills: 0, damage: 0, count: 0 };
      }
      aggregatedStats[name].kills += stat.kills || 0;
      aggregatedStats[name].damage += stat.damage || 0;
      aggregatedStats[name].count += 1;
    });

    let mvp: PlayerStat | null = null;
    Object.entries(aggregatedStats).forEach(([name, stats]) => {
      if (!mvp || stats.kills > mvp.total_kills) {
        mvp = {
          player_name: name,
          total_kills: stats.kills,
          total_damage: stats.damage,
          matches_count: stats.count,
        };
      }
    });

    setMvpPlayer(mvp);
  };

  const currentTournament = tournaments.find((t) => t.id === selectedTournament);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-primary/30 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold uppercase tracking-wider text-foreground">
              {currentTournament?.name || "PUBG Tournament"}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-xs sm:text-sm border border-border hover:border-primary/50"
            >
              <Camera className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Screenshot Upload</span>
              <span className="sm:hidden">Upload</span>
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm"
            >
              <Shield className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Admin Login</span>
              <span className="sm:hidden">Login</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="border border-primary/30 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 bg-card/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-primary uppercase tracking-wider">
                {currentTournament?.name || "Tournament"}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">
                Real-time performance metrics & standings
              </p>
            </div>
            {tournaments.length > 0 && (
              <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                <SelectTrigger className="w-full sm:w-[200px] bg-card border-border">
                  <SelectValue placeholder="Select tournament" />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Standings Table */}
          <div className="lg:col-span-2">
            <h2 className="text-xl sm:text-2xl font-bold text-primary uppercase tracking-wider mb-4">
              Current Standings
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-1 min-w-[500px]">
                <thead>
                  <tr className="text-muted-foreground text-xs sm:text-sm uppercase">
                    <th className="text-left p-2 sm:p-3 font-medium">Rank</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Team</th>
                    <th className="text-center p-2 sm:p-3 font-medium">WWCD</th>
                    <th className="text-center p-2 sm:p-3 font-medium">Matches</th>
                    <th className="text-center p-2 sm:p-3 font-medium">Place Pts</th>
                    <th className="text-center p-2 sm:p-3 font-medium">Kill Pts</th>
                    <th className="text-center p-2 sm:p-3 font-medium">Total Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.slice(0, 10).map((team, index) => {
                    const rank = index + 1;
                    const isTopThree = rank <= 3;

                    return (
                      <tr
                        key={team.id}
                        className={`${
                          isTopThree
                            ? "bg-card border-l-4 border-l-primary"
                            : "bg-card/50"
                        }`}
                      >
                        <td
                          className={`p-2 sm:p-3 font-bold text-base sm:text-xl ${
                            isTopThree ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {rank}
                        </td>
                        <td className="p-2 sm:p-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {team.logo_url ? (
                              <img
                                src={team.logo_url}
                                alt={team.name}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center">
                                <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-bold text-foreground uppercase text-xs sm:text-sm">
                              {team.name}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`text-center p-2 sm:p-3 font-bold text-xs sm:text-base ${
                            isTopThree ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {team.firstPlaceWins || "-"}
                        </td>
                        <td className="text-center p-2 sm:p-3 text-foreground text-xs sm:text-base">
                          {team.matchesPlayed}
                        </td>
                        <td className="text-center p-2 sm:p-3 text-foreground text-xs sm:text-base">
                          {team.placementPoints}
                        </td>
                        <td className="text-center p-2 sm:p-3 text-foreground text-xs sm:text-base">
                          {team.killPoints}
                        </td>
                        <td
                          className={`text-center p-2 sm:p-3 font-bold text-base sm:text-xl ${
                            isTopThree ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {team.totalPoints}
                        </td>
                      </tr>
                    );
                  })}
                  {teams.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        No teams registered yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Player Spotlight */}
          <div className="lg:col-span-1">
            <h2 className="text-xl sm:text-2xl font-bold text-primary uppercase tracking-wider mb-4">
              Player Spotlight
            </h2>
            <div className="bg-gradient-to-b from-[hsl(220_15%_25%)] to-card rounded-lg overflow-hidden border border-border">
              {/* Trophy Icon */}
              <div className="flex justify-center pt-8 pb-4">
                <div className="relative">
                  <Trophy className="h-16 w-16 sm:h-20 sm:w-20 text-primary" />
                </div>
              </div>

              {/* MVP Info */}
              <div className="text-center pb-6">
                <p className="text-xs sm:text-sm text-primary uppercase tracking-widest font-semibold mb-2">
                  MVP
                </p>
                <h3 className="text-2xl sm:text-4xl font-bold text-foreground uppercase tracking-wider">
                  {mvpPlayer?.player_name || "TBD"}
                </h3>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 border-t border-primary/30 bg-primary/10">
                <div className="text-center py-4 border-r border-primary/30">
                  <p className="text-xl sm:text-3xl font-bold text-primary">
                    {mvpPlayer?.total_kills || 0}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                    Kills
                  </p>
                </div>
                <div className="text-center py-4 border-r border-primary/30">
                  <p className="text-xl sm:text-3xl font-bold text-primary">
                    {mvpPlayer?.total_damage || 0}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                    Damage
                  </p>
                </div>
                <div className="text-center py-4">
                  <p className="text-xl sm:text-3xl font-bold text-foreground">
                    {mvpPlayer?.matches_count || 0}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                    Matches
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-primary/30 bg-card/30 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span>© 2024 Tournament Broadcast. All Rights Reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-foreground cursor-pointer">Terms of Service</span>
            <span className="hover:text-foreground cursor-pointer">Privacy Policy</span>
            <span className="hover:text-foreground cursor-pointer">Contact Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
