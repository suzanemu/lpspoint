import { Team } from "@/types/tournament";
import { Trophy, Target, Medal, Users, Swords } from "lucide-react";

interface PlayerStat {
  player_name: string;
  total_kills: number;
  total_damage: number;
}

interface TeamPreviewCardProps {
  team: Team | undefined;
  teamMvp: PlayerStat | null;
  logoUrl?: string;
}

const TeamPreviewCard = ({ team, teamMvp, logoUrl }: TeamPreviewCardProps) => {
  if (!team) return null;

  return (
    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-4 border border-primary/30 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header with Logo and Name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={team.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-primary/50 shadow-lg"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/20 flex items-center justify-center border-2 border-primary/30">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
          )}
          {team.firstPlaceWins > 0 && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1 shadow-lg">
              <Trophy className="w-3 h-3 text-yellow-900" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-base sm:text-lg truncate text-foreground">
            {team.name}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {team.matchesPlayed} matches played
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <div className="bg-background/60 rounded-lg p-2 sm:p-3 text-center border border-border/50">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-foreground">{team.totalPoints}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Total Pts</p>
        </div>
        <div className="bg-background/60 rounded-lg p-2 sm:p-3 text-center border border-border/50">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-foreground">{team.totalKills}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Kills</p>
        </div>
        <div className="bg-background/60 rounded-lg p-2 sm:p-3 text-center border border-border/50">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Medal className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-foreground">{team.placementPoints}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Place Pts</p>
        </div>
        <div className="bg-background/60 rounded-lg p-2 sm:p-3 text-center border border-border/50">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Swords className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-foreground">{team.firstPlaceWins}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">#1 Wins</p>
        </div>
      </div>

      {/* Team MVP */}
      {teamMvp && teamMvp.total_kills > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-3 border border-yellow-500/30">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-500/20 rounded-full p-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400 font-medium uppercase tracking-wide">
                Team MVP
              </p>
              <p className="font-bold text-sm sm:text-base truncate text-foreground">
                {teamMvp.player_name}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg sm:text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {teamMvp.total_kills}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">kills</p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Message */}
      <div className="mt-3 text-center">
        <p className="text-xs sm:text-sm text-muted-foreground">
          ✓ You have selected <span className="font-semibold text-primary">{team.name}</span>
        </p>
      </div>
    </div>
  );
};

export default TeamPreviewCard;
