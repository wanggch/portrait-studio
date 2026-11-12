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
  Aperture,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Copy,
  Dices,
  FileJson,
  FolderOpen,
  History,
  Layers,
  LockKeyhole,
  Plus,
  Redo2,
  Save,
  Search,
  Settings2,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Undo2,
  UnlockKeyhole,
  Upload,
  UserRound,
  X,
  MapPin,
  Camera,
  Sun,
  Accessibility,
  AlertTriangle,
  CheckCircle2,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import {
  builtInTemplates,
  displayValue,
  paletteNames,
  posePresets,
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

type Modal =
  | "history"
  | "schemes"
  | "settings"
  | "templates"
  | "random"
  | "fallback"
  | null;
const icons = [
  UserRound,
  Shirt,
  Sparkles,
  Accessibility,
  MapPin,
  Camera,
  Sun,
  Layers,
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

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const list = [
          ...(box.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input, select, textarea, [tabindex="0"]',
          ) || []),
        ].filter((el) => el.offsetParent !== null);
        if (
          list.length &&
          e.shiftKey &&
          (document.activeElement === list[0] ||
            document.activeElement === box.current)
        ) {
          e.preventDefault();
          list.at(-1)?.focus();
        }
        if (
          list.length &&
          !e.shiftKey &&
          document.activeElement === list.at(-1)
        ) {
          e.preventDefault();
          list[0].focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
      >
        <header>
          <div>
            <span className="eyebrow">PORTRAIT STUDIO</span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="关闭弹窗"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
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
          {field.multi && <small>多选</small>}
        </label>
        <div>
          <span
            title={
              field.preview === "近似"
                ? "使用程序化近似外观，不保证精确还原所选款式与细节"
                : field.preview === "仅导出"
                  ? "保留到创作简报，不改变 3D"
                  : "可影响 3D 或拍摄预览"
            }
            className={`preview-badge ${field.preview === "实时" ? "live" : ""}`}
          >
            {field.preview === "仅导出" ? "仅导出" : `${field.preview}预览`}
          </span>
          {item && (
            <>
              <button
                className="tiny-icon"
                title={item.locked ? "解锁参数" : "锁定参数"}
                aria-label={`${item.locked ? "解锁" : "锁定"}${field.label}`}
                onClick={() => onLock(id)}
              >
                {item.locked ? (
                  <LockKeyhole size={12} />
                ) : (
                  <UnlockKeyhole size={12} />
                )}
              </button>
              <button
                className="tiny-icon"
                disabled={item.locked}
                title="清除选择"
                aria-label={`清除${field.label}`}
                onClick={() => onChange(id, null)}
              >
                <X size={12} />
              </button>
            </>
          )}
        </div>
      </div>
      {field.options && (
        <div className={`options ${field.color ? "color-options" : ""}`}>
          {field.options.map((option) => (
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
              {field.color ? (
                values.includes(option) ? (
                  <Check size={15} />
                ) : (
                  ""
                )
              ) : (
                option
              )}
            </button>
          ))}
        </div>
      )}
      {values.some((v) => !field.options?.includes(v)) && (
        <div className="custom-selected">
          {displayValue(values.filter((v) => !field.options?.includes(v)))}
          {item?.locked && <LockKeyhole size={11} />}
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
            field.placeholder ||
            (field.multi ? "自定义一项…" : "自定义，或留白")
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
          aria-label={`添加自定义${field.label}`}
          disabled={item?.locked || !custom.trim()}
          onClick={() => {
            choose(custom.trim());
            setCustom("");
          }}
        >
          <Plus size={14} />
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
      <button
        className="auto-link"
        disabled={item?.locked}
        onClick={() => choose("交由下游决定")}
      >
        交由下游决定
      </button>
    </div>
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
  const [modal, setModal] = useState<Modal>(null);
  const [format, setFormat] = useState<"brief" | "json">("brief");
  const [toast, setToast] = useState("");
  const [saveStatus, setSaveStatus] = useState("正在读取");
  const [storageError, setStorageError] = useState("");
  const [library, setLibrary] = useState<
    "themes" | "poses" | "clothes" | "hair"
  >("themes");
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true),
    [rightOpen, setRightOpen] = useState(true);
  const [undo, setUndo] = useState<Scheme[]>([]),
    [redo, setRedo] = useState<Scheme[]>([]);
  const [historySearch, setHistorySearch] = useState(""),
    [historyType, setHistoryType] = useState("all"),
    [historyDate, setHistoryDate] = useState(""),
    [historyScheme, setHistoryScheme] = useState("all"),
    [favoriteOnly, setFavoriteOnly] = useState(false);
  const [historyItem, setHistoryItem] = useState<string | null>(null),
    [checked, setChecked] = useState<string[]>([]);
  const [pending, setPending] = useState<Scheme | null>(null);
  const [fallbackText, setFallbackText] = useState("");
  const [templateModule, setTemplateModule] = useState("all"),
    [templateName, setTemplateName] = useState("");
  const [randomModules, setRandomModules] = useState([
    "wardrobe",
    "pose",
    "scene",
    "lighting",
  ]);
  const [compareScheme, setCompareScheme] = useState<string | null>(null);
  const [estimate, setEstimate] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
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
  const closeModal = useCallback(() => {
    setModal(null);
    setPending(null);
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
    if (modal === "settings" && navigator.storage?.estimate)
      navigator.storage
        .estimate()
        .then((v) =>
          setEstimate(
            `约 ${((v.usage || 0) / 1024 / 1024).toFixed(2)} MB / 可用配额 ${((v.quota || 0) / 1024 / 1024).toFixed(0)} MB`,
          ),
        )
        .catch(() => setEstimate("浏览器未提供存储估算"));
  }, [modal]);

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
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "z" &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) &&
        !modal
      ) {
        e.preventDefault();
        e.shiftKey ? redoAction() : undoAction();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undoAction, redoAction, modal]);

  const s = db?.current;
  const issues = useMemo(() => (s ? conflicts(s) : []), [s]);
  const copiedText = useMemo(() => (s ? brief(s, format) : ""), [s, format]);
  const entries = s ? Object.entries(s.fields) : [];
  const section = sections.find((x) => x.id === active)!;
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
      notify(shouldRecord ? "已复制，记录已加入本地历史" : "已复制历史原文");
    } catch {
      fallbackRecord.current = shouldRecord
        ? { snapshot: clone(snapshot), format: copyFormat }
        : null;
      setFallbackText(text);
      setModal("fallback");
    }
  };
  const copyCurrent = () => {
    if (!s || !entries.length) return;
    if (issues.some((i) => i.level === "error")) {
      notify("请先处理标红的输入错误");
      return;
    }
    if (
      issues.some((i) => i.level === "warning") &&
      !window.confirm("当前方案存在创作冲突，仍复制已选参数吗？")
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
    notify("方案已保存，并建立历史版本");
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
    closeModal();
    notify(asCopy ? "已从记录新建副本，原方案未覆盖" : "已打开方案");
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
      setModal("templates");
    } catch (e) {
      notify(errorText(e));
    }
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
      notify("文件超过 30 MB，请拆分后导入");
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
        closeModal();
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

  if (!db)
    return (
      <main className="loading">
        <Aperture size={36} />
        <h1>人像工坊</h1>
        <p>{loadError || "正在打开你的本地创作空间…"}</p>
        {loadError && <button onClick={load}>重试读取</button>}
      </main>
    );
  const scheme = db.current;
  const filteredSections = search.trim()
    ? sections
        .map((sec) => ({
          ...sec,
          fields: sec.fields.filter((f) =>
            [sec.label, f.label, ...(f.options || [])].some((t) =>
              t.toLowerCase().includes(search.trim().toLowerCase()),
            ),
          ),
        }))
        .filter((sec) => sec.fields.length)
    : [section];
  const historyList = db.history.filter(
    (h) =>
      (historyType === "all" || h.kind === historyType) &&
      (!favoriteOnly || h.favorite) &&
      (!historyDate ||
        new Date(h.time).toLocaleDateString("sv-SE") === historyDate) &&
      (historyScheme === "all" || h.snapshot.id === historyScheme) &&
      `${h.name} ${brief(h.snapshot)}`
        .toLowerCase()
        .includes(historySearch.toLowerCase()),
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <span className="brand-symbol">
            <Aperture size={25} strokeWidth={1.6} />
          </span>
          <span>
            <strong>人像工坊</strong>
            <small>PORTRAIT STUDIO</small>
          </span>
        </a>
        <span className="top-divider" />
        <div className="project-name">
          <input
            aria-label="方案名称"
            value={scheme.name}
            maxLength={100}
            onChange={(e) =>
              commit({ ...scheme, name: e.target.value || "未命名创作" })
            }
          />
          <ChevronDown size={13} />
          <span
            className={`save-indicator ${storageError ? "failed" : ""}`}
            title={storageError || "仅保存在当前浏览器，请定期备份"}
          >
            <span />
            {saveStatus}
          </span>
        </div>
        <div className="top-actions">
          <button
            className="icon-button"
            aria-label="撤销"
            title="撤销 ⌘Z"
            disabled={!undo.length}
            onClick={undoAction}
          >
            <Undo2 size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="重做"
            title="重做 ⇧⌘Z"
            disabled={!redo.length}
            onClick={redoAction}
          >
            <Redo2 size={17} />
          </button>
          <span className="top-divider" />
          <button onClick={() => setModal("schemes")}>
            <FolderOpen size={15} />
            方案
          </button>
          <button onClick={() => setModal("history")}>
            <History size={15} />
            历史记录
          </button>
          <button className="save-button" onClick={saveScheme}>
            <Save size={15} />
            保存方案
          </button>
          <button
            className="icon-button"
            aria-label="设置与备份"
            onClick={() => setModal("settings")}
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>
      {storageError && (
        <div className="storage-warning">
          <AlertTriangle size={15} />
          本地保存失败：{storageError}。当前编辑仍在内存中，请立即导出备份。
          <button
            onClick={() =>
              download("人像工坊-紧急备份.json", JSON.stringify(db, null, 2))
            }
          >
            导出备份
          </button>
        </div>
      )}
      <div
        className="workspace"
        style={{
          gridTemplateColumns: `${leftOpen ? "350px" : "62px"} minmax(300px, 1fr) ${rightOpen ? "330px" : "48px"}`,
        }}
      >
        <aside className={`parameter-panel ${!leftOpen ? "collapsed" : ""}`}>
          <div className="panel-header">
            <span>
              <SlidersHorizontal size={16} />
              {leftOpen && "创作参数"}
            </span>
            <button
              className="tiny-icon"
              title="折叠参数面板"
              aria-label="切换参数面板"
              onClick={() => setLeftOpen(!leftOpen)}
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
          {leftOpen && (
            <div className="parameter-search">
              <Search size={14} />
              <input
                aria-label="搜索参数"
                placeholder="搜索参数或选项…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="清除搜索">
                  <X size={13} />
                </button>
              )}
              <kbd>⌕</kbd>
            </div>
          )}
          <nav className="section-nav">
            {sections.map((sec, i) => {
              const Icon = icons[i],
                count = Object.keys(scheme.fields).filter((k) =>
                  k.startsWith(sec.id + "."),
                ).length;
              return (
                <button
                  key={sec.id}
                  aria-label={sec.label}
                  className={active === sec.id && !search ? "active" : ""}
                  onClick={() => {
                    setActive(sec.id);
                    setSearch("");
                  }}
                >
                  <Icon size={17} />
                  {leftOpen && (
                    <>
                      <span>{sec.label}</span>
                      {count > 0 && <small>{count}</small>}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
          {leftOpen && (
            <div className="fields-scroll" key={active + !!search}>
              {filteredSections.map((sec) => (
                <div key={sec.id}>
                  <div className="section-heading">
                    <span className="eyebrow">{sec.english}</span>
                    <h2>
                      {sec.label}
                      <span>
                        {
                          Object.keys(scheme.fields).filter((k) =>
                            k.startsWith(sec.id + "."),
                          ).length
                        }{" "}
                        项已选
                      </span>
                    </h2>
                    <p>{sec.description}</p>
                    <div className="section-actions">
                      <button
                        onClick={() => {
                          const next = clone(scheme),
                            items = Object.entries(next.fields).filter(([k]) =>
                              k.startsWith(sec.id + "."),
                            );
                          const allLocked =
                            items.length && items.every(([, v]) => v.locked);
                          items.forEach(([, v]) => (v.locked = !allLocked));
                          commit(next);
                        }}
                      >
                        <LockKeyhole size={11} />
                        锁定 / 解锁本组
                      </button>
                      <button onClick={() => clearModule(sec.id)}>
                        清空未锁定项
                      </button>
                    </div>
                    {sec.fields.some((f) => f.parent) && (
                      <button
                        className="browse-details"
                        onClick={() =>
                          setBrowseDetails((previous) => ({
                            ...previous,
                            [sec.id]: !previous[sec.id],
                          }))
                        }
                      >
                        <ChevronDown size={12} />
                        {browseDetails[sec.id]
                          ? "收起未选大类的细分选项"
                          : "浏览细分选项（不会自动选中）"}
                      </button>
                    )}
                  </div>
                  {sec.fields
                    .filter(
                      (f) =>
                        !f.parent ||
                        !!scheme.fields[`${sec.id}.${f.key}`] ||
                        !!search ||
                        (!scheme.fields[`${sec.id}.${f.parent}`] &&
                          browseDetails[sec.id]) ||
                        f.when?.includes(
                          valueOf(scheme, `${sec.id}.${f.parent}`),
                        ),
                    )
                    .map((f) => (
                      <FieldEditor
                        key={`${sec.id}.${f.key}`}
                        id={`${sec.id}.${f.key}`}
                        field={f}
                        item={scheme.fields[`${sec.id}.${f.key}`]}
                        onChange={changeField}
                        onLock={lockField}
                      />
                    ))}
                </div>
              ))}
              {!filteredSections.length && (
                <div className="empty-state">
                  <Search size={24} />
                  <p>没有找到这个参数</p>
                  <small>也可以在对应字段中填写自定义内容</small>
                </div>
              )}
              <div className="leave-blank">
                <CircleHelp size={13} />
                没选的参数，不会出现在复制内容中。
              </div>
            </div>
          )}
        </aside>
        <main className="center-panel">
          <div className="center-heading">
            <div>
              <span className="eyebrow">YOUR CREATIVE CANVAS</span>
              <h1>
                让灵感，有一个轮廓<span>。</span>
              </h1>
            </div>
            <div className="center-actions">
              <button
                onClick={() => {
                  setPending(null);
                  setModal("random");
                }}
              >
                <Dices size={14} />
                随机灵感
              </button>
              <button
                onClick={() => {
                  setPending(null);
                  setModal("templates");
                }}
              >
                <Bookmark size={14} />
                模板库
              </button>
            </div>
          </div>
          <Suspense
            fallback={
              <div className="studio webgl-fallback">
                正在准备本地 3D 工作区…
              </div>
            }
          >
            <Studio
              scheme={scheme}
              settings={db.settings}
              onSelect={(id) => {
                setActive(id);
                setLeftOpen(true);
                setSearch("");
              }}
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
                notify("已记录拍摄机位，自由观察仍保持独立");
              }}
            />
          </Suspense>
          <section className={`library ${!libraryOpen ? "closed" : ""}`}>
            <div className="library-header">
              <div className="library-tabs">
                {(
                  [
                    ["themes", "灵感场景"],
                    ["poses", "姿势预设"],
                    ["clothes", "服装造型"],
                    ["hair", "发型"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    className={library === id ? "active" : ""}
                    key={id}
                    onClick={() => {
                      setLibrary(id);
                      setLibraryOpen(true);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className="tiny-icon"
                title="折叠素材库"
                aria-label="切换素材库"
                onClick={() => setLibraryOpen(!libraryOpen)}
              >
                <ChevronDown
                  size={15}
                  style={{ transform: libraryOpen ? "rotate(180deg)" : "" }}
                />
              </button>
            </div>
            {libraryOpen && (
              <div className="library-cards">
                {library === "themes"
                  ? builtInTemplates.map((t, i) => (
                      <button
                        className="theme-card"
                        key={t.name}
                        onClick={() => {
                          setTemplateModule("all");
                          proposeTemplate(
                            Object.fromEntries(
                              Object.entries(t.values).map(([k, v]) => [
                                k,
                                selection(v!, "template"),
                              ]),
                            ),
                            undefined,
                            "all",
                          );
                        }}
                      >
                        <div
                          className={`theme-art theme-art-${i}`}
                          style={{ backgroundColor: t.color }}
                        >
                          <span className="theme-window" />
                          <span className="theme-figure" />
                          <small>0{i + 1}</small>
                        </div>
                        <strong>
                          {t.name}
                          <ChevronRight size={13} />
                        </strong>
                        <span>{t.subtitle}</span>
                      </button>
                    ))
                  : library === "poses"
                    ? posePresets.map(([name, cat, key], i) => (
                        <button
                          key={name}
                          className={`preset-card ${valueOf(scheme, `pose.${key}`) === name ? "selected" : ""}`}
                          onClick={() => applyPose(name, cat, key)}
                        >
                          <Accessibility
                            size={27}
                            strokeWidth={1.2}
                            style={{
                              transform: `rotate(${cat === "卧姿" ? 75 : ((i % 3) - 1) * 12}deg)`,
                            }}
                          />
                          <strong>{name}</strong>
                          <small>{cat} · 近似预览</small>
                        </button>
                      ))
                    : library === "hair"
                      ? [
                          "长直发",
                          "短发",
                          "波波头",
                          "长卷发",
                          "高马尾",
                          "盘发",
                        ].map((name) => (
                          <button
                            className={`preset-card ${valueOf(scheme, "subject.hair") === name ? "selected" : ""}`}
                            key={name}
                            onClick={() => changeField("subject.hair", name)}
                          >
                            <UserRound size={28} strokeWidth={1.2} />
                            <strong>{name}</strong>
                            <small>近似预览</small>
                          </button>
                        ))
                      : [
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
                        ].map((name) => (
                          <button
                            className="preset-card"
                            key={name}
                            onClick={() => {
                              const isDress =
                                  name.includes("裙") && name !== "半身裙",
                                swim = name.includes("泳"),
                                jump = name.includes("连体裤"),
                                bottom = [
                                  "半身裙",
                                  "长裤",
                                  "短裤",
                                  "阔腿裤",
                                  "运动裤",
                                ].includes(name);
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
                              try {
                                commit(
                                  mergeFields(scheme, {
                                    "wardrobe.category": selection(category),
                                    [`wardrobe.${key}`]: selection(name),
                                  }),
                                );
                              } catch (e) {
                                notify(errorText(e));
                              }
                            }}
                          >
                            <Shirt size={28} strokeWidth={1.2} />
                            <strong>{name}</strong>
                            <small>近似款式参考</small>
                          </button>
                        ))}
              </div>
            )}
          </section>
          <footer className="workspace-footer">
            <span>
              <span className="status-dot" />
              LOCAL FIRST · 数据只留在你的设备
            </span>
            <span>不必填满每个选项，灵感也可以留白。</span>
          </footer>
        </main>
        <aside className={`summary-panel ${!rightOpen ? "collapsed" : ""}`}>
          <div className="panel-header">
            <span>
              {rightOpen && (
                <>
                  <Clipboard size={16} />
                  创作简报 <small>{entries.length}</small>
                </>
              )}
            </span>
            <button
              className="tiny-icon"
              aria-label="切换简报面板"
              onClick={() => setRightOpen(!rightOpen)}
            >
              <PanelRightClose size={16} />
            </button>
          </div>
          {rightOpen && (
            <>
              <div className="summary-scroll">
                <div className="summary-intro">
                  <span className="eyebrow">
                    A LITTLE DIRECTION. ENDLESS POSSIBILITY.
                  </span>
                  <h3>只记录你的选择。</h3>
                  <p>
                    这里是你交给创作工具的全部内容。
                    <br />
                    没有预设填充，也没有多余的参数。
                  </p>
                </div>
                <div className="selected-heading">
                  <span>已选参数</span>
                  <button
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
                  <div className="selected-list">
                    {entries.map(([key, item]) => (
                      <div className="selected-row" key={key}>
                        <div>
                          <small>
                            {sectionLabel(key.split(".")[0])} /{" "}
                            {fieldLabel(key)}
                          </small>
                          <span title={displayValue(item.value)}>
                            {displayValue(item.value)}
                          </span>
                        </div>
                        <button
                          className="tiny-icon"
                          aria-label={`${item.locked ? "解锁" : "锁定"}已选${fieldLabel(key)}`}
                          onClick={() => lockField(key)}
                        >
                          {item.locked ? (
                            <LockKeyhole size={13} />
                          ) : (
                            <UnlockKeyhole size={13} />
                          )}
                        </button>
                        <button
                          className="tiny-icon"
                          disabled={item.locked}
                          aria-label={`移除已选${fieldLabel(key)}`}
                          onClick={() => changeField(key, null)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-selection">
                    <Layers size={26} strokeWidth={1.2} />
                    <strong>从一个想法开始</strong>
                    <p>
                      选个场景，或一种姿态。
                      <br />
                      只选大类，也完全可以。
                    </p>
                    <button onClick={() => setActive("scene")}>
                      去选择场景 <ArrowRight size={12} />
                    </button>
                  </div>
                )}
                {issues.length > 0 && (
                  <div className="conflicts">
                    {issues.map((issue, i) => (
                      <div key={i} className={issue.level}>
                        <AlertTriangle size={13} />
                        <span>{issue.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="export-heading">
                  <span>复制内容预览</span>
                  <div className="format-tabs">
                    <button
                      className={format === "brief" ? "active" : ""}
                      onClick={() => setFormat("brief")}
                    >
                      简报
                    </button>
                    <button
                      className={format === "json" ? "active" : ""}
                      onClick={() => setFormat("json")}
                    >
                      JSON
                    </button>
                  </div>
                </div>
                <textarea
                  className="brief-preview"
                  aria-label="复制内容预览"
                  readOnly
                  value={entries.length ? copiedText : ""}
                  placeholder="已选参数会在这里整理成创作简报…"
                />
                <div className="preview-note">
                  <CircleHelp size={13} />
                  <span>
                    3D 仅作造型与构图参考，不代表最终 AI
                    图像。未选参数不会被复制。
                  </span>
                </div>
              </div>
              <div className="copy-footer">
                <button
                  className="primary copy-button"
                  disabled={
                    !entries.length || issues.some((i) => i.level === "error")
                  }
                  onClick={copyCurrent}
                >
                  <Copy size={16} />
                  一键复制参数
                  <ArrowRight size={15} />
                </button>
                <small>
                  <History size={11} />
                  复制成功后，自动保存到本地历史
                </small>
                <button
                  className="export-link"
                  disabled={!entries.length}
                  onClick={() =>
                    download(
                      `${scheme.name}.md`,
                      brief(scheme),
                      "text/markdown;charset=utf-8",
                    )
                  }
                >
                  <ArrowDownToLine size={12} />
                  导出 Markdown
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
      {toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={17} />
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

      {modal === "history" && (
        <ModalShell
          title="创作历史"
          subtitle="每一次选择，都可以再回来。记录只保存在本地。"
          onClose={closeModal}
          wide
        >
          <div className="modal-toolbar">
            <div className="input-icon">
              <Search size={15} />
              <input
                aria-label="搜索历史记录"
                placeholder="搜索名称、场景或参数…"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>
            <select
              aria-label="历史记录类型"
              value={historyType}
              onChange={(e) => setHistoryType(e.target.value)}
            >
              <option value="all">全部记录</option>
              <option value="copy">复制历史</option>
              <option value="manual">手动版本</option>
              <option value="auto">恢复检查点</option>
            </select>
            <button
              className={favoriteOnly ? "active" : ""}
              onClick={() => setFavoriteOnly(!favoriteOnly)}
            >
              <Star size={14} />
              收藏
            </button>
          </div>
          <div className="modal-toolbar compact">
            <select
              aria-label="按方案筛选历史"
              value={historyScheme}
              onChange={(e) => setHistoryScheme(e.target.value)}
            >
              <option value="all">所有方案</option>
              {[
                ...new Map(
                  db.history.map((h) => [h.snapshot.id, h.snapshot.name]),
                ).entries(),
              ].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <input
              aria-label="按日期筛选历史"
              type="date"
              value={historyDate}
              onChange={(e) => setHistoryDate(e.target.value)}
            />
            <span className="muted">共 {historyList.length} 条</span>
            {checked.length > 0 && (
              <button
                className="danger"
                onClick={() => {
                  if (
                    window.confirm(`删除选中的 ${checked.length} 条历史记录？`)
                  ) {
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
                <Trash2 size={14} />
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
                    <button
                      className="history-card-main"
                      onClick={() => setHistoryItem(h.id)}
                    >
                      <small>
                        {h.kind === "copy"
                          ? "复制记录"
                          : h.kind === "manual"
                            ? "手动版本"
                            : "恢复检查点"}{" "}
                        · {fmtTime(h.time)}
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
                      className={`tiny-icon ${h.favorite ? "favorited" : ""}`}
                      aria-label={`${h.favorite ? "取消收藏" : "收藏"} ${h.name}`}
                      onClick={() =>
                        updateHistory(h.id, { favorite: !h.favorite })
                      }
                    >
                      <Star
                        size={15}
                        fill={h.favorite ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <History size={30} />
                  <p>还没有匹配的历史记录</p>
                  <small>保存方案或复制参数后，会出现在这里。</small>
                </div>
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
                      className="tiny-icon danger"
                      title="删除此记录"
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
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <pre>
                    {selectedHistory.text ??
                      (brief(selectedHistory.snapshot) || "空白方案")}
                  </pre>
                  <div className="action-row">
                    <button
                      onClick={() => openScheme(selectedHistory.snapshot, true)}
                    >
                      <Plus size={14} />
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
                      <Copy size={14} />
                      复制当时原文
                    </button>
                  </div>
                  <h4>与当前方案比较</h4>
                  <DiffList
                    diff={differences(scheme, selectedHistory.snapshot)}
                  />
                </>
              ) : (
                <div className="empty-state">
                  <ArrowLeft size={24} />
                  <p>选择一条记录查看详情</p>
                </div>
              )}
            </div>
          </div>
        </ModalShell>
      )}

      {modal === "schemes" && (
        <ModalShell
          title="我的方案"
          subtitle="保存完整编辑状态；复制时仍然只输出已选参数。"
          onClose={closeModal}
          wide
        >
          <div className="modal-toolbar">
            <button
              className="primary"
              onClick={() => openScheme(blankScheme())}
            >
              <Plus size={14} />
              新建方案
            </button>
            <button onClick={() => openScheme(scheme, true)}>
              <Copy size={14} />
              复制当前方案
            </button>
            <button
              onClick={() =>
                download(`${scheme.name}.json`, JSON.stringify(scheme, null, 2))
              }
            >
              <FileJson size={14} />
              导出当前方案
            </button>
            <button onClick={() => fileInput.current?.click()}>
              <Upload size={14} />
              导入
            </button>
          </div>
          <div className="scheme-grid">
            {db.schemes.map((item) => (
              <div className="scheme-card" key={item.id}>
                <div className="scheme-card-art">
                  <Aperture size={38} strokeWidth={1} />
                  <span>{Object.keys(item.fields).length} 项参数</span>
                </div>
                <h3>{item.name}</h3>
                <small>{fmtTime(item.updatedAt)}</small>
                <div className="action-row">
                  <button onClick={() => openScheme(item)}>
                    打开 <ArrowRight size={13} />
                  </button>
                  <button onClick={() => setCompareScheme(item.id)}>
                    比较
                  </button>
                  <button
                    className="tiny-icon danger"
                    aria-label={`删除方案${item.name}`}
                    onClick={() => {
                      if (window.confirm("删除此命名方案？历史记录仍保留。"))
                        setDb((d) =>
                          d
                            ? {
                                ...d,
                                schemes: d.schemes.filter(
                                  (x) => x.id !== item.id,
                                ),
                              }
                            : d,
                        );
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {!db.schemes.length && (
              <div className="empty-state">
                <FolderOpen size={28} />
                <p>还没有保存的方案</p>
                <button onClick={saveScheme}>保存当前方案</button>
              </div>
            )}
          </div>
          {compareTarget && (
            <div className="comparison">
              <h3>当前方案 → {compareTarget.name}</h3>
              <DiffList diff={differences(scheme, compareTarget)} />
            </div>
          )}
        </ModalShell>
      )}

      {modal === "settings" && (
        <ModalShell
          title="设置与本地数据"
          subtitle="无账号、无上传、无遥测。请定期备份你的创作。"
          onClose={closeModal}
        >
          <div className="settings-content">
            <h3>预览设置</h3>
            <label className="setting-row">
              渲染质量
              <select
                aria-label="渲染质量"
                value={db.settings.quality}
                onChange={(e) =>
                  setDb({
                    ...db,
                    settings: {
                      ...db.settings,
                      quality: e.target.value as "standard" | "low",
                    },
                  })
                }
              >
                <option value="standard">标准 · 阴影与抗锯齿</option>
                <option value="low">轻量 · 适合低性能设备</option>
              </select>
            </label>
            <h3>历史与恢复</h3>
            <label className="setting-row">
              自动检查点间隔
              <input
                aria-label="自动检查点间隔"
                type="number"
                min="30"
                max="3600"
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
              <span>秒</span>
            </label>
            <label className="setting-row">
              每方案自动检查点上限
              <input
                aria-label="自动检查点上限"
                type="number"
                min="1"
                max="1000"
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
              收藏、复制记录和手动版本不会被自动清理。共 {db.history.length}{" "}
              条历史，{db.schemes.length} 个方案。
            </p>
            <p className="muted">{estimate || "正在读取本地存储信息…"}</p>
            <h3>备份与导入</h3>
            <div className="action-row">
              <button
                className="primary"
                onClick={() =>
                  download(
                    `人像工坊-备份-${new Date().toISOString().slice(0, 10)}.json`,
                    JSON.stringify(db, null, 2),
                  )
                }
              >
                <ArrowDownToLine size={14} />
                导出全部数据
              </button>
              <button onClick={() => fileInput.current?.click()}>
                <Upload size={14} />
                导入方案 / 恢复备份
              </button>
            </div>
            <div className="notice">
              浏览器数据可能被清理。自动保存不等于永久备份，备份文件包含方案、原始复制文本、收藏与模板。
            </div>
            <h3>关于 3D 预览</h3>
            <p className="muted">
              使用原创程序化风格模型，服装与姿态为近似表达。五官、面料剪裁、复杂动作和照片级效果不在当前模型能力内。所有运行资源均为本地，不调用图片生成或
              AI 服务。
            </p>
            <button
              onClick={() => {
                download("当前方案-创作参数.json", brief(scheme, "json"));
              }}
            >
              导出纯创作参数 JSON
            </button>
          </div>
        </ModalShell>
      )}

      {(modal === "templates" || modal === "random") && (
        <ModalShell
          title={modal === "templates" ? "模板与灵感" : "受约束的随机灵感"}
          subtitle="先查看变动，再决定应用。锁定参数不会被覆盖。"
          onClose={closeModal}
          wide
        >
          {modal === "templates" ? (
            <>
              <div className="modal-toolbar">
                <select
                  aria-label="模板应用范围"
                  value={templateModule}
                  onChange={(e) => {
                    setTemplateModule(e.target.value);
                    setPending(null);
                  }}
                >
                  <option value="all">整套方案</option>
                  {sections.map((sec) => (
                    <option value={sec.id} key={sec.id}>
                      {sec.label}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="模板名称"
                  placeholder="为当前配置起一个模板名"
                  value={templateName}
                  maxLength={100}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (!templateName.trim()) {
                      notify("请填写模板名称");
                      return;
                    }
                    const fields = Object.fromEntries(
                      Object.entries(scheme.fields).filter(
                        ([k]) =>
                          templateModule === "all" ||
                          k.startsWith(templateModule + "."),
                      ),
                    );
                    if (!Object.keys(fields).length) {
                      notify("所选范围没有参数");
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
                            templateModule === "all" ||
                            templateModule === "camera"
                              ? clone(scheme.camera)
                              : null,
                        },
                        ...db.templates,
                      ],
                    });
                    setTemplateName("");
                    notify("模板已保存");
                  }}
                >
                  <Save size={14} />
                  存为模板
                </button>
              </div>
              <div className="template-grid">
                {builtInTemplates.map((t) => (
                  <button
                    key={t.name}
                    onClick={() =>
                      proposeTemplate(
                        Object.fromEntries(
                          Object.entries(t.values).map(([k, v]) => [
                            k,
                            selection(v!, "template"),
                          ]),
                        ),
                      )
                    }
                  >
                    <span style={{ background: t.color }} />
                    <strong>{t.name}</strong>
                    <small>{t.subtitle}</small>
                  </button>
                ))}
                {db.templates.map((t) => (
                  <div className="user-template" key={t.id}>
                    <button onClick={() => proposeTemplate(t.fields, t.camera)}>
                      <Bookmark size={18} />
                      <strong>{t.name}</strong>
                      <small>{Object.keys(t.fields).length} 项参数</small>
                    </button>
                    <button
                      className="tiny-icon"
                      aria-label={`删除模板${t.name}`}
                      onClick={() => {
                        if (window.confirm("删除这个自定义模板？"))
                          setDb({
                            ...db,
                            templates: db.templates.filter(
                              (x) => x.id !== t.id,
                            ),
                          });
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="module-choices">
                {sections.map((sec) => (
                  <label key={sec.id}>
                    <input
                      type="checkbox"
                      checked={randomModules.includes(sec.id)}
                      onChange={(e) => {
                        setRandomModules(
                          e.target.checked
                            ? [...randomModules, sec.id]
                            : randomModules.filter((x) => x !== sec.id),
                        );
                        setPending(null);
                      }}
                    />
                    {sec.label}
                  </label>
                ))}
              </div>
              <button
                className="primary"
                onClick={() => {
                  try {
                    setPending(randomize(scheme, randomModules));
                  } catch (e) {
                    notify(errorText(e));
                  }
                }}
                disabled={!randomModules.length}
              >
                <Dices size={15} />
                生成候选组合
              </button>
            </>
          )}
          {pending && (
            <div className="pending-panel">
              <h3>
                即将发生的变化 <small>{diff.length} 项</small>
              </h3>
              <DiffList diff={diff} />
              {conflicts(pending).map((c, i) => (
                <p className="muted" key={i}>
                  {c.text}
                </p>
              ))}
              <button
                className="primary"
                disabled={!diff.length}
                onClick={() => {
                  commit(pending);
                  closeModal();
                  notify("已应用，可以一键撤销");
                }}
              >
                <Check size={15} />
                确认应用
              </button>
            </div>
          )}
        </ModalShell>
      )}

      {modal === "fallback" && (
        <ModalShell
          title="手动复制"
          subtitle="浏览器暂未允许剪贴板访问。请选中下方文字后手动复制。"
          onClose={closeModal}
        >
          <textarea
            className="fallback-text"
            aria-label="手动复制内容"
            readOnly
            value={fallbackText}
            onFocus={(e) => e.target.select()}
          />
          <div className="action-row">
            <button
              onClick={() =>
                download(
                  "人像工坊-创作参数.txt",
                  fallbackText,
                  "text/plain;charset=utf-8",
                )
              }
            >
              下载文本
            </button>
            <button
              className="primary"
              onClick={() => {
                const record = fallbackRecord.current;
                if (record)
                  recordHistory(
                    record.snapshot,
                    "copy",
                    fallbackText,
                    record.format,
                  );
                fallbackRecord.current = null;
                closeModal();
                notify("已确认手动复制");
              }}
            >
              我已手动复制
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function DiffList({ diff }: { diff: ReturnType<typeof differences> }) {
  return (
    <div className="diff-list">
      {diff.length ? (
        diff.map((d) => (
          <div key={d.key}>
            <small>
              {sectionLabel(d.key.split(".")[0])} / {d.label}
            </small>
            <span>{d.before}</span>
            <ArrowRight size={12} />
            <strong>{d.after}</strong>
          </div>
        ))
      ) : (
        <p className="muted">没有参数差异。</p>
      )}
    </div>
  );
}
