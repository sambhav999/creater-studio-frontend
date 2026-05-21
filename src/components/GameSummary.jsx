import { BadgeCheck, Gamepad2, Palette, Settings2 } from "lucide-react";

export function GameSummary({ gamePackage }) {
  return (
    <article className="summary-card">
      <div className="panel-title">
        <BadgeCheck size={18} />
        <h3>Game Kit</h3>
      </div>
      <div className="summary-list">
        <div>
          <Gamepad2 size={18} />
          <span>Mechanic</span>
          <strong>{gamePackage.gameplay?.mechanic}</strong>
        </div>
        <div>
          <Settings2 size={18} />
          <span>Controls</span>
          <strong>{gamePackage.gameplay?.controls}</strong>
        </div>
        <div>
          <Palette size={18} />
          <span>Assets</span>
          <strong>{gamePackage.visuals?.assets}</strong>
        </div>
      </div>
    </article>
  );
}
