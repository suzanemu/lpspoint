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

const TournamentManager = ({ onTournamentSelect }: TournamentManagerProps) => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [totalMatches, setTotalMatches] = useState(6);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

    // Delete all related data first
    const { error: teamsError } = await supabase
      .from("teams")
      .delete()
      .eq("tournament_id", deleteId);

    if (teamsError) {
      console.error("Error deleting teams:", teamsError);
      toast.error("Failed to delete tournament data");
      setDeleteId(null);
      return;
    }

    const { error } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", deleteId);

    if (error) {
      console.error("Error deleting tournament:", error);
      toast.error("Failed to delete tournament");
    } else {
      toast.success("Tournament deleted");
      fetchTournaments();
      if (onTournamentSelect) {
        onTournamentSelect(null);
      }
    }
    setDeleteId(null);
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

    <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Tournament?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this tournament and all associated teams and data. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default TournamentManager;
