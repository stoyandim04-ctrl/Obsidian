/**
 * Lightweight interactive viewer for the canonical OBSIDIAN bottle.
 * Geometry comes from the same Blender build as every render (public/models/obsidian-no01.glb);
 * materials are defined here so they stay cheap enough for phones (no transmission pass).
 * Renders on demand only: while the view is settling after input, never in an idle loop.
 */
import {
  ACESFilmicToneMapping,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface ViewerOptions {
  modelUrl: string;
  labelUrl: (size: string) => string;
  size: string;
  /** Lower-cost path for touch devices / small screens. */
  lite: boolean;
  onError?: (reason: string) => void;
}

const DEG = Math.PI / 180;
const HOME_YAW = -12 * DEG;
const HOME_PITCH = 0;
const PITCH_LIMIT = 14 * DEG;
const TARGET_Y = 0.95;

/** Studio environment built from emissive cards (no HDR download). */
function studioEnvironment(): Scene {
  const env = new Scene();
  const room = new Mesh(new BoxGeometry(20, 12, 20), new MeshBasicMaterial({ color: new Color(0.004, 0.004, 0.005), side: BackSide }));
  room.position.y = 4;
  env.add(room);
  const card = (w: number, h: number, color: [number, number, number], x: number, y: number, z: number, lookY = 1) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(...color) }));
    m.position.set(x, y, z);
    m.lookAt(0, lookY, 0);
    env.add(m);
  };
  card(1.2, 6, [6.0, 3.9, 2.3], 5.5, 2.5, -3.5); // warm key / rim, behind right
  card(0.35, 5, [2.6, 2.1, 1.7], -6, 2.2, -1.5); // thin strip, left
  card(4, 4, [0.35, 0.36, 0.4], 0, 9, 2, 0); // faint top soft
  card(0.2, 4, [3.2, 2.2, 1.3], 4, 2.6, 5); // shoulder sweep, front right
  return env;
}

