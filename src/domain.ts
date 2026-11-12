import { z } from "zod";
import { sections, fieldMap, displayValue, type Section } from "./catalog";

const selectionSchema = z.object({
  value: z.union([
    z.string().min(1).max(4000),
    z.array(z.string().min(1).max(4000)).min(1).max(50),
  ]),
  locked: z.boolean(),
  source: z.enum(["user", "template", "random"]),
  state: z.enum(["specified", "auto", "none"]),
});
const point = z.tuple([
  z.number().finite().min(-100).max(100),
  z.number().finite().min(-100).max(100),
  z.number().finite().min(-100).max(100),
]);
export const schemeSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
    fields: z
      .record(selectionSchema)
      .refine(
        (v) =>
          Object.keys(v).every((k) => fieldMap.has(k) || k === "pose.variant"),
        "存在未知字段",
      ),
    camera: z
      .object({
        position: point,
        target: point,
        verticalFov: z.number().min(5).max(150).optional(),
      })
      .nullable(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((v, ctx) => {
    for (const error of inputErrors(v.fields)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    }
  });
export type Scheme = z.infer<typeof schemeSchema>;
export type Selection = z.infer<typeof selectionSchema>;
export type HistoryEntry = {
  id: string;
  kind: "copy" | "manual" | "auto";
  time: string;
  name: string;
  favorite: boolean;
  format?: string;
  text?: string;
  snapshot: Scheme;
};
export type Template = {
  id: string;
  name: string;
  fields: Scheme["fields"];
  camera?: Scheme["camera"];
};
export type Settings = {
  checkpointLimit: number;
  checkpointSeconds: number;
  quality: "standard" | "low";
};
export type Database = {
  schemaVersion: "1.0";
  current: Scheme;
  schemes: Scheme[];
  history: HistoryEntry[];
  templates: Template[];
  settings: Settings;
};

export const validAge = (v: string | string[]) =>
  /^(?:成年|成年人|成年女性)$/.test(String(v)) ||
  (/\d+/.test(String(v)) &&
    Number(String(v).match(/\d+/)?.[0]) >= 18 &&
    Number(String(v).match(/\d+/)?.[0]) <= 100);
export function inputErrors(fields: Scheme["fields"]): string[] {
  const messages: string[] = [];
  const specified = (key: string) =>
    fields[key] && fields[key].state !== "auto"
      ? String(fields[key].value)
      : "";
  const age = specified("subject.age");
  if (age && !validAge(age)) messages.push("人物年龄必须明确为 18 岁及以上。");
  const count = specified("story.count");
  if (count && (!/^\d+$/.test(count) || +count < 1 || +count > 100))
    messages.push("期望数量需为 1–100 的整数。");
  const focal = specified("camera.focal");
  if (
    focal &&
    (!/^\d+(?:\.\d+)?(?:mm)?$/.test(focal) ||
      parseFloat(focal) < 10 ||
      parseFloat(focal) > 300)
  )
    messages.push("焦段请输入 10–300mm 的数值。");
  const ratio = specified("camera.ratio");
  if (
    ratio &&
    (!/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(ratio) ||
      ratio.split(":").some((n) => +n <= 0 || +n > 100) ||
      +ratio.split(":")[0] / +ratio.split(":")[1] < 0.3 ||
      +ratio.split(":")[0] / +ratio.split(":")[1] > 3)
  )
    messages.push("画幅需为宽:高且宽高比在 0.3–3 之间，例如 3:4。");
  return messages;
}
export const uid = () => crypto.randomUUID();
export const clone = <T>(v: T): T => structuredClone(v);
export const blankScheme = (): Scheme => ({
  schemaVersion: "1.0",
  id: uid(),
  name: "未命名创作",
  fields: {},
  camera: null,
  updatedAt: new Date().toISOString(),
});
export const initialDatabase = (): Database => ({
  schemaVersion: "1.0",
  current: blankScheme(),
  schemes: [],
  history: [],
  templates: [],
  settings: {
    checkpointLimit: 100,
    checkpointSeconds: 30,
    quality: "standard",
  },
});
export const selection = (
  value: string | string[],
  source: Selection["source"] = "user",
): Selection => ({
  value,
  locked: false,
  source,
  state:
    value === "交由下游决定"
      ? "auto"
      : value === "不使用"
        ? "none"
        : "specified",
});
export const valueOf = (s: Scheme, id: string, fallback = ""): string => {
  const v = s.fields[id]?.value;
  return Array.isArray(v) ? v.join("、") : v || fallback;
};

export function sparse(s: Scheme) {
  const result: Record<string, Record<string, unknown>> = {};
  for (const section of sections) {
    for (const f of section.fields) {
      const v = s.fields[`${section.id}.${f.key}`];
      if (!v) continue;
      result[section.id] ??= {};
      result[section.id][f.key] = v.locked
        ? { value: v.value, locked: true }
        : v.value;
    }
  }
  if (s.fields["pose.variant"]) {
    result.pose ??= {};
    const v = s.fields["pose.variant"];
    result.pose.variant = v.locked ? { value: v.value, locked: true } : v.value;
  }
  if (s.camera && s.fields["camera.position"]) {
    result.camera ??= {};
    result.camera.position = s.fields["camera.position"].locked
      ? { value: s.camera, locked: true }
      : s.camera;
  }
  return result;
}

export function brief(s: Scheme, format: "brief" | "json" = "brief") {
  if (format === "json") return JSON.stringify(sparse(s), null, 2);
  return sections
    .map((section) => {
      const entries = section.fields.flatMap((f) => {
        const item = s.fields[`${section.id}.${f.key}`];
        return item
          ? [
              `${f.label}：${displayValue(item.value)}${item.locked ? "（锁定）" : ""}`,
            ]
          : [];
      });
      if (section.id === "pose" && s.fields["pose.variant"])
        entries.push(
          `姿势预设：${displayValue(s.fields["pose.variant"].value)}${s.fields["pose.variant"].locked ? "（锁定）" : ""}`,
        );
      return entries.length ? `${section.label}\n${entries.join("\n")}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export type Conflict = { level: "error" | "warning" | "info"; text: string };
export function conflicts(s: Scheme): Conflict[] {
  const out: Conflict[] = inputErrors(s.fields).map((text) => ({
    level: "error",
    text,
  }));
  const v = (k: string) => valueOf(s, k);
  for (const side of ["left", "right"]) {
    const task = v(`pose.${side}Hand`);
    const binding = v("accessories.binding");
    if (
      v("accessories.prop") &&
      v("accessories.prop") !== "不使用" &&
      (binding === (side === "left" ? "左手持有" : "右手持有") ||
        binding === "双手持有") &&
      task &&
      task !== "持道具" &&
      task !== "自然下垂"
    )
      out.push({
        level: "warning",
        text: `${side === "left" ? "左" : "右"}手既要${task}又要持道具，任务冲突。`,
      });
  }
  const cat = v("pose.category"),
    support = v("scene.support");
  if (["坐姿", "卧姿"].includes(cat) && !support)
    out.push({
      level: "info",
      text: "预览使用参考支撑物，不会加入复制内容；你可以只保留姿态。",
    });
  if (
    cat === "坐姿" &&
    ["墙面", "栏杆", "不使用"].includes(support) &&
    v("pose.sitting") !== "地坐"
  )
    out.push({ level: "warning", text: "当前坐姿与指定支撑物不匹配。" });
  if (cat === "卧姿" && ["椅子", "墙面", "不使用"].includes(support))
    out.push({ level: "warning", text: "当前卧姿需要更合适的支撑面。" });
  if (
    ["裙装", "连体装", "泳装"].includes(v("wardrobe.category")) &&
    (v("wardrobe.top") || v("wardrobe.bottom"))
  )
    out.push({ level: "warning", text: "连体主装与上下装占用重复服装槽位。" });
  if (
    v("pose.gaze") === "看镜头" &&
    v("pose.orientation") === "背面" &&
    v("camera.angle") !== "背面"
  )
    out.push({
      level: "warning",
      text: "背向人物与看镜头的要求可能不一致，请确认头部与拍摄机位。",
    });
  if (v("camera.position") && v("camera.angle"))
    out.push({
      level: "info",
      text: "当前使用记录的自定义拍摄机位，水平机位参数仅作为创作描述。",
    });
  for (const section of sections)
    for (const field of section.fields) {
      if (!field.parent || !s.fields[`${section.id}.${field.key}`]) continue;
      const parent = s.fields[`${section.id}.${field.parent}`];
      if (
        parent &&
        parent.state !== "auto" &&
        field.when &&
        !field.when.includes(String(parent.value))
      )
        out.push({
          level: "warning",
          text: `${section.label}的“${field.label}”与已选大类不适用，请确认。`,
        });
    }
  return out;
}

export function updateField(
  s: Scheme,
  id: string,
  value: string | string[] | null,
): Scheme {
  if (s.fields[id]?.locked) return s;
  const next = clone(s);
  if (
    value === null ||
    value === "" ||
    (Array.isArray(value) && !value.length)
  ) {
    delete next.fields[id];
    if (id === "camera.position") next.camera = null;
  } else next.fields[id] = selection(value);
  if (id === "camera.focal" && next.camera) delete next.camera.verticalFov;
  const [sectionId, key] = id.split(".");
  const sec = sections.find((x) => x.id === sectionId);
  if (sec)
    for (const child of sec.fields.filter((x) => x.parent === key)) {
      if (
        next.fields[`${sectionId}.${child.key}`] &&
        child.when &&
        !child.when.includes(String(value))
      ) {
        if (next.fields[`${sectionId}.${child.key}`].locked)
          throw new Error(`请先解锁“${child.label}”，再切换大类。`);
        delete next.fields[`${sectionId}.${child.key}`];
      }
    }
  if (id === "pose.category" && next.fields["pose.variant"]) {
    if (next.fields["pose.variant"].locked) throw new Error("请先解锁姿势预设");
    delete next.fields["pose.variant"];
  }
  return next;
}

export function mergeFields(
  s: Scheme,
  values: Scheme["fields"],
  module?: string,
): Scheme {
  let next = clone(s);
  for (const [key, item] of Object.entries(values)) {
    if (module && !key.startsWith(module + ".")) continue;
    if (next.fields[key]?.locked) {
      if (
        JSON.stringify(next.fields[key].value) !== JSON.stringify(item.value) &&
        sections.some((s) =>
          s.fields.some(
            (f) => f.parent === key.split(".")[1] && s.id === key.split(".")[0],
          ),
        )
      )
        throw new Error(`“${fieldLabel(key)}”已锁定，与候选模板的大类不一致。`);
      continue;
    }
    const field = fieldMap.get(key);
    if (field?.parent) {
      const parent = next.fields[`${key.split(".")[0]}.${field.parent}`];
      if (parent && field.when && !field.when.includes(String(parent.value)))
        throw new Error(`“${field.label}”不适用于当前已选大类。`);
    }
    const previous = next.fields[key];
    next = updateField(next, key, item.value);
    if (next.fields[key])
      next.fields[key] = { ...item, locked: previous?.locked || false };
  }
  const errors = inputErrors(next.fields);
  if (errors.length) throw new Error(errors[0]);
  return next;
}

export function randomize(s: Scheme, allowed: string[]): Scheme {
  const pick = <T>(values: T[]) =>
    values[Math.floor(Math.random() * values.length)];
  let next = clone(s);
  const defaults: Record<string, string[]> = {
    "subject.hair": ["长直发", "短发", "波波头", "高马尾", "盘发"],
    "subject.expression": ["微笑", "平静", "专注"],
    "accessories.earrings": ["耳钉", "圆环耳饰", "不使用"],
    "accessories.necklace": ["细链", "吊坠项链", "不使用"],
    "wardrobe.category": ["裙装", "上下装", "运动装"],
    "wardrobe.color": ["#c9b9a7", "#728c80", "#a66363", "#9baac6"],
    "pose.category": ["站立", "行走"],
    "scene.location": ["窗边", "客厅", "海边", "树林", "影棚"],
    "camera.shot": ["半身", "全身", "七分身"],
    "lighting.direction": ["左侧光", "右侧光", "顺光"],
    "story.emotion": ["松弛", "期待", "安静"],
  };
  for (const [key, values] of Object.entries(defaults)) {
    if (!allowed.includes(key.split(".")[0]) || next.fields[key]?.locked)
      continue;
    try {
      next = updateField(next, key, pick(values));
      next.fields[key].source = "random";
    } catch {
      /* locked descendants keep their category */
    }
  }
  if (conflicts(next).some((c) => c.level === "error" || c.level === "warning"))
    throw new Error("当前约束下未找到合理组合，请调整锁定项或随机范围。");
  return next;
}

export function makeHistory(
  s: Scheme,
  kind: HistoryEntry["kind"],
  text?: string,
  format?: string,
): HistoryEntry {
  return {
    id: uid(),
    kind,
    time: new Date().toISOString(),
    name: s.name,
    favorite: false,
    snapshot: clone(s),
    ...(text !== undefined ? { text, format } : {}),
  };
}
export function trimHistory(history: HistoryEntry[], limit: number) {
  const counts: Record<string, number> = {};
  return history.filter((h) => {
    if (h.kind !== "auto" || h.favorite) return true;
    counts[h.snapshot.id] = (counts[h.snapshot.id] || 0) + 1;
    return counts[h.snapshot.id] <= limit;
  });
}
export function differences(a: Scheme, b: Scheme) {
  return [...new Set([...Object.keys(a.fields), ...Object.keys(b.fields)])]
    .filter((k) => JSON.stringify(a.fields[k]) !== JSON.stringify(b.fields[k]))
    .map((key) => ({
      key,
      label: fieldMap.get(key)?.label || key,
      before: a.fields[key] ? displayValue(a.fields[key].value) : "未选",
      after: b.fields[key] ? displayValue(b.fields[key].value) : "未选",
    }));
}

const historySchema = z.object({
  id: z.string(),
  kind: z.enum(["copy", "manual", "auto"]),
  time: z.string().datetime(),
  name: z.string().max(100),
  favorite: z.boolean(),
  format: z.string().optional(),
  text: z.string().max(200000).optional(),
  snapshot: schemeSchema,
});
export const databaseSchema = z.object({
  schemaVersion: z.literal("1.0"),
  current: schemeSchema,
  schemes: z.array(schemeSchema).max(10000),
  history: z.array(historySchema).max(50000),
  templates: z
    .array(
      z
        .object({
          id: z.string(),
          name: z.string().max(100),
          fields: schemeSchema.innerType().shape.fields,
          camera: schemeSchema.innerType().shape.camera.optional(),
        })
        .superRefine((t, ctx) => {
          for (const message of inputErrors(t.fields))
            ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        }),
    )
    .max(10000),
  settings: z.object({
    checkpointLimit: z.number().int().min(1).max(1000),
    checkpointSeconds: z.number().int().min(30).max(3600),
    quality: z.enum(["standard", "low"]),
  }),
});
export const fieldLabel = (id: string) =>
  fieldMap.get(id)?.label || (id === "pose.variant" ? "姿势预设" : id);
export const sectionLabel = (id: string) =>
  sections.find((s: Section) => s.id === id)?.label || id;
