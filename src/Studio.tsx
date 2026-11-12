import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  Camera,
  Crosshair,
  Download,
  Eye,
  Maximize2,
  RotateCcw,
  ScanFace,
  Video,
} from "lucide-react";
import { valueOf, type Scheme, type Settings } from "./domain";

type V3 = [number, number, number];
type Pose = {
  hip: V3;
  root: V3;
  leftLeg: V3;
  rightLeg: V3;
  leftKnee: number;
  rightKnee: number;
  leftArm: V3;
  rightArm: V3;
  leftElbow: number;
  rightElbow: number;
  torso: number;
};
const origin: V3 = [0, 0, 0];
const base: Pose = {
  hip: [0, 0.95, 0],
  root: origin,
  leftLeg: [0, 0, -0.025],
  rightLeg: [0, 0, 0.025],
  leftKnee: 0.04,
  rightKnee: 0.04,
  leftArm: [0, 0, -0.12],
  rightArm: [0, 0, 0.12],
  leftElbow: -0.08,
  rightElbow: -0.08,
  torso: 0,
};
function getPose(s: Scheme): Pose {
  const p = { ...base },
    cat = valueOf(s, "pose.category"),
    detail =
      valueOf(s, "pose.variant") ||
      valueOf(s, "pose.standing") ||
      valueOf(s, "pose.sitting") ||
      valueOf(s, "pose.lying");
  if (cat === "坐姿") {
    p.hip = [0, 0.54, 0];
    p.leftLeg = [-1.45, 0, -0.06];
    p.rightLeg = [-1.45, 0, 0.06];
    p.leftKnee = p.rightKnee = 1.45;
    p.leftArm = [-0.35, 0, -0.1];
    p.rightArm = [-0.35, 0, 0.1];
    p.leftElbow = p.rightElbow = -0.9;
  }
  if (detail === "侧坐") {
    p.root = [0, 0.5, 0];
    p.leftLeg = [-1.3, 0.2, -0.12];
    p.rightLeg = [-1.4, 0.2, 0.15];
  }
  if (detail === "坐姿前倾") p.torso = 0.24;
  if (detail === "地坐") {
    p.hip = [0, 0.19, 0];
    p.leftLeg = [-1.35, 0, -0.42];
    p.rightLeg = [-1.35, 0, 0.42];
    p.leftKnee = p.rightKnee = 0.3;
  }
  if (cat === "卧姿") {
    p.hip = [0, 0.44, 0];
    p.root = [0, 0, -Math.PI / 2];
    p.leftLeg = [0, 0, -0.06];
    p.rightLeg = [0, 0, 0.08];
  }
  if (detail === "仰卧") p.root = [0, Math.PI / 2, -Math.PI / 2];
  if (detail === "俯卧") {
    p.root = [0, -Math.PI / 2, -Math.PI / 2];
    p.leftKnee = 0.45;
    p.rightKnee = 0.6;
  }
  if (detail === "侧卧") {
    p.leftLeg = [-0.3, 0, -0.04];
    p.rightLeg = [-0.5, 0, 0.04];
    p.leftKnee = 0.55;
    p.rightKnee = 0.65;
  }
  if (detail === "斜倚") {
    p.hip = [0, 0.38, 0];
    p.root = [0, 0, -0.9];
    p.rightElbow = -1.2;
  }
  if (cat === "蹲姿") {
    p.hip = [0, 0.43, 0];
    p.leftLeg = [-1.65, 0, -0.2];
    p.rightLeg = [-1.65, 0, 0.2];
    p.leftKnee = p.rightKnee = 2.25;
    p.torso = 0.28;
  }
  if (detail === "单膝蹲姿") {
    p.rightLeg = [-0.4, 0, 0.18];
    p.rightKnee = 1.8;
  }
  if (detail === "侧身蹲姿") p.root = [0, 0.7, 0];
  if (detail === "抱膝蹲姿") {
    p.leftArm = [-1, 0, -0.15];
    p.rightArm = [-1, 0, 0.15];
    p.leftElbow = p.rightElbow = -1.1;
  }
  if (cat === "跪姿") {
    p.hip = [0, 0.55, 0];
    p.leftKnee = p.rightKnee = 1.55;
  }
  if (detail === "单膝跪姿") {
    p.leftLeg = [-1.25, 0, -0.06];
    p.leftKnee = 1.25;
  }
  if (detail === "侧身跪姿") p.root = [0, 0.7, 0];
  if (detail === "跪姿回眸") p.root = [0, -0.7, 0];
  if (cat === "行走") {
    p.leftLeg = [-0.35, 0, -0.025];
    p.rightLeg = [0.34, 0, 0.025];
    p.rightKnee = 0.45;
    p.leftArm = [0.25, 0, -0.1];
    p.rightArm = [-0.3, 0, 0.1];
  }
  if (detail === "转身停顿") {
    p.root = [0, 0.55, 0];
    p.rightLeg = [0.18, 0, 0.02];
  }
  if (detail === "侧身站立") p.root = [0, 0.65, 0];
  if (detail === "前后错步" || valueOf(s, "pose.legs") === "前后错步") {
    p.leftLeg = [-0.16, 0, -0.06];
    p.rightLeg = [0.16, 0, 0.06];
    p.rightKnee = 0.18;
  }
  if (detail === "轻倚墙面") {
    p.root = [0, 0, -0.09];
    p.rightKnee = 0.45;
    p.rightLeg = [-0.15, 0, 0.08];
  }
  if (cat === "运动") {
    p.leftArm = [0, 0, -2.25];
    p.rightArm = [0, 0, 2.25];
    p.leftLeg = [0, 0, -0.2];
    p.rightLeg = [0, 0, 0.2];
  }
  if (detail === "弓步伸展") {
    p.hip = [0, 0.78, 0];
    p.leftLeg = [-0.85, 0, -0.04];
    p.leftKnee = 1.15;
    p.rightLeg = [0.55, 0, 0.04];
    p.leftArm = [-0.5, 0, -0.25];
    p.rightArm = [-0.5, 0, 0.25];
  }
  if (valueOf(s, "pose.legs") === "单腿屈膝") p.rightKnee = 0.6;
  if (valueOf(s, "pose.legs") === "自然分开") {
    p.leftLeg = [0, 0, -0.16];
    p.rightLeg = [0, 0, 0.16];
  }
  for (const side of ["left", "right"] as const) {
    const sign = side === "left" ? -1 : 1,
      hand = valueOf(s, `pose.${side}Hand`);
    if (hand === "扶腰") {
      p[`${side}Arm`] = [0, 0, sign * 0.55];
      p[`${side}Elbow`] = -1.45;
    }
    if (hand === "整理头发") {
      p[`${side}Arm`] = [-0.3, 0, sign * 2.2];
      p[`${side}Elbow`] = -1.25;
    }
    if (hand === "持道具") {
      p[`${side}Arm`] = [-0.4, 0, sign * 0.12];
      p[`${side}Elbow`] = -1.25;
    }
  }
  return p;
}

