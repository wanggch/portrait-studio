export type Preview = "实时" | "近似" | "仅导出";
export type Field = {
  key: string;
  label: string;
  options?: string[];
  preview: Preview;
  multi?: boolean;
  parent?: string;
  when?: string[];
  placeholder?: string;
  color?: boolean;
};
export type Section = {
  id: string;
  label: string;
  english: string;
  description: string;
  fields: Field[];
};
const f = (
  key: string,
  label: string,
  options?: string[],
  preview: Preview = "仅导出",
  extra: Partial<Field> = {},
): Field => ({ key, label, options, preview, ...extra });

export const sections: Section[] = [
  {
    id: "subject",
    label: "人物",
    english: "CHARACTER",
    description: "从一个轮廓，到独一无二的人物。所有设定均可留白。",
    fields: [
      f("name", "角色名称", undefined, "仅导出", {
        placeholder: "给她一个名字，或留白",
      }),
      f("age", "成年年龄", ["23 岁", "28 岁", "35 岁", "45 岁"]),
      f("appearance", "外貌特征", ["东亚面孔", "欧美面孔", "混血感"]),
      f("face", "脸型", ["鹅蛋脸", "圆脸", "方脸", "心形脸"]),
      f("features", "五官特点", ["柔和五官", "立体五官", "自然雀斑"]),
      f("skin", "肤色", ["自然肤色", "白皙", "小麦色", "深肤色"], "实时"),
      f("skinDetail", "皮肤特点", ["自然肤质", "细腻纹理", "雀斑", "晒痕"]),
      f("height", "身高", ["160 cm", "168 cm", "175 cm"], "近似"),
      f("body", "体型", ["匀称", "纤细", "丰盈"], "近似"),
      f("proportion", "身形比例", ["自然比例", "修长四肢", "宽肩", "明显腰线"]),
      f("muscle", "肌肉感", ["柔和", "适中", "运动感"]),
      f(
        "hair",
        "发型",
        ["长直发", "短发", "波波头", "长卷发", "高马尾", "盘发"],
        "近似",
      ),
      f("bangs", "刘海", ["无刘海", "侧分刘海", "齐刘海"]),
      f("hairColor", "发色", ["自然黑", "栗棕", "浅金", "酒红"], "实时"),
      f("makeup", "妆容", ["素颜感", "日常妆", "晚宴妆", "复古妆"]),
      f("makeupIntensity", "妆容浓淡", ["清淡", "适中", "浓郁"]),
      f("lip", "唇色", ["裸粉", "豆沙", "正红", "珊瑚"]),
      f("eyes", "眼妆", ["自然眼妆", "细眼线", "烟熏眼妆"]),
      f("expression", "表情", ["平静", "微笑", "专注", "惊喜", "若有所思"]),
      f(
        "temperament",
        "气质",
        ["温柔", "自信", "清冷", "活泼", "松弛"],
        "仅导出",
        { multi: true },
      ),
    ],
  },
  {
    id: "wardrobe",
    label: "服饰",
    english: "WARDROBE",
    description: "只选一个大类也可以。细节，由你决定到哪一步。",
    fields: [
      f(
        "category",
        "服装大类",
        ["上下装", "裙装", "连体装", "运动装", "泳装"],
        "近似",
      ),
      f(
        "dress",
        "裙装款式",
        ["A 字连衣裙", "直筒连衣裙", "吊带裙", "衬衫裙"],
        "近似",
        { parent: "category", when: ["裙装"] },
      ),
      f("top", "上装", ["T 恤", "衬衫", "针织衫", "背心", "短款上衣"], "近似", {
        parent: "category",
        when: ["上下装", "运动装"],
      }),
      f(
        "bottom",
        "下装",
        ["半身裙", "长裤", "短裤", "阔腿裤", "运动裤"],
        "近似",
        { parent: "category", when: ["上下装", "运动装"] },
      ),
      f("onepiece", "连体款式", ["连体裤", "短连体裤"], "近似", {
        parent: "category",
        when: ["连体装"],
      }),
      f("swim", "泳装款式", ["连体泳衣", "分体泳装"], "近似", {
        parent: "category",
        when: ["泳装"],
      }),
      f("outer", "外套", ["西装外套", "开衫", "短夹克", "不使用"], "近似"),
      f("fit", "版型", ["合身", "修身", "宽松"]),
      f("neck", "领型", ["圆领", "V 领", "方领", "翻领", "挂脖"]),
      f("sleeve", "袖型", ["无袖", "短袖", "长袖", "泡泡袖"]),
      f("length", "裙长", ["短款", "及膝", "长款"], "近似", {
        parent: "category",
        when: ["裙装"],
      }),
      f("waist", "腰线", ["自然腰线", "高腰", "低腰"]),
      f("material", "材质", ["棉", "针织", "牛仔", "缎面", "皮革"], "近似"),
      f(
        "color",
        "主色",
        ["#c9b9a7", "#f4eee4", "#26292d", "#728c80", "#9baac6", "#a66363"],
        "实时",
        { color: true },
      ),
      f("secondary", "辅色", undefined, "仅导出", { color: true }),
      f("pattern", "图案", ["纯色", "条纹", "格纹", "波点", "花卉"]),
      f(
        "detail",
        "服装点缀",
        ["刺绣", "蕾丝边", "蝴蝶结", "褶皱", "流苏", "金属扣"],
        "仅导出",
        { multi: true },
      ),
      f("wear", "穿着方式", [
        "自然垂落",
        "下摆扎入",
        "袖口卷起",
        "外套敞开",
        "扣合",
      ]),
      f("socks", "袜类", ["短袜", "长袜", "连裤袜", "不使用"], "近似"),
      f(
        "shoes",
        "鞋履",
        ["平底鞋", "高跟鞋", "短靴", "运动鞋", "凉鞋", "不使用"],
        "近似",
      ),
    ],
  },
  {
    id: "accessories",
    label: "饰品道具",
    english: "DETAILS",
    description: "恰到好处的点缀，让人物有自己的故事。",
    fields: [
      f("earrings", "耳饰", ["耳钉", "圆环耳饰", "垂坠耳饰", "不使用"], "近似"),
      f("necklace", "项链", ["细链", "吊坠项链", "珍珠项链", "不使用"], "近似"),
      f("wrist", "腕部饰品", ["手链", "腕表", "不使用"], "近似"),
      f("ring", "戒指", ["细戒指", "不使用"]),
      f("hairpin", "发饰", ["发夹", "发带", "不使用"], "近似"),
      f("glasses", "眼镜", ["圆框眼镜", "太阳镜", "不使用"], "近似"),
      f("hat", "帽子", ["宽檐帽", "贝雷帽", "不使用"], "近似"),
      f("belt", "腰带", ["细腰带", "宽腰带", "不使用"], "近似"),
      f("scarf", "围巾", ["丝巾", "长围巾", "不使用"], "近似"),
      f("bag", "包", ["单肩包", "手提包", "不使用"], "近似"),
      f(
        "material",
        "饰品材质",
        ["金色金属", "银色金属", "珍珠", "皮革"],
        "近似",
      ),
      f("color", "饰品颜色", undefined, "近似", { color: true }),
      f("side", "佩戴侧", ["左侧", "右侧", "双侧"]),
      f(
        "prop",
        "互动道具",
        ["书", "杯子", "花束", "雨伞", "球", "不使用"],
        "近似",
      ),
      f(
        "binding",
        "道具位置",
        ["左手持有", "右手持有", "双手持有", "桌面放置", "地面放置"],
        "近似",
      ),
      f("size", "大小", ["小", "适中", "大"]),
    ],
  },
  {
    id: "pose",
    label: "姿势",
    english: "POSE & GESTURE",
    description: "选一个自然的瞬间。身体、视线与镜头独立控制。",
    fields: [
      f(
        "category",
        "基础姿态",
        ["站立", "坐姿", "蹲姿", "跪姿", "卧姿", "行走", "运动"],
        "近似",
      ),
      f(
        "standing",
        "站姿",
        ["自然站立", "侧身站立", "前后错步", "轻倚墙面"],
        "近似",
        { parent: "category", when: ["站立"] },
      ),
      f("sitting", "坐姿细分", ["端坐", "侧坐", "坐姿前倾", "地坐"], "近似", {
        parent: "category",
        when: ["坐姿"],
      }),
      f("lying", "卧姿细分", ["仰卧", "侧卧", "俯卧", "斜倚"], "近似", {
        parent: "category",
        when: ["卧姿"],
      }),
      f(
        "orientation",
        "身体朝向",
        ["正面", "左侧 45°", "右侧 45°", "侧面", "背面"],
        "实时",
      ),
      f(
        "head",
        "头部朝向",
        ["正向", "向左转头", "向右转头", "低头", "抬头"],
        "近似",
      ),
      f("gaze", "视线", ["看镜头", "看远处", "看手中物件", "看向地面"]),
      f(
        "leftHand",
        "左手任务",
        ["自然下垂", "扶腰", "整理头发", "持道具", "扶椅"],
        "近似",
      ),
      f(
        "rightHand",
        "右手任务",
        ["自然下垂", "扶腰", "整理头发", "持道具", "扶椅"],
        "近似",
      ),
      f("legs", "腿部", ["并拢", "前后错步", "单腿屈膝", "自然分开"], "近似"),
      f("moment", "动作阶段", [
        "短暂停顿",
        "刚坐下",
        "即将起身",
        "刚转头",
        "迈步中",
      ]),
      f("support", "支撑关系", [
        "双脚着地",
        "臀部坐于椅面",
        "手肘支撑桌面",
        "身体倚靠墙面",
      ]),
      f("amplitude", "动作幅度", ["轻微", "自然", "明显"]),
      f("mirror", "镜像", ["左右镜像", "不镜像"], "实时"),
    ],
  },
  {
    id: "scene",
    label: "场景",
    english: "SPACE & SETTING",
    description: "一处空间，一种氛围。背景也可以留给想象。",
    fields: [
      f("category", "场景大类", ["室内", "城市", "自然", "影棚"], "近似"),
      f(
        "location",
        "具体地点",
        ["窗边", "客厅", "咖啡馆", "城市街道", "海边", "树林", "影棚"],
        "近似",
      ),
      f("space", "空间结构", ["开放空间", "走廊", "露台", "楼梯", "窗边"]),
      f(
        "support",
        "环境物件",
        ["椅子", "沙发", "桌子", "床", "栏杆", "墙面", "不使用"],
        "近似",
      ),
      f("time", "时间", ["清晨", "午后", "黄昏", "夜晚"], "近似"),
      f("weather", "天气", ["晴天", "阴天", "小雨", "薄雾"]),
      f("season", "季节", ["春", "夏", "秋", "冬"]),
      f("wind", "风力", ["无风", "微风", "明显的风"]),
      f("dynamic", "环境动态", ["碎发被风吹动", "树叶飘落", "远处人流"]),
      f("complexity", "背景复杂度", ["极简", "适中", "丰富"]),
      f("distance", "人物与背景", ["贴近背景", "适度分离", "明显纵深"]),
    ],
  },
  {
    id: "camera",
    label: "摄影",
    english: "CAMERA & FRAME",
    description: "找到那个角度。自由观察不会改变你的拍摄机位。",
    fields: [
      f(
        "shot",
        "景别",
        ["特写", "胸像", "半身", "七分身", "全身", "环境人像"],
        "实时",
      ),
      f(
        "angle",
        "水平机位",
        ["正面", "斜前方", "侧面", "斜后方", "背面"],
        "实时",
      ),
      f("elevation", "俯仰角", ["平视", "俯拍", "仰拍"], "实时"),
      f("focal", "焦段", ["35mm", "50mm", "85mm", "105mm"], "实时"),
      f("ratio", "画幅", ["3:4", "4:5", "1:1", "9:16", "16:9"], "实时"),
      f(
        "composition",
        "构图",
        ["居中", "三分法", "对称", "左侧留白", "右侧留白"],
        "近似",
      ),
      f("dof", "景深", ["背景清晰", "适度虚化", "浅景深"]),
      f("focus", "对焦目标", ["面部", "眼睛", "人物整体", "手中物件"]),
      f("tilt", "画面倾斜", ["水平", "左倾 5°", "右倾 5°"]),
      f("position", "自定义机位", undefined, "实时", {
        placeholder: "使用工作区的“设为拍摄机位”记录",
      }),
    ],
  },
  {
    id: "lighting",
    label: "光线风格",
    english: "LIGHT & MOOD",
    description: "让光线塑造轮廓，让色彩传递情绪。",
    fields: [
      f("source", "光源", ["自然光", "窗光", "棚灯", "街灯", "混合光"], "近似"),
      f(
        "direction",
        "主光方向",
        ["顺光", "左侧光", "右侧光", "逆光", "顶光"],
        "实时",
      ),
      f("intensity", "主光强度", ["柔和", "适中", "明亮"], "实时"),
      f("softness", "光线软硬", ["柔光", "硬光"], "近似"),
      f("temperature", "色温", ["偏暖", "中性", "偏冷"], "实时"),
      f("fill", "补光", ["弱补光", "自然补光", "明显补光"], "实时"),
      f("rim", "轮廓光", ["不使用", "柔和轮廓光", "明显轮廓光"], "近似"),
      f("style", "视觉风格", [
        "写实摄影",
        "电影感",
        "胶片",
        "时尚编辑",
        "插画",
      ]),
      f("tone", "色调", ["自然", "暖色", "冷色", "低饱和"]),
      f("texture", "质感", ["自然肤质", "胶片颗粒", "柔焦"], "仅导出", {
        multi: true,
      }),
    ],
  },
  {
    id: "story",
    label: "故事与输出",
    english: "STORY & INTENT",
    description: "不必描述全部。一个瞬间，也足以成为创作起点。",
    fields: [
      f("theme", "创作主题", undefined, "仅导出", {
        placeholder: "例如：午后窗边，读到一半忽然抬眸",
      }),
      f("activity", "正在做什么", [
        "阅读",
        "等人",
        "整理衣领",
        "散步",
        "喝咖啡",
      ]),
      f("moment", "瞬间状态", [
        "刚放下杯子",
        "即将起身",
        "忽然看向镜头",
        "短暂停顿",
      ]),
      f("emotion", "情绪意图", ["松弛", "期待", "专注", "轻微惊喜", "安静"]),
      f("usage", "用途", ["头像", "写真", "封面", "社交配图"]),
      f("mode", "输出意图", ["单个方案", "多套差异化创意", "同人物同造型系列"]),
      f("count", "期望数量", ["1", "3", "5", "9"]),
      f(
        "variable",
        "允许变化",
        ["姿势", "机位", "服装", "场景", "光线"],
        "仅导出",
        { multi: true },
      ),
      f("language", "输出语言", ["中文", "英文", "中英双语"]),
      f("include", "必须包含", undefined, "仅导出", {
        placeholder: "明确想保留的元素",
      }),
      f("exclude", "避免出现", undefined, "仅导出", {
        placeholder: "例如：文字、水印、多余人物",
      }),
      f("notes", "自由补充", undefined, "仅导出", {
        placeholder: "其他想法，都可以写在这里",
      }),
    ],
  },
];

