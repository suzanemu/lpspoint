import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Tournament } from "@/types/tournament";

export default function TeamManager() {
  const [teams, setTeams] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [newTeamName, setNewTeamName] = useState("");

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTeams();
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    const { data } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
    setTournaments(data || []);
    if (data && data.length > 0 && !selectedTournament) {
      setSelectedTournament(data[0].id);
    }
  };

  const fetchTeams = async () => {
    const { data } = await supabase.from("teams").select("*").eq("tournament_id", selectedTournament);
    setTeams(data || []);
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim() || !selectedTournament) {
      toast.error("Please enter a team name");
      return;
    }

    const { error } = await supabase.from("teams").insert({ name: newTeamName, tournament_id: selectedTournament });

    if (error) {
      toast.error("Failed to add team");
    } else {
      toast.success("Team added");
      setNewTeamName("");
      fetchTeams();
    }
  };

  const handleDeleteTeam = async (id: string) => {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Team deleted");
      fetchTeams();
    }
  };

  return (
    <Card className="p-6 border-primary/30 bg-card/95">
      <h2 className="text-xl font-bold mb-4">Team Manager</h2>
      
      {tournaments.length > 0 && (
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-full mb-4">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex gap-2 mb-4">
        <Input
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          placeholder="Team name"
          className="bg-input"
        />
        <Button onClick={handleAddTeam}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {teams.map((team) => (
          <div key={team.id} className="flex items-center justify-between p-3 bg-secondary rounded">
            <span>{team.name}</span>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteTeam(team.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
