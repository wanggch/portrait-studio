import { test, expect, type Page } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "一键复制参数" }),
  ).toBeVisible();
}
async function selectSea(page: Page) {
  await page.getByRole("button", { name: "场景", exact: true }).click();
  await page
    .locator('[data-field="scene.location"]')
    .getByRole("button", { name: "海边", exact: true })
    .click();
}

async function rendered(page: Page) {
  await page.waitForFunction(() => {
    const source = document.querySelector(
      ".scene-main canvas",
    ) as HTMLCanvasElement | null;
    if (!source || !source.width || !source.height) return false;
    const sample = document.createElement("canvas");
    sample.width = sample.height = 64;
    const ctx = sample.getContext("2d")!;
    ctx.drawImage(source, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += 16)
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    return colors.size > 25;
  });
}

test("空白与部分选择：默认值不泄漏，支持大类，JSON 稀疏", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await expect(
    page.getByRole("button", { name: "一键复制参数" }),
  ).toBeDisabled();
  await page
    .locator('[data-field="wardrobe.category"]')
    .getByRole("button", { name: "裙装", exact: true })
    .click();
  await selectSea(page);
  const output = page.getByRole("textbox", { name: "复制内容预览" });
  await expect(output).toHaveValue(/服装大类：裙装/);
  await expect(output).toHaveValue(/具体地点：海边/);
  const text = await output.inputValue();
  expect(text).not.toMatch(/年龄|站立|主色|50mm|自动|未设置/);
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  expect(JSON.parse(await output.inputValue())).toEqual({
    wardrobe: { category: "裙装" },
    scene: { location: "海边" },
  });
  await rendered(page);
  await page.screenshot({ path: "test-results/workspace.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("复制历史持久化、原文一致、恢复成副本", async ({ page }) => {
  await ready(page);
  await selectSea(page);
  const original = await page
    .getByRole("textbox", { name: "复制内容预览" })
    .inputValue();
  await page.getByRole("button", { name: "一键复制参数" }).click();
  await expect(page.getByRole("status")).toContainText("已复制");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    original,
  );
  await expect(page.locator(".save-indicator")).toContainText("已保存到本地");
  await page.reload();
  await page.getByRole("button", { name: "历史记录", exact: true }).click();
  const record = page.locator(".history-card-main").first();
  await expect(record).toContainText("复制记录");
  await record.click();
  await expect(page.locator(".history-detail pre")).toHaveText(original);
  await page.getByRole("button", { name: "从记录新建", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "方案名称" })).toHaveValue(
    /副本/,
  );
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    original,
  );
});

test("锁定、清除、撤销、重做", async ({ page }) => {
  await ready(page);
  await selectSea(page);
  await page
    .getByRole("button", { name: "锁定已选具体地点", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "移除已选具体地点", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "解锁已选具体地点", exact: true })
    .click();
  await page
    .getByRole("button", { name: "移除已选具体地点", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "一键复制参数" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /海边/,
  );
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "一键复制参数" }),
  ).toBeDisabled();
});

test("模板确认前不修改，应用后可整体撤销", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: /海风来信/ }).click();
  await expect(page.getByRole("region", { name: "应用预览" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    "",
  );
  await page.getByRole("button", { name: "确认应用", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /海边/,
  );
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    "",
  );
});

test("自由观察不进入复制；明确设为机位才导出", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "侧面观察", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    "",
  );
  await page.getByRole("button", { name: "设为拍摄机位", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /自定义机位/,
  );
  const original = await page
    .getByRole("textbox", { name: "复制内容预览" })
    .inputValue();
  await page.getByRole("button", { name: "正面观察", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    original,
  );
});

test("WebGL 不可用时表单与复制仍可用", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
      return original.call(this, type as "2d", ...args);
    } as typeof original;
  });
  await ready(page);
  await expect(page.getByText("当前环境不支持 WebGL")).toBeVisible();
  await selectSea(page);
  await expect(
    page.getByRole("button", { name: "一键复制参数" }),
  ).toBeEnabled();
});

