import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const modelUrl = new URL("./assets/portrait/figure.glb", import.meta.url).href;

function frameBody(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distY = size.y / 2 / Math.tan(fov / 2);
  const distX = size.x / 2 / Math.tan(fov / 2) / Math.max(camera.aspect, 0.2);
  const dist = Math.max(distY, distX) * 1.32;
  controls.target.set(center.x, center.y + size.y * 0.06, center.z);
  camera.position.set(center.x, controls.target.y, center.z + dist);
  camera.near = Math.max(dist / 80, 0.01);
  camera.far = dist * 12;
  camera.updateProjectionMatrix();
  controls.minDistance = dist * 0.42;
  controls.maxDistance = dist * 2.2;
  controls.update();
  return {
    position: camera.position.clone(),
    target: controls.target.clone(),
  };
}

export default function Portrait() {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const controlsRef = useRef<OrbitControls | null>(null);
  const home = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const figure = useRef<THREE.Object3D | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

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
    renderer.toneMappingExposure = 1.12;
    renderer.setClearColor("#e6ded2");
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e6ded2");
    const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 40);
    cameraRef.current = camera;
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.7;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    scene.add(new THREE.AmbientLight("#fff8f2", 0.72));
    scene.add(new THREE.HemisphereLight("#fff6ee", "#b7a394", 0.48));
    const key = new THREE.DirectionalLight("#fff4e8", 2.5);
    key.position.set(1.6, 3.2, 2.8);
    const fill = new THREE.DirectionalLight("#d7e3f6", 0.85);
    fill.position.set(-2.4, 1.8, 1.6);
    const rim = new THREE.DirectionalLight("#ffe0cc", 0.7);
    rim.position.set(-0.6, 2.4, -2.2);
    scene.add(key, fill, rim);

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (!alive) return;
        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        root.position.y -= box.min.y;
        scene.add(root);
        figure.current = root;
        const ground = new THREE.Mesh(
          new THREE.CircleGeometry(0.42, 48),
          new THREE.MeshBasicMaterial({
            color: "#000000",
            transparent: true,
            opacity: 0.08,
            depthWrite: false,
          }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0.004;
        scene.add(ground);
        home.current = frameBody(camera, controls, root);
        render();
        requestAnimationFrame(() => {
          if (alive) setReady(true);
        });
      },
      undefined,
      () => {
        if (alive) setFailed(true);
      },
    );

    let frame = 0;
    const render = () => renderer.render(scene, camera);
    const loop = () => {
      if (!alive) return;
      frame = requestAnimationFrame(loop);
      if (controls.update()) render();
    };
    const resize = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 800 ? 1.25 : 1.75));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (figure.current) home.current = frameBody(camera, controls, figure.current);
      render();
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
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
      controlsRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  return (
    <div className="portrait-stack">
      <div className="portrait-frame" ref={host} data-portrait="figure" data-ready={ready ? "true" : "false"}>
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
      <p className="portrait-caption">
        <strong>拖动旋转，双指缩放。</strong>
        选项不会改变姿势或服装。
      </p>
    </div>
  );
}
