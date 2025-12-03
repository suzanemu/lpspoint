import { Button } from "@/components/ui/button";
import { Download, Trophy, Target, Flame } from "lucide-react";
import { Team } from "@/types/tournament";

interface PlayerStat {
  player_name: string;
  total_kills: number;
  total_damage: number;
}

interface StandingsProps {
  teams: Team[];
  isAdmin?: boolean;
  tournamentName?: string;
  mvpPlayer?: PlayerStat | null;
  topDamagePlayer?: PlayerStat | null;
}

const Standings = ({ 
  teams, 
  isAdmin = false, 
  tournamentName = "Tournament",
  mvpPlayer,
  topDamagePlayer
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
    <div className="bg-[hsl(220_20%_12%)] rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Season 1</h3>
          <h2 className="text-4xl font-bold text-primary uppercase tracking-wider">Overall Standings</h2>
        </div>
        {isAdmin && (
          <Button onClick={downloadCSV} variant="outline" className="border-primary/50">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* MVP and Top Damage Player Cards */}
      {(mvpPlayer || topDamagePlayer) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {mvpPlayer && (
            <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 rounded-full p-2">
                  <Target className="h-5 w-5 text-black" />
                </div>
                <div>
                  <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">MVP - Highest Kills</p>
                  <p className="text-lg font-bold text-foreground">{mvpPlayer.player_name}</p>
                  <p className="text-sm text-amber-400">{mvpPlayer.total_kills} Total Kills</p>
                </div>
              </div>
            </div>
          )}
          {topDamagePlayer && (
            <div className="bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 rounded-full p-2">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-red-400 uppercase tracking-wider font-semibold">Top Damage</p>
                  <p className="text-lg font-bold text-foreground">{topDamagePlayer.player_name}</p>
                  <p className="text-sm text-red-400">{topDamagePlayer.total_damage.toLocaleString()} Total Damage</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-1">
          <thead>
            <tr className="bg-primary">
              <th className="text-left p-3 font-bold text-primary-foreground uppercase text-sm rounded-l-lg">Rank</th>
              <th className="text-left p-3 font-bold text-primary-foreground uppercase text-sm">Team Name</th>
              <th className="text-center p-3 font-bold text-primary-foreground uppercase text-sm">WWCD</th>
              <th className="text-center p-3 font-bold text-primary-foreground uppercase text-sm">MP</th>
              <th className="text-center p-3 font-bold text-primary-foreground uppercase text-sm">Place</th>
              <th className="text-center p-3 font-bold text-primary-foreground uppercase text-sm">Kills</th>
              <th className="text-center p-3 font-bold text-primary-foreground uppercase text-sm rounded-r-lg">Total</th>
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
                  <td className={`p-3 font-bold text-primary text-xl ${isTopTeam ? 'rounded-l-lg' : ''}`}>
                    {rank}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {team.logo_url && (
                        <img src={team.logo_url} alt={team.name} className="w-8 h-8 rounded object-cover" />
                      )}
                      <span className="font-bold text-foreground uppercase">{team.name}</span>
                    </div>
                  </td>
                  <td className="text-center p-3">
                    {team.firstPlaceWins > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <div className="bg-primary rounded-full p-1">
                          <Trophy className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <span className="text-primary font-bold">{team.firstPlaceWins}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="text-center p-3 text-primary font-bold">
                    {team.matchesPlayed}
                  </td>
                  <td className="text-center p-3 text-primary font-bold">
                    {team.placementPoints}
                  </td>
                  <td className="text-center p-3 text-primary font-bold">
                    {team.totalKills}
                  </td>
                  <td className={`text-center p-3 text-primary font-bold text-xl ${isTopTeam ? 'rounded-r-lg' : ''}`}>
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
