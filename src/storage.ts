import { defaultAspect, defaultPersona, defaultSettings, type PromptSettings } from "./compose";

const SETTINGS_KEY = "portrait-studio-settings";
const COPIES_KEY = "portrait-studio-copies";

export interface CopyRecord {
  id: string;
  title: string;
  text: string;
  at: number;
}

export function loadSettings(): PromptSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw) as Partial<PromptSettings>;
    return {
      persona: typeof parsed.persona === "string" && parsed.persona.trim() ? parsed.persona : defaultPersona,
      aspect: typeof parsed.aspect === "string" && parsed.aspect.trim() ? parsed.aspect : defaultAspect,
    };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: PromptSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadCopies(): CopyRecord[] {
  try {
    const raw = localStorage.getItem(COPIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CopyRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.text === "string").slice(0, 12);
  } catch {
    return [];
  }
}

export function rememberCopy(title: string, text: string): CopyRecord[] {
  const next: CopyRecord[] = [
    { id: `${Date.now()}`, title, text, at: Date.now() },
    ...loadCopies().filter((item) => item.text !== text),
  ].slice(0, 12);
  localStorage.setItem(COPIES_KEY, JSON.stringify(next));
  return next;
}
