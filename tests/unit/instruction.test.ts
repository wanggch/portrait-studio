import { describe, expect, it } from "vitest";
import { emptyDraft, instruction } from "../../src/instruction";

describe("技能指令", () => {
  it("默认只写出技能名和主题，数量 5 时省略", () => {
    expect(instruction({ ...emptyDraft, theme: "雨夜便利店门口" })).toBe(
      "/beauty-prompt 主题：雨夜便利店门口",
    );
  });

  it("选中的参数和自由固定写进同一段，空的不写", () => {
    expect(
      instruction({
        ...emptyDraft,
        theme: "雨夜便利店门口",
        chips: { wardrobe: "裙装", color: "酒红" },
        note: "  ",
        count: 5,
      }),
    ).toBe("/beauty-prompt 主题：雨夜便利店门口；固定：服装：裙装，颜色：酒红");
  });

  it("类别决定技能名，数量不是 5 才写出来", () => {
    expect(
      instruction({
        ...emptyDraft,
        category: "candid",
        theme: "电梯间",
        note: "酒红丝绒吊带裙",
        count: 3,
      }),
    ).toBe("/candid-prompt 主题：电梯间；固定：酒红丝绒吊带裙；数量：3");
  });

  it("内衣写真对应 lingerie-prompt", () => {
    expect(instruction({ ...emptyDraft, category: "lingerie", theme: "清晨花市" })).toBe(
      "/lingerie-prompt 主题：清晨花市",
    );
  });
});