test("剪贴板拒绝时提供手动复制并由用户确认记录", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.reject(new Error("denied")),
    }),
  );
  await ready(page);
  await selectSea(page);
  await page.getByRole("button", { name: "一键复制参数" }).click();
  await expect(page.getByRole("dialog", { name: "手动复制" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "手动复制内容" })).toHaveValue(
    /海边/,
  );
  await page.getByRole("button", { name: "我已手动复制", exact: true }).click();
  await page.getByRole("button", { name: "历史记录", exact: true }).click();
  await expect(page.locator(".history-card-main").first()).toContainText(
    "复制记录",
  );
});

test("自定义年龄验证不破坏草稿持久化", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "人物", exact: true }).click();
  await page
    .getByRole("textbox", { name: "自定义成年年龄", exact: true })
    .fill("16 岁");
  await page
    .getByRole("button", { name: "添加自定义成年年龄", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("18 岁");
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    "",
  );
  await page
    .locator('[data-field="subject.age"]')
    .getByRole("button", { name: "交由下游决定", exact: true })
    .click();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /成年年龄：交由下游决定/,
  );
  await expect(page.locator(".save-indicator")).toContainText("已保存到本地");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /交由下游决定/,
  );
});

test("备份导入恢复历史与选择，失败文件不覆盖当前方案", async ({ page }) => {
  await ready(page);
  await selectSea(page);
  await page.getByRole("button", { name: "一键复制参数" }).click();
  await page.getByRole("button", { name: "设置与备份", exact: true }).click();
  const savedFile = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出全部数据", exact: true }).click();
  const downloaded = await savedFile;
  const path = await downloaded.path();
  expect(path).toBeTruthy();
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page
    .getByRole("button", { name: "移除已选具体地点", exact: true })
    .click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"schemaVersion":"bad"}'),
    });
  await expect(page.getByRole("status")).toContainText("导入失败");
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    "",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /海边/,
  );
  await page.getByRole("button", { name: "历史记录", exact: true }).click();
  await expect(page.locator(".history-card-main").first()).toContainText(
    "复制记录",
  );
});

test("画幅实际比例与拍摄取景一致，预览可下载", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "拍摄视角", exact: true }).click();
  const bounds = await page.locator(".scene-main").boundingBox();
  expect(bounds).toBeTruthy();
  expect(bounds!.width / bounds!.height).toBeCloseTo(0.75, 2);
  const shot = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出拍摄取景图", exact: true })
    .click();
  expect((await shot).suggestedFilename()).toContain(".png");
});

test("390 宽可点选、复制按钮在视口内，且没有横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await expect(page.getByRole("button", { name: "一键复制参数" })).toBeInViewport();
  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(await noOverflow()).toBe(true);
  await page.getByRole("button", { name: "场景", exact: true }).click();
  await page
    .locator('[data-field="scene.location"]')
    .getByRole("button", { name: "海边", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "一键复制参数" })).toBeEnabled();
  expect(await noOverflow()).toBe(true);
  await page.getByRole("button", { name: "历史记录", exact: true }).click();
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await expect(page.getByRole("button", { name: "一键复制参数" })).toBeVisible();
});

test("1280×800 下的主要工作区不横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await ready(page);
  await expect(
    page.getByRole("button", { name: "一键复制参数" }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await rendered(page);
  await page.screenshot({
    path: "test-results/workspace-1280.png",
    fullPage: true,
  });
});

test("浏览细分类不产生选择，24 个姿势预设可切换且无页面异常", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await page
    .getByRole("button", { name: "浏览细分选项（不会自动选中）", exact: true })
    .click();
  await expect(page.locator('[data-field="wardrobe.dress"]')).toBeVisible();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    "",
  );
  await page.getByRole("button", { name: "姿势预设", exact: true }).click();
  const presets = page.locator(".library-cards .preset-card");
  await expect(presets).toHaveCount(24);
  for (let i = 0; i < 24; i++) {
    await presets.nth(i).click();
    await expect(
      page.getByRole("textbox", { name: "复制内容预览" }),
    ).not.toHaveValue("");
  }
  await rendered(page);
  expect(errors).toEqual([]);
});
