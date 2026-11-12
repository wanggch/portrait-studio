import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Check,
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
  builtInTemplates,
  displayValue,
  paletteNames,
  posePresets,
  sections,
  type Field,
  type Section,
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
  randomize,
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
  type Selection,
} from "./domain";
import { download, loadDatabase, persistDatabase } from "./storage";

const Studio = lazy(() => import("./Studio"));

type Screen = "studio" | "history" | "schemes" | "settings";
type Theme = "light" | "dark";

const leadKeys: Record<string, string[]> = {
  subject: [
    "age",
    "appearance",
    "skin",
    "hair",
    "hairColor",
    "expression",
    "temperament",
  ],
  wardrobe: ["category", "color"],
  accessories: ["earrings", "necklace", "prop", "binding"],
  pose: ["category", "orientation", "gaze"],
  scene: ["location", "time", "weather"],
  camera: ["shot", "ratio", "focal", "angle"],
  lighting: ["source", "direction", "style", "temperature"],
  story: ["theme", "activity", "emotion", "usage"],
};

const hairStyles = ["长直发", "短发", "波波头", "长卷发", "高马尾", "盘发"];
const garmentNames = [
  "A 字连衣裙",
  "直筒连衣裙",
  "吊带裙",
  "衬衫裙",
  "T 恤",
  "衬衫",
  "针织衫",
  "背心",
  "短款上衣",
  "连体裤",
  "短连体裤",
  "连体泳衣",
  "分体泳装",
  "半身裙",
  "长裤",
  "短裤",
  "阔腿裤",
  "运动裤",
];

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
const previewHint: Record<Field["preview"], string> = {
  实时: "会反映在预览或取景里",
  近似: "只是近似外形，和文字描述不一定一致",
  仅导出: "只写进创作简报，不改变画面",
};
const kindLabel = (kind: HistoryEntry["kind"]) =>
  kind === "copy" ? "复制记录" : kind === "manual" ? "手动版本" : "恢复检查点";

