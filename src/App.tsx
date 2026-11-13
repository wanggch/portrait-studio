import { useEffect, useState } from "react";
import Portrait from "./Portrait";
import {
  categories,
  chipGroups,
  emptyDraft,
  examples,
  instruction,
  personaNote,
  type ChipKey,
  type Draft,
} from "./instruction";
import { loadDraft, saveDraft } from "./storage";

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "true");
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export default function App() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("");
  const text = instruction(draft);
  const ready = draft.theme.trim().length > 0;

  useEffect(() => {
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDraft(draft);
  }, [draft, hydrated]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 1600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function toggleChip(key: ChipKey, option: string) {
    setDraft((current) => ({
      ...current,
      chips: { ...current.chips, [key]: current.chips[key] === option ? undefined : option },
    }));
  }

  return (
    <div className="app">
      <header className="topbar">
        <p className="brand">人像工坊</p>
        <h1>告诉技能要写什么</h1>
      </header>
      <div className="shell">
        <Portrait />
        <form className="form" onSubmit={(event) => event.preventDefault()}>
          <div className="categories" role="tablist" aria-label="类别">
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={draft.category === item.id}
                className={draft.category === item.id ? "category is-on" : "category"}
                onClick={() => setDraft({ ...draft, category: item.id })}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="field">
            主题
            <input
              aria-label="主题"
              value={draft.theme}
              placeholder="例如：雨夜便利店门口"
              onChange={(event) => setDraft({ ...draft, theme: event.target.value })}
            />
          </label>
          <div className="chips" aria-label="示例">
            {examples.map((example) => (
              <button key={example} type="button" onClick={() => setDraft({ ...draft, theme: example })}>
                {example}
              </button>
            ))}
          </div>

          {chipGroups.map((group) => (
            <fieldset key={group.key}>
              <legend>{group.label}</legend>
              <div className="chips">
                {group.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={draft.chips[group.key] === option}
                    onClick={() => toggleChip(group.key, option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          <label className="field">
            想固定的（可空）
            <input
              aria-label="想固定的"
              value={draft.note}
              placeholder="例如：酒红丝绒吊带裙"
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            />
          </label>

          <div className="stepper">
            <span id="count-label">数量</span>
            <button
              type="button"
              aria-label="减少数量"
              disabled={draft.count <= 1}
              onClick={() => setDraft({ ...draft, count: draft.count - 1 })}
            >
              −
            </button>
            <strong aria-labelledby="count-label">{draft.count}</strong>
            <button
              type="button"
              aria-label="增加数量"
              disabled={draft.count >= 10}
              onClick={() => setDraft({ ...draft, count: draft.count + 1 })}
            >
              +
            </button>
          </div>

          <p className="defaults">{personaNote}</p>
          <h2>给技能的指令</h2>
          <pre aria-label="指令预览">{text}</pre>
          <div className="dock">
            <button
              type="button"
              className="primary"
              disabled={!ready}
              onClick={async () => {
                const ok = await writeClipboard(text);
                setNotice(ok ? "已复制" : "复制失败，请长按文字");
              }}
            >
              复制
            </button>
          </div>
        </form>
      </div>
      <p className="notice" role="status">
        {notice}
      </p>
    </div>
  );
}
