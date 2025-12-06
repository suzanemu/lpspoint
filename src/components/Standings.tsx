import { Button } from "@/components/ui/button";
import { Download, Trophy, Target } from "lucide-react";
import { Team } from "@/types/tournament";

interface PlayerStat {
  player_name: string;
  total_kills: number;
}

interface StandingsProps {
  teams: Team[];
  isAdmin?: boolean;
  tournamentName?: string;
  mvpPlayer?: PlayerStat | null;
}

const Standings = ({ 
  teams, 
  isAdmin = false, 
  tournamentName = "Tournament",
  mvpPlayer
}: StandingsProps) => {
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return b.placementPoints - a.placementPoints;
  });

  const downloadCSV = () => {
    const csvHeaders = "Rank,Team Name,Total Points,Placement Points,Kill Points,Total Kills,Matches Played,First Place Wins\n";
    const csvRows = sortedTeams.map((team, index) => {
      return [
        index + 1,
        `"${team.name}"`,
        team.totalPoints,
        team.placementPoints,
        team.killPoints,
        team.totalKills,
        team.matchesPlayed,
        team.firstPlaceWins
      ].join(',');
    }).join('\n');

    const csvContent = csvHeaders + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `${tournamentName.toLowerCase().replace(/\s+/g, '-')}-standings-${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[hsl(220_20%_12%)] rounded-lg p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h3 className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider mb-1">{tournamentName}</h3>
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-primary uppercase tracking-wider">Overall Standings</h2>
        </div>
        {isAdmin && (
          <Button onClick={downloadCSV} variant="outline" size="sm" className="border-primary/50 w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* MVP Card */}
      {mvpPlayer && (
        <div className="mb-4 sm:mb-6">
          <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-amber-500 rounded-full p-1.5 sm:p-2 shrink-0">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-amber-400 uppercase tracking-wider font-semibold">MVP - Highest Kills</p>
                <p className="text-sm sm:text-lg font-bold text-foreground truncate">{mvpPlayer.player_name}</p>
                <p className="text-xs sm:text-sm text-amber-400">{mvpPlayer.total_kills} Kills</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        <table className="w-full border-separate border-spacing-y-1 min-w-[500px] sm:min-w-0">
          <thead>
            <tr className="bg-primary">
              <th className="text-left p-2 sm:p-3 font-bold text-primary-foreground uppercase text-xs sm:text-sm rounded-l-lg">#</th>
              <th className="text-left p-2 sm:p-3 font-bold text-primary-foreground uppercase text-xs sm:text-sm">Team</th>
              <th className="text-center p-2 sm:p-3 font-bold text-primary-foreground uppercase text-xs sm:text-sm">
                <span className="hidden sm:inline">WWCD</span>
                <Trophy className="h-3 w-3 sm:hidden inline" />
              </th>
              <th className="text-center p-2 sm:p-3 font-bold text-primary-foreground uppercase text-xs sm:text-sm">MP</th>
              <th className="text-center p-2 sm:p-3 font-bold text-primary-foreground uppercase text-xs sm:text-sm">
                <span className="hidden sm:inline">Place</span>
                <span className="sm:hidden">PL</span>
              </th>
              <th className="text-center p-2 sm:p-3 font-bold text-primary-foreground uppercase text-xs sm:text-sm">
                <span className="hidden sm:inline">Kills</span>
                <span className="sm:hidden">K</span>
              </th>
              <th className="text-center p-2 sm:p-3 font-bold text-primary-foreground uppercase text-xs sm:text-sm rounded-r-lg">
                <span className="hidden sm:inline">Total</span>
                <span className="sm:hidden">PTS</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, index) => {
              const rank = index + 1;
              const isTopTeam = rank <= 7;
              
              return (
                <tr 
                  key={team.id} 
                  className={`
                    ${isTopTeam 
                      ? 'bg-[hsl(220_18%_15%)] border-2 border-primary rounded-lg' 
                      : 'bg-[hsl(220_18%_10%)]'
                    }
                  `}
                >
                  <td className={`p-2 sm:p-3 font-bold text-primary text-base sm:text-xl ${isTopTeam ? 'rounded-l-lg' : ''}`}>
                    {rank}
                  </td>
                  <td className="p-2 sm:p-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      {team.logo_url && (
                        <img src={team.logo_url} alt={team.name} className="w-6 h-6 sm:w-8 sm:h-8 rounded object-cover shrink-0" />
                      )}
                      <span className="font-bold text-foreground uppercase text-xs sm:text-base truncate max-w-[80px] sm:max-w-none">{team.name}</span>
                    </div>
                  </td>
                  <td className="text-center p-2 sm:p-3">
                    {team.firstPlaceWins > 0 ? (
                      <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                        <div className="bg-primary rounded-full p-0.5 sm:p-1">
                          <Trophy className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary-foreground" />
                        </div>
                        <span className="text-primary font-bold text-xs sm:text-base">{team.firstPlaceWins}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs sm:text-base">-</span>
                    )}
                  </td>
                  <td className="text-center p-2 sm:p-3 text-primary font-bold text-xs sm:text-base">
                    {team.matchesPlayed}
                  </td>
                  <td className="text-center p-2 sm:p-3 text-primary font-bold text-xs sm:text-base">
                    {team.placementPoints}
                  </td>
                  <td className="text-center p-2 sm:p-3 text-primary font-bold text-xs sm:text-base">
                    {team.totalKills}
                  </td>
                  <td className={`text-center p-2 sm:p-3 text-primary font-bold text-base sm:text-xl ${isTopTeam ? 'rounded-r-lg' : ''}`}>
                    {team.totalPoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Standings;
