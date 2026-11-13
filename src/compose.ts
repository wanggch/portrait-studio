import type { Theme, Variation } from "./library";

export const defaultPersona =
  "绝美23岁东亚成年女性，身材匀称丰满，上围明显自然丰满圆润、富有真实体量感，配合纤细腰部，胸腰差明显，但不夸张、不假体感。";

export const defaultAspect = "9:16竖幅";

export interface PromptSettings {
  persona: string;
  aspect: string;
}

export const defaultSettings: PromptSettings = {
  persona: defaultPersona,
  aspect: defaultAspect,
};

export function compose(variation: Variation, settings: PromptSettings = defaultSettings): string {
  const persona = settings.persona.trim() || defaultPersona;
  const aspect = settings.aspect.trim() || defaultAspect;
  const face = variation.face.trim();
  const body = variation.body.replaceAll("{{aspect}}", aspect).trim();
  const opening = face ? `${persona}${face}` : persona;
  return `${opening}\n\n${body}`.replace(/\n{3,}/g, "\n\n").trim();
}

export function composeSet(theme: Theme, settings: PromptSettings = defaultSettings): string {
  const blocks = theme.variations.map((variation, index) => {
    return `## ${index + 1}. ${variation.title}\n\n\`\`\`text\n${compose(variation, settings)}\n\`\`\``;
  });
  return `# ${theme.title}\n\n${blocks.join("\n\n")}\n`;
}