function Ellipsoid({
  at = origin,
  scale,
  color,
  roughness = 0.7,
}: {
  at?: V3;
  scale: V3;
  color: string;
  roughness?: number;
}) {
  return (
    <mesh position={at} scale={scale} castShadow receiveShadow>
      <sphereGeometry args={[1, 24, 20]} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}
function Box({
  at,
  size,
  color,
  rotation = origin,
}: {
  at: V3;
  size: V3;
  color: string;
  rotation?: V3;
}) {
  return (
    <mesh position={at} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}
function Tube({
  points,
  radius,
  color,
}: {
  points: V3[];
  radius: number;
  color: string;
}) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    [points],
  );
  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 16, radius, 8, false]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
  );
}
function Ring({
  at,
  radius,
  color,
  rotation = origin,
  tube = 0.007,
}: {
  at: V3;
  radius: number;
  color: string;
  rotation?: V3;
  tube?: number;
}) {
  return (
    <mesh position={at} rotation={rotation} castShadow>
      <torusGeometry args={[radius, tube, 8, 40]} />
      <meshStandardMaterial color={color} metalness={0.65} roughness={0.25} />
    </mesh>
  );
}
function Garment({
  bottom = false,
  length,
  radius,
  color,
  roughness,
  style = "normal",
}: {
  bottom?: boolean;
  length: number;
  radius: number;
  color: string;
  roughness: number;
  style?: "normal" | "straps" | "crop" | "twoPiece";
}) {
  const points = useMemo(
    () =>
      bottom
        ? [
            new THREE.Vector2(radius, -length),
            new THREE.Vector2(radius * 0.95, -length + 0.03),
            new THREE.Vector2(0.18, -0.055),
            new THREE.Vector2(0.135, 0.015),
          ]
        : [
            new THREE.Vector2(
              style === "twoPiece" ? 0.154 : 0.128,
              style === "crop" ? 0.15 : style === "twoPiece" ? 0.25 : -0.01,
            ),
            new THREE.Vector2(
              style === "twoPiece" ? 0.173 : 0.116,
              style === "twoPiece" ? 0.33 : 0.18,
            ),
            new THREE.Vector2(0.174, 0.34),
            ...(style === "straps" || style === "twoPiece"
              ? []
              : [
                  new THREE.Vector2(0.194, 0.39),
                  new THREE.Vector2(0.078, 0.44),
                ]),
          ],
    [bottom, length, radius, style],
  );
  return (
    <mesh scale={[1, 1, 0.73]} castShadow receiveShadow>
      <latheGeometry args={[points, 40]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Prop({ type, color }: { type: string; color: string }) {
  if (type === "书")
    return (
      <group rotation={[0.25, 0, 0]}>
        <Box at={[0, 0, 0]} size={[0.12, 0.025, 0.17]} color={color} />
        <Box at={[0, 0.002, 0]} size={[0.11, 0.02, 0.155]} color="#eee8db" />
      </group>
    );
  if (type === "杯子")
    return (
      <group>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.032, 0.085, 24]} />
          <meshStandardMaterial color="#e4dfd5" />
        </mesh>
        <Ring at={[0.046, 0, 0]} radius={0.025} color="#e4dfd5" />
      </group>
    );
  if (type === "球")
    return <Ellipsoid scale={[0.085, 0.085, 0.085]} color="#bc9778" />;
  if (type === "花束")
    return (
      <group>
        {[-0.035, 0, 0.035].map((x, i) => (
          <group key={x}>
            <Tube
              points={[
                [0, -0.1, 0],
                [x, 0.05, 0],
                [x, 0.1 + i * 0.015, 0],
              ]}
              radius={0.004}
              color="#70836a"
            />
            <Ellipsoid
              at={[x, 0.1 + i * 0.015, 0]}
              scale={[0.028, 0.025, 0.025]}
              color={i === 1 ? "#f5e6cc" : "#bb8a85"}
            />
          </group>
        ))}
      </group>
    );
  if (type === "雨伞")
    return (
      <group>
        <Tube
          points={[
            [0, -0.05, 0],
            [0, 0.5, 0],
          ]}
          radius={0.006}
          color="#6c6963"
        />
        <mesh position={[0, 0.5, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.38, 0.14, 32, 1, true]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  return null;
}

function Figure({
  scheme,
  onSelect,
}: {
  scheme: Scheme;
  onSelect?: (section: string) => void;
}) {
  const v = (k: string, d = "") => valueOf(scheme, k, d);
  const pose = getPose(scheme);
  const skin =
    {
      自然肤色: "#d2b09a",
      白皙: "#e4c8b4",
      小麦色: "#b98d70",
      深肤色: "#805c48",
    }[v("subject.skin")] || "#d2b09a";
  const hair =
    { 自然黑: "#292a28", 栗棕: "#574438", 浅金: "#b6a078", 酒红: "#634044" }[
      v("subject.hairColor")
    ] || "#40342d";
  const color = /^#[a-fA-F0-9]{6}$/.test(v("wardrobe.color"))
    ? v("wardrobe.color")
    : "#c9b9a7";
  const rough =
    v("wardrobe.material") === "缎面"
      ? 0.28
      : v("wardrobe.material") === "皮革"
        ? 0.4
        : 0.85;
  const isDress = v("wardrobe.category", "裙装") === "裙装",
    swim = v("wardrobe.category") === "泳装";
  const jumpsuit = v("wardrobe.category") === "连体装";
  const skirt = isDress || v("wardrobe.bottom") === "半身裙";
  const pants = !skirt && !swim;
  const upperStyle =
    swim && v("wardrobe.swim") === "分体泳装"
      ? "twoPiece"
      : v("wardrobe.top") === "短款上衣"
        ? "crop"
        : v("wardrobe.dress") === "吊带裙" || v("wardrobe.top") === "背心"
          ? "straps"
          : "normal";
  const short =
    v("wardrobe.bottom") === "短裤" || v("wardrobe.onepiece") === "短连体裤";
  const bodyScale =
    v("subject.body") === "纤细"
      ? 0.9
      : v("subject.body") === "丰盈"
        ? 1.12
        : 1;
  const height = Math.min(
    1.12,
    Math.max(0.9, parseFloat(v("subject.height", "168")) / 168 || 1),
  );
  const orientation =
    {
      正面: 0,
      "左侧 45°": -0.785,
      "右侧 45°": 0.785,
      侧面: 1.57,
      背面: Math.PI,
    }[v("pose.orientation")] || 0;
  const metal =
    (/^#[a-fA-F0-9]{6}$/.test(v("accessories.color"))
      ? v("accessories.color")
      : "") ||
    (v("accessories.material") === "银色金属" ? "#b9bdbe" : "#b89d69");
  const active = (k: string) =>
    !!v(`accessories.${k}`) && v(`accessories.${k}`) !== "不使用";
  const prop = v("accessories.prop"),
    binding = v("accessories.binding", "右手持有");
  const bodyClick =
    (section: string) => (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onSelect?.(section);
    };
  const arm = (side: "left" | "right") => {
    const sign = side === "left" ? -1 : 1;
    const hold =
      prop &&
      prop !== "不使用" &&
      (binding === (side === "left" ? "左手持有" : "右手持有") ||
        binding === "双手持有");
    const outerColor =
      v("wardrobe.outer") === "开衫"
        ? "#aaa28f"
        : v("wardrobe.outer") === "短夹克"
          ? "#817466"
          : "#8b877d";
    const sleeveColor =
      v("wardrobe.outer") && v("wardrobe.outer") !== "不使用"
        ? outerColor
        : color;
    const sleeves =
      !swim &&
      (v("wardrobe.sleeve") === "长袖" ||
        v("wardrobe.top") === "针织衫" ||
        v("wardrobe.top") === "衬衫" ||
        (v("wardrobe.outer") && v("wardrobe.outer") !== "不使用"));
    return (
      <group
        key={side}
        position={[sign * 0.195, 0.365, 0]}
        rotation={pose[`${side}Arm`]}
      >
        <Ellipsoid
          at={[0, -0.125, 0]}
          scale={[0.043, 0.158, 0.045]}
          color={sleeves ? sleeveColor : skin}
        />
        {!swim && !isDress && !sleeves && v("wardrobe.top") !== "背心" && (
          <Ellipsoid
            at={[0, -0.045, 0]}
            scale={[0.051, 0.07, 0.053]}
            color={color}
          />
        )}
        <group
          position={[0, -0.265, 0]}
          rotation={[
            hold && !v(`pose.${side}Hand`) ? -1.25 : pose[`${side}Elbow`],
            0,
            0,
          ]}
        >
          <Ellipsoid
            at={[0, -0.105, 0]}
            scale={[0.033, 0.132, 0.035]}
            color={sleeves ? sleeveColor : skin}
          />
          <group position={[0, -0.235, 0]}>
            <Ellipsoid
              at={[0, -0.025, 0.006]}
              scale={[0.03, 0.052, 0.016]}
              color={skin}
            />
            {hold && (
              <group
                position={[0, -0.025, 0.045]}
                rotation={[Math.PI / 2, 0, 0]}
                onClick={bodyClick("accessories")}
              >
                <Prop type={prop} color={color} />
              </group>
            )}
            {active("wrist") && side === "left" && (
              <group onClick={bodyClick("accessories")}>
                <Ring
                  at={[0, 0.015, 0]}
                  radius={0.035}
                  color={metal}
                  rotation={[Math.PI / 2, 0, 0]}
                />
                {v("accessories.wrist") === "腕表" && (
                  <Box
                    at={[0, 0.014, 0.036]}
                    size={[0.035, 0.035, 0.012]}
                    color={metal}
                  />
                )}
              </group>
            )}
          </group>
        </group>
      </group>
    );
  };
  const leg = (side: "left" | "right") => {
    const sign = side === "left" ? -1 : 1,
      legColor = pants ? (jumpsuit ? color : "#706e68") : skin;
    const wide = v("wardrobe.bottom") === "阔腿裤",
      athletic = v("wardrobe.bottom") === "运动裤";
    const shoe = v("wardrobe.shoes", "平底鞋"),
      shoeHeight = shoe === "高跟鞋" ? 0.045 : 0.025;
    return (
      <group
        key={side}
        position={[sign * 0.092, -0.045, 0]}
        rotation={pose[`${side}Leg`]}
      >
        <Ellipsoid
          at={[0, -0.185, 0]}
          scale={[
            pants && !short ? (wide ? 0.105 : 0.086) : 0.076,
            0.235,
            0.08,
          ]}
          color={short ? skin : legColor}
        />
        {short && (
          <Ellipsoid
            at={[0, -0.085, 0]}
            scale={[0.087, 0.145, 0.087]}
            color={legColor}
          />
        )}
        <group position={[0, -0.41, 0]} rotation={[pose[`${side}Knee`], 0, 0]}>
          <Ellipsoid
            at={[0, -0.19, 0]}
            scale={[
              pants && !short
                ? wide
                  ? 0.105
                  : athletic
                    ? 0.08
                    : 0.067
                : 0.047,
              0.225,
              wide ? 0.09 : 0.055,
            ]}
            color={pants && !short ? legColor : skin}
          />
          {v("wardrobe.socks") && v("wardrobe.socks") !== "不使用" && (
            <Ellipsoid
              at={[0, -0.31, 0]}
              scale={[
                0.046,
                v("wardrobe.socks") === "短袜" ? 0.065 : 0.14,
                0.05,
              ]}
              color="#e9e4da"
            />
          )}
          <group position={[0, -0.412, 0.04]} onClick={bodyClick("wardrobe")}>
            <Ellipsoid
              scale={[0.052, shoeHeight, 0.1]}
              color={
                shoe === "不使用"
                  ? skin
                  : shoe === "运动鞋"
                    ? "#e7e1d7"
                    : "#51493f"
              }
            />
            {shoe === "短靴" && (
              <Ellipsoid
                at={[0, 0.06, -0.035]}
                scale={[0.055, 0.09, 0.055]}
                color="#51493f"
              />
            )}
            {shoe === "高跟鞋" && (
              <Box
                at={[0, -0.023, -0.035]}
                size={[0.025, 0.04, 0.025]}
                color="#51493f"
              />
            )}
          </group>
        </group>
      </group>
    );
  };
  return (
    <group
      name="portrait-subject"
      rotation={[0, orientation, 0]}
      scale={[
        bodyScale * (v("pose.mirror") === "左右镜像" ? -1 : 1),
        height,
        bodyScale,
      ]}
    >
      <group position={pose.hip} rotation={pose.root}>
        <Ellipsoid
          at={[0, -0.015, 0]}
          scale={[0.17, 0.135, 0.12]}
          color={pants && !jumpsuit ? "#706e68" : color}
        />
        {leg("left")}
        {leg("right")}
        {skirt && (
          <group
            rotation={
              ["坐姿", "蹲姿"].includes(v("pose.category"))
                ? [-1, 0, 0]
                : origin
            }
            onClick={bodyClick("wardrobe")}
          >
            <Garment
              bottom
              length={
                v("wardrobe.length") === "长款"
                  ? 0.73
                  : v("wardrobe.length") === "短款"
                    ? 0.3
                    : 0.5
              }
              radius={v("wardrobe.dress") === "直筒连衣裙" ? 0.19 : 0.27}
              color={color}
              roughness={rough}
            />
          </group>
        )}
        <group rotation={[pose.torso, 0, 0]}>
          <group onClick={bodyClick("wardrobe")}>
            <group scale={[0.99, 0.99, 0.99]}>
              <Garment length={0} radius={0} color={skin} roughness={0.8} />
            </group>
            <Garment
              length={0}
              radius={0}
              color={color}
              roughness={rough}
              style={upperStyle}
            />
            {(upperStyle === "straps" || upperStyle === "twoPiece") &&
              [-1, 1].map((sign) => (
                <Box
                  key={sign}
                  at={[sign * 0.125, 0.385, 0.015]}
                  size={[0.025, 0.12, 0.16]}
                  color={color}
                />
              ))}
            {v("wardrobe.top") === "衬衫" ||
            v("wardrobe.dress") === "衬衫裙" ? (
              <>
                {[0.15, 0.23, 0.31].map((y) => (
                  <Ellipsoid
                    key={y}
                    at={[0, y, 0.12]}
                    scale={[0.006, 0.006, 0.004]}
                    color="#ede4d4"
                  />
                ))}
                <Box
                  at={[-0.035, 0.4, 0.08]}
                  size={[0.06, 0.05, 0.02]}
                  color="#e9e1d5"
                  rotation={[0, 0, -0.4]}
                />
                <Box
                  at={[0.035, 0.4, 0.08]}
                  size={[0.06, 0.05, 0.02]}
                  color="#e9e1d5"
                  rotation={[0, 0, 0.4]}
                />
              </>
            ) : null}
            {v("wardrobe.outer") && v("wardrobe.outer") !== "不使用" && (
              <>
                <Box
                  at={[-0.14, 0.22, 0.018]}
                  size={[0.105, 0.4, 0.21]}
                  color="#8b877d"
                />
                <Box
                  at={[0.14, 0.22, 0.018]}
                  size={[0.105, 0.4, 0.21]}
                  color="#8b877d"
                />
              </>
            )}
          </group>
          {arm("left")}
          {arm("right")}
          <Ellipsoid
            at={[0, 0.465, 0]}
            scale={[0.052, 0.085, 0.048]}
            color={skin}
          />
          <group
            position={[0, 0.64, 0.005]}
            rotation={[
              v("pose.head") === "低头"
                ? 0.2
                : v("pose.head") === "抬头"
                  ? -0.2
                  : 0,
              v("pose.head") === "向左转头"
                ? -0.5
                : v("pose.head") === "向右转头"
                  ? 0.5
                  : 0,
              0,
            ]}
            onClick={bodyClick("subject")}
          >
            <Ellipsoid scale={[0.103, 0.142, 0.097]} color={skin} />
            <Ellipsoid
              at={[0, -0.027, 0.089]}
              scale={[0.014, 0.025, 0.023]}
              color={skin}
            />
            {[-1, 1].map((sign) => (
              <group key={sign}>
                <Ellipsoid
                  at={[sign * 0.04, 0.015, 0.086]}
                  scale={[0.022, 0.007, 0.006]}
                  color="#3f3932"
                />
                <Ellipsoid
                  at={[sign * 0.041, 0.04, 0.082]}
                  scale={[0.025, 0.0035, 0.005]}
                  color={hair}
                />
                <Ellipsoid
                  at={[sign * 0.103, -0.018, 0]}
                  scale={[0.015, 0.026, 0.015]}
                  color={skin}
                />
              </group>
            ))}
            <Ellipsoid
              at={[0, -0.066, 0.084]}
              scale={[0.022, 0.006, 0.005]}
              color="#ad7c70"
            />
            <mesh position={[0, 0.012, -0.013]} scale={[0.111, 0.147, 0.101]}>
              <sphereGeometry
                args={[1, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55]}
              />
              <meshStandardMaterial color={hair} roughness={0.9} />
            </mesh>
            {["长直发", "长卷发", "波波头", "短发"].includes(
              v("subject.hair", "长直发"),
            ) && (
              <group>
                {Array.from(
                  { length: v("subject.hair") === "长卷发" ? 15 : 9 },
                  (_, i) => {
                    const angle = 0.2 + (i / 8) * Math.PI * 1.8,
                      x = Math.cos(angle) * 0.104,
                      z = -Math.sin(angle) * 0.083;
                    const len =
                      v("subject.hair") === "短发"
                        ? 0.08
                        : v("subject.hair") === "波波头"
                          ? 0.16
                          : 0.34;
                    if (z > 0.035 && Math.abs(x) < 0.07) return null;
                    return (
                      <Tube
                        key={i}
                        points={[
                          [x, 0.07, z],
                          [x * 1.1, -0.04, z],
                          [
                            x * 1.18 +
                              (v("subject.hair") === "长卷发"
                                ? Math.sin(i) * 0.02
                                : 0),
                            -len,
                            z - 0.02,
                          ],
                        ]}
                        radius={v("subject.hair") === "长卷发" ? 0.026 : 0.024}
                        color={hair}
                      />
                    );
                  },
                )}
              </group>
            )}
            {v("subject.hair") === "高马尾" && (
              <>
                <Ellipsoid
                  at={[0, 0.07, -0.11]}
                  scale={[0.06, 0.07, 0.06]}
                  color={hair}
                />
                <Tube
                  points={[
                    [0, 0.09, -0.1],
                    [0, 0.01, -0.17],
                    [0, -0.22, -0.15],
                  ]}
                  radius={0.045}
                  color={hair}
                />
              </>
            )}
            {v("subject.hair") === "盘发" && (
              <Ellipsoid
                at={[0, 0.08, -0.105]}
                scale={[0.073, 0.06, 0.055]}
                color={hair}
              />
            )}
            {active("earrings") &&
              [-1, 1].map((sign) =>
                v("accessories.earrings") === "耳钉" ? (
                  <Ellipsoid
                    key={sign}
                    at={[sign * 0.117, -0.04, 0.008]}
                    scale={[0.01, 0.01, 0.01]}
                    color={metal}
                  />
                ) : (
                  <Ring
                    key={sign}
                    at={[sign * 0.117, -0.065, 0]}
                    radius={
                      v("accessories.earrings") === "垂坠耳饰" ? 0.027 : 0.019
                    }
                    color={metal}
                  />
                ),
              )}
            {active("glasses") && (
              <group onClick={bodyClick("accessories")}>
                {[-1, 1].map((sign) => (
                  <group key={sign}>
                    <Ring
                      at={[sign * 0.044, 0.016, 0.102]}
                      radius={0.031}
                      color="#625b50"
                      tube={0.003}
                    />
                    {v("accessories.glasses") === "太阳镜" && (
                      <Ellipsoid
                        at={[sign * 0.044, 0.016, 0.102]}
                        scale={[0.029, 0.027, 0.004]}
                        color="#3a3933"
                      />
                    )}
                  </group>
                ))}
                <Box
                  at={[0, 0.017, 0.106]}
                  size={[0.025, 0.004, 0.004]}
                  color="#625b50"
                />
              </group>
            )}
            {active("hat") && (
              <group position={[0, 0.12, 0]} onClick={bodyClick("accessories")}>
                <mesh scale={[1, 0.45, 1]}>
                  <cylinderGeometry
                    args={[
                      0.13,
                      v("accessories.hat") === "宽檐帽" ? 0.23 : 0.15,
                      0.07,
                      40,
                    ]}
                  />
                  <meshStandardMaterial color="#c2ab83" />
                </mesh>
                <Ellipsoid
                  at={[0, 0.035, 0]}
                  scale={[0.12, 0.07, 0.12]}
                  color="#c2ab83"
                />
              </group>
            )}
            {active("hairpin") && (
              <Box
                at={[0.09, 0.07, 0.052]}
                size={[0.015, 0.07, 0.014]}
                color={metal}
                rotation={[0, 0, -0.45]}
              />
            )}
          </group>
          {active("necklace") && (
            <group onClick={bodyClick("accessories")}>
              <Ring
                at={[0, 0.405, 0.015]}
                radius={0.077}
                color={metal}
                rotation={[1.05, 0, 0]}
                tube={0.004}
              />
              {v("accessories.necklace") === "吊坠项链" && (
                <Ellipsoid
                  at={[0, 0.348, 0.086]}
                  scale={[0.014, 0.02, 0.007]}
                  color={metal}
                />
              )}
            </group>
          )}
          {active("scarf") && (
            <group onClick={bodyClick("accessories")}>
              <Ring
                at={[0, 0.465, 0]}
                radius={0.057}
                tube={0.018}
                color="#8c9c8b"
                rotation={[Math.PI / 2, 0, 0]}
              />
              <Box
                at={[0.04, 0.34, 0.105]}
                size={[0.05, 0.2, 0.015]}
                color="#8c9c8b"
                rotation={[0, 0, -0.2]}
              />
            </group>
          )}
          {active("bag") && (
            <group
              position={[0.29, -0.07, 0]}
              onClick={bodyClick("accessories")}
            >
              <Box at={[0, 0, 0]} size={[0.15, 0.16, 0.08]} color="#8b6950" />
              <Ring at={[0, 0.1, 0]} radius={0.055} color="#8b6950" />
              {v("accessories.bag") === "单肩包" && (
                <Tube
                  points={[
                    [0, 0.05, -0.02],
                    [-0.07, 0.45, -0.02],
                    [0, 0.05, 0.02],
                  ]}
                  radius={0.009}
                  color="#8b6950"
                />
              )}
            </group>
          )}
        </group>
        {active("belt") && (
          <group onClick={bodyClick("accessories")}>
            <mesh scale={[1, 1, 0.73]}>
              <cylinderGeometry
                args={[
                  0.126,
                  0.13,
                  v("accessories.belt") === "宽腰带" ? 0.06 : 0.025,
                  40,
                  1,
                  true,
                ]}
              />
              <meshStandardMaterial color="#665340" side={THREE.DoubleSide} />
            </mesh>
            <Box at={[0, 0, 0.1]} size={[0.035, 0.025, 0.012]} color={metal} />
          </group>
        )}
      </group>
      {prop && ["桌面放置", "地面放置"].includes(binding) && (
        <group position={[0.55, binding === "桌面放置" ? 0.82 : 0.1, 0.1]}>
          <Prop type={prop} color={color} />
        </group>
      )}
    </group>
  );
}

function Support({
  type,
  sitting = false,
}: {
  type: string;
  sitting?: boolean;
}) {
  if (type === "椅子")
    return (
      <group position={[0, 0, sitting ? -0.05 : -0.6]}>
        <Box at={[0, 0.46, 0]} size={[0.48, 0.055, 0.45]} color="#a99c87" />
        <Box at={[0, 0.77, -0.2]} size={[0.48, 0.56, 0.035]} color="#a99c87" />
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <Box
              key={`${x}${z}`}
              at={[x * 0.2, 0.225, z * 0.18]}
              size={[0.035, 0.45, 0.035]}
              color="#8f826e"
            />
          )),
        )}
      </group>
    );
  if (type === "沙发")
    return (
      <group position={[0, 0, -0.12]}>
        <Box at={[0, 0.3, 0]} size={[1.4, 0.3, 0.65]} color="#c2b9a6" />
        <Box at={[0, 0.65, -0.3]} size={[1.4, 0.5, 0.15]} color="#b5ac9a" />
        {[-1, 1].map((x) => (
          <Box
            key={x}
            at={[x * 0.65, 0.48, 0]}
            size={[0.15, 0.4, 0.65]}
            color="#b5ac9a"
          />
        ))}
      </group>
    );
  if (type === "床")
    return (
      <group position={[0, -0.01, 0]}>
        <Box at={[0, 0.08, 0]} size={[2.2, 0.16, 1.1]} color="#cfc5b6" />
        <Box at={[0, 0.2, 0]} size={[2.1, 0.12, 1]} color="#eee6da" />
      </group>
    );
  if (type === "桌子")
    return (
      <group position={[0.55, 0, 0]}>
        <Box at={[0, 0.75, 0]} size={[0.65, 0.05, 0.5]} color="#b6a48c" />
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <Box
              key={`${x}${z}`}
              at={[x * 0.27, 0.36, z * 0.2]}
              size={[0.035, 0.72, 0.035]}
              color="#96846f"
            />
          )),
        )}
      </group>
    );
  if (type === "墙面")
    return <Box at={[0, 1, -0.4]} size={[2.5, 2, 0.1]} color="#c9c5b9" />;
  if (type === "栏杆")
    return (
      <group position={[0, 0, -0.5]}>
        <Box at={[0, 1, 0]} size={[2.4, 0.04, 0.05]} color="#8c8d84" />
        {[-1, -0.5, 0, 0.5, 1].map((x) => (
          <Box
            key={x}
            at={[x, 0.5, 0]}
            size={[0.025, 1, 0.025]}
            color="#8c8d84"
          />
        ))}
      </group>
    );
  return null;
}