export const fieldMap = new Map<string, Field & { section: string }>(
  sections.flatMap((s) =>
    s.fields.map(
      (field) => [`${s.id}.${field.key}`, { ...field, section: s.id }] as const,
    ),
  ),
);
export const allFields = [...fieldMap.entries()];
export const paletteNames: Record<string, string> = {
  "#c9b9a7": "燕麦色",
  "#f4eee4": "奶油白",
  "#26292d": "炭黑",
  "#728c80": "鼠尾草绿",
  "#9baac6": "雾蓝",
  "#a66363": "陶土红",
};
export const displayValue = (v: string | string[]) =>
  Array.isArray(v)
    ? v.map((x) => paletteNames[x] || x).join("、")
    : paletteNames[v] || v;

export const posePresets = [
  ["自然站立", "站立", "standing"],
  ["侧身站立", "站立", "standing"],
  ["前后错步", "站立", "standing"],
  ["轻倚墙面", "站立", "standing"],
  ["端坐", "坐姿", "sitting"],
  ["侧坐", "坐姿", "sitting"],
  ["坐姿前倾", "坐姿", "sitting"],
  ["地坐", "坐姿", "sitting"],
  ["仰卧", "卧姿", "lying"],
  ["侧卧", "卧姿", "lying"],
  ["俯卧", "卧姿", "lying"],
  ["斜倚", "卧姿", "lying"],
  ["自然蹲姿", "蹲姿", "variant"],
  ["单膝蹲姿", "蹲姿", "variant"],
  ["侧身蹲姿", "蹲姿", "variant"],
  ["抱膝蹲姿", "蹲姿", "variant"],
  ["双膝跪姿", "跪姿", "variant"],
  ["单膝跪姿", "跪姿", "variant"],
  ["侧身跪姿", "跪姿", "variant"],
  ["跪姿回眸", "跪姿", "variant"],
  ["迈步瞬间", "行走", "variant"],
  ["转身停顿", "行走", "variant"],
  ["舒展双臂", "运动", "variant"],
  ["弓步伸展", "运动", "variant"],
] as const;

