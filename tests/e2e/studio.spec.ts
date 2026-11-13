import { expect, test } from "@playwright/test";

const persona = "绝美23岁东亚成年女性，身材匀称丰满";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test("默认类别点两下就能复制一条带人物和竖幅的提示词", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "美女写真" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: /城市天台日落/ }).click();
  const prompt = page.locator("pre").first();
  await expect(prompt).toContainText(persona);
  await expect(prompt).toContainText("9:16竖幅");
  await page.getByRole("button", { name: "复制这条" }).first().click();
  await expect(page.getByRole("status")).toHaveText("已复制");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.startsWith(persona)).toBe(true);
  expect(copied).toContain("9:16竖幅");
  expect(copied).not.toMatch(/年龄：|未设置|schema/);
});

test("换到纪实抓拍后，人物和画幅仍然锁住", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "纪实抓拍" }).click();
  await page.getByRole("button", { name: /电梯间抓拍/ }).click();
  await expect(page.locator("pre").first()).toContainText(persona);
  await expect(page.locator("pre").first()).toContainText("9:16竖幅");
  await page.getByRole("button", { name: "复制整组" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("# 电梯间抓拍");
  expect(copied).toContain("```text");
});

test("设置里可以改人物，也能恢复默认", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "设置" }).click();
  const field = page.getByRole("textbox", { name: "人物" });
  await expect(field).toHaveValue(new RegExp(persona));
  await field.fill("测试人物。");
  await page.getByRole("button", { name: "完成" }).click();
  await page.getByRole("button", { name: /城市天台日落/ }).click();
  await expect(page.locator("pre").first()).toContainText("测试人物。");
  await page.getByRole("button", { name: "设置" }).click();
  await page.getByRole("button", { name: "恢复默认" }).click();
  await page.getByRole("button", { name: "完成" }).click();
  await expect(page.locator("pre").first()).toContainText(persona);
});

test("390 宽可以搜索、打开并复制，没有横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("textbox", { name: "搜索主题" }).fill("试衣间");
  await page.getByRole("tab", { name: "内衣写真" }).click();
  await page.getByRole("button", { name: /精品店试衣间/ }).click();
  const copy = page.getByRole("button", { name: "复制这条" }).first();
  await expect(copy).toBeVisible();
  await copy.click();
  const box = await copy.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("1440 宽同时看见主题和提示词，没有横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: /城市天台日落/ }).click();
  await expect(page.getByRole("tab", { name: "美女写真" })).toBeVisible();
  await expect(page.locator("pre").first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
