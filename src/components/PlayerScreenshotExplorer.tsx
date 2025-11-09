import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

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

interface PlayerScreenshotExplorerProps {
  screenshots: Screenshot[];
}

const PlayerScreenshotExplorer = ({ screenshots }: PlayerScreenshotExplorerProps) => {
  // Group screenshots by day and team
  const groupedScreenshots = screenshots.reduce((acc, screenshot) => {
    const day = screenshot.day || 1;
    const teamName = (screenshot.teams as any)?.name || "Unknown Team";
    
    if (!acc[day]) acc[day] = {};
    if (!acc[day][teamName]) acc[day][teamName] = [];
    
    acc[day][teamName].push(screenshot);
    return acc;
  }, {} as Record<number, Record<string, Screenshot[]>>);

  if (screenshots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No screenshots uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedScreenshots).sort(([a], [b]) => Number(a) - Number(b)).map(([day, teams]) => (
        <div key={day} className="space-y-4">
          <h3 className="text-lg font-bold text-primary">Day {day}</h3>
          
          {Object.entries(teams).map(([teamName, teamScreenshots]) => (
            <div key={teamName} className="space-y-2">
              <h4 className="font-semibold text-foreground/90">{teamName}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {teamScreenshots.map((screenshot) => (
                  <div key={screenshot.id} className="border border-primary/30 rounded-lg p-2 bg-secondary/50">
                    <img
                      src={screenshot.screenshot_url}
                      alt={`Match ${screenshot.match_number}`}
                      className="w-full h-32 object-cover rounded mb-2"
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
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default PlayerScreenshotExplorer;
