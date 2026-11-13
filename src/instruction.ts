export const categories = [
  { id: "beauty", label: "美女写真", skill: "beauty-prompt" },
  { id: "lingerie", label: "内衣写真", skill: "lingerie-prompt" },
  { id: "candid", label: "纪实抓拍", skill: "candid-prompt" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export const personaNote =
  "人设锁定（绝美23岁东亚成年女性，身材匀称丰满，上围明显自然丰满圆润、富有真实体量感，配合纤细腰部，胸腰差明显，但不夸张、不假体感。）· 9:16 竖幅";

export const examples = ["雨夜便利店门口", "圣诞雪夜木屋", "清晨花市", "电梯间"] as const;

export const chipGroups = [
  { key: "wardrobe", label: "服装", options: ["裙装", "上下装", "泳装", "套装内衣"] },
  { key: "color", label: "颜色", options: ["酒红", "象牙", "黑色", "雾蓝"] },
  { key: "place", label: "场景", options: ["影棚", "室内", "城市街道", "海边"] },
  { key: "pose", label: "姿态", options: ["站立", "坐姿", "行走", "回望"] },
  { key: "light", label: "光线", options: ["自然光", "棚灯", "窗光", "夜灯"] },
  { key: "shot", label: "景别", options: ["特写", "半身", "全身"] },
] as const;

export type ChipKey = (typeof chipGroups)[number]["key"];

export type Draft = {
  category: CategoryId;
  theme: string;
  chips: Partial<Record<ChipKey, string>>;
  note: string;
  count: number;
};

export const emptyDraft: Draft = {
  category: "beauty",
  theme: "",
  chips: {},
  note: "",
  count: 5,
};

export function instruction(draft: Draft): string {
  const skill = categories.find((item) => item.id === draft.category)?.skill ?? "beauty-prompt";
  const bits: string[] = [];
  const theme = draft.theme.trim();
  if (theme) bits.push(`主题：${theme}`);
  const fixed = [
    ...chipGroups.flatMap((group) => {
      const value = draft.chips[group.key];
      return value ? [`${group.label}：${value}`] : [];
    }),
    ...(draft.note.trim() ? [draft.note.trim()] : []),
  ];
  if (fixed.length) bits.push(`固定：${fixed.join("，")}`);
  if (draft.count !== 5) bits.push(`数量：${draft.count}`);
  return bits.length ? `/${skill} ${bits.join("；")}` : `/${skill}`;
}
