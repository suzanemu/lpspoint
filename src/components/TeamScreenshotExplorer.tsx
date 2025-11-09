import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Image, Trash2, AlertCircle, ChevronDown, ChevronRight, FolderOpen, Folder } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Screenshot {
  id: string;
  screenshot_url: string;
  match_number: number;
  day: number;
  placement: number | null;
  kills: number | null;
  points: number | null;
  teams: { name: string } | null;
}

interface TeamScreenshotExplorerProps {
  selectedTournament: string;
  userId: string;
}

const TeamScreenshotExplorer = ({ selectedTournament, userId }: TeamScreenshotExplorerProps) => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<Screenshot | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedTournament) {
      fetchScreenshots();
    }
  }, [selectedTournament]);

  const fetchScreenshots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("match_screenshots")
      .select(`
        id,
        screenshot_url,
        match_number,
        day,
        placement,
        kills,
        points,
        teams (name)
      `)
      .order("day", { ascending: true })
      .order("match_number", { ascending: true });

    if (error) {
      console.error("Error fetching screenshots:", error);
      toast.error("Failed to load screenshots");
    } else {
      setScreenshots(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from("match_screenshots")
      .delete()
      .eq("id", deleteId);

    if (error) {
      console.error("Error deleting screenshot:", error);
      toast.error("Failed to delete");
    } else {
      toast.success("Screenshot deleted");
      fetchScreenshots();
    }
    setDeleteId(null);
  };

  // Group screenshots by day and team
  const groupedScreenshots = screenshots.reduce((acc, screenshot) => {
    const day = screenshot.day || 1;
    const teamName = (screenshot.teams as any)?.name || "Unknown Team";
    
    if (!acc[day]) acc[day] = {};
    if (!acc[day][teamName]) acc[day][teamName] = [];
    
    acc[day][teamName].push(screenshot);
    return acc;
  }, {} as Record<number, Record<string, Screenshot[]>>);

  const toggleDay = (day: number) => {
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const toggleTeam = (key: string) => {
    setExpandedTeams(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <Card className="p-6 border-primary/30 bg-card/95">
        <p className="text-muted-foreground">Loading screenshots...</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 border-primary/30 bg-card/95">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          Screenshot Verification
        </h2>

        {screenshots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No screenshots uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedScreenshots).sort(([a], [b]) => Number(a) - Number(b)).map(([day, teams]) => (
              <Collapsible
                key={day}
                open={expandedDays[Number(day)]}
                onOpenChange={() => toggleDay(Number(day))}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-2 p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                    {expandedDays[Number(day)] ? (
                      <ChevronDown className="h-5 w-5 text-primary" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-primary" />
                    )}
                    {expandedDays[Number(day)] ? (
                      <FolderOpen className="h-5 w-5 text-primary" />
                    ) : (
                      <Folder className="h-5 w-5 text-primary" />
                    )}
                    <h3 className="text-lg font-bold text-primary">Day {day}</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {Object.values(teams).reduce((sum, arr) => sum + arr.length, 0)} screenshots
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-2 ml-4 space-y-2">
                  {Object.entries(teams).map(([teamName, teamScreenshots]) => {
                    const teamKey = `${day}-${teamName}`;
                    return (
                      <Collapsible
                        key={teamKey}
                        open={expandedTeams[teamKey]}
                        onOpenChange={() => toggleTeam(teamKey)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center gap-2 p-2 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors">
                            {expandedTeams[teamKey] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {expandedTeams[teamKey] ? (
                              <FolderOpen className="h-4 w-4" />
                            ) : (
                              <Folder className="h-4 w-4" />
                            )}
                            <h4 className="font-semibold text-foreground/90">{teamName}</h4>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {teamScreenshots.length} screenshots
                            </Badge>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="mt-2 ml-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {teamScreenshots.map((screenshot) => (
                              <div key={screenshot.id} className="border border-primary/30 rounded-lg p-2 bg-secondary/50">
                                <img
                                  src={screenshot.screenshot_url}
                                  alt={`Match ${screenshot.match_number}`}
                                  className="w-full h-32 object-cover rounded mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setSelectedImage(screenshot)}
                                />
                                <div className="space-y-1 text-xs">
                                  <p className="font-semibold">Match #{screenshot.match_number}</p>
                                  {screenshot.placement && (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">Rank: #{screenshot.placement}</Badge>
                                      <Badge variant="outline" className="text-xs">{screenshot.kills} kills</Badge>
                                    </div>
                                  )}
                                  {screenshot.points && (
                                    <p className="font-bold text-primary">{screenshot.points} pts</p>
                                  )}
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="w-full mt-2"
                                  onClick={() => setDeleteId(screenshot.id)}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Screenshot?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the screenshot and its data.
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

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>
              {selectedImage && (
                <div className="flex items-center gap-4">
                  <span>{(selectedImage.teams as any)?.name}</span>
                  <Badge variant="outline">Match #{selectedImage.match_number}</Badge>
                  <Badge variant="outline">Day {selectedImage.day}</Badge>
                  {selectedImage.placement && (
                    <>
                      <Badge>Rank: #{selectedImage.placement}</Badge>
                      <Badge>{selectedImage.kills} kills</Badge>
                      <Badge className="bg-primary">{selectedImage.points} pts</Badge>
                    </>
                  )}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img
              src={selectedImage.screenshot_url}
              alt={`Match ${selectedImage.match_number}`}
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamScreenshotExplorer;
