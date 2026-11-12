import { describe, it, expect } from "vitest";
import {
  blankScheme,
  brief,
  conflicts,
  databaseSchema,
  initialDatabase,
  makeHistory,
  mergeFields,
  randomize,
  schemeSchema,
  selection,
  sparse,
  trimHistory,
  updateField,
} from "../../src/domain";

describe("稀疏创作参数", () => {
  it("空白方案不带预览默认值", () => {
    const s = blankScheme();
    expect(sparse(s)).toEqual({});
    expect(brief(s)).toBe("");
  });
  it("只选海边和裙装，不包含年龄、姿势、颜色或技术元数据", () => {
    let s = updateField(blankScheme(), "scene.location", "海边");
    s = updateField(s, "wardrobe.category", "裙装");
    expect(sparse(s)).toEqual({
      wardrobe: { category: "裙装" },
      scene: { location: "海边" },
    });
    expect(brief(s)).not.toMatch(/schema|年龄|站立|颜色|机位|自动/);
    expect(Object.keys(s.fields)).toHaveLength(2);
  });
  it("颜色可以独立选择，清除后模块被省略", () => {
    let s = updateField(blankScheme(), "wardrobe.color", "#728c80");
    expect(sparse(s)).toEqual({ wardrobe: { color: "#728c80" } });
    s = updateField(s, "wardrobe.color", null);
    expect(sparse(s)).toEqual({});
  });
  it("不使用是明确约束，自动只在主动选择时输出", () => {
    let s = updateField(blankScheme(), "accessories.necklace", "不使用");
    s = updateField(s, "lighting.source", "交由下游决定");
    expect(brief(s)).toContain("项链：不使用");
    expect(s.fields["lighting.source"].state).toBe("auto");
  });
  it("锁定项导出锁定语义，不输出无关字段", () => {
    const s = updateField(blankScheme(), "scene.location", "海边");
    s.fields["scene.location"].locked = true;
    expect(sparse(s)).toEqual({
      scene: { location: { value: "海边", locked: true } },
    });
    expect(updateField(s, "scene.location", "树林")).toBe(s);
  });
});

describe("级联、模板与随机", () => {
  it("更换大类清除失效子项", () => {
    let s = updateField(blankScheme(), "wardrobe.category", "裙装");
    s = updateField(s, "wardrobe.dress", "吊带裙");
    s = updateField(s, "wardrobe.category", "上下装");
    expect(s.fields["wardrobe.dress"]).toBeUndefined();
  });
  it("锁定子项阻止父类变更", () => {
    let s = updateField(blankScheme(), "wardrobe.category", "裙装");
    s = updateField(s, "wardrobe.dress", "吊带裙");
    s.fields["wardrobe.dress"].locked = true;
    expect(() => updateField(s, "wardrobe.category", "上下装")).toThrow("解锁");
  });
  it("模板不覆盖锁定参数", () => {
    const s = updateField(blankScheme(), "scene.location", "海边");
    s.fields["scene.location"].locked = true;
    const next = mergeFields(s, {
      "scene.location": selection("树林"),
      "subject.hair": selection("短发"),
    });
    expect(next.fields["scene.location"].value).toBe("海边");
    expect(next.fields["subject.hair"].value).toBe("短发");
  });
  it("随机只修改允许模块且保留锁定项", () => {
    const s = updateField(blankScheme(), "wardrobe.color", "#c9b9a7");
    s.fields["wardrobe.color"].locked = true;
    const next = randomize(s, ["wardrobe"]);
    expect(next.fields["wardrobe.color"].value).toBe("#c9b9a7");
    expect(
      Object.keys(next.fields).every((k) => k.startsWith("wardrobe.")),
    ).toBe(true);
  });
});