function Environment({
  scheme,
  minimal = false,
}: {
  scheme: Scheme;
  minimal?: boolean;
}) {
  const location = valueOf(scheme, "scene.location");
  const cat = valueOf(scheme, "pose.category");
  const support =
    valueOf(scheme, "scene.support") ||
    (cat === "坐姿" && valueOf(scheme, "pose.sitting") !== "地坐"
      ? "椅子"
      : cat === "卧姿"
        ? "床"
        : "");
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color={
            location === "海边"
              ? "#dbd0b6"
              : location === "树林"
                ? "#b9bfab"
                : "#dedbd3"
          }
          roughness={1}
        />
      </mesh>
      {!minimal && (
        <gridHelper
          args={[12, 24, "#c5c1b8", "#d0ccc3"]}
          position={[0, 0.001, 0]}
        />
      )}
      <mesh position={[0, 0.013, 0]} receiveShadow>
        <cylinderGeometry args={[0.93, 0.93, 0.022, 80]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.9} />
      </mesh>
      <Support type={support} sitting={cat === "坐姿"} />
      {valueOf(scheme, "accessories.binding") === "桌面放置" &&
        support !== "桌子" && <Support type="桌子" />}
      {["窗边", "客厅", "咖啡馆"].includes(location) && (
        <group position={[0, 0, -1.3]}>
          <Box at={[-1.3, 1.4, 0]} size={[0.8, 2.8, 0.1]} color="#d6d0c3" />
          <Box at={[1.3, 1.4, 0]} size={[0.8, 2.8, 0.1]} color="#d6d0c3" />
          <Box at={[0, 2.6, 0]} size={[2, 0.4, 0.1]} color="#d6d0c3" />
          {[-0.9, 0, 0.9].map((x) => (
            <Box
              key={x}
              at={[x, 1.45, 0]}
              size={[0.04, 2, 0.08]}
              color="#a79f90"
            />
          ))}
          <Box at={[0, 1.45, 0]} size={[1.8, 0.04, 0.08]} color="#a79f90" />
        </group>
      )}
      {location === "城市街道" &&
        [-2, -1.3, 1.3, 2].map((x, i) => (
          <Box
            key={x}
            at={[x, 0.7 + i * 0.2, -2]}
            size={[0.55, 1.4 + i * 0.4, 0.5]}
            color={i % 2 ? "#b6b5b0" : "#c9c4b8"}
          />
        ))}
      {location === "海边" && (
        <Box at={[0, -0.005, -5]} size={[40, 0.02, 7]} color="#9eb9b7" />
      )}
      {location === "树林" &&
        [-1.8, -1.1, 1.2, 1.9].map((x, i) => (
          <group key={x} position={[x, 0, -1.5 - (i % 2)]}>
            <Box at={[0, 0.7, 0]} size={[0.13, 1.4, 0.13]} color="#8c826a" />
            <Ellipsoid
              at={[0, 1.8, 0]}
              scale={[0.55, 0.85, 0.5]}
              color={i % 2 ? "#8c9c7f" : "#a2ae8b"}
            />
          </group>
        ))}
    </group>
  );
}

