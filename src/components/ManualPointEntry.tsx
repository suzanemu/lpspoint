import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Calculator, Plus, Trash2, CalendarDays } from "lucide-react";
import { calculatePoints } from "@/types/tournament";

interface Team {
  id: string;
  name: string;
  logo_url?: string;
}

interface ManualPointEntryProps {
  selectedTournament: string;
}

interface TeamResult {
  teamId: string;
  teamName: string;
  placement: number;
  kills: number;
  points: number;
}

export default function ManualPointEntry({ selectedTournament }: ManualPointEntryProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matchNumber, setMatchNumber] = useState("1");
  const [day, setDay] = useState("1");
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [placement, setPlacement] = useState("");
  const [kills, setKills] = useState("");
  const [addedResults, setAddedResults] = useState<TeamResult[]>([]);

  // Daily total entry states
  const [dailyDay, setDailyDay] = useState("1");
  const [dailyTeam, setDailyTeam] = useState("");
  const [dailyKills, setDailyKills] = useState("");
  const [dailyPlacementPoints, setDailyPlacementPoints] = useState("");
  const [dailyLoading, setDailyLoading] = useState(false);

  useEffect(() => {
    if (selectedTournament) {
      fetchTeams();
    }
  }, [selectedTournament]);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, logo_url")
      .eq("tournament_id", selectedTournament)
      .order("name");

    if (error) {
      console.error("Error fetching teams:", error);
      return;
    }

    setTeams(data || []);
  };

  const handleAddResult = () => {
    if (!selectedTeam || !placement || !kills) {
      toast.error("Please fill all fields");
      return;
    }

    const placementNum = parseInt(placement);
    const killsNum = parseInt(kills);

    if (isNaN(placementNum) || placementNum < 1 || placementNum > 32) {
      toast.error("Placement must be between 1 and 32");
      return;
    }

    if (isNaN(killsNum) || killsNum < 0) {
      toast.error("Kills must be a positive number");
      return;
    }

    if (addedResults.some(r => r.teamId === selectedTeam)) {
      toast.error("Team already added");
      return;
    }

    const team = teams.find(t => t.id === selectedTeam);
    if (!team) return;

    const points = calculatePoints(placementNum, killsNum);

    setAddedResults([...addedResults, {
      teamId: selectedTeam,
      teamName: team.name,
      placement: placementNum,
      kills: killsNum,
      points,
    }]);

    setSelectedTeam("");
    setPlacement("");
    setKills("");
    toast.success(`${team.name} added`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!matchNumber || addedResults.length === 0) {
      toast.error("Please add at least one team result");
      return;
    }

    setLoading(true);

    try {
      const matchData = addedResults.map(result => ({
        team_id: result.teamId,
        match_number: parseInt(matchNumber),
        day: parseInt(day),
        placement: result.placement,
        kills: result.kills,
        points: result.points,
        screenshot_url: "manual-entry",
        analyzed_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("match_screenshots")
        .insert(matchData);

      if (error) {
        console.error("Error:", error);
        toast.error("Failed to save");
      } else {
        toast.success(`Match ${matchNumber} saved`);
        setAddedResults([]);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    }

    setLoading(false);
  };

  const handleDailySubmit = async () => {
    if (!dailyTeam || !dailyKills || !dailyPlacementPoints) {
      toast.error("Please fill all fields");
      return;
    }

    const killsNum = parseInt(dailyKills);
    const placementPointsNum = parseInt(dailyPlacementPoints);

    if (isNaN(killsNum) || killsNum < 0) {
      toast.error("Kills must be a positive number");
      return;
    }

    if (isNaN(placementPointsNum) || placementPointsNum < 0) {
      toast.error("Placement points must be a positive number");
      return;
    }

    const team = teams.find(t => t.id === dailyTeam);
    if (!team) return;

    setDailyLoading(true);

    try {
      // Insert as a special "daily-total" entry with match_number = 0
      const totalPoints = killsNum + placementPointsNum;
      
      const { error } = await supabase
        .from("match_screenshots")
        .insert({
          team_id: dailyTeam,
          match_number: 0, // 0 indicates daily total entry
          day: parseInt(dailyDay),
          placement: 0, // Not applicable for daily total
          kills: killsNum,
          points: totalPoints,
          screenshot_url: "daily-total-entry",
          analyzed_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Error:", error);
        toast.error("Failed to save daily total");
      } else {
        toast.success(`Daily total for ${team.name} saved`);
        setDailyTeam("");
        setDailyKills("");
        setDailyPlacementPoints("");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    }

    setDailyLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Match Entry Card */}
      <Card className="p-6 border-primary/30 bg-card/95">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Manual Match Entry
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label>Match Number</Label>
              <Input
                type="number"
                min="1"
                value={matchNumber}
                onChange={(e) => setMatchNumber(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Day</Label>
              <Input
                type="number"
                min="1"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="bg-input border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Choose team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.filter(t => !addedResults.some(r => r.teamId === t.id)).map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Placement</Label>
              <Input
                type="number"
                min="1"
                max="32"
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label>Kills</Label>
              <Input
                type="number"
                min="0"
                value={kills}
                onChange={(e) => setKills(e.target.value)}
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label>Points</Label>
              <div className="h-10 px-3 flex items-center bg-muted rounded-md border border-border">
                <span className="font-bold text-primary">
                  {placement && kills ? calculatePoints(parseInt(placement) || 0, parseInt(kills) || 0) : 0}
                </span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleAddResult}
            variant="outline"
            className="w-full border-primary/50 hover:bg-primary/10"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Team Result
          </Button>
        </div>

        {addedResults.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="font-semibold mb-2">Added Results ({addedResults.length})</h3>
            {addedResults.map((result) => (
              <div key={result.teamId} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-semibold">{result.teamName}</span>
                  <span className="text-sm">Rank: #{result.placement}</span>
                  <span className="text-sm">Kills: {result.kills}</span>
                  <span className="font-bold text-primary">{result.points} pts</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddedResults(addedResults.filter(r => r.teamId !== result.teamId))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-primary hover:shadow-glow mt-4"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : `Save Match ${matchNumber}`}
            </Button>
          </div>
        )}
      </Card>

      {/* Daily Total Entry Card */}
      <Card className="p-6 border-accent/30 bg-card/95">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-accent" />
          Daily Total Entry
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Add total points for a team for the entire day (combined kills and placement points)
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Day</Label>
              <Input
                type="number"
                min="1"
                value={dailyDay}
                onChange={(e) => setDailyDay(e.target.value)}
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={dailyTeam} onValueChange={setDailyTeam}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Choose team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Total Kills</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={dailyKills}
                onChange={(e) => setDailyKills(e.target.value)}
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label>Placement Points</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={dailyPlacementPoints}
                onChange={(e) => setDailyPlacementPoints(e.target.value)}
                className="bg-input border-border"
              />
            </div>
          </div>

          {/* Preview total */}
          {(dailyKills || dailyPlacementPoints) && (
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Kills:</span>
                    <span className="ml-2 font-semibold">{dailyKills || 0}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Placement:</span>
                    <span className="ml-2 font-semibold">{dailyPlacementPoints || 0}</span>
                  </div>
                </div>
                <div className="text-lg font-bold text-primary">
                  Total: {(parseInt(dailyKills) || 0) + (parseInt(dailyPlacementPoints) || 0)} pts
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleDailySubmit}
            disabled={dailyLoading || !dailyTeam || !dailyKills || !dailyPlacementPoints}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Save className="mr-2 h-4 w-4" />
            {dailyLoading ? "Saving..." : "Save Daily Total"}
          </Button>
        </div>
      </Card>
    </div>
  );
}