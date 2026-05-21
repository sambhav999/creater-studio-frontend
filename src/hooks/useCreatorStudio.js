import { useCallback, useMemo, useState } from "react";
import { gameTemplates, themePresets } from "../data/templates";
import { api } from "../lib/api";

const defaultPrompt = "cyberpunk doge samurai fighting AI robots in a neon arena";

function localPackage(template, options) {
  const theme = themePresets[options.theme] ?? themePresets.neon;
  const tuning = template.difficulty[options.difficulty] ?? template.difficulty.normal;
  const slug = `${template.id}-${options.theme}-${Date.now().toString(36)}`;

  return {
    id: slug,
    tier: "template",
    title: `${theme.label} ${template.name}`,
    templateId: template.id,
    templateName: template.name,
    category: template.category,
    createdIn: template.time,
    apiCost: 0,
    reliability: template.reliability,
    customization: {
      prompt: options.prompt,
      theme: theme.label,
      level: options.customization,
      difficulty: options.difficulty,
      extra: options.extra
    },
    gameplay: {
      mechanic: template.mechanic,
      controls: template.controls,
      tuning
    },
    visuals: {
      mood: theme.mood,
      colors: theme.colors,
      assets: template.assets
    },
    build: {
      renderer: "Playable Canvas runtime",
      runtimeTarget: "Browser",
      externalAssets: false,
      publishReady: true
    },
    checklist: [
      "Deterministic template selected",
      "Difficulty tuning applied",
      "Theme colors injected",
      "Canvas-safe asset plan generated",
      "Optional AI refinement available"
    ]
  };
}

function localTemplateExport() {
  return {
    name: "kult-template-pack",
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    strategy: {
      tier1: "Templates are primary: instant, deterministic, zero API cost.",
      tier2: "LLM refinement is optional and prompt-driven."
    },
    themes: themePresets,
    templates: gameTemplates.map(template => ({
      ...template,
      assets: [
        {
          id: `${template.id}-procedural-assets`,
          type: "procedural",
          format: "canvas",
          description: template.assets
        }
      ],
      aiRefinement: {
        system: "You are an expert Phaser 3 game developer. Output only executable JavaScript. Use Canvas-drawn assets. No markdown.",
        userTemplate: `Game: ${template.name}\nMechanic: ${template.mechanic}\nControls: ${template.controls}`
      }
    })),
    usage: {
      exportNote: "Assets are procedural Canvas manifests. The game runtime draws them instead of shipping image files."
    }
  };
}

export function useCreatorStudio() {
  const [selectedId, setSelectedId] = useState("flappy");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [theme, setTheme] = useState("neon");
  const [difficulty, setDifficulty] = useState("normal");
  const [customization, setCustomization] = useState("light");
  const [extra, setExtra] = useState("none");
  const [status, setStatus] = useState("Ready");
  const [packageMode, setPackageMode] = useState("Tier 1");
  const [generatedPackage, setGeneratedPackage] = useState(() =>
    localPackage(gameTemplates[0], { prompt: defaultPrompt, theme: "neon", difficulty: "normal", customization: "light", extra: "none" })
  );

  const selectedTemplate = useMemo(
    () => gameTemplates.find(template => template.id === selectedId) ?? gameTemplates[0],
    [selectedId]
  );

  const options = useMemo(
    () => ({ prompt, theme, difficulty, customization, extra }),
    [prompt, theme, difficulty, customization, extra]
  );

  const createFromTemplate = useCallback(async () => {
    setStatus("Creating");
    setPackageMode("Tier 1");
    try {
      const response = await api.post("/games/create", {
        templateId: selectedTemplate.id,
        ...options
      });
      setGeneratedPackage(response.data.game);
      setStatus("Generated");
    } catch {
      setGeneratedPackage(localPackage(selectedTemplate, options));
      setStatus("Generated locally");
    }
  }, [options, selectedTemplate]);

  const refineWithAi = useCallback(async () => {
    setStatus("Preparing AI");
    setPackageMode("Tier 2");
    try {
      const response = await api.post("/games/refine", {
        gamePackage: generatedPackage,
        request: prompt,
        refinementLevel: customization
      });
      setGeneratedPackage(prev => ({
        ...prev,
        tier: "ai-refinement",
        refinement: response.data.refinement
      }));
      setStatus("AI prompt ready");
    } catch {
      setGeneratedPackage(prev => ({
        ...prev,
        tier: "ai-refinement",
        refinement: {
          eta: "2-3 minutes",
          promptBundle: {
            system: "You are an expert Phaser 3 game developer. Output only executable JavaScript.",
            user: `Refine ${prev.title}. User request: ${prompt}`
          },
          validation: ["Syntax check", "Input responsive", "60 FPS target", "No external images"]
        }
      }));
      setStatus("AI prompt ready");
    }
  }, [customization, generatedPackage, prompt]);

  const getTemplateExport = useCallback(async () => {
    try {
      const response = await api.get("/templates/export");
      return response.data;
    } catch {
      return localTemplateExport();
    }
  }, []);

  return {
    templates: gameTemplates,
    themePresets,
    selectedTemplate,
    selectedId,
    setSelectedId,
    prompt,
    setPrompt,
    theme,
    setTheme,
    difficulty,
    setDifficulty,
    customization,
    setCustomization,
    extra,
    setExtra,
    status,
    packageMode,
    generatedPackage,
    createFromTemplate,
    refineWithAi,
    getTemplateExport
  };
}