export const builtInTemplates = [
  {
    name: "窗边的午后",
    subtitle: "柔光 / 安静 / 生活感",
    color: "#d6c5a9",
    values: {
      "scene.location": "窗边",
      "scene.time": "午后",
      "lighting.source": "窗光",
      "lighting.temperature": "偏暖",
      "pose.category": "坐姿",
      "wardrobe.category": "裙装",
      "story.activity": "阅读",
    },
  },
  {
    name: "海风来信",
    subtitle: "海边 / 微风 / 自然光",
    color: "#a8c6c4",
    values: {
      "scene.location": "海边",
      "scene.wind": "微风",
      "wardrobe.category": "裙装",
      "pose.category": "站立",
      "lighting.source": "自然光",
    },
  },
  {
    name: "城市漫步",
    subtitle: "街道 / 行走 / 电影感",
    color: "#b8b5ad",
    values: {
      "scene.location": "城市街道",
      "pose.category": "行走",
      "wardrobe.category": "上下装",
      "wardrobe.top": "衬衫",
      "wardrobe.bottom": "长裤",
      "lighting.style": "电影感",
    },
  },
  {
    name: "纯粹肖像",
    subtitle: "影棚 / 极简 / 轮廓光",
    color: "#b9b5cc",
    values: {
      "scene.location": "影棚",
      "camera.shot": "半身",
      "lighting.source": "棚灯",
      "lighting.direction": "左侧光",
      "lighting.rim": "柔和轮廓光",
    },
  },
];
