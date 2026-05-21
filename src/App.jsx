import {
  Bot,
  Braces,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  FileCode2,
  Gamepad2,
  Home,
  Rocket,
  Sparkles,
  Wand2
} from "lucide-react";
import { useEffect } from "react";
import { CreatorDashboard } from "./components/CreatorDashboard.jsx";
import { GameSummary } from "./components/GameSummary.jsx";
import { OutputPackage } from "./components/OutputPackage.jsx";
import { StudioControls } from "./components/StudioControls.jsx";
import { TemplateGallery } from "./components/TemplateGallery.jsx";
import { ThreePreview } from "./components/ThreePreview.jsx";
import { useCreatorStudio } from "./hooks/useCreatorStudio.js";
import { api } from "./lib/api.js";

export default function App() {
  const studio = useCreatorStudio();
  const {
    createFromTemplate,
    customization,
    difficulty,
    extra,
    selectedId,
    theme
  } = studio;

  useEffect(() => {
    createFromTemplate();
  }, [createFromTemplate, customization, difficulty, extra, selectedId, theme]);

  async function copyPackage() {
    await navigator.clipboard.writeText(JSON.stringify(studio.generatedPackage, null, 2));
  }

  async function downloadTemplatePack() {
    const bundle = await studio.getTemplateExport();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kult-template-pack.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadPackage() {
    const blob = new Blob([JSON.stringify(studio.generatedPackage, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${studio.generatedPackage.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadGameCode() {
    const response = await api.post(
      "/games/export-code",
      { gamePackage: studio.generatedPackage },
      { responseType: "blob", timeout: 30000 }
    );
    const disposition = response.headers["content-disposition"];
    const match = disposition?.match(/filename="([^"]+)"/);
    const fallback = `${studio.generatedPackage.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-source.zip`;
    const blob = new Blob([response.data], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = match?.[1] ?? fallback;
    link.click();
    URL.revokeObjectURL(url);
  }

  function goHome() {
    window.location.assign("/");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">K</div>
          <div>
            <h1>KULT Creator Studio</h1>
            <p>Template-first creation. AI only when it helps.</p>
          </div>
        </div>

        <button type="button" className="home-button" onClick={goHome}>
          <Home size={20} /> Home
        </button>

        <div className="tier-grid">
          <article className="tier-card primary">
            <Gamepad2 size={20} />
            <span>Tier 1</span>
            <strong>Templates</strong>
            <small>{studio.templates.length} presets, 20-30 seconds, zero API cost.</small>
          </article>
          <article className="tier-card">
            <Bot size={20} />
            <span>Tier 2</span>
            <strong>LLM Refinement</strong>
            <small>Optional 2-3 minute advanced pass.</small>
          </article>
        </div>

        <TemplateGallery
          templates={studio.templates}
          selectedId={studio.selectedId}
          onSelect={studio.setSelectedId}
          onDownloadAll={downloadTemplatePack}
        />
      </aside>

      <section className="studio">
        <header className="topbar">
          <div>
            <span className="eyebrow">Live Build</span>
            <h2>{studio.generatedPackage.title}</h2>
          </div>
          <div className="topbar-actions">
            <button type="button" className="ghost-button" onClick={copyPackage}>
              <Copy size={16} /> Copy
            </button>
            <button type="button" className="ghost-button" onClick={downloadPackage}>
              <Download size={16} /> Save
            </button>
            <button type="button" className="ghost-button" onClick={downloadGameCode}>
              <FileCode2 size={16} /> Code
            </button>
            <button type="button" className="publish-button">
              <Rocket size={16} /> Publish
            </button>
          </div>
        </header>

        <section className="hero-grid">
          <div className="preview-panel">
            <ThreePreview gamePackage={studio.generatedPackage} />
            <div className="preview-hud">
              <span><Clock3 size={14} /> {studio.generatedPackage.createdIn}</span>
              <span><CheckCircle2 size={14} /> {studio.generatedPackage.reliability}</span>
              <span><Braces size={14} /> {studio.packageMode}</span>
            </div>
          </div>

          <StudioControls studio={studio} />
        </section>

        <section className="content-grid">
          <GameSummary gamePackage={studio.generatedPackage} />
          <article className="refine-panel">
            <div className="panel-title">
              <Wand2 size={18} />
              <h3>Optional AI Refinement</h3>
            </div>
            <p>
              Tier 1 is already playable. Use refinement when a creator asks for a heavier mechanic,
              a specific theme twist, or generated Phaser code.
            </p>
            <button type="button" className="ai-button" onClick={studio.refineWithAi}>
              <Sparkles size={16} /> Refine With AI
            </button>
            <ol className="flow-list">
              <li className="done">Select template</li>
              <li className="done">Customize values</li>
              <li className="done">Create deterministic package</li>
              <li className={studio.generatedPackage.refinement ? "done" : ""}>Prepare LLM prompt bundle</li>
            </ol>
          </article>
          <CreatorDashboard />
        </section>

        <OutputPackage packageMode={studio.packageMode} status={studio.status} gamePackage={studio.generatedPackage} />
      </section>
    </main>
  );
}