function contactShadow(): Mesh {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, "rgba(0,0,0,0.85)");
  grad.addColorStop(0.45, "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new CanvasTexture(c);
  const m = new Mesh(new PlaneGeometry(2.1, 1.3), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.002;
  return m;
}

export class BottleViewer {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(20, 4 / 5, 0.1, 50);
  private pivot = new Group();
  private label?: Mesh;
  private labelTextures = new Map<string, Texture>();
  private disposables: { dispose: () => void }[] = [];
  private yaw = HOME_YAW;
  private pitch = HOME_PITCH;
  private targetYaw = HOME_YAW;
  private targetPitch = HOME_PITCH;
  private raf = 0;
  private visible = true;
  private disposed = false;
  private loaded = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: ViewerOptions,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: !opts.lite, alpha: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.lite ? 1.5 : 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x000000, 0);

    const pmrem = new PMREMGenerator(this.renderer);
    const envScene = studioEnvironment();
    const envRT = pmrem.fromScene(envScene, 0.02);
    this.scene.environment = envRT.texture;
    this.disposables.push(envRT, pmrem);
    envScene.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        (m.material as Material).dispose();
      }
    });

    const key = new DirectionalLight(0xffc89a, 1.4);
    key.position.set(3, 4, -3);
    this.scene.add(key);
    this.scene.add(this.pivot);
    this.scene.add(contactShadow());

    canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    this.load();
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.opts.onError?.("The 3D view was interrupted by the browser.");
  };

  private async load() {
    try {
      const gltf = await new GLTFLoader().loadAsync(this.opts.modelUrl);
      if (this.disposed) return;
      const glass = new MeshPhysicalMaterial({
        color: 0x070605,
        roughness: 0.06,
        metalness: 0,
        ior: 1.52,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        sheen: 1,
        sheenColor: new Color(0x7a3e12),
        sheenRoughness: 0.35,
        envMapIntensity: 1.25,
      });
      const cap = new MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.42, metalness: 0.0, envMapIntensity: 0.9 });
      const brass = new MeshStandardMaterial({ color: 0xc89b63, roughness: 0.26, metalness: 1, envMapIntensity: 1.4 });
      const print = new MeshStandardMaterial({ transparent: true, roughness: 0.6, metalness: 0, depthWrite: false });
      this.disposables.push(glass, cap, brass, print);
      gltf.scene.traverse((o: Object3D) => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        this.disposables.push(m.geometry);
        const name = m.name.toLowerCase();
        if (name.startsWith("liquid")) m.visible = false; // hidden inside opaque black glass
        else if (name.startsWith("glassbody")) m.material = glass;
        else if (name.startsWith("cap")) m.material = cap;
        else if (name.startsWith("brassring")) m.material = brass;
        else if (name.startsWith("frontprint")) {
          m.material = print;
          m.renderOrder = 2;
          this.label = m;
        }
      });
      this.pivot.add(gltf.scene);
      await this.setLabel(this.opts.size);
      this.loaded = true;
      this.resize();
      this.kick();
    } catch {
      this.opts.onError?.("The 3D model could not be loaded.");
    }
  }

  async setLabel(size: string) {
    this.opts.size = size;
    if (!this.label) return;
    let tex = this.labelTextures.get(size);
    if (!tex) {
      tex = await new TextureLoader().loadAsync(this.opts.labelUrl(size));
      tex.flipY = false;
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      this.labelTextures.set(size, tex);
      this.disposables.push(tex);
    }
    if (this.disposed) return;
    const mat = this.label.material as MeshStandardMaterial;
    mat.map = tex;
    mat.needsUpdate = true;
    this.kick();
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep the full 1.9-unit object comfortably framed at any aspect
    const fitH = 2.7;
    const vFov = this.camera.fov * DEG;
    const distH = fitH / 2 / Math.tan(vFov / 2);
    const distW = fitH * 0.8 / 2 / Math.tan(vFov / 2) / this.camera.aspect;
    this.camera.userData.dist = Math.max(distH, distW);
    this.camera.updateProjectionMatrix();
    this.kick();
  }

  /** Relative rotation from drag or keys (radians). */
  rotateBy(dYaw: number, dPitch = 0) {
    this.targetYaw += dYaw;
    this.targetPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.targetPitch + dPitch));
    this.kick();
  }

  reset() {
    // return by the shortest way round
    const full = Math.PI * 2;
    this.yaw = ((((this.yaw - HOME_YAW) % full) + full + Math.PI) % full) - Math.PI + HOME_YAW;
    this.targetYaw = HOME_YAW;
    this.targetPitch = HOME_PITCH;
    this.kick();
  }

  /** Current yaw in degrees for announcements. */
  get yawDegrees() {
    return Math.round(((((this.targetYaw / DEG) % 360) + 540) % 360) - 180);
  }

  setVisible(v: boolean) {
    this.visible = v;
    if (v) this.kick();
  }

  private kick() {
    if (!this.raf && !this.disposed && this.visible && this.loaded) this.raf = requestAnimationFrame(this.frame);
  }

  private frame = () => {
    this.raf = 0;
    const k = 0.14;
    this.yaw += (this.targetYaw - this.yaw) * k;
    this.pitch += (this.targetPitch - this.pitch) * k;
    this.pivot.rotation.y = this.yaw;
    const d = this.camera.userData.dist ?? 8;
    this.camera.position.set(0, TARGET_Y + Math.sin(this.pitch) * d, Math.cos(this.pitch) * d);
    this.camera.lookAt(0, TARGET_Y, 0);
    this.renderer.render(this.scene, this.camera);
    if (Math.abs(this.targetYaw - this.yaw) > 1e-4 || Math.abs(this.targetPitch - this.pitch) > 1e-4) this.kick();
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.disposables.forEach((d) => d.dispose());
    this.scene.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh && m.geometry) m.geometry.dispose();
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

/** True when a WebGL context can be created (released immediately). */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}
