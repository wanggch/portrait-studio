import { emptyDraft, type Draft } from "./instruction";

const KEY = "portrait-studio-draft";

export function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...emptyDraft, chips: {} };
    const parsed = JSON.parse(raw) as Partial<Draft>;
    const count = Number(parsed.count);
    return {
      category:
        parsed.category === "lingerie" || parsed.category === "candid" || parsed.category === "beauty"
          ? parsed.category
          : "beauty",
      theme: typeof parsed.theme === "string" ? parsed.theme : "",
      chips: parsed.chips && typeof parsed.chips === "object" ? parsed.chips : {},
      note: typeof parsed.note === "string" ? parsed.note : "",
      count: Number.isInteger(count) && count >= 1 && count <= 10 ? count : 5,
    };
  } catch {
    return { ...emptyDraft, chips: {} };
  }
}

export function saveDraft(draft: Draft) {
  localStorage.setItem(KEY, JSON.stringify(draft));
}
