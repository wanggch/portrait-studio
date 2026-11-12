import { test, expect, type Page } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "一键复制参数" })).toBeVisible();
  await expect(page.getByText("风格参考，不会随选项变化")).toBeVisible();
}
async function selectSea(page: Page) {
  await page.getByRole("button", { name: "场景", exact: true }).click();
  await page
    .locator('[data-field="scene.location"]')
    .getByRole("button", { name: "海边", exact: true })
    .click();
}
async function referenceSrc(page: Page) {
  return page.locator("img.reference").getAttribute("src");
}

test("空白与部分选择：默认值不泄漏，参考图是真照片且不跟着选项变", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await expect(page.getByRole("button", { name: "一键复制参数" })).toBeDisabled();
  await expect(page.locator("canvas")).toHaveCount(0);
  const image = page.locator("img.reference");
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(200);
  const before = await referenceSrc(page);
  await page
    .locator('[data-field="wardrobe.category"]')
    .getByRole("button", { name: "裙装", exact: true })
    .click();
  await selectSea(page);
  expect(await referenceSrc(page)).toBe(before);
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

test("方向在空白方案上直接写入，并换上对应的参考照片", async ({ page }) => {
  await ready(page);
  const before = await referenceSrc(page);
  await page.getByRole("button", { name: /街角暖光/ }).click();
  await expect(page.getByRole("region", { name: "应用预览" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /城市街道/,
  );
  expect(await referenceSrc(page)).not.toBe(before);
  await page
    .locator('[data-field="wardrobe.category"]')
    .getByRole("button", { name: "裙装", exact: true })
    .click();
  expect(await referenceSrc(page)).not.toBe(before);
  const stayed = await referenceSrc(page);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /上下装/,
  );
  expect(await referenceSrc(page)).toBe(stayed);
});

test("已有文字时，方向要确认后才改简报和参考图", async ({ page }) => {
  await ready(page);
  const before = await referenceSrc(page);
  await selectSea(page);
  await page.getByRole("button", { name: /冷调特写/ }).click();
  await expect(page.getByRole("region", { name: "应用预览" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /^场景\n具体地点：海边$/,
  );
  expect(await referenceSrc(page)).toBe(before);
  await page.getByRole("button", { name: "确认应用", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "复制内容预览" })).toHaveValue(
    /偏冷/,
  );
  expect(await referenceSrc(page)).not.toBe(before);
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
  await expect(page.locator("img.reference")).toBeInViewport();
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
  await expect(page.locator("img.reference")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
  ).toBe(true);
});
