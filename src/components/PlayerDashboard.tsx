import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, LogOut, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Standings from "./Standings";
import PlayerScreenshotExplorer from "./PlayerScreenshotExplorer";
import { Team, Tournament } from "@/types/tournament";

interface PlayerDashboardProps {
  userId: string;
}

interface PlayerStat {
  player_name: string;
  total_kills: number;
}

const PlayerDashboard = ({ userId }: PlayerDashboardProps) => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<{ id: string; name: string; logo_url?: string }[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matchNumber, setMatchNumber] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadedMatches, setUploadedMatches] = useState<number>(0);
  const [allScreenshots, setAllScreenshots] = useState<any[]>([]);
  const [mvpPlayer, setMvpPlayer] = useState<PlayerStat | null>(null);

  useEffect(() => {
    fetchTournamentAndTeams();
  }, []);

  useEffect(() => {
    if (tournament?.id) {
      fetchAllScreenshots();
      fetchPlayerStats();
      const interval = setInterval(() => {
        fetchTeams();
        fetchUploadedMatches();
        fetchAllScreenshots();
        fetchPlayerStats();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [tournament?.id, selectedTeamId, selectedDay]);

  const fetchTournamentAndTeams = async () => {
    const { data: tournamentData } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (tournamentData) {
      setTournament(tournamentData);

      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, logo_url")
        .eq("tournament_id", tournamentData.id);

      if (teamsData) {
        setAllTeams(teamsData);
        if (teamsData.length > 0 && !selectedTeamId) {
          setSelectedTeamId(teamsData[0].id);
        }
      }

      fetchTeams();
    }
  };

  const fetchUploadedMatches = async () => {
    if (!selectedTeamId) return;

    const { data, error } = await supabase
      .from("match_screenshots")
      .select("id")
      .match({ team_id: selectedTeamId, day: selectedDay });

    if (!error && data) {
      setUploadedMatches(data.length);
    }
  };

  const fetchAllScreenshots = async () => {
    if (!tournament?.id) return;

    const { data: teams } = await supabase
      .from("teams")
      .select("id")
      .eq("tournament_id", tournament.id);

    if (!teams || teams.length === 0) return;

    const teamIds = teams.map(t => t.id);

    const { data, error } = await supabase
      .from("match_screenshots")
      .select("id, screenshot_url, match_number, day, placement, kills, points, team_id, teams!inner(id, name, logo_url)")
      .in("team_id", teamIds)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAllScreenshots(data);
    }
  };

  const fetchTeams = async () => {
    if (!tournament?.id) return;

    const { data, error } = await supabase
      .from("teams")
      .select("id, name, created_at, logo_url")
      .eq("tournament_id", tournament.id);

    if (error) {
      console.error("Error fetching teams:", error);
      return;
    }

    if (data) {
      const { data: allMatches } = await supabase
        .from("match_screenshots")
        .select("team_id, placement, kills, points");

      const teamsData: Team[] = data.map((team) => {
        const teamMatches = allMatches?.filter((m) => m.team_id === team.id) || [];
        let totalPoints = 0;
        let totalKills = 0;
        let placementPoints = 0;
        const firstPlaceWins = teamMatches.filter((m) => m.placement === 1).length;

        teamMatches.forEach((match) => {
          totalKills += match.kills || 0;
          totalPoints += match.points || 0;

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
      setTeams(teamsData);
    }
  };

  const fetchPlayerStats = async () => {
    if (!tournament?.id) return;

    const { data: teamsData } = await supabase
      .from("teams")
      .select("id")
      .eq("tournament_id", tournament.id);

    if (!teamsData || teamsData.length === 0) return;

    const teamIds = teamsData.map(t => t.id);

    const { data: playerStats, error } = await supabase
      .from("player_stats")
      .select("player_name, kills, team_id")
      .in("team_id", teamIds);

    if (error || !playerStats || playerStats.length === 0) {
      setMvpPlayer(null);
      return;
    }

    const aggregatedStats: Record<string, number> = {};
    playerStats.forEach((stat) => {
      const name = stat.player_name;
      aggregatedStats[name] = (aggregatedStats[name] || 0) + (stat.kills || 0);
    });

    let mvp: PlayerStat | null = null;
    Object.entries(aggregatedStats).forEach(([name, kills]) => {
      if (!mvp || kills > mvp.total_kills) {
        mvp = { player_name: name, total_kills: kills };
      }
    });

    setMvpPlayer(mvp);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) {
      return;
    }

    if (!selectedTeamId) {
      toast.error("Please select a team first");
      return;
    }

    if (tournament && uploadedMatches >= tournament.total_matches) {
      toast.error(`You have reached the maximum number of matches (${tournament.total_matches}) for this tournament`);
      return;
    }

    if (tournament && (uploadedMatches + files.length) > tournament.total_matches) {
      const remaining = tournament.total_matches - uploadedMatches;
      toast.error(`You can only upload ${remaining} more screenshot${remaining > 1 ? 's' : ''} for this tournament`);
      return;
    }

    if (files.length > 4) {
      toast.error("You can only upload up to 4 screenshots at once");
      return;
    }

    const invalidFiles = files.filter(file => !file.type.startsWith("image/"));
    if (invalidFiles.length > 0) {
      toast.error("Please upload only image files");
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;
    const errorMessages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Processing ${i + 1} of ${files.length}...`);

        try {
          const fileExt = file.name.split(".").pop();
          const fileName = `${userId}/${Date.now()}_${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("match-screenshots")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("match-screenshots")
            .getPublicUrl(fileName);

          setAnalyzing(true);
          setUploadProgress(`Analyzing screenshot ${i + 1} with AI...`);

          const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
            "analyze-screenshot",
            {
              body: { imageUrl: publicUrl },
            }
          );

          setAnalyzing(false);

          if (analysisError) {
            console.error("Analysis error:", analysisError);
            errorMessages.push(`Screenshot ${i + 1}: ${analysisError.message || 'Analysis failed'}`);
            failCount++;
            continue;
          }

          if (analysisData?.error) {
            console.error("AI error:", analysisData.error);
            errorMessages.push(`Screenshot ${i + 1}: ${analysisData.error}`);
            failCount++;
            continue;
          }

          const { placement, kills, players } = analysisData;

          if (placement === null || kills === null) {
            errorMessages.push(`Screenshot ${i + 1}: Could not detect placement or kills. Please ensure the screenshot clearly shows the match results.`);
            failCount++;
            continue;
          }

          const PLACEMENT_POINTS: Record<number, number> = {
            1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1,
            9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0,
            17: 0, 18: 0, 19: 0, 20: 0, 21: 0, 22: 0, 23: 0, 24: 0,
            25: 0, 26: 0, 27: 0, 28: 0, 29: 0, 30: 0, 31: 0, 32: 0,
          };
          const placementPoints = PLACEMENT_POINTS[placement] || 0;
          const points = placementPoints + kills;

          const { data: screenshotData, error: dbError } = await supabase
            .from("match_screenshots")
            .insert({
              team_id: selectedTeamId,
              player_id: userId,
              match_number: matchNumber + i,
              day: selectedDay,
              screenshot_url: publicUrl,
              placement,
              kills,
              points,
              analyzed_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (dbError) {
            console.error("Database error:", dbError);
            errorMessages.push(`Screenshot ${i + 1}: Failed to save to database`);
            failCount++;
          } else {
            // Save player stats if available
            if (players && Array.isArray(players) && players.length > 0) {
              const playerStatsToInsert = players.map((player: { name: string; kills: number; damage: number }) => ({
                screenshot_id: screenshotData.id,
                team_id: selectedTeamId,
                player_name: player.name,
                kills: player.kills || 0,
                damage: player.damage || 0,
              }));

              const { error: playerStatsError } = await supabase
                .from("player_stats")
                .insert(playerStatsToInsert);

              if (playerStatsError) {
                console.error("Player stats error:", playerStatsError);
              }
            }
            successCount++;
          }
        } catch (error) {
          console.error("Error processing file:", error);
          errorMessages.push(`Screenshot ${i + 1}: ${error instanceof Error ? error.message : 'Processing failed'}`);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} screenshot${successCount > 1 ? 's' : ''}!`);
        setMatchNumber(matchNumber + successCount);
        fetchUploadedMatches();
      }

      if (failCount > 0) {
        toast.error(
          `Failed to process ${failCount} screenshot${failCount > 1 ? 's' : ''}`,
          {
            description: errorMessages.length > 0 ? errorMessages.join('\n') : 'Please try again or contact support.',
          }
        );
      }

      e.target.value = "";
      fetchTeams();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload screenshots");
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setUploadProgress("");
    }
  };

  const canUploadMore = !tournament || uploadedMatches < 4;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Player Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Upload your match screenshots</p>
          </div>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="border-primary/50 hover:bg-primary/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {tournament && (
          <Card className="p-6 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 shadow-card">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Tournament Info
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{tournament.name}</h3>
                {tournament.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {tournament.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-background/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">Total Matches</p>
                  <p className="text-2xl font-bold">{tournament.total_matches}</p>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">Day {selectedDay} Uploaded</p>
                  <p className="text-2xl font-bold">{uploadedMatches} / 4</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 border-primary/30 shadow-card bg-card/95">
          <h2 className="text-2xl font-bold mb-4">Upload Match Screenshot</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamSelect">Select Team</Label>
              <Select value={selectedTeamId} onValueChange={(value) => {
                setSelectedTeamId(value);
                fetchUploadedMatches();
              }}>
                <SelectTrigger className="bg-input border-border max-w-xs">
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/30 z-50">
                  {allTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        {team.logo_url && (
                          <img
                            src={team.logo_url}
                            alt={team.name}
                            className="w-5 h-5 rounded object-cover"
                          />
                        )}
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="daySelect">Select Day</Label>
              <Select value={selectedDay.toString()} onValueChange={(value) => {
                setSelectedDay(parseInt(value));
                fetchUploadedMatches();
              }}>
                <SelectTrigger className="bg-input border-border max-w-xs">
                  <SelectValue placeholder="Choose a day" />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/30 z-50">
                  <SelectItem value="1">Day 1</SelectItem>
                  <SelectItem value="2">Day 2</SelectItem>
                  <SelectItem value="3">Day 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="matchNumber">Match Number</Label>
              <Input
                id="matchNumber"
                type="number"
                min="1"
                value={matchNumber}
                onChange={(e) => setMatchNumber(parseInt(e.target.value) || 1)}
                className="bg-input border-border max-w-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenshot">Upload Screenshots (Max 4)</Label>
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={!selectedTeamId || uploading || analyzing || !canUploadMore}
                  className="hidden"
                />
                <label
                  htmlFor="screenshot"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {uploading || analyzing ? (
                    <>
                      <Loader2 className="h-12 w-12 text-primary animate-spin" />
                      <p className="text-lg font-semibold">
                        {uploadProgress || (uploading ? "Uploading..." : "Analyzing with AI...")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Please wait while we process your screenshots
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-primary" />
                      <p className="text-lg font-semibold">
                        Click to upload screenshots (up to 4)
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {canUploadMore
                          ? "AI will automatically extract placement and kills from each"
                          : "You have uploaded all allowed matches"}
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        </Card>

        {teams.length > 0 && (
          <Standings 
            teams={teams} 
            mvpPlayer={mvpPlayer}
          />
        )}

        {allScreenshots.length > 0 && (
          <Card className="p-6 border-primary/30 bg-card/95">
            <h2 className="text-2xl font-bold mb-4">All Uploaded Screenshots</h2>
            <PlayerScreenshotExplorer screenshots={allScreenshots} />
          </Card>
        )}
      </div>
    </div>
  );
};

export default PlayerDashboard;
