import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Trophy } from "lucide-react";

interface TournamentManagerProps {
  onTournamentSelect?: (tournamentId: string | null) => void;
}

const TournamentManager = ({ onTournamentSelect }: TournamentManagerProps) => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [totalMatches, setTotalMatches] = useState(6);

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

  return (
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
          <div key={t.id} className="p-3 bg-secondary rounded">
            <h3 className="font-semibold">{t.name}</h3>
            <p className="text-sm text-muted-foreground">{t.total_matches} matches</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TournamentManager;
