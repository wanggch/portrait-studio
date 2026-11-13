import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test("主题和选项收成一条技能指令，再复制", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "美女写真" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("人设锁定（绝美23岁东亚成年女性")).toBeVisible();
  await page.getByRole("button", { name: "雨夜便利店门口" }).click();
  await page.getByRole("button", { name: "裙装" }).click();
  await page.getByRole("button", { name: "增加数量" }).click();
  await expect(page.getByLabel("指令预览")).toHaveText(
    "/beauty-prompt 主题：雨夜便利店门口；固定：服装：裙装；数量：6",
  );
  await page.getByRole("button", { name: "复制", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("已复制");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "/beauty-prompt 主题：雨夜便利店门口；固定：服装：裙装；数量：6",
  );
  await expect(page.locator("[data-portrait]")).toHaveAttribute("data-ready", "true");
});

test("纪实抓拍换成 candid-prompt，数量回到 5 就不再写出", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "纪实抓拍" }).click();
  await page.getByRole("textbox", { name: "主题" }).fill("电梯间");
  await expect(page.getByLabel("指令预览")).toHaveText("/candid-prompt 主题：电梯间");
});

test("390 宽可以点选并复制，没有横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "清晨花市" }).click();
  const copy = page.getByRole("button", { name: "复制", exact: true });
  await copy.scrollIntoViewIfNeeded();
  await expect(copy).toBeVisible();
  const box = await copy.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("1440 宽同时看见人像和指令", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "主题" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