function initialTheme(): Theme {
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

function garmentTarget(name: string) {
  const isDress = name.includes("裙") && name !== "半身裙";
  const swim = name.includes("泳");
  const jump = name.includes("连体裤");
  const bottom = ["半身裙", "长裤", "短裤", "阔腿裤", "运动裤"].includes(name);
  const category = isDress
    ? "裙装"
    : swim
      ? "泳装"
      : jump
        ? "连体装"
        : "上下装";
  const key = isDress
    ? "dress"
    : swim
      ? "swim"
      : jump
        ? "onepiece"
        : bottom
          ? "bottom"
          : "top";
  return { category, key };
}

function FieldEditor({
  id,
  field,
  item,
  onChange,
  onLock,
}: {
  id: string;
  field: Field;
  item?: Selection;
  onChange: (id: string, value: string | string[] | null) => void;
  onLock: (id: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const values = item
    ? Array.isArray(item.value)
      ? item.value
      : [item.value]
    : [];
  const choose = (value: string) => {
    if (item?.locked) return;
    if (value === "交由下游决定") {
      onChange(id, values.includes(value) ? null : value);
      return;
    }
    const actualValues = values.filter((v) => v !== "交由下游决定");
    onChange(
      id,
      field.multi
        ? actualValues.includes(value)
          ? actualValues.filter((x) => x !== value)
          : [...actualValues, value]
        : values.includes(value)
          ? null
          : value,
    );
  };
  return (
    <div className={`field ${item ? "has-value" : ""}`} data-field={id}>
      <div className="field-heading">
        <label htmlFor={`custom-${id}`}>
          {field.label}
          {field.multi && <small>可多选</small>}
        </label>
        <div className="field-tools">
          <span className="tag" title={previewHint[field.preview]}>
            {field.preview}
          </span>
          {item && (
            <>
              <button
                className="icon-hit"
                title={item.locked ? "解锁" : "锁定，避免被模板或随机覆盖"}
                aria-label={`${item.locked ? "解锁" : "锁定"}${field.label}`}
                onClick={() => onLock(id)}
              >
                {item.locked ? (
                  <LockKeyhole size={16} />
                ) : (
                  <UnlockKeyhole size={16} />
                )}
              </button>
              <button
                className="icon-hit"
                disabled={item.locked}
                title="清除"
                aria-label={`清除${field.label}`}
                onClick={() => onChange(id, null)}
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className={`options ${field.color ? "color-options" : ""}`}>
        {field.options?.map((option) => (
          <button
            key={option}
            disabled={item?.locked}
            aria-pressed={values.includes(option)}
            title={paletteNames[option] || option}
            aria-label={paletteNames[option] || option}
            className={`option ${values.includes(option) ? "selected" : ""} ${field.color ? "swatch" : ""}`}
            style={field.color ? { background: option } : undefined}
            onClick={() => choose(option)}
          >
            {field.color ? values.includes(option) && <Check size={16} /> : option}
          </button>
        ))}
        <button
          className={`option ghost ${values.includes("交由下游决定") ? "selected" : ""}`}
          disabled={item?.locked}
          aria-pressed={values.includes("交由下游决定")}
          onClick={() => choose("交由下游决定")}
        >
          交由下游决定
        </button>
      </div>
      {values.some((v) => v !== "交由下游决定" && !field.options?.includes(v)) && (
        <div className="custom-selected">
          {displayValue(values.filter((v) => !field.options?.includes(v)))}
          {item?.locked && <LockKeyhole size={14} />}
        </div>
      )}
      <div className="custom-row">
        <input
          id={`custom-${id}`}
          aria-label={`自定义${field.label}`}
          disabled={item?.locked}
          value={custom}
          maxLength={4000}
          placeholder={
            field.placeholder || (field.multi ? "自己写一项" : "自己写，或留空")
          }
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && custom.trim()) {
              choose(custom.trim());
              setCustom("");
            }
          }}
        />
        <button
          className="icon-hit"
          aria-label={`添加自定义${field.label}`}
          disabled={item?.locked || !custom.trim()}
          onClick={() => {
            choose(custom.trim());
            setCustom("");
          }}
        >
          <Plus size={18} />
        </button>
        {field.color && (
          <input
            className="color-input"
            type="color"
            title="自定义颜色"
            aria-label={`选择${field.label}色值`}
            disabled={item?.locked}
            value={
              /^#[a-fA-F0-9]{6}$/.test(values[0] || "") ? values[0] : "#c9b9a7"
            }
            onChange={(e) => onChange(id, e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

function DiffList({ diff }: { diff: ReturnType<typeof differences> }) {
  if (!diff.length) return <p className="muted">没有需要改动的参数。</p>;
  return (
    <div className="diff-list">
      {diff.map((d) => (
        <div key={d.key}>
          <small>
            {sectionLabel(d.key.split(".")[0])} / {d.label}
          </small>
          <span>{d.before}</span>
          <em>改为</em>
          <strong>{d.after}</strong>
        </div>
      ))}
    </div>
  );
}

function Chip({
  pressed,
  onClick,
  children,
  label,
}: {
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      className="chip"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [db, setDb] = useState<Database | null>(null);
  const [loadError, setLoadError] = useState("");
  const [active, setActive] = useState("wardrobe");
  const [search, setSearch] = useState("");
  const [browseDetails, setBrowseDetails] = useState<Record<string, boolean>>(
    {},
  );
  const [screen, setScreen] = useState<Screen>("studio");
  const [format, setFormat] = useState<"brief" | "json">("brief");
  const [toast, setToast] = useState("");
  const [saveStatus, setSaveStatus] = useState("正在读取");
  const [storageError, setStorageError] = useState("");
  const [library, setLibrary] = useState<"poses" | "clothes" | "hair" | null>(
    null,
  );
  const [undo, setUndo] = useState<Scheme[]>([]);
  const [redo, setRedo] = useState<Scheme[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyType, setHistoryType] = useState("all");
  const [historyDate, setHistoryDate] = useState("");
  const [historyScheme, setHistoryScheme] = useState("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [historyItem, setHistoryItem] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [pending, setPending] = useState<Scheme | null>(null);
  const [fallbackText, setFallbackText] = useState("");
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [templateModule, setTemplateModule] = useState("all");
  const [templateName, setTemplateName] = useState("");
  const [randomModules, setRandomModules] = useState([
    "wardrobe",
    "pose",
    "scene",
    "lighting",
  ]);
  const [compareScheme, setCompareScheme] = useState<string | null>(null);
  const [estimate, setEstimate] = useState("");
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLTextAreaElement>(null);
  const pendingRef = useRef<HTMLElement>(null);
  const dbRef = useRef(db);
  dbRef.current = db;
  const persistQueue = useRef(Promise.resolve());
  const initialized = useRef(false);
  const checkpoint = useRef("");
  const fallbackRecord = useRef<{ snapshot: Scheme; format: string } | null>(
    null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const notify = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3800);
  }, []);

  const load = useCallback(() => {
    setLoadError("");
    loadDatabase()
      .then((data) => {
        checkpoint.current = JSON.stringify(data.current);
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
  useEffect(() => {
    if (screen === "settings" && navigator.storage?.estimate)
      navigator.storage
        .estimate()
        .then((v) =>
          setEstimate(
            `大约占用 ${((v.usage || 0) / 1024 / 1024).toFixed(2)} MB，配额 ${((v.quota || 0) / 1024 / 1024).toFixed(0)} MB`,
          ),
        )
        .catch(() => setEstimate("浏览器没有提供存储估算"));
  }, [screen]);
  useEffect(() => {
    if (pending) pendingRef.current?.scrollIntoView({ block: "nearest" });
  }, [pending]);

  const commit = useCallback((next: Scheme) => {
    const previous = dbRef.current?.current;
    if (!previous || sameContent(previous, next)) return;
    setUndo((stack) => [...stack.slice(-79), clone(previous)]);
    setRedo([]);
    setDb((d) =>
      d
        ? { ...d, current: { ...next, updatedAt: new Date().toISOString() } }
        : d,
    );
  }, []);
  const undoAction = useCallback(() => {
    if (!undo.length || !dbRef.current) return;
    setRedo((stack) => [...stack, clone(dbRef.current!.current)]);
    setDb((d) => (d ? { ...d, current: undo.at(-1)! } : d));
    setUndo((stack) => stack.slice(0, -1));
  }, [undo]);
  const redoAction = useCallback(() => {
    if (!redo.length || !dbRef.current) return;
    setUndo((stack) => [...stack, clone(dbRef.current!.current)]);
    setDb((d) => (d ? { ...d, current: redo.at(-1)! } : d));
    setRedo((stack) => stack.slice(0, -1));
  }, [redo]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (e.key === "Escape") {
        if (fallbackOpen) setFallbackOpen(false);
        else if (pending && !typing) setPending(null);
      }
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
  }, [undoAction, redoAction, screen, fallbackOpen, pending]);

  const s = db?.current;
  const issues = useMemo(() => (s ? conflicts(s) : []), [s]);
  const copiedText = useMemo(() => (s ? brief(s, format) : ""), [s, format]);
  const entries = s ? Object.entries(s.fields) : [];
  const changeField = (id: string, value: string | string[] | null) => {
    if (!s) return;
    const descendants =
      sections
        .find((sec) => sec.id === id.split(".")[0])
        ?.fields.filter(
          (f) =>
            f.parent === id.split(".")[1] &&
            s.fields[`${id.split(".")[0]}.${f.key}`] &&
            !f.when?.includes(String(value)),
        ) || [];
    if (
      descendants.length &&
      !window.confirm(
        `此操作会清除不适用的子项：${descendants.map((f) => f.label).join("、")}。继续吗？`,
      )
    )
      return;
    try {
      const next = updateField(s, id, value);
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
    if (!s?.fields[id]) return;
    const next = clone(s);
    next.fields[id].locked = !next.fields[id].locked;
    commit(next);
  };
  const clearModule = (module: string) => {
    if (!s) return;
    const next = clone(s);
    Object.keys(next.fields)
      .filter((k) => k.startsWith(module + ".") && !next.fields[k].locked)
      .forEach((k) => delete next.fields[k]);
    if (module === "camera" && !next.fields["camera.position"])
      next.camera = null;
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
            history: [
              makeHistory(snapshot, kind, text, copyFormat),
              ...d.history,
            ],
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
    if (!s || !entries.length) return;
    if (issues.some((i) => i.level === "error")) {
      notify("请先处理标出的输入错误");
      return;
    }
    if (
      issues.some((i) => i.level === "warning") &&
      !window.confirm("当前方案有创作冲突，仍要复制已选参数吗？")
    )
      return;
    void copyText(copiedText, clone(s), format);
  };
  const saveScheme = () => {
    if (!s) return;
    if (!schemeSchema.safeParse(s).success) {
      notify("请先处理输入错误，再保存正式版本");
      return;
    }
    setDb((d) =>
      d
        ? {
            ...d,
            schemes: [clone(s), ...d.schemes.filter((x) => x.id !== s.id)],
            history: [makeHistory(s, "manual"), ...d.history],
          }
        : d,
    );
    notify("方案已保存，并留下一个历史版本");
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
    setUndo([]);
    setRedo([]);
    setPending(null);
    setScreen("studio");
    notify(asCopy ? "已从记录新建副本，原来的方案还在" : "已打开方案");
  };
  const proposeTemplate = (
    values: Scheme["fields"],
    templateCamera?: Scheme["camera"],
    scope = templateModule,
  ) => {
    if (!s) return;
    try {
      const next = mergeFields(s, values, scope === "all" ? undefined : scope);
      if (
        templateCamera &&
        values["camera.position"] &&
        !s.fields["camera.position"]?.locked &&
        (scope === "all" || scope === "camera")
      )
        next.camera = clone(templateCamera);
      setPending(next);
      setScreen("studio");
    } catch (e) {
      notify(errorText(e));
    }
  };
  const applyPending = () => {
    if (!pending) return;
    commit(pending);
    setPending(null);
    notify("已应用，可以撤销");
  };
  const applyPose = (name: string, cat: string, key: string) => {
    if (!s) return;
    const values: Scheme["fields"] = {
      "pose.category": selection(cat, "template"),
      [`pose.${key}`]: selection(name, "template"),
    };
    try {
      commit(mergeFields(s, values));
    } catch (e) {
      notify(errorText(e));
    }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
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
        setDb(parsedDb.data);
        setUndo([]);
        setRedo([]);
        setPending(null);
        setScreen("studio");
        notify("本地备份已恢复");
      } else {
        const parsed = schemeSchema.parse(data);
        openScheme(parsed, true);
      }
    } catch (e) {
      notify(`导入失败，当前数据未改动：${errorText(e).slice(0, 160)}`);
    }
    if (fileInput.current) fileInput.current.value = "";
  };
  const saveTemplate = () => {
    if (!s || !db) return;
    if (!templateName.trim()) {
      notify("先给模板起个名字");
      return;
    }
    const fields = Object.fromEntries(
      Object.entries(s.fields).filter(
        ([k]) => templateModule === "all" || k.startsWith(templateModule + "."),
      ),
    );
    if (!Object.keys(fields).length) {
      notify("这个范围里还没有参数");
      return;
    }
    setDb({
      ...db,
      templates: [
        {
          id: uid(),
          name: templateName.trim(),
          fields: clone(fields),
          camera:
            templateModule === "all" || templateModule === "camera"
              ? clone(s.camera)
              : null,
        },
        ...db.templates,
      ],
    });
    setTemplateName("");
    notify("模板已保存在这台设备上");
  };

  if (!db || !s)
    return (
      <main className="loading">
        <p className="brand-mark">人像工坊</p>
        <h1>{loadError ? "没有读到本地数据" : "正在打开"}</h1>
        <p>{loadError || "方案都留在这台设备上。"}</p>
        {loadError && <button onClick={load}>重试读取</button>}
      </main>
    );

  const scheme = s;
  const query = search.trim().toLowerCase();
  const shownSections = query
    ? sections
        .map((sec) => ({
          ...sec,
          fields: sec.fields.filter((f) =>
            [sec.label, f.label, ...(f.options || [])].some((t) =>
              t.toLowerCase().includes(query),
            ),
          ),
        }))
        .filter((sec) => sec.fields.length)
    : [sections.find((sec) => sec.id === active)!];
  const historyList = db.history.filter(
    (h) =>
      (historyType === "all" || h.kind === historyType) &&
      (!favoriteOnly || h.favorite) &&
      (!historyDate ||
        new Date(h.time).toLocaleDateString("sv-SE") === historyDate) &&
      (historyScheme === "all" || h.snapshot.id === historyScheme) &&
      `${h.name} ${brief(h.snapshot)}`.toLowerCase().includes(historySearch.toLowerCase()),
  );
  const selectedHistory = db.history.find((h) => h.id === historyItem);
  const compareTarget = db.schemes.find((x) => x.id === compareScheme);
  const diff = pending ? differences(scheme, pending) : [];
  const updateHistory = (id: string, change: Partial<HistoryEntry>) =>
    setDb((d) =>
      d
        ? {
            ...d,
            history: d.history.map((h) =>
              h.id === id ? { ...h, ...change } : h,
            ),
          }
        : d,
    );
  const schemeNames = [
    ...new Map(db.history.map((h) => [h.snapshot.id, h.snapshot.name])).entries(),
  ];
  const peek =
    format === "json"
      ? entries.length
        ? `JSON · ${entries.length} 项`
        : "选任意一项后就可以复制"
      : entries.length
        ? copiedText.replace(/\s+/g, " ").slice(0, 90)
        : "选任意一项后就可以复制";

  const goSection = (id: string) => {
    setActive(id);
    setSearch("");
    setScreen("studio");
    if (window.innerWidth < 1100)
      requestAnimationFrame(() =>
        document.getElementById("editor")?.scrollIntoView({ block: "start" }),
      );
  };

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
          <button aria-label="撤销" title="撤销 ⌘Z" disabled={!undo.length} onClick={undoAction}>
            <Undo2 size={16} />
            撤销
          </button>
          <button aria-label="重做" title="重做 ⇧⌘Z" disabled={!redo.length} onClick={redoAction}>
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
            title={storageError || "只保存在这台设备的浏览器里，请定期导出备份"}
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
          <section className="stage" aria-label="预览">
            <Suspense
              fallback={<div className="studio webgl-fallback">正在准备预览…</div>}
            >
              <Studio
                scheme={scheme}
                settings={db.settings}
                onSelect={goSection}
                onCamera={(camera) => {
                  if (scheme.fields["camera.position"]?.locked) {
                    notify("请先解锁自定义机位");
                    return;
                  }
                  const next = clone(scheme);
                  next.camera = camera;
                  next.fields["camera.position"] = selection(
                    `位置 (${camera.position.map((n) => n.toFixed(2)).join(", ")})，目标 (${camera.target.map((n) => n.toFixed(2)).join(", ")})${camera.verticalFov ? `，垂直视角 ${camera.verticalFov.toFixed(1)}°` : ""}`,
                  );
                  commit(next);
                  notify("已记下拍摄机位。之后自由转动画面，不会改掉它");
                }}
              />
            </Suspense>
          </section>

          <section className="editor" id="editor">
            <div className="editor-intro">
              <h1>选一个方向，或自己点</h1>
              <p>没选的内容不会出现在复制结果里。模板会先给你看变化。</p>
            </div>
            <div className="looks">
              {builtInTemplates.map((item) => {
                const on = Object.entries(item.values).every(
                  ([key, value]) => valueOf(scheme, key) === value,
                );
                return (
                  <button
                    key={item.name}
                    className={`look-card ${on ? "on" : ""}`}
                    style={{ ["--swatch" as string]: item.color }}
                    onClick={() =>
                      proposeTemplate(
                        Object.fromEntries(
                          Object.entries(item.values).map(([k, v]) => [
                            k,
                            selection(v, "template"),
                          ]),
                        ),
                        undefined,
                        "all",
                      )
                    }
                  >
                    <strong>{item.name}</strong>
                    <small>{item.subtitle}</small>
                  </button>
                );
              })}
              {db.templates.map((item) => (
                <div className="user-template" key={item.id}>
                  <button
                    className="look-card"
                    onClick={() => proposeTemplate(item.fields, item.camera)}
                  >
                    <strong>{item.name}</strong>
                    <small>{Object.keys(item.fields).length} 项</small>
                  </button>
                  <button
                    className="icon-hit"
                    aria-label={`删除模板${item.name}`}
                    onClick={() => {
                      if (window.confirm("删除这个模板？"))
                        setDb({
                          ...db,
                          templates: db.templates.filter((x) => x.id !== item.id),
                        });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {pending && (
              <section
                className="apply-preview"
                role="region"
                aria-label="应用预览"
                ref={pendingRef}
              >
                <div className="apply-top">
                  <div>
                    <h2>先看会改什么</h2>
                    <p>{diff.length} 项会写进当前方案。锁住的项保持不动。</p>
                  </div>
                  <div className="apply-actions">
                    <button onClick={() => setPending(null)}>取消</button>
                    <button
                      className="btn-primary"
                      disabled={!diff.length}
                      onClick={applyPending}
                    >
                      确认应用
                    </button>
                  </div>
                </div>
                <DiffList diff={diff} />
                {conflicts(pending).map((c, i) => (
                  <p className="muted" key={i}>
                    {c.text}
                  </p>
                ))}
              </section>
            )}

            <div className="search-row">
              <Search size={16} />
              <input
                aria-label="搜索参数"
                placeholder="搜索参数或选项"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="icon-hit" aria-label="清除搜索" onClick={() => setSearch("")}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="sections" role="group" aria-label="参数分组">
              {sections.map((sec) => {
                const count = Object.keys(scheme.fields).filter((k) =>
                  k.startsWith(sec.id + "."),
                ).length;
                return (
                  <button
                    key={sec.id}
                    aria-label={sec.label}
                    aria-current={active === sec.id && !query ? "true" : undefined}
                    onClick={() => goSection(sec.id)}
                  >
                    {sec.label}
                    {count > 0 && <small aria-hidden="true">{count}</small>}
                  </button>
                );
              })}
            </div>

            {shownSections.map((sec) => (
              <SectionBlock
                key={sec.id}
                sec={sec}
                scheme={scheme}
                searching={!!query}
                browse={!!browseDetails[sec.id]}
                onBrowse={() =>
                  setBrowseDetails((previous) => ({
                    ...previous,
                    [sec.id]: !previous[sec.id],
                  }))
                }
                onLockGroup={() => {
                  const next = clone(scheme);
                  const items = Object.entries(next.fields).filter(([k]) =>
                    k.startsWith(sec.id + "."),
                  );
                  const allLocked = items.length > 0 && items.every(([, v]) => v.locked);
                  items.forEach(([, v]) => (v.locked = !allLocked));
                  commit(next);
                }}
                onClear={() => clearModule(sec.id)}
                onChange={changeField}
                onLock={lockField}
              />
            ))}
            {!shownSections.length && (
              <p className="muted pad">没有找到。也可以在对应项里自己写。</p>
            )}

            <div className="library-block">
              <div className="sections">
                <button
                  aria-pressed={library === "poses"}
                  onClick={() => setLibrary(library === "poses" ? null : "poses")}
                >
                  姿势预设
                </button>
                <button
                  aria-pressed={library === "clothes"}
                  onClick={() =>
                    setLibrary(library === "clothes" ? null : "clothes")
                  }
                >
                  服装造型
                </button>
                <button
                  aria-pressed={library === "hair"}
                  onClick={() => setLibrary(library === "hair" ? null : "hair")}
                >
                  发型
                </button>
              </div>
              {library && (
                <p className="muted">点一下就写上，可以撤销。</p>
              )}
              {library === "poses" && (
                <div className="library-cards">
                  {posePresets.map(([name, cat, key]) => (
                    <button
                      key={name}
                      className={`preset-card ${valueOf(scheme, `pose.${key}`) === name ? "selected" : ""}`}
                      onClick={() => applyPose(name, cat, key)}
                    >
                      <strong>{name}</strong>
                      <small>{cat}</small>
                    </button>
                  ))}
                </div>
              )}
              {library === "hair" && (
                <div className="library-cards">
                  {hairStyles.map((name) => (
                    <button
                      key={name}
                      className={`preset-card ${valueOf(scheme, "subject.hair") === name ? "selected" : ""}`}
                      onClick={() => changeField("subject.hair", name)}
                    >
                      <strong>{name}</strong>
                      <small>发型</small>
                    </button>
                  ))}
                </div>
              )}
              {library === "clothes" && (
                <div className="library-cards">
                  {garmentNames.map((name) => {
                    const target = garmentTarget(name);
                    return (
                      <button
                        key={name}
                        className={`preset-card ${valueOf(scheme, `wardrobe.${target.key}`) === name ? "selected" : ""}`}
                        onClick={() => {
                          try {
                            commit(
                              mergeFields(scheme, {
                                "wardrobe.category": selection(target.category),
                                [`wardrobe.${target.key}`]: selection(name),
                              }),
                            );
                          } catch (e) {
                            notify(errorText(e));
                          }
                        }}
                      >
                        <strong>{name}</strong>
                        <small>{target.category}</small>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <details className="more">
              <summary>保存模板、随机组合</summary>
              <p className="muted">范围只影响「存成模板」和你自己的模板。上面四个方向始终是整套。</p>
              <div className="sections" role="group" aria-label="模板应用范围">
                <Chip
                  pressed={templateModule === "all"}
                  onClick={() => {
                    setTemplateModule("all");
                    setPending(null);
                  }}
                >
                  整套
                </Chip>
                {sections.map((sec) => (
                  <Chip
                    key={sec.id}
                    pressed={templateModule === sec.id}
                    onClick={() => {
                      setTemplateModule(sec.id);
                      setPending(null);
                    }}
                  >
                    {sec.label}
                  </Chip>
                ))}
              </div>
              <div className="custom-row">
                <input
                  aria-label="模板名称"
                  placeholder="给当前配置起个名字"
                  value={templateName}
                  maxLength={100}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
                <button onClick={saveTemplate}>存成模板</button>
              </div>
              <h3>随机</h3>
              <div className="sections" role="group" aria-label="随机范围">
                {sections.map((sec) => (
                  <Chip
                    key={sec.id}
                    pressed={randomModules.includes(sec.id)}
                    onClick={() => {
                      setRandomModules((current) =>
                        current.includes(sec.id)
                          ? current.filter((x) => x !== sec.id)
                          : [...current, sec.id],
                      );
                      setPending(null);
                    }}
                  >
                    {sec.label}
                  </Chip>
                ))}
              </div>
              <button
                className="btn-primary"
                disabled={!randomModules.length}
                onClick={() => {
                  try {
                    setPending(randomize(scheme, randomModules));
                  } catch (e) {
                    notify(errorText(e));
                  }
                }}
              >
                生成一组候选
              </button>
            </details>
          </section>

          <aside className="brief">
            <div className="brief-scroll">
              <div className="brief-head">
                <h2>已选 {entries.length}</h2>
                <button
                  disabled={!entries.length}
                  onClick={() => {
                    if (window.confirm("清除全部未锁定参数？")) {
                      const next = clone(scheme);
                      Object.keys(next.fields).forEach((k) => {
                        if (!next.fields[k].locked) delete next.fields[k];
                      });
                      if (!next.fields["camera.position"]) next.camera = null;
                      commit(next);
                    }
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
                        {item.locked ? (
                          <LockKeyhole size={16} />
                        ) : (
                          <UnlockKeyhole size={16} />
                        )}
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
              {issues.length > 0 && (
                <div className="conflicts">
                  {issues.map((issue, i) => (
                    <p key={i} className={issue.level}>
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
                    download(
                      `${scheme.name}.md`,
                      brief(scheme),
                      "text/markdown;charset=utf-8",
                    )
                  }
                >
                  导出 Markdown
                </button>
              </div>
              <textarea
                ref={previewRef}
                className={`brief-preview ${format === "json" ? "mono" : ""}`}
                aria-label="复制内容预览"
                readOnly
                value={entries.length ? copiedText : ""}
                placeholder="已选的参数会整理在这里。"
              />
              <p className="muted">画面只是造型参考。未选项不会被复制。</p>
            </div>
            <div className="copy-dock">
              <p className="dock-peek">{peek}</p>
              <div className="dock-row">
                <div className="format-switch" role="group" aria-label="复制格式">
                  <button
                    aria-pressed={format === "brief"}
                    onClick={() => setFormat("brief")}
                  >
                    简报
                  </button>
                  <button
                    aria-pressed={format === "json"}
                    onClick={() => setFormat("json")}
                  >
                    JSON
                  </button>
                </div>
                <button
                  className="btn-primary copy-button"
                  disabled={!entries.length || issues.some((i) => i.level === "error")}
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
              {screen === "history"
                ? "历史"
                : screen === "schemes"
                  ? "方案"
                  : "设置与备份"}
            </h1>
          </div>

          {screen === "history" && (
            <>
              <div className="stack-controls">
                <div className="search-row">
                  <Search size={16} />
                  <input
                    aria-label="搜索历史记录"
                    placeholder="搜索名称或参数"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                </div>
                <div className="sections" role="group" aria-label="历史记录类型">
                  {(
                    [
                      ["all", "全部"],
                      ["copy", "复制"],
                      ["manual", "版本"],
                      ["auto", "检查点"],
                    ] as const
                  ).map(([id, label]) => (
                    <Chip
                      key={id}
                      pressed={historyType === id}
                      onClick={() => setHistoryType(id)}
                    >
                      {label}
                    </Chip>
                  ))}
                  <Chip
                    pressed={favoriteOnly}
                    onClick={() => setFavoriteOnly((v) => !v)}
                  >
                    <Star size={14} />
                    收藏
                  </Chip>
                </div>
                <div className="sections" role="group" aria-label="按方案筛选历史">
                  <Chip
                    pressed={historyScheme === "all"}
                    onClick={() => setHistoryScheme("all")}
                  >
                    所有方案
                  </Chip>
                  {schemeNames.map(([id, name]) => (
                    <Chip
                      key={id}
                      pressed={historyScheme === id}
                      label={name}
                      onClick={() => setHistoryScheme(id)}
                    >
                      {name}
                    </Chip>
                  ))}
                </div>
                <label className="setting-row">
                  日期
                  <input
                    aria-label="按日期筛选历史"
                    type="date"
                    value={historyDate}
                    onChange={(e) => setHistoryDate(e.target.value)}
                  />
                </label>
                <p className="muted">共 {historyList.length} 条</p>
                {checked.length > 0 && (
                  <button
                    className="danger"
                    onClick={() => {
                      if (window.confirm(`删除选中的 ${checked.length} 条历史记录？`)) {
                        setDb((d) =>
                          d
                            ? {
                                ...d,
                                history: d.history.filter(
                                  (h) => !checked.includes(h.id),
                                ),
                              }
                            : d,
                        );
                        setChecked([]);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                    删除 {checked.length} 条
                  </button>
                )}
              </div>
              <div className="history-layout">
                <div className="history-list">
                  {historyList.length ? (
                    historyList.map((h) => (
                      <div
                        className={`history-card ${historyItem === h.id ? "active" : ""}`}
                        key={h.id}
                      >
                        <label className="check-hit">
                          <input
                            type="checkbox"
                            aria-label={`选择记录 ${h.name}`}
                            checked={checked.includes(h.id)}
                            onChange={(e) =>
                              setChecked(
                                e.target.checked
                                  ? [...checked, h.id]
                                  : checked.filter((id) => id !== h.id),
                              )
                            }
                          />
                        </label>
                        <button
                          className="history-card-main"
                          onClick={() => setHistoryItem(h.id)}
                        >
                          <small>
                            {kindLabel(h.kind)} · {fmtTime(h.time)}
                          </small>
                          <strong>{h.name}</strong>
                          <span>
                            {Object.entries(h.snapshot.fields)
                              .slice(0, 3)
                              .map(([, v]) => displayValue(v.value))
                              .join(" / ") || "空白创作"}
                          </span>
                        </button>
                        <button
                          className={`icon-hit ${h.favorite ? "favorited" : ""}`}
                          aria-label={`${h.favorite ? "取消收藏" : "收藏"} ${h.name}`}
                          onClick={() =>
                            updateHistory(h.id, { favorite: !h.favorite })
                          }
                        >
                          <Star size={16} fill={h.favorite ? "currentColor" : "none"} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="muted pad">还没有符合条件的记录。复制或保存之后会出现在这里。</p>
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
                            updateHistory(selectedHistory.id, {
                              name: e.target.value,
                            })
                          }
                        />
                        <button
                          className="icon-hit danger"
                          aria-label="删除此记录"
                          onClick={() => {
                            if (window.confirm("删除这条历史？")) {
                              setDb((d) =>
                                d
                                  ? {
                                      ...d,
                                      history: d.history.filter(
                                        (h) => h.id !== selectedHistory.id,
                                      ),
                                    }
                                  : d,
                              );
                              setHistoryItem(null);
                            }
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
                        <button
                          onClick={() => openScheme(selectedHistory.snapshot, true)}
                        >
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
                      <h2>和当前方案的差别</h2>
                      <DiffList diff={differences(scheme, selectedHistory.snapshot)} />
                    </>
                  ) : (
                    <p className="muted pad">点一条记录，可以查看、复制或另存为副本。</p>
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
                    download(
                      `${scheme.name}.json`,
                      JSON.stringify(scheme, null, 2),
                    )
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
                        className="icon-hit danger"
                        aria-label={`删除方案${item.name}`}
                        onClick={() => {
                          if (window.confirm("删除此命名方案？历史记录仍保留。"))
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
                <p className="muted pad">
                  还没有命名方案。当前草稿会自动保存，点「保存」才会留下正式版本。
                </p>
              )}
              {compareTarget && (
                <div className="apply-preview">
                  <h2>当前方案和「{compareTarget.name}」</h2>
                  <DiffList diff={differences(scheme, compareTarget)} />
                </div>
              )}
            </>
          )}

          {screen === "settings" && (
            <div className="settings">
              <h2>预览</h2>
              <div className="setting-row">
                <span>渲染质量</span>
                <div className="sections" role="group" aria-label="渲染质量">
                  <Chip
                    pressed={db.settings.quality === "standard"}
                    onClick={() =>
                      setDb({
                        ...db,
                        settings: { ...db.settings, quality: "standard" },
                      })
                    }
                  >
                    标准
                  </Chip>
                  <Chip
                    pressed={db.settings.quality === "low"}
                    onClick={() =>
                      setDb({
                        ...db,
                        settings: { ...db.settings, quality: "low" },
                      })
                    }
                  >
                    轻量
                  </Chip>
                </div>
              </div>
              <p className="muted">标准有阴影和抗锯齿。手机上如果卡，用轻量。</p>
              <h2>历史</h2>
              <label className="setting-row">
                自动检查点间隔
                <span className="inline-input">
                  <input
                    aria-label="自动检查点间隔"
                    type="number"
                    min={30}
                    max={3600}
                    value={db.settings.checkpointSeconds}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isInteger(n) && n >= 30 && n <= 3600)
                        setDb({
                          ...db,
                          settings: { ...db.settings, checkpointSeconds: n },
                        });
                    }}
                  />
                  秒
                </span>
              </label>
              <label className="setting-row">
                自动检查点上限
                <input
                  aria-label="自动检查点上限"
                  type="number"
                  min={1}
                  max={1000}
                  value={db.settings.checkpointLimit}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 1 && n <= 1000)
                      setDb({
                        ...db,
                        settings: { ...db.settings, checkpointLimit: n },
                        history: trimHistory(db.history, n),
                      });
                  }}
                />
              </label>
              <p className="muted">
                收藏、复制记录和手动版本不会被自动清掉。现在有 {db.history.length}{" "}
                条历史、{db.schemes.length} 个方案、{db.templates.length} 个模板。
              </p>
              <p className="muted">{estimate || "正在读取本机存储…"}</p>
              <h2>备份</h2>
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
                <button
                  onClick={() =>
                    download("当前方案-创作参数.json", brief(scheme, "json"))
                  }
                >
                  导出纯创作参数 JSON
                </button>
              </div>
              <p className="notice">
                浏览器清掉网站数据后，这里的方案就没了。自动保存不等于备份，导出的文件里有方案、复制原文、收藏和模板。
              </p>
              <h2>关于预览</h2>
              <p className="muted">
                人物、衣服和场景是程序化的造型参考，不是照片。五官、布料和复杂动作只会写进文字。不上传，也不调用生图服务。
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

function SectionBlock({
  sec,
  scheme,
  searching,
  browse,
  onBrowse,
  onLockGroup,
  onClear,
  onChange,
  onLock,
}: {
  sec: Section;
  scheme: Scheme;
  searching: boolean;
  browse: boolean;
  onBrowse: () => void;
  onLockGroup: () => void;
  onClear: () => void;
  onChange: (id: string, value: string | string[] | null) => void;
  onLock: (id: string) => void;
}) {
  const full = sections.find((item) => item.id === sec.id)!;
  const leads: Field[] = [];
  const more: Field[] = [];
  for (const field of searching ? sec.fields : full.fields) {
    if (!searching && field.parent) {
      const id = `${sec.id}.${field.key}`;
      const parentOn = !!scheme.fields[`${sec.id}.${field.parent}`];
      const shown =
        !!scheme.fields[id] ||
        (!parentOn && browse) ||
        !!field.when?.includes(valueOf(scheme, `${sec.id}.${field.parent}`));
      if (!shown) continue;
    }
    const selected = !!scheme.fields[`${sec.id}.${field.key}`];
    if (
      searching ||
      field.parent ||
      selected ||
      (leadKeys[sec.id] || []).includes(field.key)
    )
      leads.push(field);
    else more.push(field);
  }
  const count = Object.keys(scheme.fields).filter((k) =>
    k.startsWith(sec.id + "."),
  ).length;
  return (
    <div className="section-block">
      <div className="section-copy">
        <h2>
          {sec.label}
          <small>{count} 项已选</small>
        </h2>
        <p>{sec.description}</p>
      </div>
      <div className="section-actions">
        <button onClick={onLockGroup}>锁定本组</button>
        <button onClick={onClear}>清空未锁定</button>
        {full.fields.some((field) => field.parent) && (
          <button className="text-btn" onClick={onBrowse}>
            {browse ? "收起未选大类的细分" : "浏览细分选项（不会自动选中）"}
          </button>
        )}
      </div>
      {leads.map((field) => (
        <FieldEditor
          key={`${sec.id}.${field.key}`}
          id={`${sec.id}.${field.key}`}
          field={field}
          item={scheme.fields[`${sec.id}.${field.key}`]}
          onChange={onChange}
          onLock={onLock}
        />
      ))}
      {more.length > 0 && (
        <details className="more">
          <summary>更多细节</summary>
          {more.map((field) => (
            <FieldEditor
              key={`${sec.id}.${field.key}`}
              id={`${sec.id}.${field.key}`}
              field={field}
              item={scheme.fields[`${sec.id}.${field.key}`]}
              onChange={onChange}
              onLock={onLock}
            />
          ))}
        </details>
      )}
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
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [onClose]);
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
        <div className="apply-top">
          <div>
            <h2>手动复制</h2>
            <p>浏览器没有允许写入剪贴板。选中下面的文字，自己复制即可。</p>
          </div>
          <button className="icon-hit" aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
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
