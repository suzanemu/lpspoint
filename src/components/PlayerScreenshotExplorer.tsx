interface PlayerScreenshotExplorerProps {
  screenshots: any[];
}

const PlayerScreenshotExplorer = ({ screenshots }: PlayerScreenshotExplorerProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {screenshots.map((screenshot) => (
        <div key={screenshot.id} className="border border-primary/30 rounded-lg p-2">
          <img src={screenshot.screenshot_url} alt="Match" className="w-full h-32 object-cover rounded" />
          <p className="text-xs mt-2">{(screenshot.teams as any)?.name}</p>
        </div>
      ))}
    </div>
  );
};

export default PlayerScreenshotExplorer;
