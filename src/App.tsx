import { useEffect, useMemo, useState } from "react";
import { compose, composeSet, defaultSettings, type PromptSettings } from "./compose";
import { categories, themes, type Category, type Theme } from "./library";
import { loadCopies, loadSettings, rememberCopy, saveSettings, type CopyRecord } from "./storage";

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
  const [category, setCategory] = useState<Category>("美女写真");
  const [query, setQuery] = useState("");
  const [themeId, setThemeId] = useState<string | null>(null);
  const [settings, setSettings] = useState<PromptSettings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copies, setCopies] = useState<CopyRecord[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setSettings(loadSettings());
    setCopies(loadCopies());
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim();
    return themes.filter((theme) => {
      if (theme.category !== category) return false;
      if (!needle) return true;
      return theme.title.includes(needle) || theme.variations.some((item) => item.title.includes(needle));
    });
  }, [category, query]);

  const theme = themes.find((item) => item.id === themeId) ?? null;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 1600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function copyText(title: string, text: string) {
    const ok = await writeClipboard(text);
    if (ok) {
      setCopies(rememberCopy(title, text));
      setNotice("已复制");
    } else {
      setNotice("复制失败，请长按文字");
    }
  }

  return (
    <div className={theme ? "app has-theme" : "app"}>
      <header className="topbar">
        <div className="top-row">
          <p className="brand">人像工坊</p>
          <button type="button" className="text-button" onClick={() => setSettingsOpen(true)}>
            设置
          </button>
        </div>
        <h1>{theme ? theme.title : "选一个主题，直接复制"}</h1>
      </header>

      <div className="shell">
        <section className="browser" aria-label="主题">
          <div className="categories" role="tablist" aria-label="类别">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={category === item}
                className={category === item ? "category is-on" : "category"}
                onClick={() => {
                  setCategory(item);
                  setThemeId(null);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="search">
            <span>搜索主题</span>
            <input
              value={query}
              placeholder="例如 天台、试衣间、电梯"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <p className="hint">人物和 9:16 竖幅已经写进每条提示词，不用每次再选。</p>
          <ul className="theme-list">
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === themeId ? "theme is-on" : "theme"}
                  onClick={() => setThemeId(item.id)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.variations.length} 条变体</span>
                </button>
              </li>
            ))}
          </ul>
          {visible.length === 0 && <p className="empty">这个类别里没有匹配的主题。</p>}
          {copies.length > 0 && (
            <div className="recent">
              <h2>最近复制</h2>
              <ul>
                {copies.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => copyText(item.title, item.text)}>
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="reader" aria-label="提示词">
          {theme ? (
            <Reader
              theme={theme}
              settings={settings}
              onBack={() => setThemeId(null)}
              onCopy={copyText}
            />
          ) : (
            <div className="placeholder">
              <p>从左边选一个主题。</p>
              <p>每个主题会给出一组可以直接粘贴的变体，写法跟你现有的提示词文件一样。</p>
            </div>
          )}
        </section>
      </div>

      {settingsOpen && (
        <Settings
          value={settings}
          onClose={() => setSettingsOpen(false)}
          onChange={(next) => {
            setSettings(next);
            saveSettings(next);
          }}
        />
      )}
      <p className="notice" role="status">
        {notice}
      </p>
    </div>
  );
}

function Reader({
  theme,
  settings,
  onBack,
  onCopy,
}: {
  theme: Theme;
  settings: PromptSettings;
  onBack: () => void;
  onCopy: (title: string, text: string) => void;
}) {
  return (
    <>
      <div className="reader-head">
        <button type="button" className="text-button back" onClick={onBack}>
          返回主题
        </button>
        <button type="button" className="primary" onClick={() => onCopy(`${theme.title} · 整组`, composeSet(theme, settings))}>
          复制整组
        </button>
      </div>
      <p className="hint">
        {theme.category} · {theme.variations.length} 条。复制整组会带上标题和编号。
      </p>
      <ol className="variations">
        {theme.variations.map((variation, index) => {
          const text = compose(variation, settings);
          return (
            <li key={variation.title}>
              <div className="variation-head">
                <h2>
                  <span>{index + 1}</span>
                  {variation.title}
                </h2>
                <button type="button" onClick={() => onCopy(`${theme.title} · ${variation.title}`, text)}>
                  复制这条
                </button>
              </div>
              <pre>{text}</pre>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function Settings({
  value,
  onChange,
  onClose,
}: {
  value: PromptSettings;
  onChange: (next: PromptSettings) => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="设置">
      <div className="sheet-card">
        <div className="reader-head">
          <h2>默认值</h2>
          <button type="button" className="text-button" onClick={onClose}>
            完成
          </button>
        </div>
        <p className="hint">平时不用打开这里。只有想换人物或画幅时才改，改完所有主题都会跟着变。</p>
        <label>
          人物
          <textarea
            aria-label="人物"
            rows={5}
            value={value.persona}
            onChange={(event) => onChange({ ...value, persona: event.target.value })}
          />
        </label>
        <label>
          画幅
          <input
            aria-label="画幅"
            value={value.aspect}
            onChange={(event) => onChange({ ...value, aspect: event.target.value })}
          />
        </label>
        <button type="button" className="text-button" onClick={() => onChange(defaultSettings)}>
          恢复默认
        </button>
      </div>
    </div>
  );
}
