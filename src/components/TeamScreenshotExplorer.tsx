import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Image, Trash2, AlertCircle, ChevronDown, ChevronRight, FolderOpen, Folder, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculatePoints } from "@/types/tournament";
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
  teams: { name: string; id: string } | null;
  team_id: string;
}

interface PlayerStat {
  player_name: string;
  kills: number;
  damage: number;
  team_id: string;
}

interface TeamScreenshotExplorerProps {
  selectedTournament: string;
  userId: string;
}

const TeamScreenshotExplorer = ({ selectedTournament, userId }: TeamScreenshotExplorerProps) => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<Screenshot | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [editingScreenshot, setEditingScreenshot] = useState<Screenshot | null>(null);
  const [editPlacement, setEditPlacement] = useState<number>(0);
  const [editKills, setEditKills] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    if (selectedTournament) {
      fetchScreenshots();
    }
  }, [selectedTournament, userId]);

  const checkAdminStatus = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("role")
      .eq("user_id", userId)
      .single();
    
    setIsAdmin(data?.role === "admin");
  };

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
        team_id,
        teams (id, name)
      `)
      .order("day", { ascending: true })
      .order("match_number", { ascending: true });

    if (error) {
      console.error("Error fetching screenshots:", error);
      toast.error("Failed to load screenshots");
    } else {
      setScreenshots(data || []);
      // Fetch player stats for all teams
      const teamIds = [...new Set((data || []).map(s => s.team_id))];
      if (teamIds.length > 0) {
        const { data: statsData } = await supabase
          .from("player_stats")
          .select("player_name, kills, damage, team_id")
          .in("team_id", teamIds);
        setPlayerStats(statsData || []);
      }
    }
    setLoading(false);
  };

  // Get team's MVP and top damage player
  const getTeamTopPlayers = (teamId: string) => {
    const teamStats = playerStats.filter(s => s.team_id === teamId);
    if (teamStats.length === 0) return { mvp: null, topDamage: null };

    // Aggregate stats by player name
    const aggregated = teamStats.reduce((acc, stat) => {
      if (!acc[stat.player_name]) {
        acc[stat.player_name] = { kills: 0, damage: 0 };
      }
      acc[stat.player_name].kills += stat.kills;
      acc[stat.player_name].damage += stat.damage;
      return acc;
    }, {} as Record<string, { kills: number; damage: number }>);

    const players = Object.entries(aggregated).map(([name, stats]) => ({
      name,
      ...stats
    }));

    const mvp = players.reduce((max, p) => p.kills > max.kills ? p : max, players[0]);
    const topDamage = players.reduce((max, p) => p.damage > max.damage ? p : max, players[0]);

    return { mvp, topDamage };
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

  const handleEditClick = (screenshot: Screenshot) => {
    setEditingScreenshot(screenshot);
    setEditPlacement(screenshot.placement || 0);
    setEditKills(screenshot.kills || 0);
  };

  const handleEditSave = async () => {
    if (!editingScreenshot) return;

    const newPoints = calculatePoints(editPlacement, editKills);

    const { error } = await supabase
      .from("match_screenshots")
      .update({
        placement: editPlacement,
        kills: editKills,
        points: newPoints,
      })
      .eq("id", editingScreenshot.id);

    if (error) {
      console.error("Error updating screenshot:", error);
      toast.error("Failed to update screenshot");
    } else {
      toast.success("Screenshot updated successfully");
      fetchScreenshots();
      setEditingScreenshot(null);
    }
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
      <Card className="p-3 sm:p-6 border-primary/30 bg-card/95">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
          <Image className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Screenshot Verification
        </h2>

        {screenshots.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm sm:text-base">No screenshots uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {Object.entries(groupedScreenshots).sort(([a], [b]) => Number(a) - Number(b)).map(([day, teams]) => (
              <Collapsible
                key={day}
                open={expandedDays[Number(day)]}
                onOpenChange={() => toggleDay(Number(day))}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-2 p-2 sm:p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                    {expandedDays[Number(day)] ? (
                      <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                    )}
                    {expandedDays[Number(day)] ? (
                      <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                    ) : (
                      <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                    )}
                    <h3 className="text-sm sm:text-lg font-bold text-primary">Day {day}</h3>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {Object.values(teams).reduce((sum, arr) => sum + arr.length, 0)}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-2 ml-2 sm:ml-4 space-y-2">
                  {Object.entries(teams).map(([teamName, teamScreenshots]) => {
                    const teamKey = `${day}-${teamName}`;
                    const teamId = teamScreenshots[0]?.team_id;
                    const { mvp, topDamage } = getTeamTopPlayers(teamId);
                    return (
                      <Collapsible
                        key={teamKey}
                        open={expandedTeams[teamKey]}
                        onOpenChange={() => toggleTeam(teamKey)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-2 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors">
                            {expandedTeams[teamKey] ? (
                              <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                            )}
                            {expandedTeams[teamKey] ? (
                              <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                            ) : (
                              <Folder className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                            )}
                            <h4 className="font-semibold text-foreground/90 text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{teamName}</h4>
                            {mvp && (
                              <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px] sm:text-xs px-1.5 py-0.5">
                                MVP: {mvp.name} ({mvp.kills})
                              </Badge>
                            )}
                            <Badge variant="outline" className="ml-auto text-[10px] sm:text-xs">
                              {teamScreenshots.length}
                            </Badge>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="mt-2 ml-2 sm:ml-6">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
                            {teamScreenshots.map((screenshot) => (
                              <div key={screenshot.id} className="border border-primary/30 rounded-lg p-1.5 sm:p-2 bg-secondary/50">
                                <img
                                  src={screenshot.screenshot_url}
                                  alt={`Match ${screenshot.match_number}`}
                                  className="w-full h-20 sm:h-32 object-cover rounded mb-1.5 sm:mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setSelectedImage(screenshot)}
                                />
                                <div className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs">
                                  <p className="font-semibold">Match #{screenshot.match_number}</p>
                                  {screenshot.placement && (
                                    <div className="flex flex-wrap items-center gap-1">
                                      <Badge variant="outline" className="text-[9px] sm:text-xs px-1 py-0">#{screenshot.placement}</Badge>
                                      <Badge variant="outline" className="text-[9px] sm:text-xs px-1 py-0">{screenshot.kills}k</Badge>
                                    </div>
                                  )}
                                  {screenshot.points && (
                                    <p className="font-bold text-primary text-xs sm:text-sm">{screenshot.points} pts</p>
                                  )}
                                </div>
                                {isAdmin && (
                                  <div className="flex gap-1 sm:gap-2 mt-1.5 sm:mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 h-7 sm:h-8 text-[10px] sm:text-xs px-1.5 sm:px-2"
                                      onClick={() => handleEditClick(screenshot)}
                                    >
                                      <Edit className="h-3 w-3 sm:mr-1" />
                                      <span className="hidden sm:inline">Edit</span>
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="flex-1 h-7 sm:h-8 text-[10px] sm:text-xs px-1.5 sm:px-2"
                                      onClick={() => setDeleteId(screenshot.id)}
                                    >
                                      <Trash2 className="h-3 w-3 sm:mr-1" />
                                      <span className="hidden sm:inline">Delete</span>
                                    </Button>
                                  </div>
                                )}
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
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Delete Screenshot?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This action cannot be undone. This will permanently delete the screenshot and its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground w-full sm:w-auto">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl w-full p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {selectedImage && (
                <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                  <span className="font-bold">{(selectedImage.teams as any)?.name}</span>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">Match #{selectedImage.match_number}</Badge>
                    <Badge variant="outline" className="text-xs">Day {selectedImage.day}</Badge>
                    {selectedImage.placement && (
                      <>
                        <Badge className="text-xs">#{selectedImage.placement}</Badge>
                        <Badge className="text-xs">{selectedImage.kills}k</Badge>
                        <Badge className="bg-primary text-xs">{selectedImage.points} pts</Badge>
                      </>
                    )}
                  </div>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img
              src={selectedImage.screenshot_url}
              alt={`Match ${selectedImage.match_number}`}
              className="w-full h-auto rounded-lg max-h-[70vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingScreenshot} onOpenChange={() => setEditingScreenshot(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Edit Screenshot Data</DialogTitle>
          </DialogHeader>
          {editingScreenshot && (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="placement" className="text-sm">Placement</Label>
                <Input
                  id="placement"
                  type="number"
                  min="1"
                  max="32"
                  value={editPlacement}
                  onChange={(e) => setEditPlacement(parseInt(e.target.value) || 0)}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="kills" className="text-sm">Kills</Label>
                <Input
                  id="kills"
                  type="number"
                  min="0"
                  value={editKills}
                  onChange={(e) => setEditKills(parseInt(e.target.value) || 0)}
                  className="h-10"
                />
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground">Calculated Points:</p>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {calculatePoints(editPlacement, editKills)} pts
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleEditSave} className="flex-1 h-10">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingScreenshot(null)} className="flex-1 h-10">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamScreenshotExplorer;
