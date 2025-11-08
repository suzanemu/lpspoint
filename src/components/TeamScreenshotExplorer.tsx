import { Card } from "@/components/ui/card";

interface TeamScreenshotExplorerProps {
  selectedTournament: string;
}

const TeamScreenshotExplorer = ({ selectedTournament }: TeamScreenshotExplorerProps) => {
  return (
    <Card className="p-6 border-primary/30 bg-card/95">
      <h2 className="text-xl font-bold">Screenshot Explorer</h2>
      <p className="text-muted-foreground mt-2">View all uploaded screenshots here</p>
    </Card>
  );
};

export default TeamScreenshotExplorer;
