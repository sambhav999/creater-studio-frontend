import { Play, SlidersHorizontal } from "lucide-react";

export function StudioControls({ studio }) {
  return (
    <article className="control-card">
      <div className="panel-title">
        <SlidersHorizontal size={18} />
        <h3>Customize</h3>
      </div>

      <label className="field">
        <span>Creator Prompt</span>
        <textarea
          value={studio.prompt}
          onChange={event => studio.setPrompt(event.target.value)}
          onBlur={studio.createFromTemplate}
        />
      </label>

      <div className="control-grid">
        <label className="field">
          <span>Theme</span>
          <select value={studio.theme} onChange={event => studio.setTheme(event.target.value)}>
            {Object.entries(studio.themePresets).map(([key, preset]) => (
              <option key={key} value={key}>{preset.label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Difficulty</span>
          <select value={studio.difficulty} onChange={event => studio.setDifficulty(event.target.value)}>
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
            <option value="insane">Insane</option>
          </select>
        </label>

        <label className="field">
          <span>Customization</span>
          <select value={studio.customization} onChange={event => studio.setCustomization(event.target.value)}>
            <option value="light">Light</option>
            <option value="medium">Medium</option>
            <option value="heavy">Heavy</option>
          </select>
        </label>

        <label className="field">
          <span>Extra</span>
          <select value={studio.extra} onChange={event => studio.setExtra(event.target.value)}>
            <option value="none">None</option>
            <option value="powerups">Powerups</option>
            <option value="leaderboard">Leaderboard</option>
            <option value="boss">Boss Mode</option>
          </select>
        </label>
      </div>

      <button type="button" className="create-button" onClick={studio.createFromTemplate}>
        <Play size={16} /> Create From Template
      </button>
    </article>
  );
}