describe("冲突与持久化", () => {
  it("用户主动授权年龄自动时不误判为非法年龄", () => {
    const s = updateField(blankScheme(), "subject.age", "交由下游决定");
    expect(schemeSchema.safeParse(s).success).toBe(true);
    expect(conflicts(s)).toEqual([]);
  });
  it("导入拒绝无效焦段、零画幅和非数坐标", () => {
    expect(
      schemeSchema.safeParse(
        updateField(blankScheme(), "camera.focal", "999mm"),
      ).success,
    ).toBe(false);
    expect(
      schemeSchema.safeParse(updateField(blankScheme(), "camera.ratio", "3:0"))
        .success,
    ).toBe(false);
    const s = blankScheme();
    s.camera = { position: [NaN, 1, 2], target: [0, 0, 0] };
    expect(schemeSchema.safeParse(s).success).toBe(false);
  });
  it("锁定大类时不允许模板强加其他大类的子项", () => {
    const s = updateField(blankScheme(), "wardrobe.category", "裙装");
    s.fields["wardrobe.category"].locked = true;
    expect(() =>
      mergeFields(s, {
        "wardrobe.category": selection("上下装"),
        "wardrobe.top": selection("衬衫"),
      }),
    ).toThrow("已锁定");
  });
  it("自定义机位保留垂直视角，主动修改焦段后解除视角覆盖", () => {
    const s = updateField(blankScheme(), "camera.position", "记录的机位");
    s.camera = { position: [1, 2, 3], target: [0, 0.9, 0], verticalFov: 35 };
    expect(sparse(s)).toEqual({ camera: { position: s.camera } });
    const next = updateField(s, "camera.focal", "85mm");
    expect(next.camera?.verticalFov).toBeUndefined();
  });
  it("单选坐姿不会因缺少其他参数阻断", () => {
    const s = updateField(blankScheme(), "pose.category", "坐姿");
    expect(
      conflicts(s).some((c) => c.level === "error" || c.level === "warning"),
    ).toBe(false);
    expect(sparse(s)).toEqual({ pose: { category: "坐姿" } });
  });
  it("同手双任务能被检测", () => {
    let s = updateField(blankScheme(), "accessories.prop", "杯子");
    s = updateField(s, "accessories.binding", "左手持有");
    s = updateField(s, "pose.leftHand", "整理头发");
    expect(
      conflicts(s).some(
        (c) => c.level === "warning" && c.text.includes("左手"),
      ),
    ).toBe(true);
  });
  it("未成年人年龄与未知导入字段被拒绝", () => {
    const s = updateField(blankScheme(), "subject.age", "16 岁");
    expect(schemeSchema.safeParse(s).success).toBe(false);
    const bad = blankScheme();
    bad.fields["bad.script"] = selection("evil");
    expect(schemeSchema.safeParse(bad).success).toBe(false);
  });
  it("历史保存原文与独立快照", () => {
    const s = updateField(blankScheme(), "wardrobe.category", "裙装");
    const text = brief(s);
    const h = makeHistory(s, "copy", text, "brief");
    s.fields["wardrobe.category"].value = "泳装";
    expect(h.text).toBe(text);
    expect(h.snapshot.fields["wardrobe.category"].value).toBe("裙装");
  });
  it("检查点清理不影响复制记录、手动版本、收藏", () => {
    const s = blankScheme();
    const favorite = { ...makeHistory(s, "auto"), favorite: true };
    const copy = makeHistory(s, "copy", "原文");
    const manual = makeHistory(s, "manual");
    const list = trimHistory(
      [copy, manual, favorite, makeHistory(s, "auto"), makeHistory(s, "auto")],
      1,
    );
    expect(list).toHaveLength(4);
    expect(list).toContain(copy);
    expect(list).toContain(favorite);
    expect(list).toContain(manual);
  });
  it("全量备份往返保留大类选择、锁定和原文", () => {
    const d = initialDatabase();
    d.current = updateField(d.current, "wardrobe.category", "裙装");
    d.current.fields["wardrobe.category"].locked = true;
    d.history.push(makeHistory(d.current, "copy", brief(d.current), "brief"));
    const parsed = databaseSchema.parse(JSON.parse(JSON.stringify(d)));
    expect(parsed).toEqual(d);
    expect(Object.keys(parsed.current.fields)).toEqual(["wardrobe.category"]);
  });
});
