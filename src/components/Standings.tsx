import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Team } from "@/types/tournament";

interface StandingsProps {
  teams: Team[];
  isAdmin?: boolean;
  tournamentName?: string;
}

const Standings = ({ teams, isAdmin = false, tournamentName = "Tournament" }: StandingsProps) => {
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
    <div className="border-primary/30 bg-card/95 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Tournament Standings</h2>
        {isAdmin && (
          <Button onClick={downloadCSV} variant="outline" className="border-primary/50">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-primary/30">
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Team</th>
              <th className="text-right p-3">Points</th>
              <th className="text-right p-3">Kills</th>
              <th className="text-right p-3">Matches</th>
              <th className="text-right p-3">Wins</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, index) => (
              <tr key={team.id} className="border-b border-border hover:bg-primary/5">
                <td className="p-3 font-bold">{index + 1}</td>
                <td className="p-3">{team.name}</td>
                <td className="text-right p-3 font-bold text-primary">{team.totalPoints}</td>
                <td className="text-right p-3">{team.totalKills}</td>
                <td className="text-right p-3">{team.matchesPlayed}</td>
                <td className="text-right p-3">{team.firstPlaceWins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Standings;
