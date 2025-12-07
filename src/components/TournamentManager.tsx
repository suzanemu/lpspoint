import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Trophy, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TournamentManagerProps {
  onTournamentSelect?: (tournamentId: string | null) => void;
}

const PLACEMENT_POINTS: Record<number, number> = {
  1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1,
  9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0,
};

const TournamentManager = ({ onTournamentSelect }: TournamentManagerProps) => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [totalMatches, setTotalMatches] = useState(6);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    const { data } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
    setTournaments(data || []);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Tournament name required");
      return;
    }

    const { error } = await supabase.from("tournaments").insert({ name, total_matches: totalMatches });

    if (error) {
      toast.error("Failed to create");
    } else {
      toast.success("Tournament created");
      setName("");
      fetchTournaments();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);

    try {
      // Get tournament details
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", deleteId)
        .single();

      if (!tournament) {
        toast.error("Tournament not found");
        setDeleteId(null);
        setIsDeleting(false);
        return;
      }

      // Get teams for this tournament
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, logo_url")
        .eq("tournament_id", deleteId);

      const teamIds = teams?.map(t => t.id) || [];

      // Calculate standings for history
      let standings: any[] = [];
      let mvpPlayerName = "";
      let mvpTotalKills = 0;
      let mvpMatchesCount = 0;

      if (teamIds.length > 0) {
        // Get match data for standings
        const { data: matchData } = await supabase
          .from("match_screenshots")
          .select("team_id, placement, kills, points")
          .in("team_id", teamIds);

        // Calculate team standings
        standings = (teams || []).map(team => {
          const teamMatches = matchData?.filter(m => m.team_id === team.id) || [];
          const totalPoints = teamMatches.reduce((sum, m) => sum + (m.points || 0), 0);
          const totalKills = teamMatches.reduce((sum, m) => sum + (m.kills || 0), 0);
          const firstPlaceWins = teamMatches.filter(m => m.placement === 1).length;

          let placementPoints = 0;
          teamMatches.forEach(match => {
            placementPoints += PLACEMENT_POINTS[match.placement || 0] || 0;
          });

          return {
            name: team.name,
            logo_url: team.logo_url,
            totalPoints,
            placementPoints,
            killPoints: totalKills,
            totalKills,
            matchesPlayed: teamMatches.length,
            firstPlaceWins,
          };
        }).sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints;
          }
          return b.placementPoints - a.placementPoints;
        });

        // Get MVP player stats
        const { data: playerStats } = await supabase
          .from("player_stats")
          .select("player_name, kills, team_id")
          .in("team_id", teamIds);

        if (playerStats && playerStats.length > 0) {
          const aggregatedStats: Record<string, { kills: number; count: number }> = {};
          playerStats.forEach(stat => {
            const name = stat.player_name;
            if (!aggregatedStats[name]) {
              aggregatedStats[name] = { kills: 0, count: 0 };
            }
            aggregatedStats[name].kills += stat.kills || 0;
            aggregatedStats[name].count += 1;
          });

          Object.entries(aggregatedStats).forEach(([playerName, stats]) => {
            if (stats.kills > mvpTotalKills) {
              mvpPlayerName = playerName;
              mvpTotalKills = stats.kills;
              mvpMatchesCount = stats.count;
            }
          });
        }

        // Get all screenshot URLs to delete from storage
        const { data: screenshots } = await supabase
          .from("match_screenshots")
          .select("screenshot_url")
          .in("team_id", teamIds);

        // Delete screenshots from storage
        if (screenshots && screenshots.length > 0) {
          const filePaths = screenshots
            .map(s => {
              // Extract file path from URL
              const url = s.screenshot_url;
              const match = url.match(/match-screenshots\/(.+)$/);
              return match ? match[1] : null;
            })
            .filter(Boolean) as string[];

          if (filePaths.length > 0) {
            const { error: storageError } = await supabase.storage
              .from("match-screenshots")
              .remove(filePaths);

            if (storageError) {
              console.error("Error deleting screenshots from storage:", storageError);
            }
          }
        }

        // Delete player stats
        await supabase.from("player_stats").delete().in("team_id", teamIds);

        // Delete match screenshots from database
        await supabase.from("match_screenshots").delete().in("team_id", teamIds);

        // Delete access codes for teams
        await supabase.from("access_codes").delete().in("team_id", teamIds);
      }

      // Save tournament history
      const { error: historyError } = await supabase.from("tournament_history").insert({
        tournament_name: tournament.name,
        tournament_description: tournament.description,
        total_matches: tournament.total_matches,
        standings: standings,
        mvp_player_name: mvpPlayerName || null,
        mvp_total_kills: mvpTotalKills,
        mvp_matches_count: mvpMatchesCount,
        original_tournament_id: tournament.id,
      });

      if (historyError) {
        console.error("Error saving tournament history:", historyError);
      }

      // Delete teams
      const { error: teamsError } = await supabase
        .from("teams")
        .delete()
        .eq("tournament_id", deleteId);

      if (teamsError) {
        console.error("Error deleting teams:", teamsError);
        toast.error("Failed to delete tournament data");
        setDeleteId(null);
        setIsDeleting(false);
        return;
      }

      // Delete tournament
      const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", deleteId);

      if (error) {
        console.error("Error deleting tournament:", error);
        toast.error("Failed to delete tournament");
      } else {
        toast.success("Tournament archived and deleted");
        fetchTournaments();
        if (onTournamentSelect) {
          onTournamentSelect(null);
        }
      }
    } catch (err) {
      console.error("Error during deletion:", err);
      toast.error("Failed to delete tournament");
    }

    setDeleteId(null);
    setIsDeleting(false);
  };

  return (
    <>
    <Card className="p-6 border-primary/30 bg-card/95">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        Tournament Manager
      </h2>

      <div className="space-y-4 mb-6">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tournament name" className="bg-input" />
        <Input type="number" value={totalMatches} onChange={(e) => setTotalMatches(parseInt(e.target.value))} placeholder="Total matches" className="bg-input" />
        <Button onClick={handleCreate} className="w-full bg-gradient-primary">Create Tournament</Button>
      </div>

      <div className="space-y-2">
        {tournaments.map((t) => (
          <div key={t.id} className="p-3 bg-secondary rounded flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{t.name}</h3>
              <p className="text-sm text-muted-foreground">{t.total_matches} matches</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteId(t.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>

    <AlertDialog open={!!deleteId} onOpenChange={() => !isDeleting && setDeleteId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Tournament?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this tournament, all associated screenshots, and free up storage space. The standings and MVP data will be saved to tournament history for future reference.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            className="bg-destructive text-destructive-foreground"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default TournamentManager;