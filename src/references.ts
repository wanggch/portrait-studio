import cool from "./assets/references/cool.jpg";
import dusk from "./assets/references/dusk.jpg";
import street from "./assets/references/street.jpg";
import studio from "./assets/references/studio.jpg";

export const unsplashLicense = "https://unsplash.com/license";

export type Look = {
  id: string;
  name: string;
  subtitle: string;
  image: string;
  width: number;
  height: number;
  alt: string;
  photoId: string;
  depicts: string;
  values: Record<string, string>;
};

/** Real adult portraits. The picture is a style reference, not a render of the form. */
export const looks: Look[] = [
  {
    id: "studio",
    name: "影棚侧光",
    subtitle: "灰背景 · 棚灯 · 半身",
    image: studio,
    width: 900,
    height: 1350,
    alt: "成年女性的影棚人像：灰色背景，金色长发，黑色上衣，侧身看向镜头。",
    photoId: "photo-1524504388940-b1c1722653e1",
    depicts: "影棚灰背景前的侧身半身人像",
    values: {
      "scene.location": "影棚",
      "lighting.source": "棚灯",
      "lighting.direction": "左侧光",
      "lighting.style": "时尚编辑",
      "camera.shot": "半身",
      "pose.category": "站立",
    },
  },
  {
    id: "cool",
    name: "冷调特写",
    subtitle: "蓝光 · 特写 · 安静",
    image: cool,
    width: 900,
    height: 1125,
    alt: "成年女性的特写人像：冷蓝色棚灯，深色短发，黑色圆领上衣，正面看向镜头。",
    photoId: "photo-1534528741775-53994a69daeb",
    depicts: "冷蓝色棚灯下的面部特写",
    values: {
      "scene.location": "影棚",
      "lighting.source": "棚灯",
      "lighting.temperature": "偏冷",
      "lighting.style": "时尚编辑",
      "camera.shot": "特写",
    },
  },
  {
    id: "dusk",
    name: "黄昏户外",
    subtitle: "暖光 · 自然 · 胸像",
    image: dusk,
    width: 900,
    height: 1349,
    alt: "成年女性的户外人像：黄昏暖光，棕色长发，蓝白条纹衬衫，身后是田野。",
    photoId: "photo-1544005313-94ddf0286df2",
    depicts: "黄昏田野里的自然光胸像",
    values: {
      "scene.location": "树林",
      "scene.time": "黄昏",
      "lighting.source": "自然光",
      "lighting.temperature": "偏暖",
      "camera.shot": "胸像",
    },
  },
  {
    id: "street",
    name: "街角暖光",
    subtitle: "街道 · 微笑 · 半身",
    image: street,
    width: 900,
    height: 1350,
    alt: "成年女性的街拍人像：红色高领，深色卷发，城市背景虚化，正在微笑。",
    photoId: "photo-1494790108377-be9c29b29330",
    depicts: "城市虚化背景前的微笑半身人像",
    values: {
      "scene.location": "城市街道",
      "lighting.source": "自然光",
      "lighting.style": "写实摄影",
      "camera.shot": "半身",
      "wardrobe.category": "上下装",
    },
  },
];

export const resting = looks[0];

export const simpleGroups: { id: string; keys: string[] }[] = [
  { id: "scene", keys: ["location", "time"] },
  { id: "wardrobe", keys: ["category", "color"] },
  { id: "lighting", keys: ["source", "temperature", "style"] },
  { id: "camera", keys: ["shot", "ratio"] },
  { id: "pose", keys: ["category"] },
  { id: "subject", keys: ["age", "hair", "expression", "temperament"] },
];
