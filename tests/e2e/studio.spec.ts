import { test, expect, type Page } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "一键复制参数" })).toBeVisible();
  await expect(page.getByText("选项不会改变姿势或服装")).toBeVisible();
  await page.waitForFunction(
    () => document.querySelector("[data-portrait]")?.getAttribute("data-ready") === "true",
  );
}
async function selectSea(page: Page) {
  await page.getByRole("button", { name: "场景", exact: true }).click();
  await page
    .locator('[data-field="scene.location"]')
    .getByRole("button", { name: "海边", exact: true })
    .click();
}
async function sample(page: Page) {
  return page.evaluate(() => {
    const source = document.querySelector("canvas") as HTMLCanvasElement;
    const tiny = document.createElement("canvas");
    tiny.width = tiny.height = 48;
    const ctx = tiny.getContext("2d")!;
    ctx.drawImage(source, 0, 0, 48, 48);
    return Array.from(ctx.getImageData(0, 0, 48, 48).data);
  });
}
function difference(a: number[], b: number[]) {
  let changed = 0;
  for (let i = 0; i < a.length; i += 4) {
    const delta =
      Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    if (delta > 40) changed += 1;
  }
  return changed;
}

test("空白与部分选择：默认值不泄漏，立体人像能渲染且不跟选项变", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await expect(page.getByRole("button", { name: "一键复制参数" })).toBeDisabled();
  const before = await sample(page);
  const colors = new Set<string>();
  for (let i = 0; i < before.length; i += 16)
    colors.add(`${before[i]},${before[i + 1]},${before[i + 2]}`);
  expect(colors.size).toBeGreaterThan(8);
  await page
    .locator('[data-field="wardrobe.category"]')
    .getByRole("button", { name: "裙装", exact: true })
    .click();
  await selectSea(page);
  expect(difference(before, await sample(page))).toBeLessThan(8);
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
  expect(errors).toEqual([]);
});

test("方向在空白方案上直接写入文字，模型仍可旋转", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: /街角暖光/ }).click();
  await expect(page.getByRole("region", { name: "应用预览" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /城市街道/,
  );
  const still = await sample(page);
  const box = await page.locator("canvas").boundingBox();
  expect(box).toBeTruthy();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 140, y + 20, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  expect(difference(still, await sample(page))).toBeGreaterThan(30);
});

test("已有文字时，方向要确认后才改简报", async ({ page }) => {
  await ready(page);
  await selectSea(page);
  await page.getByRole("button", { name: /冷调特写/ }).click();
  await expect(page.getByRole("region", { name: "应用预览" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /^场景\n具体地点：海边$/,
  );
  await page.getByRole("button", { name: "确认应用", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /偏冷/,
  );
  await expect(page.locator("[data-portrait]")).toHaveAttribute("data-ready", "true");
});

test("复制历史持久化、原文一致、恢复成副本", async ({ page }) => {
  await ready(page);
  await selectSea(page);
  const original = await page
    .getByRole("textbox", { name: "复制内容预览" })
    .inputValue();
  await page.getByRole("button", { name: "一键复制参数" }).click();
  await expect(page.getByRole("status")).toContainText("已复制");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(original);
  await expect(page.locator(".save-indicator")).toContainText("已保存到本地");
  await page.reload();
  await page.getByRole("button", { name: "历史记录", exact: true }).click();
  const record = page.locator(".history-card-main").first();
  await expect(record).toContainText("复制记录");
  await record.click();
  await expect(page.locator(".history-detail pre")).toHaveText(original);
  await page.getByRole("button", { name: "从记录新建", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "方案名称" })).toHaveValue(/副本/);
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    original,
  );
});

test("锁定、清除、撤销、重做", async ({ page }) => {
  await ready(page);
  await selectSea(page);
  await page.getByRole("button", { name: "锁定已选具体地点", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "移除已选具体地点", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "解锁已选具体地点", exact: true }).click();
  await page.getByRole("button", { name: "移除已选具体地点", exact: true }).click();
  await expect(page.getByRole("button", { name: "一键复制参数" })).toBeDisabled();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /海边/,
  );
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(page.getByRole("button", { name: "一键复制参数" })).toBeDisabled();
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
  await expect(page.locator(".history-card-main").first()).toContainText("复制记录");
});

test("备份导入失败不覆盖，成功则恢复", async ({ page }) => {
  await ready(page);
  await selectSea(page);
  await page.getByRole("button", { name: "一键复制参数" }).click();
  await page.getByRole("button", { name: "设置与备份", exact: true }).click();
  const savedFile = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出全部数据", exact: true }).click();
  const path = await (await savedFile).path();
  expect(path).toBeTruthy();
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page.getByRole("button", { name: "移除已选具体地点", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":"bad"}'),
  });
  await expect(page.getByRole("status")).toContainText("导入失败");
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue("");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /海边/,
  );
});

test("390 宽可操作，复制按钮和参考图都在视口内，没有横向滚动", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await expect(page.getByRole("button", { name: "一键复制参数" })).toBeInViewport();
  await expect(page.locator("canvas")).toBeInViewport();
  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(await noOverflow()).toBe(true);
  await selectSea(page);
  await expect(page.getByRole("button", { name: "一键复制参数" })).toBeEnabled();
  expect(await noOverflow()).toBe(true);
});

test("1280×800 下复制按钮可见且没有横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await ready(page);
  await expect(page.getByRole("button", { name: "一键复制参数" })).toBeInViewport();
  await expect(page.locator("canvas")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
  ).toBe(true);
});
