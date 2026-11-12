import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import colorUrl from "./assets/portrait/color.jpg";
import normalUrl from "./assets/portrait/normal.jpg";

const modelUrl = new URL("./assets/portrait/LeePerrySmith.glb", import.meta.url).href;

export default function Portrait() {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const controlsRef = useRef<OrbitControls | null>(null);
  const home = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }
    let alive = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.setClearColor("#3a322c");
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#3a322c");
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.7;
    controls.minDistance = 4.2;
    controls.maxDistance = 14;
    controls.target.set(0, 1.15, 0);
    camera.position.set(0.12, 1.22, 6.5);
    home.current = {
      position: camera.position.clone(),
      target: controls.target.clone(),
    };
    controls.update();

    scene.add(new THREE.AmbientLight("#fff6ef", 0.7));
    scene.add(new THREE.HemisphereLight("#fff4ea", "#6a5348", 0.55));
    const key = new THREE.DirectionalLight("#fff1e2", 3.4);
    key.position.set(2.4, 3.6, 4.8);
    const fill = new THREE.DirectionalLight("#d5e0f0", 1.05);
    fill.position.set(-3.6, 1.4, 2.8);
    const rim = new THREE.DirectionalLight("#ffd0b4", 1.15);
    rim.position.set(-1.2, 2.8, -3.8);
    scene.add(key, fill, rim);

    let texturesReady = 0;
    let meshReady = false;
    const markReady = () => {
      if (!alive || !meshReady || texturesReady < 2) return;
      requestAnimationFrame(() => {
        if (alive) setReady(true);
      });
    };
    const color = new THREE.TextureLoader().load(colorUrl, () => {
      texturesReady += 1;
      markReady();
    });
    color.colorSpace = THREE.SRGBColorSpace;
    color.flipY = false;
    color.anisotropy = 8;
    const normal = new THREE.TextureLoader().load(normalUrl, () => {
      texturesReady += 1;
      markReady();
    });
    normal.colorSpace = THREE.NoColorSpace;
    normal.flipY = false;

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (!alive) return;
        const mesh = gltf.scene.getObjectByName("LeePerrySmith");
        if (!mesh || !(mesh as THREE.Mesh).isMesh) {
          setFailed(true);
          return;
        }
        const head = mesh as THREE.Mesh;
        head.material = new THREE.MeshStandardMaterial({
          map: color,
          normalMap: normal,
          normalScale: new THREE.Vector2(0.85, -0.85),
          roughness: 0.58,
          metalness: 0,
        });
        scene.add(head);
        meshReady = true;
        markReady();
      },
      undefined,
      () => {
        if (alive) setFailed(true);
      },
    );

    let frame = 0;
    const loop = () => {
      if (!alive) return;
      frame = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    const resize = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 800 ? 1.5 : 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    loop();

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      color.dispose();
      normal.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
      controlsRef.current = null;
    };
  }, []);

  return (
    <div className="portrait-frame" ref={host} data-portrait="scan" data-ready={ready ? "true" : "false"}>
      <p className="portrait-caption">
        <strong>拖动旋转，双指缩放</strong>
        <span>成年男性头部扫描，双眼闭合，没有头发和衣服。选项不会改变姿势、发型或衣服。</span>
      </p>
      <button
        className="portrait-reset"
        type="button"
        onClick={() => {
          const controls = controlsRef.current;
          const pose = home.current;
          if (!controls || !pose) return;
          controls.object.position.copy(pose.position);
          controls.target.copy(pose.target);
          controls.update();
        }}
      >
        回到正面
      </button>
      {failed && (
        <div className="portrait-fallback">
          当前环境无法显示立体人像
          <small>参数和复制仍然可用</small>
        </div>
      )}
    </div>
  );
}
