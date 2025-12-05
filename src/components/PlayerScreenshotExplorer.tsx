import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ChevronDown, ChevronRight, FolderOpen, Folder } from "lucide-react";
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

interface PlayerScreenshotExplorerProps {
  screenshots: Screenshot[];
}

const PlayerScreenshotExplorer = ({ screenshots }: PlayerScreenshotExplorerProps) => {
  const [selectedImage, setSelectedImage] = useState<Screenshot | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);

  useEffect(() => {
    const fetchPlayerStats = async () => {
      const teamIds = [...new Set(screenshots.map(s => s.team_id).filter(Boolean))];
      if (teamIds.length > 0) {
        const { data } = await supabase
          .from("player_stats")
          .select("player_name, kills, damage, team_id")
          .in("team_id", teamIds);
        setPlayerStats(data || []);
      }
    };
    fetchPlayerStats();
  }, [screenshots]);

  // Get team's MVP and top damage player
  const getTeamTopPlayers = (teamId: string) => {
    const teamStats = playerStats.filter(s => s.team_id === teamId);
    if (teamStats.length === 0) return { mvp: null, topDamage: null };

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

  if (screenshots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No screenshots uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
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
                            MVP: {mvp.name} <span className="hidden sm:inline">({mvp.kills} kills)</span>
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
    </>
  );
};

export default PlayerScreenshotExplorer;
