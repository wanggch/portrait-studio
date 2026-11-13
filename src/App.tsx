import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  LockKeyhole,
  Plus,
  Redo2,
  Search,
  Star,
  Trash2,
  Undo2,
  UnlockKeyhole,
  X,
} from "lucide-react";
import {
  displayValue,
  fieldMap,
  paletteNames,
  sections,
  type Field,
} from "./catalog";
import {
  blankScheme,
  brief,
  clone,
  conflicts,
  databaseSchema,
  differences,
  fieldLabel,
  inputErrors,
  makeHistory,
  mergeFields,
  schemeSchema,
  sectionLabel,
  selection,
  trimHistory,
  uid,
  updateField,
  valueOf,
  type Database,
  type HistoryEntry,
  type Scheme,
} from "./domain";
import Portrait from "./Portrait";
import { looks, simpleGroups, unsplashLicense, type Look } from "./references";
import { download, loadDatabase, persistDatabase } from "./storage";

type Screen = "studio" | "history" | "schemes" | "settings";
type ThemeName = "light" | "dark";
type Snap = { scheme: Scheme; referenceId: string | null };
type Pending = { title: string; scheme: Scheme; referenceId?: string };

const fmtTime = (s: string) =>
  new Date(s).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "发生未知错误";
const sameContent = (a: Scheme, b: Scheme) =>
  JSON.stringify([a.fields, a.camera, a.name]) ===
  JSON.stringify([b.fields, b.camera, b.name]);
const kindLabel = (kind: HistoryEntry["kind"]) =>
  kind === "copy" ? "复制记录" : kind === "manual" ? "手动版本" : "恢复检查点";

