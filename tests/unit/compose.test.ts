import { describe, expect, it } from "vitest";
import { compose, composeSet, defaultAspect, defaultPersona, defaultSettings } from "../../src/compose";
import { themes } from "../../src/library";

const persona = defaultPersona;

describe("提示词组装", () => {
  it("每条都从锁定人物开始，并写成 9:16 竖幅", () => {
    for (const theme of themes) {
      for (const variation of theme.variations) {
        const text = compose(variation);
        expect(text.startsWith(persona)).toBe(true);
        expect(text).toContain(defaultAspect);
        expect(text).not.toContain("{{aspect}}");
        expect(text).not.toContain("4:5");
        expect(text).not.toContain("3:4");
      }
    }
  });

  it("衣服和场景还在，不会被人物句冲掉", () => {
    const theme = themes.find((item) => item.title === "精品店试衣间");
    expect(theme).toBeTruthy();
    const text = compose(theme!.variations[0]);
    expect(text).toContain("象牙白");
    expect(text).toContain("试衣间");
  });

  it("设置里改人物和画幅后，正文跟着变", () => {
    const variation = themes[0].variations[0];
    const text = compose(variation, { persona: "自定义人物。", aspect: "3:2横幅" });
    expect(text.startsWith("自定义人物。")).toBe(true);
    expect(text).toContain("3:2横幅");
    expect(text).not.toContain(defaultAspect);
  });

  it("整组导出保留编号和可粘贴的正文", () => {
    const theme = themes.find((item) => item.title === "城市天台日落")!;
    const set = composeSet(theme, defaultSettings);
    expect(set.startsWith("# 城市天台日落")).toBe(true);
    expect(set).toContain("## 1.");
    expect(set).toContain("```text");
    expect(set).toContain(persona);
  });
});