export type CameraApi = {
  capture: () => { position: V3; target: V3; verticalFov: number };
  view: (position: V3, target?: V3) => void;
  screenshot: () => void;
};
function CameraRig({
  scheme,
  photo,
  api,
  onFraming,
  onReady,
}: {
  scheme: Scheme;
  photo: boolean;
  api?: React.RefObject<CameraApi | null>;
  onFraming?: (cropped: boolean) => void;
  onReady?: (ready: boolean) => void;
}) {
  const { camera, gl, invalidate, size } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const scene = useThree((s) => s.scene);
  const v = (k: string, d = "") => valueOf(scheme, k, d);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.target.set(0, 0.9, 0);
    c.enableDamping = false;
    c.minDistance = 0.4;
    c.maxDistance = 14;
    c.maxPolarAngle = Math.PI * 0.92;
    c.enabled = !photo;
    const changed = () => invalidate();
    c.addEventListener("change", changed);
    controls.current = c;
    if (!photo) {
      (camera as THREE.PerspectiveCamera).fov = 35;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      camera.position.set(2.7, 1.85, 4.7);
      c.update();
      invalidate();
    }
    return () => {
      c.removeEventListener("change", changed);
      c.dispose();
    };
  }, [camera, gl, photo, invalidate]);
  useEffect(() => {
    if (!photo) return;
    const focal = Math.min(
      300,
      Math.max(10, parseFloat(v("camera.focal", "50")) || 50),
    );
    // Vertical full-frame dimension follows the current crop; focal length is preserved.
    const ratio = size.width / size.height;
    const sensorHeight =
      ratio < 1 ? Math.min(36, 24 / ratio) : Math.min(24, 36 / ratio);
    (camera as THREE.PerspectiveCamera).fov =
      scheme.camera?.verticalFov ??
      THREE.MathUtils.radToDeg(2 * Math.atan(sensorHeight / (2 * focal)));
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    if (scheme.camera && scheme.fields["camera.position"]) {
      camera.position.fromArray(scheme.camera.position);
      controls.current?.target.fromArray(scheme.camera.target);
    } else {
      const shot = v("camera.shot", "全身");
      const h =
        shot === "特写"
          ? 0.45
          : shot === "胸像"
            ? 0.7
            : shot === "半身"
              ? 1.1
              : shot === "七分身"
                ? 1.5
                : shot === "环境人像"
                  ? 3
                  : 2.05;
      const distance =
        h /
        (2 *
          Math.tan(
            THREE.MathUtils.degToRad(
              (camera as THREE.PerspectiveCamera).fov / 2,
            ),
          ));
      const yaw =
        { 正面: 0, 斜前方: 0.65, 侧面: 1.57, 斜后方: 2.35, 背面: Math.PI }[
          v("camera.angle")
        ] || 0;
      const elevation =
        v("camera.elevation") === "俯拍"
          ? 0.35
          : v("camera.elevation") === "仰拍"
            ? -0.2
            : 0.03;
      const y =
        shot === "特写" || shot === "胸像"
          ? 1.51
          : shot === "半身"
            ? 1.23
            : 0.92;
      const offset =
        v("camera.composition") === "左侧留白"
          ? -0.3
          : v("camera.composition") === "右侧留白"
            ? 0.3
            : 0;
      controls.current?.target.set(offset, y, 0);
      camera.position.set(
        Math.sin(yaw) * distance,
        y + elevation * distance,
        Math.cos(yaw) * distance,
      );
    }
    controls.current?.update();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    photo,
    scheme.camera,
    scheme.fields["camera.position"],
    v("camera.focal"),
    v("camera.shot"),
    v("camera.angle"),
    v("camera.elevation"),
    v("camera.composition"),
    size.width,
    size.height,
  ]);
  useEffect(() => {
    if (!api) return;
    api.current = {
      capture: () => ({
        position: camera.position.toArray() as V3,
        target: (controls.current?.target.toArray() || [0, 0.9, 0]) as V3,
        verticalFov: (camera as THREE.PerspectiveCamera).fov,
      }),
      view: (position, target = [0, 0.9, 0]) => {
        camera.position.fromArray(position);
        controls.current?.target.fromArray(target);
        controls.current?.update();
        invalidate();
      },
      screenshot: () => {
        const size = gl.getSize(new THREE.Vector2()),
          pixelRatio = gl.getPixelRatio();
        const aspect = size.x / size.y,
          width = Math.round(1600 * Math.min(1, aspect));
        try {
          gl.setPixelRatio(1);
          gl.setSize(width, Math.round(width / aspect), false);
          gl.render(scene, camera);
          const a = document.createElement("a");
          a.download = "人像工坊-取景参考.png";
          a.href = gl.domElement.toDataURL("image/png");
          a.click();
        } finally {
          gl.setPixelRatio(pixelRatio);
          gl.setSize(size.x, size.y, false);
          invalidate();
        }
      },
    };
    onReady?.(true);
    return () => {
      api.current = null;
      onReady?.(false);
    };
  }, [api, camera, gl, invalidate, scene, onReady]);
  useEffect(() => {
    if (!photo || !onFraming) return;
    const frame = requestAnimationFrame(() => {
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      const figure = scene.getObjectByName("portrait-subject");
      if (!figure) return;
      const box = new THREE.Box3().setFromObject(figure);
      const corners = [box.min.x, box.max.x].flatMap((x) =>
        [box.min.y, box.max.y].flatMap((y) =>
          [box.min.z, box.max.z].map((z) =>
            new THREE.Vector3(x, y, z).project(camera),
          ),
        ),
      );
      onFraming(
        corners.some(
          (p) => Math.abs(p.x) > 1.02 || Math.abs(p.y) > 1.02 || p.z > 1,
        ),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [scheme, size.width, size.height, photo, scene, camera, onFraming]);
  return null;
}

function World({
  scheme,
  minimal,
  onSelect,
}: {
  scheme: Scheme;
  minimal?: boolean;
  onSelect?: (section: string) => void;
}) {
  const direction = valueOf(scheme, "lighting.direction");
  const pos: V3 =
    direction === "右侧光"
      ? [4, 4, 2]
      : direction === "逆光"
        ? [0, 4, -4]
        : direction === "顶光"
          ? [0, 7, 0]
          : direction === "顺光"
            ? [0, 3, 5]
            : [-3, 5, 3];
  const time = valueOf(scheme, "scene.time");
  const temp =
    valueOf(scheme, "lighting.temperature") ||
    (time === "黄昏" || time === "清晨"
      ? "偏暖"
      : time === "夜晚"
        ? "偏冷"
        : "");
  return (
    <>
      <color attach="background" args={["#e5e1d8"]} />
      <fog attach="fog" args={["#e5e1d8", 9, 24]} />
      <ambientLight
        intensity={
          valueOf(scheme, "lighting.fill") === "弱补光"
            ? 0.5
            : valueOf(scheme, "lighting.fill") === "明显补光"
              ? 1.8
              : time === "夜晚"
                ? 0.4
                : 1.2
        }
      />
      <directionalLight
        position={pos}
        intensity={
          valueOf(scheme, "lighting.intensity") === "明亮"
            ? 4
            : valueOf(scheme, "lighting.intensity") === "柔和"
              ? 1.6
              : 2.6
        }
        color={
          temp === "偏冷" ? "#e0eeff" : temp === "偏暖" ? "#ffe1b3" : "#fff4e5"
        }
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-normalBias={0.03}
        shadow-radius={valueOf(scheme, "lighting.softness") === "硬光" ? 1 : 5}
      />
      <directionalLight
        position={[3, 3, -3]}
        intensity={
          valueOf(scheme, "lighting.rim") === "不使用"
            ? 0
            : valueOf(scheme, "lighting.rim") === "明显轮廓光"
              ? 3
              : 0.7
        }
        color="#f8eee0"
      />
      <Environment scheme={scheme} minimal={minimal} />
      <Figure scheme={scheme} onSelect={onSelect} />
    </>
  );
}

class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="webgl-fallback">
        3D 预览暂不可用
        <br />
        <small>参数编辑、保存和复制仍可使用。</small>
      </div>
    ) : (
      this.props.children
    );
  }
}
function WebGLCheck() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export default function Studio({
  scheme,
  settings,
  onCamera,
  onSelect,
}: {
  scheme: Scheme;
  settings: Settings;
  onCamera: (camera: NonNullable<Scheme["camera"]>) => void;
  onSelect: (section: string) => void;
}) {
  const mainApi = useRef<CameraApi | null>(null),
    photoApi = useRef<CameraApi | null>(null);
  const [mode, setMode] = useState<"observe" | "photo">("observe");
  const [webgl] = useState(WebGLCheck);
  const [grid, setGrid] = useState(true);
  const [cropped, setCropped] = useState(false);
  const [ready, setReady] = useState(false);
  const [photoReady, setPhotoReady] = useState(false);
  const stageRef = useRef<HTMLElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 600, height: 500 });
  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);
  const ratioRaw = valueOf(scheme, "camera.ratio", "3:4")
    .split(":")
    .map(Number);
  const ratio =
    ratioRaw.length === 2 && ratioRaw.every((n) => n > 0)
      ? Math.min(3, Math.max(0.3, ratioRaw[0] / ratioRaw[1]))
      : 0.75;
  return (
    <section className="studio" ref={stageRef}>
      <div className="studio-top">
        <div className="segmented">
          <button
            className={mode === "observe" ? "active" : ""}
            onClick={() => setMode("observe")}
          >
            <Eye size={14} />
            自由观察
          </button>
          <button
            className={mode === "photo" ? "active" : ""}
            onClick={() => setMode("photo")}
          >
            <Camera size={14} />
            拍摄视角
          </button>
        </div>
        <span className="live-dot">
          {ready ? "本地实时预览" : webgl ? "正在准备 3D…" : "参数编辑模式"}
        </span>
      </div>
      <div
        className="scene-main"
        style={
          mode === "photo"
            ? {
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: Math.min(stageSize.width, stageSize.height * ratio),
                height: Math.min(stageSize.height, stageSize.width / ratio),
                minHeight: 0,
              }
            : undefined
        }
      >
        {webgl ? (
          <SceneBoundary>
            <Canvas
              key={settings.quality}
              frameloop="demand"
              shadows={settings.quality !== "low"}
              dpr={settings.quality === "low" ? 1 : [1, 1.5]}
              camera={{
                position: [2.7, 1.85, 4.7],
                fov: 35,
                near: 0.01,
                far: 100,
              }}
              gl={{
                preserveDrawingBuffer: true,
                antialias: settings.quality !== "low",
              }}
            >
              <World scheme={scheme} onSelect={onSelect} minimal={!grid} />
              <CameraRig
                scheme={scheme}
                photo={mode === "photo"}
                api={mainApi}
                onReady={setReady}
              />
            </Canvas>
          </SceneBoundary>
        ) : (
          <div className="webgl-fallback">
            当前环境不支持 WebGL
            <br />
            <small>你仍可配置参数并复制创作简报</small>
          </div>
        )}
        {mode === "photo" && (
          <div className="thirds">
            <i />
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      <div className="scene-label">
        <span>FIGURE 01</span>
        <strong>成年女性 · 造型参考</strong>
        <small>程序化风格模型 / 非最终出图效果</small>
      </div>
      <div className="scene-tools">
        <button
          title="正面"
          aria-label="正面观察"
          onClick={() => {
            setMode("observe");
            setTimeout(() => mainApi.current?.view([0, 1.15, 4.3]), 0);
          }}
        >
          <Crosshair size={17} />
        </button>
        <button
          title="侧面"
          aria-label="侧面观察"
          onClick={() => {
            setMode("observe");
            setTimeout(() => mainApi.current?.view([4.3, 1.15, 0]), 0);
          }}
        >
          <RotateCcw size={17} />
        </button>
        <button
          title="背面"
          aria-label="背面观察"
          onClick={() => {
            setMode("observe");
            setTimeout(() => mainApi.current?.view([0, 1.15, -4.3]), 0);
          }}
        >
          <Eye size={17} />
        </button>
        <button
          title="俯视"
          aria-label="俯视观察"
          onClick={() => {
            setMode("observe");
            setTimeout(() => mainApi.current?.view([0, 4.5, 0.05]), 0);
          }}
        >
          <Camera size={17} />
        </button>
        <button
          title="面部"
          aria-label="聚焦面部"
          onClick={() => {
            setMode("observe");
            setTimeout(
              () => mainApi.current?.view([0, 1.6, 1.25], [0, 1.55, 0]),
              0,
            );
          }}
        >
          <ScanFace size={17} />
        </button>
        <button
          title="全身"
          aria-label="聚焦全身"
          onClick={() => {
            setMode("observe");
            setTimeout(() => mainApi.current?.view([2.7, 1.85, 4.7]), 0);
          }}
        >
          <Maximize2 size={17} />
        </button>
        <button
          title="导出拍摄取景图"
          aria-label="导出拍摄取景图"
          disabled={!photoReady}
          onClick={() => photoApi.current?.screenshot()}
        >
          <Download size={17} />
        </button>
      </div>
      {webgl && (
        <div className="viewfinder">
          <div className="viewfinder-title">
            <Video size={12} />
            取景预览<span>{valueOf(scheme, "camera.ratio", "3:4")}</span>
          </div>
          <div className="viewfinder-canvas" style={{ aspectRatio: ratio }}>
            <SceneBoundary>
              <Canvas
                frameloop="demand"
                dpr={1}
                camera={{ near: 0.01, far: 100 }}
                gl={{ preserveDrawingBuffer: true }}
              >
                <World scheme={scheme} minimal />
                <CameraRig
                  scheme={scheme}
                  photo
                  api={photoApi}
                  onFraming={setCropped}
                  onReady={setPhotoReady}
                />
              </Canvas>
            </SceneBoundary>
            <div className="thirds">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <small>
            {scheme.camera?.verticalFov
              ? `${scheme.camera.verticalFov.toFixed(0)}° 视角`
              : valueOf(scheme, "camera.focal", "50mm")}{" "}
            · {valueOf(scheme, "camera.shot", "全身参考")}
          </small>
        </div>
      )}
      <div className="studio-bottom">
        {cropped && valueOf(scheme, "camera.shot") === "全身" && (
          <small
            className="crop-warning"
            title="当前取景可能裁切人物；提示不影响复制参数"
          >
            全身可能被裁切
          </small>
        )}
        <span>
          {mode === "observe"
            ? "拖动旋转 · 滚轮缩放 · 右键平移"
            : "独立拍摄机位 · 仅用于构图参考"}
        </span>
        <button
          className="small-button"
          onClick={() => onCamera(mainApi.current!.capture())}
          disabled={!ready || mode === "photo"}
        >
          <Camera size={13} />
          设为拍摄机位
        </button>
        <button className="small-button" onClick={() => setGrid(!grid)}>
          {grid ? "隐藏网格" : "显示网格"}
        </button>
      </div>
    </section>
  );
}