function initialTheme(): ThemeName {
  try {
    const saved = localStorage.getItem("portrait-studio-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* private mode */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function fieldOf(sectionId: string, key: string): Field {
  const field = fieldMap.get(`${sectionId}.${key}`);
  if (!field) throw new Error(key);
  return field;
}

function valuesOf(scheme: Scheme, id: string): string[] {
  const value = scheme.fields[id]?.value;
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function inferLook(scheme: Scheme): string | null {
  const found = looks.find((look) =>
    Object.entries(look.values).every(([key, value]) => valueOf(scheme, key) === value),
  );
  return found?.id ?? null;
}

function lookValues(look: Look): Scheme["fields"] {
  return Object.fromEntries(
    Object.entries(look.values).map(([key, value]) => [key, selection(value, "template")]),
  );
}

export default function App() {
  const [db, setDb] = useState<Database | null>(null);
  const [loadError, setLoadError] = useState("");
  const [screen, setScreen] = useState<Screen>("studio");
  const [format, setFormat] = useState<"brief" | "json">("brief");
  const [toast, setToast] = useState("");
  const [saveStatus, setSaveStatus] = useState("正在读取");
  const [storageError, setStorageError] = useState("");
  const [undo, setUndo] = useState<Snap[]>([]);
  const [redo, setRedo] = useState<Snap[]>([]);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [historyType, setHistoryType] = useState("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [historyItem, setHistoryItem] = useState<string | null>(null);
  const [compareScheme, setCompareScheme] = useState<string | null>(null);
  const [fallbackText, setFallbackText] = useState("");
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const fileInput = useRef<HTMLInputElement>(null);
  const dbRef = useRef(db);
  dbRef.current = db;
  const referenceRef = useRef(referenceId);
  referenceRef.current = referenceId;
  const persistQueue = useRef(Promise.resolve());
  const initialized = useRef(false);
  const checkpoint = useRef("");
  const fallbackRecord = useRef<{ snapshot: Scheme; format: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  }, []);

  const load = useCallback(() => {
    setLoadError("");
    loadDatabase()
      .then((data) => {
        checkpoint.current = JSON.stringify(data.current);
        setReferenceId(inferLook(data.current));
        setDb(data);
        initialized.current = true;
        setSaveStatus("已恢复本地草稿");
      })
      .catch((e) =>
        setLoadError(
          `无法读取本地数据：${errorText(e)}。为保护现有记录，未覆盖存储。`,
        ),
      );
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("portrait-studio-theme", theme);
    } catch {
      /* ignore */
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#131210" : "#f3eee6");
  }, [theme]);
  useEffect(() => {
    if (!db || !initialized.current) return;
    setSaveStatus("保存中…");
    persistQueue.current = persistQueue.current
      .catch(() => {})
      .then(async () => {
        await persistDatabase(db);
        if (dbRef.current === db) {
          setSaveStatus("已保存到本地");
          setStorageError("");
        }
      })
      .catch((e) => {
        setSaveStatus("保存失败");
        setStorageError(errorText(e));
      });
  }, [db]);
  useEffect(() => {
    if (!db) return;
    const snap = db.current;
    if (JSON.stringify(snap) === checkpoint.current) return;
    const timer = setTimeout(() => {
      checkpoint.current = JSON.stringify(snap);
      setDb((previous) =>
        previous
          ? {
              ...previous,
              history: trimHistory(
                [makeHistory(snap, "auto"), ...previous.history],
                previous.settings.checkpointLimit,
              ),
            }
          : previous,
      );
    }, db.settings.checkpointSeconds * 1000);
    return () => clearTimeout(timer);
  }, [db?.current, db?.settings.checkpointSeconds]);

  const commit = useCallback((next: Scheme, reference?: string | null) => {
    const previous = dbRef.current?.current;
    if (!previous) return;
    const nextReference = reference === undefined ? referenceRef.current : reference;
    if (sameContent(previous, next) && nextReference === referenceRef.current) return;
    setUndo((stack) => [
      ...stack.slice(-79),
      { scheme: clone(previous), referenceId: referenceRef.current },
    ]);
    setRedo([]);
    if (reference !== undefined) setReferenceId(reference);
    if (!sameContent(previous, next)) {
      setDb((d) =>
        d
          ? { ...d, current: { ...next, updatedAt: new Date().toISOString() } }
          : d,
      );
    }
  }, []);
  const undoAction = useCallback(() => {
    const previous = undo.at(-1);
    if (!previous || !dbRef.current) return;
    setRedo((stack) => [
      ...stack,
      { scheme: clone(dbRef.current!.current), referenceId: referenceRef.current },
    ]);
    setReferenceId(previous.referenceId);
    setDb((d) => (d ? { ...d, current: previous.scheme } : d));
    setUndo((stack) => stack.slice(0, -1));
  }, [undo]);
  const redoAction = useCallback(() => {
    const next = redo.at(-1);
    if (!next || !dbRef.current) return;
    setUndo((stack) => [
      ...stack,
      { scheme: clone(dbRef.current!.current), referenceId: referenceRef.current },
    ]);
    setReferenceId(next.referenceId);
    setDb((d) => (d ? { ...d, current: next.scheme } : d));
    setRedo((stack) => stack.slice(0, -1));
  }, [redo]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (e.key === "Escape" && fallbackOpen) setFallbackOpen(false);
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "z" &&
        !typing &&
        screen === "studio" &&
        !fallbackOpen
      ) {
        e.preventDefault();
        e.shiftKey ? redoAction() : undoAction();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undoAction, redoAction, screen, fallbackOpen]);

  const scheme = db?.current;
  const issues = useMemo(() => (scheme ? conflicts(scheme) : []), [scheme]);
  const copiedText = useMemo(
    () => (scheme ? brief(scheme, format) : ""),
    [scheme, format],
  );
  const entries = scheme ? Object.entries(scheme.fields) : [];

  const changeField = (id: string, value: string | string[] | null) => {
    if (!scheme) return;
    const descendants =
      sections
        .find((sec) => sec.id === id.split(".")[0])
        ?.fields.filter(
          (field) =>
            field.parent === id.split(".")[1] &&
            scheme.fields[`${id.split(".")[0]}.${field.key}`] &&
            !field.when?.includes(String(value)),
        ) || [];
    if (
      descendants.length &&
      !window.confirm(
        `此操作会清除不适用的子项：${descendants.map((field) => field.label).join("、")}。继续吗？`,
      )
    )
      return;
    try {
      const next = updateField(scheme, id, value);
      const errors = inputErrors(next.fields);
      if (errors.length) {
        notify(errors[0]);
        return;
      }
      commit(next);
    } catch (e) {
      notify(errorText(e));
    }
  };
  const lockField = (id: string) => {
    if (!scheme?.fields[id]) return;
    const next = clone(scheme);
    next.fields[id].locked = !next.fields[id].locked;
    commit(next);
  };
  const recordHistory = (
    snapshot: Scheme,
    kind: HistoryEntry["kind"],
    text?: string,
    copyFormat?: string,
  ) => {
    setDb((d) =>
      d
        ? {
            ...d,
            history: [makeHistory(snapshot, kind, text, copyFormat), ...d.history],
          }
        : d,
    );
  };
  const copyText = async (
    text: string,
    snapshot: Scheme,
    copyFormat: string,
    shouldRecord = true,
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      if (shouldRecord) recordHistory(snapshot, "copy", text, copyFormat);
      notify(shouldRecord ? "已复制，并记入本地历史" : "已复制历史原文");
    } catch {
      fallbackRecord.current = shouldRecord
        ? { snapshot: clone(snapshot), format: copyFormat }
        : null;
      setFallbackText(text);
      setFallbackOpen(true);
    }
  };
  const copyCurrent = () => {
    if (!scheme || !entries.length) return;
    if (issues.some((issue) => issue.level === "error")) {
      notify("请先处理标出的输入错误");
      return;
    }
    if (
      issues.some((issue) => issue.level === "warning") &&
      !window.confirm("当前方案有创作冲突，仍要复制已选文字吗？")
    )
      return;
    void copyText(copiedText, clone(scheme), format);
  };
  const saveScheme = () => {
    if (!scheme) return;
    if (!schemeSchema.safeParse(scheme).success) {
      notify("请先处理输入错误，再保存正式版本");
      return;
    }
    setDb((d) =>
      d
        ? {
            ...d,
            schemes: [clone(scheme), ...d.schemes.filter((item) => item.id !== scheme.id)],
            history: [makeHistory(scheme, "manual"), ...d.history],
          }
        : d,
    );
    notify("方案已保存");
  };
  const openScheme = (next: Scheme, asCopy = false) => {
    const copy = clone(next);
    if (asCopy) {
      copy.id = uid();
      copy.name = `${copy.name.slice(0, 88)} · 副本`;
    }
    setDb((d) =>
      d
        ? {
            ...d,
            current: copy,
            history: trimHistory(
              [makeHistory(d.current, "auto"), ...d.history],
              d.settings.checkpointLimit,
            ),
          }
        : d,
    );
    checkpoint.current = JSON.stringify(copy);
    setReferenceId(inferLook(copy));
    setUndo([]);
    setRedo([]);
    setPending(null);
    setScreen("studio");
    notify(asCopy ? "已从记录新建副本，原来的方案还在" : "已打开方案");
  };
  const proposeLook = (look: Look) => {
    if (!scheme) return;
    try {
      const next = mergeFields(scheme, lookValues(look));
      const diff = differences(scheme, next);
      if (!diff.length) {
        setReferenceId(look.id);
        setPending(null);
        return;
      }
      if (!Object.keys(scheme.fields).length) {
        commit(next, look.id);
        setPending(null);
        return;
      }
      setPending({ title: look.name, scheme: next, referenceId: look.id });
    } catch (e) {
      notify(errorText(e));
    }
  };
  const importFile = async (file?: File) => {
    if (!file || !db) return;
    if (file.size > 30 * 1024 * 1024) {
      notify("文件超过 30 MB，请拆分后再导入");
      return;
    }
    try {
      const data: unknown = JSON.parse(await file.text());
      const parsedDb = databaseSchema.safeParse(data);
      if (parsedDb.success) {
        if (
          !window.confirm(
            "此操作将替换本地工作区与历史。请先导出当前备份，确认继续？",
          )
        )
          return;
        await persistQueue.current;
        await persistDatabase(parsedDb.data);
        checkpoint.current = JSON.stringify(parsedDb.data.current);
        setReferenceId(inferLook(parsedDb.data.current));
        setDb(parsedDb.data);
        setUndo([]);
        setRedo([]);
        setPending(null);
        setScreen("studio");
        notify("本地备份已恢复");
      } else {
        openScheme(schemeSchema.parse(data), true);
      }
    } catch (e) {
      notify(`导入失败，当前数据未改动：${errorText(e).slice(0, 160)}`);
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  if (!db || !scheme)
    return (
      <main className="loading">
        <p className="brand-mark">人像工坊</p>
        <h1>{loadError ? "没有读到本地数据" : "正在打开"}</h1>
        <p>{loadError || "方案都留在这台设备上。"}</p>
        {loadError && <button onClick={load}>重试读取</button>}
      </main>
    );

  const historyList = db.history.filter(
    (item) =>
      (historyType === "all" || item.kind === historyType) &&
      (!favoriteOnly || item.favorite) &&
      `${item.name} ${brief(item.snapshot)}`
        .toLowerCase()
        .includes(historySearch.toLowerCase()),
  );
  const selectedHistory = db.history.find((item) => item.id === historyItem);
  const compareTarget = db.schemes.find((item) => item.id === compareScheme);
  const pendingDiff = pending ? differences(scheme, pending.scheme) : [];
  const simpleIds = new Set(
    simpleGroups.flatMap((group) => group.keys.map((key) => `${group.id}.${key}`)),
  );
  simpleIds.add("story.theme");
  simpleIds.add("story.notes");
  const extraEntries = entries.filter(([key]) => !simpleIds.has(key));
  const peek = entries.length
    ? format === "json"
      ? `JSON · ${entries.length} 项`
      : copiedText.replace(/\s+/g, " ").slice(0, 80)
    : "选一个方向，或点下面的选项";

  const updateHistory = (id: string, change: Partial<HistoryEntry>) =>
    setDb((d) =>
      d
        ? {
            ...d,
            history: d.history.map((item) =>
              item.id === id ? { ...item, ...change } : item,
            ),
          }
        : d,
    );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-row">
          <p className="brand-mark">人像工坊</p>
          <div className="scheme-name">
            <input
              aria-label="方案名称"
              value={scheme.name}
              maxLength={100}
              onChange={(e) =>
                commit({ ...scheme, name: e.target.value || "未命名创作" })
              }
            />
          </div>
          <button
            className="text-btn"
            aria-label={theme === "dark" ? "切换为浅色" : "切换为深色"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "浅色" : "深色"}
          </button>
        </div>
        <div className="top-actions">
          <button aria-label="撤销" disabled={!undo.length} onClick={undoAction}>
            <Undo2 size={16} />
            撤销
          </button>
          <button aria-label="重做" disabled={!redo.length} onClick={redoAction}>
            <Redo2 size={16} />
            重做
          </button>
          <button onClick={saveScheme}>保存</button>
          <button onClick={() => setScreen("schemes")}>方案</button>
          <button aria-label="历史记录" onClick={() => setScreen("history")}>
            历史
          </button>
          <button aria-label="设置与备份" onClick={() => setScreen("settings")}>
            设置
          </button>
          <span
            className={`save-indicator ${storageError ? "failed" : ""}`}
            title={storageError || "只保存在这台设备的浏览器里"}
          >
            {saveStatus}
          </span>
        </div>
      </header>
      {storageError && (
        <div className="storage-warning">
          <AlertTriangle size={16} />
          <span>本地保存失败：{storageError}。请马上导出备份。</span>
          <button
            onClick={() =>
              download("人像工坊-紧急备份.json", JSON.stringify(db, null, 2))
            }
          >
            导出备份
          </button>
        </div>
      )}

      {screen === "studio" ? (
        <div className="workspace">
          <section className="stage" aria-label="立体人像">
            <Portrait />
          </section>

          <section className="editor" id="editor">
            <div className="editor-intro">
              <h1>先选一个方向</h1>
              <p>人像可以转着看。方向只写入文字，不改模型。</p>
            </div>
            <div className="looks">
              {looks.map((look) => (
                <button
                  key={look.id}
                  className={referenceId === look.id ? "on" : ""}
                  onClick={() => proposeLook(look)}
                >
                  <img src={look.image} alt="" />
                  <span>
                    <strong>{look.name}</strong>
                    <small>{look.subtitle}</small>
                  </span>
                </button>
              ))}
            </div>
            {pending && (
              <section className="apply-preview" role="region" aria-label="应用预览">
                <div className="apply-top">
                  <div>
                    <h2>换成「{pending.title}」</h2>
                    <p>确认后只改文字。立体人像的姿势和衣服不会变。</p>
                  </div>
                  <div className="apply-actions">
                    <button onClick={() => setPending(null)}>先不换</button>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        commit(pending.scheme, pending.referenceId);
                        setPending(null);
                      }}
                    >
                      确认应用
                    </button>
                  </div>
                </div>
                <DiffList diff={pendingDiff} />
              </section>
            )}
            <nav className="sections" aria-label="参数分组">
              {simpleGroups.map((group) => (
                <button
                  key={group.id}
                  aria-label={sectionLabel(group.id)}
                  onClick={() =>
                    document.getElementById(`group-${group.id}`)?.scrollIntoView({
                      block: "start",
                    })
                  }
                >
                  {sectionLabel(group.id)}
                </button>
              ))}
            </nav>
            {simpleGroups.map((group) => (
              <div className="group" id={`group-${group.id}`} key={group.id}>
                <h2>{sectionLabel(group.id)}</h2>
                {group.keys.map((key) => {
                  const field = fieldOf(group.id, key);
                  const id = `${group.id}.${key}`;
                  return (
                    <Choice
                      key={id}
                      id={id}
                      field={field}
                      values={valuesOf(scheme, id)}
                      locked={!!scheme.fields[id]?.locked}
                      onChoose={(option) => {
                        const current = valuesOf(scheme, id).filter(
                          (value) => value !== "交由下游决定",
                        );
                        if (field.multi) {
                          const next = current.includes(option)
                            ? current.filter((value) => value !== option)
                            : [...current, option];
                          changeField(id, next.length ? next : null);
                        } else {
                          changeField(id, current.includes(option) ? null : option);
                        }
                      }}
                    />
                  );
                })}
              </div>
            ))}
            <div className="group" id="group-story">
              <h2>想补充的话</h2>
              <TextChoice
                label="创作主题"
                value={valueOf(scheme, "story.theme")}
                placeholder="例如：风把头发吹起来的那一下"
                disabled={!!scheme.fields["story.theme"]?.locked}
                onCommit={(value) => changeField("story.theme", value)}
              />
              <TextChoice
                label="自由补充"
                value={valueOf(scheme, "story.notes")}
                placeholder="其他想法，都可以写在这里"
                disabled={!!scheme.fields["story.notes"]?.locked}
                onCommit={(value) => changeField("story.notes", value)}
              />
            </div>
            {!!db.templates.length && (
              <div className="group">
                <h2>以前保存的模板</h2>
                <p className="muted">只合并文字，不换参考图。</p>
                <div className="sections">
                  {db.templates.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        try {
                          const next = mergeFields(scheme, item.fields);
                          const diff = differences(scheme, next);
                          if (!diff.length) return;
                          if (!Object.keys(scheme.fields).length) commit(next);
                          else setPending({ title: item.name, scheme: next });
                        } catch (e) {
                          notify(errorText(e));
                        }
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="brief">
            <div className="brief-scroll">
              <div className="brief-head">
                <h2>已选 {entries.length}</h2>
                <button
                  disabled={!entries.length}
                  onClick={() => {
                    if (!window.confirm("清除全部未锁定文字？")) return;
                    const next = clone(scheme);
                    Object.keys(next.fields).forEach((key) => {
                      if (!next.fields[key].locked) delete next.fields[key];
                    });
                    if (!next.fields["camera.position"]) next.camera = null;
                    commit(next, null);
                  }}
                >
                  清空
                </button>
              </div>
              {entries.length ? (
                <ul className="picked">
                  {entries.map(([key, item]) => (
                    <li key={key}>
                      <div>
                        <small>
                          {sectionLabel(key.split(".")[0])} · {fieldLabel(key)}
                        </small>
                        <strong>{displayValue(item.value)}</strong>
                      </div>
                      <button
                        className="icon-hit"
                        aria-label={`${item.locked ? "解锁" : "锁定"}已选${fieldLabel(key)}`}
                        onClick={() => lockField(key)}
                      >
                        {item.locked ? <LockKeyhole size={16} /> : <UnlockKeyhole size={16} />}
                      </button>
                      <button
                        className="icon-hit"
                        disabled={item.locked}
                        aria-label={`移除已选${fieldLabel(key)}`}
                        onClick={() => changeField(key, null)}
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">还是空白。选一个方向，或只点一个场景。</p>
              )}
              {!!extraEntries.length && (
                <p className="muted">
                  有 {extraEntries.length} 项来自以前更细的设置，仍会写进复制结果。
                </p>
              )}
              {!!issues.length && (
                <div className="conflicts">
                  {issues.map((issue, index) => (
                    <p key={index} className={issue.level}>
                      <AlertTriangle size={14} />
                      <span>{issue.text}</span>
                    </p>
                  ))}
                </div>
              )}
              <div className="brief-head">
                <h2>复制内容</h2>
                <button
                  className="text-btn"
                  disabled={!entries.length}
                  onClick={() =>
                    download(`${scheme.name}.md`, brief(scheme), "text/markdown;charset=utf-8")
                  }
                >
                  导出 Markdown
                </button>
              </div>
              <textarea
                className={`brief-preview ${format === "json" ? "mono" : ""}`}
                aria-label="复制内容预览"
                readOnly
                value={entries.length ? copiedText : ""}
                placeholder="已选的文字会整理在这里。"
              />
            </div>
            <div className="copy-dock">
              <p className="dock-peek">{peek}</p>
              <div className="dock-row">
                <div className="format-switch" role="group" aria-label="复制格式">
                  <button aria-pressed={format === "brief"} onClick={() => setFormat("brief")}>
                    简报
                  </button>
                  <button aria-pressed={format === "json"} onClick={() => setFormat("json")}>
                    JSON
                  </button>
                </div>
                <button
                  className="btn-primary copy-button"
                  disabled={!entries.length || issues.some((issue) => issue.level === "error")}
                  onClick={copyCurrent}
                >
                  <Copy size={18} />
                  一键复制参数
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <main className="screen">
          <div className="screen-head">
            <button onClick={() => setScreen("studio")}>返回</button>
            <h1>
              {screen === "history" ? "历史" : screen === "schemes" ? "方案" : "设置与备份"}
            </h1>
          </div>
          {screen === "history" && (
            <>
              <div className="search-row">
                <Search size={16} />
                <input
                  aria-label="搜索历史记录"
                  placeholder="搜索名称或文字"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
              <div className="sections">
                {(
                  [
                    ["all", "全部"],
                    ["copy", "复制"],
                    ["manual", "版本"],
                    ["auto", "检查点"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={historyType === id}
                    onClick={() => setHistoryType(id)}
                  >
                    {label}
                  </button>
                ))}
                <button aria-pressed={favoriteOnly} onClick={() => setFavoriteOnly((v) => !v)}>
                  <Star size={14} />
                  收藏
                </button>
              </div>
              <div className="history-layout">
                <div>
                  {historyList.length ? (
                    historyList.map((item) => (
                      <div
                        className={`history-card ${historyItem === item.id ? "active" : ""}`}
                        key={item.id}
                      >
                        <button
                          className="history-card-main"
                          onClick={() => setHistoryItem(item.id)}
                        >
                          <small>
                            {kindLabel(item.kind)} · {fmtTime(item.time)}
                          </small>
                          <strong>{item.name}</strong>
                          <span>
                            {Object.entries(item.snapshot.fields)
                              .slice(0, 3)
                              .map(([, value]) => displayValue(value.value))
                              .join(" / ") || "空白"}
                          </span>
                        </button>
                        <button
                          className={`icon-hit ${item.favorite ? "favorited" : ""}`}
                          aria-label={`${item.favorite ? "取消收藏" : "收藏"} ${item.name}`}
                          onClick={() => updateHistory(item.id, { favorite: !item.favorite })}
                        >
                          <Star size={16} fill={item.favorite ? "currentColor" : "none"} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="muted pad">还没有记录。复制或保存之后会出现在这里。</p>
                  )}
                </div>
                <div className="history-detail">
                  {selectedHistory ? (
                    <>
                      <div className="detail-title">
                        <input
                          aria-label="历史记录名称"
                          maxLength={100}
                          value={selectedHistory.name}
                          onChange={(e) =>
                            updateHistory(selectedHistory.id, { name: e.target.value })
                          }
                        />
                        <button
                          className="icon-hit"
                          aria-label="删除此记录"
                          onClick={() => {
                            if (!window.confirm("删除这条历史？")) return;
                            setDb((d) =>
                              d
                                ? {
                                    ...d,
                                    history: d.history.filter(
                                      (item) => item.id !== selectedHistory.id,
                                    ),
                                  }
                                : d,
                            );
                            setHistoryItem(null);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <pre>
                        {selectedHistory.text ??
                          (brief(selectedHistory.snapshot) || "空白方案")}
                      </pre>
                      <div className="apply-actions">
                        <button onClick={() => openScheme(selectedHistory.snapshot, true)}>
                          <Plus size={16} />
                          从记录新建
                        </button>
                        <button
                          disabled={!selectedHistory.text}
                          onClick={() =>
                            void copyText(
                              selectedHistory.text!,
                              selectedHistory.snapshot,
                              selectedHistory.format || "brief",
                              false,
                            )
                          }
                        >
                          <Copy size={16} />
                          复制当时原文
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="muted pad">点一条记录，可以查看或另存为副本。</p>
                  )}
                </div>
              </div>
            </>
          )}
          {screen === "schemes" && (
            <>
              <div className="apply-actions">
                <button className="btn-primary" onClick={() => openScheme(blankScheme())}>
                  <Plus size={16} />
                  新建方案
                </button>
                <button onClick={() => openScheme(scheme, true)}>复制当前方案</button>
                <button
                  onClick={() =>
                    download(`${scheme.name}.json`, JSON.stringify(scheme, null, 2))
                  }
                >
                  导出当前方案
                </button>
                <button onClick={() => fileInput.current?.click()}>导入</button>
              </div>
              <div className="scheme-grid">
                {db.schemes.map((item) => (
                  <article className="scheme-card" key={item.id}>
                    <h2>{item.name}</h2>
                    <p className="muted">
                      {Object.keys(item.fields).length} 项 · {fmtTime(item.updatedAt)}
                    </p>
                    <div className="apply-actions">
                      <button onClick={() => openScheme(item)}>打开</button>
                      <button onClick={() => setCompareScheme(item.id)}>比较</button>
                      <button
                        className="icon-hit"
                        aria-label={`删除方案${item.name}`}
                        onClick={() => {
                          if (!window.confirm("删除此命名方案？历史记录仍保留。")) return;
                          setDb((d) =>
                            d
                              ? {
                                  ...d,
                                  schemes: d.schemes.filter((x) => x.id !== item.id),
                                }
                              : d,
                          );
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!db.schemes.length && (
                <p className="muted pad">还没有命名方案。当前草稿会自动保存。</p>
              )}
              {compareTarget && (
                <div className="apply-preview">
                  <h2>和「{compareTarget.name}」的差别</h2>
                  <DiffList diff={differences(scheme, compareTarget)} />
                </div>
              )}
            </>
          )}
          {screen === "settings" && (
            <div className="settings">
              <h2>备份</h2>
              <p className="muted">
                现在有 {db.history.length} 条历史、{db.schemes.length} 个方案、
                {db.templates.length} 个模板。清理浏览器数据会丢掉它们。
              </p>
              <div className="apply-actions">
                <button
                  className="btn-primary"
                  onClick={() =>
                    download(
                      `人像工坊-备份-${new Date().toISOString().slice(0, 10)}.json`,
                      JSON.stringify(db, null, 2),
                    )
                  }
                >
                  导出全部数据
                </button>
                <button onClick={() => fileInput.current?.click()}>
                  导入方案 / 恢复备份
                </button>
              </div>
              <h2>立体人像</h2>
              <p className="muted">
                中间是一个可旋转的成年女性全身模型，有头发和衣服。她是风格化的造型，不是照片，选项也不会改她的姿势或服装。模型以 CC0 发布，来自 Grab3D 的 Casual Woman。
              </p>
              <h2>文字方向配图</h2>
              <p className="muted">
                四个方向旁的小图只帮助感受文字气质，不是立体人像，也不会跟着选项生成。许可为 Unsplash License。
              </p>
              <ul className="credits">
                {looks.map((look) => (
                  <li key={look.id}>
                    <strong>{look.name}</strong>
                    <span>{look.depicts}</span>
                    <a href={`https://images.unsplash.com/${look.photoId}`}>
                      {look.photoId}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="muted">
                <a href={unsplashLicense}>Unsplash License</a>
                。照片已打包在应用里，打开页面时不会再去请求这些地址。
              </p>
            </div>
          )}
        </main>
      )}

      {toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      <input
        ref={fileInput}
        hidden
        type="file"
        accept=".json,application/json"
        aria-label="导入方案或备份"
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      {fallbackOpen && (
        <FallbackSheet
          text={fallbackText}
          onClose={() => setFallbackOpen(false)}
          onDownload={() =>
            download("人像工坊-创作参数.txt", fallbackText, "text/plain;charset=utf-8")
          }
          onConfirm={() => {
            const record = fallbackRecord.current;
            if (record)
              recordHistory(record.snapshot, "copy", fallbackText, record.format);
            fallbackRecord.current = null;
            setFallbackOpen(false);
            notify("已确认手动复制");
          }}
        />
      )}
    </div>
  );
}

function Choice({
  id,
  field,
  values,
  locked,
  onChoose,
}: {
  id: string;
  field: Field;
  values: string[];
  locked: boolean;
  onChoose: (option: string) => void;
}) {
  return (
    <div className="choice" data-field={id}>
      <div className="choice-label">
        {field.label}
        {field.multi && <small>可多选</small>}
      </div>
      <div className="options">
        {field.options?.map((option) => (
          <button
            key={option}
            disabled={locked}
            aria-pressed={values.includes(option)}
            aria-label={field.color ? paletteNames[option] || option : undefined}
            className={`${values.includes(option) ? "selected" : ""} ${field.color ? "swatch" : ""}`}
            style={field.color ? { background: option } : undefined}
            onClick={() => onChoose(option)}
          >
            {field.color ? "" : option}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextChoice({
  label,
  value,
  placeholder,
  disabled,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onCommit: (value: string | null) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <label className="text-choice">
      {label}
      <textarea
        aria-label={label}
        value={text}
        disabled={disabled}
        maxLength={4000}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const next = text.trim();
          if (next !== value) onCommit(next || null);
        }}
      />
    </label>
  );
}

function DiffList({ diff }: { diff: ReturnType<typeof differences> }) {
  if (!diff.length) return <p className="muted">没有需要改动的文字。</p>;
  return (
    <div className="diff-list">
      {diff.map((item) => (
        <div key={item.key}>
          <small>
            {sectionLabel(item.key.split(".")[0])} / {item.label}
          </small>
          <span>{item.before}</span>
          <em>改为</em>
          <strong>{item.after}</strong>
        </div>
      ))}
    </div>
  );
}

function FallbackSheet({
  text,
  onClose,
  onDownload,
  onConfirm,
}: {
  text: string;
  onClose: () => void;
  onDownload: () => void;
  onConfirm: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    box.current?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="手动复制"
        className="sheet"
      >
        <h2>手动复制</h2>
        <p>浏览器没有允许写入剪贴板。选中下面的文字即可。</p>
        <textarea
          className="brief-preview"
          aria-label="手动复制内容"
          readOnly
          value={text}
          onFocus={(e) => e.target.select()}
        />
        <div className="apply-actions">
          <button onClick={onDownload}>下载文本</button>
          <button className="btn-primary" onClick={onConfirm}>
            我已手动复制
          </button>
        </div>
      </div>
    </div>
  );
}
