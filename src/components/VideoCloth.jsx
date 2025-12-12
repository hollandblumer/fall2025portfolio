// src/components/VideoCloth.jsx
import React, { useEffect, useRef, useState } from "react";

// NOTE: External dependencies (THREE, CANNON, etc.) are kept via Skypack for consistency.
// FIX: Explicitly linking to three.module.js and adding .js extensions to Three.js examples
import * as THREE from "https://cdn.skypack.dev/three@0.124.0/build/three.module.js";
import * as CANNON from "https://cdn.skypack.dev/cannon-es@0.18.0";
import imagesLoaded from "https://cdn.skypack.dev/imagesloaded@4.1.4";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/controls/OrbitControls.js";
import Stats from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/libs/stats.module.js";
import { EffectComposer } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/postprocessing/ShaderPass.js";
import gsap from "https://cdn.skypack.dev/gsap@3.6.1";
import SimplexNoise from "https://cdn.skypack.dev/simplex-noise@3.0.0";
import {
  Maku,
  MakuGroup,
  getScreenFov,
} from "https://cdn.skypack.dev/maku.js@1.0.1";

/* ================== SHADERS ================== */

const mainVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main(){
    vec4 modelPosition = modelMatrix * vec4(position,1.);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    vUv = uv;
    vPosition = position;
}
`;

const mainFragmentShader = `
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform sampler2D uTexture;

varying vec2 vUv;
varying vec3 vPosition;

void main(){
    vec4 textureColor = texture2D(uTexture, vUv);
    vec3 color = textureColor.rgb;
    gl_FragColor = vec4(color,1.);
}
`;

const postprocessingVertexShader = `
varying vec2 vUv;

void main(){
    vec4 modelPosition = modelMatrix * vec4(position,1.);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    vUv = uv;
}
`;

const postprocessingFragmentShader = `
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform sampler2D tDiffuse;

varying vec2 vUv;

void main(){
    vec2 newUv = vUv;
    vec4 color = texture2D(tDiffuse, newUv);
    gl_FragColor = color;
}
`;

const calcAspect = (el) => el.clientWidth / el.clientHeight;

const getNormalizedMousePos = (e) => {
  return {
    x: (e.clientX / window.innerWidth) * 2 - 1,
    y: -(e.clientY / window.innerHeight) * 2 + 1,
  };
};

const preloadImages = (sel = "img") => {
  return new Promise((resolve) => {
    imagesLoaded(sel, { background: true }, resolve);
  });
};

/* ================== CORE CLASSES ================== */

// Mouse tracker with delta (for smear-style interaction)
class MouseTracker {
  constructor() {
    this.mousePos = new THREE.Vector2(0, 0);
    this.delta = new THREE.Vector2(0, 0);
    this._hasPos = false;
    this.trackMousePos();
  }

  trackMousePos() {
    const handler = (e) => this.setMousePos(e);

    window.addEventListener("mousemove", handler);
    window.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches && e.touches[0]) this.setMousePos(e.touches[0]);
      },
      { passive: false }
    );
    window.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches && e.touches[0]) this.setMousePos(e.touches[0]);
      },
      { passive: false }
    );
  }

  setMousePos(e) {
    const { x, y } = getNormalizedMousePos(e);

    if (!this._hasPos) {
      this.mousePos.set(x, y);
      this.delta.set(0, 0);
      this._hasPos = true;
    } else {
      // delta = newPos - oldPos
      this.delta.set(x - this.mousePos.x, y - this.mousePos.y);
      this.mousePos.set(x, y);
    }
  }
}

// Single shared instance for mouse tracking (efficiency improvement)
const GLOBAL_MOUSE_TRACKER = new MouseTracker();

class Base {
  constructor(containerEl, debug = false) {
    this.debug = debug;
    this.container = containerEl;
    this.perspectiveCameraParams = {
      fov: 75,
      near: 0.1,
      far: 100,
    };
    this.orthographicCameraParams = {
      zoom: 2,
      near: -100,
      far: 1000,
    };
    this.cameraPosition = new THREE.Vector3(0, 0, 600);
    this.lookAtPosition = new THREE.Vector3(0, 0, 0);
    this.rendererParams = {
      alpha: true,
      antialias: true,
    };
    this.mouseTracker = GLOBAL_MOUSE_TRACKER;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.stats = null;
    this.shaderMaterial = null;
    this.composer = null;
  }

  init() {
    this.createScene();
    this.createPerspectiveCamera();
    this.createRenderer();
    this.createLight();
    // this.createOrbitControls();
    this.createDebugUI();
    this.addListeners();
    this.setLoop();
  }

  dispose() {
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
      this.renderer.dispose();
      if (this.renderer.domElement?.parentNode) {
        this.renderer.domElement.parentNode.removeChild(
          this.renderer.domElement
        );
      }
    }
    window.removeEventListener("resize", this.resizeHandler);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.stats = null;
    this.shaderMaterial = null;
    this.composer = null;
  }

  createScene() {
    this.scene = new THREE.Scene();
  }

  createPerspectiveCamera() {
    const { perspectiveCameraParams, cameraPosition, lookAtPosition } = this;
    const { fov, near, far } = perspectiveCameraParams;
    const aspect = calcAspect(this.container);
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.copy(cameraPosition);
    camera.lookAt(lookAtPosition);
    this.camera = camera;
  }

  createRenderer() {
    const { rendererParams } = this;
    const renderer = new THREE.WebGLRenderer(rendererParams);
    renderer.setClearColor(0x000000, 0);

    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = 0;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    this.container.appendChild(renderer.domElement);
    this.renderer = renderer;
    this.resizeRendererToDisplaySize();
  }

  resizeRendererToDisplaySize() {
    const { renderer, container } = this;
    if (!container || !renderer) return;
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  createLight() {
    const dirLight = new THREE.DirectionalLight("#ffffff", 0.7);
    dirLight.position.set(0, 0, 1);
    this.scene.add(dirLight);
    const ambiLight = new THREE.AmbientLight("#ffffff", 0.5);
    this.scene.add(ambiLight);
  }

  createOrbitControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = 0.5;
    controls.target.copy(this.lookAtPosition);
    controls.update();
    this.controls = controls;
  }

  createDebugUI() {
    if (!this.debug) return;
    const axisHelper = new THREE.AxesHelper();
    this.scene.add(axisHelper);
    const stats = Stats();
    this.container.appendChild(stats.dom);
    this.stats = stats;
  }

  addListeners() {
    this.resizeHandler = () => {
      if (!this.container) return;
      const aspect = calcAspect(this.container);
      const camera = this.camera;
      if (camera && camera.isPerspectiveCamera) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
      this.resizeRendererToDisplaySize();
      if (this.shaderMaterial) {
        this.shaderMaterial.uniforms.uResolution.value.set(
          this.container.clientWidth,
          this.container.clientHeight
        );
      }
    };
    window.addEventListener("resize", this.resizeHandler);
  }

  update() {}

  setLoop() {
    this.renderer.setAnimationLoop(() => {
      this.update();
      if (this.controls) this.controls.update();
      if (this.stats) this.stats.update();
      if (this.composer) this.composer.render();
      else this.renderer.render(this.scene, this.camera);
    });
  }
}

class PhysicsBase extends Base {
  constructor(containerEl, debug = false) {
    super(containerEl, debug);
    this.world = null;
    this.gravity = new CANNON.Vec3(0, -1, 0);
    this.meshPhysicsObjs = [];
  }

  createWorld() {
    const world = new CANNON.World();
    const solver = new CANNON.GSSolver();
    solver.iterations = 12;
    solver.tolerance = 1e-3;
    world.solver = solver;
    world.gravity.copy(this.gravity);
    this.world = world;
  }

  update() {
    this.sync();
    this.world.step(1 / 60);
  }

  sync() {
    this.meshPhysicsObjs.forEach((obj) => {
      const { mesh, body, copyPosition, copyQuaternion } = obj;
      if (copyPosition) mesh.position.copy(body.position);
      if (copyQuaternion) mesh.quaternion.copy(body.quaternion);
    });
  }
}

class ClothMaku extends Maku {
  constructor(el, material, scene, world, config) {
    super(el, material, scene, config);
    this.world = world;
    this.stitches = [];

    const container =
      this.el.closest(".project-media") ||
      this.el.closest(".image-cloth-instance") ||
      this.el.parentElement;

    if (container) {
      const cw = container.clientWidth || window.innerWidth;
      const ch = container.clientHeight || window.innerHeight;

      const rw = this.rect.width || cw;
      const rh = this.rect.height || ch;

      const sx = cw / rw;
      const sy = ch / rh;

      this.mesh.scale.set(
        this.mesh.scale.x * sx,
        this.mesh.scale.y * sy,
        this.mesh.scale.z
      );

      this.rect.width = cw;
      this.rect.height = ch;

      this.mesh.position.set(0, 0, 0);
    }

    this.createStitches();
    this.connectStitches();
  }

  getPositionRowCol(i, size) {
    const length = size + 1;
    const row = Math.floor(i / length);
    const col = i % length;
    return { row, col };
  }

  createStitches() {
    const { mesh, rect, segments } = this;
    const particleShape = new CANNON.Particle();
    const position = mesh.geometry.attributes.position;
    const { width, height } = rect;

    const stitches = [...Array(position.count).keys()].map((i) => {
      const gridSize = segments.width;
      const { row, col } = this.getPositionRowCol(i, gridSize);
      const last = gridSize;

      const pos = new CANNON.Vec3(
        position.getX(i) * width,
        position.getY(i) * height,
        position.getZ(i)
      );

      const centerRow = segments.height / 2;
      const centerCol = segments.width / 2;

      const nx = (col - centerCol) / centerCol;
      const ny = (row - centerRow) / centerRow;
      const dist = Math.sqrt(nx * nx + ny * ny);

      const bulgeStrength = 4;
      const bulge = (1.0 - Math.min(dist, 1.0)) * bulgeStrength;

      pos.z -= bulge;

      const isCorner =
        (row === 0 || row === last) && (col === 0 || col === last);
      const isEdge =
        !isCorner && (row === 0 || row === last || col === 0 || col === last);

      let mass;
      if (isCorner) mass = 0;
      else if (isEdge) mass = 0.001;
      else mass = 0.0002;

      const stitch = new CANNON.Body({
        mass,
        position: pos,
        shape: particleShape,
      });
      this.world.addBody(stitch);
      return stitch;
    });

    this.stitches = stitches;
    return stitches;
  }

  connect(bodyA, bodyB) {
    const distance = undefined;
    const maxForce = 1e8;
    const c = new CANNON.DistanceConstraint(bodyA, bodyB, distance, maxForce);
    this.world.addConstraint(c);
  }

  connectStitches() {
    const { mesh, segments } = this;
    const position = mesh.geometry.attributes.position;
    [...Array(position.count).keys()].forEach((i) => {
      const gridSize = segments.width;
      const { row, col } = this.getPositionRowCol(i, gridSize);
      if (col < gridSize) this.connect(this.stitches[i], this.stitches[i + 1]);
      if (row < gridSize)
        this.connect(this.stitches[i], this.stitches[i + gridSize + 1]);
    });
  }

  applyMouseStretch(mouseTracker) {
    if (!mouseTracker || !mouseTracker._hasPos) return;
    if (!this.stitches || !this.stitches.length) return;

    const { rect, stitches } = this;
    const w = rect.width || 1;
    const h = rect.height || 1;

    const mx = mouseTracker.mousePos.x * (w / 2);
    const my = mouseTracker.mousePos.y * (h / 2);

    const radius = Math.min(w, h) * 0.01;

    const dxNorm = mouseTracker.delta.x;
    const dyNorm = mouseTracker.delta.y;
    if (dxNorm === 0 && dyNorm === 0) return;

    const baseStrength = 80;
    const fxBase = dxNorm * baseStrength;
    const fyBase = -dyNorm * baseStrength;

    for (let i = 0; i < stitches.length; i++) {
      const s = stitches[i];
      const sx = s.position.x;
      const sy = s.position.y;

      const dx = sx - mx;
      const dy = sy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;

      const falloff = 1 - dist / radius;

      const force = new CANNON.Vec3(fxBase * falloff, fyBase * falloff, 0);
      s.applyForce(force);
    }
  }

  update() {
    const { mesh, rect, stitches } = this;
    const { width, height } = rect;
    const position = mesh.geometry.attributes.position;

    const w = width || 1;
    const h = height || 1;
    const count = position.count;

    for (let i = 0; i < count; i++) {
      const stitch = stitches[i];
      const sx = stitch.position.x / w;
      const sy = stitch.position.y / h;
      const sz = stitch.position.z;
      position.setXYZ(i, sx, sy, sz);
    }

    position.needsUpdate = true;
  }

  applyWind(wind) {
    const count = this.mesh.geometry.attributes.position.count;
    for (let i = 0; i < count; i++) {
      const stitch = this.stitches[i];
      const noise = wind.flowField[i];
      const { x, y, z } = noise;
      const force = new CANNON.Vec3(x, y, z);
      stitch.applyForce(force);
    }
  }
}

class Wind {
  constructor(maku, mouseTracker, config = {}) {
    this.maku = maku;
    this.mouseTracker = mouseTracker;

    const {
      baseForce = 2,
      off = 0.02,
      direction = new THREE.Vector3(0.5, 0, -1),
      seed = Math.random() * 1000,
    } = config;

    const position = maku.mesh.geometry.attributes.position;
    const count = position.count;
    const force = baseForce / count;
    const flowField = new Array(count);

    this.flowField = flowField;
    this.off = off;
    this.force = force;
    this.direction = direction;
    this.seed = seed;
    this.time = 0;

    this.noise = new SimplexNoise();

    this.update();
    this.directionFollowMouse();
  }

  update() {
    this.time += 1 / 60;

    const { maku, off, seed } = this;
    const position = maku.mesh.geometry.attributes.position;
    const size = maku.segments.width;
    const count = position.count;

    for (let i = 0; i < count; i++) {
      const { row, col } = this.maku.getPositionRowCol(i, size);

      const force = this.noise.noise3D(
        row * off + seed,
        col * off + seed,
        this.time + seed * 0.1
      );

      const centeredForce = 0.5 * force + 0.5;
      const realForce = centeredForce * this.force;
      const forceVector = this.direction.clone().multiplyScalar(realForce);
      this.flowField[i] = forceVector;
    }
  }

  directionFollowMouse() {
    window.addEventListener("mousemove", () => {
      const mousePos = this.mouseTracker.mousePos;
      const { x, y } = mousePos;
      gsap.to(this.direction, {
        x,
        y,
        duration: 0.8,
      });
    });
  }
}

class ImageCloth extends PhysicsBase {
  constructor(containerEl, medias, debug, windSeed = Math.random() * 10000) {
    super(containerEl, debug);

    this.clock = new THREE.Clock();
    this.cameraPosition = new THREE.Vector3(0, 0, 600);
    const fov = getScreenFov(this.cameraPosition.z);
    this.perspectiveCameraParams = {
      fov,
      near: 100,
      far: 2000,
    };

    this.medias = medias;
    this.makuGroup = new MakuGroup();

    this.winds = [];
    this.customPass = null;

    this.windSeed = windSeed;

    this.windConfig = {
      baseForce: 0.4,
      off: 0.2,
      direction: new THREE.Vector3(0.5, 0, -0.1),
    };

    this.windUpdateFrameCount = 0;
    this.windUpdateFrequency = 3;
  }

  async init() {
    if (!this.container) return;
    this.createWorld();
    this.createScene();
    this.createPerspectiveCamera();
    this.createRenderer();

    this.resizeRendererToDisplaySize();

    await this.createEverything();
    this.addListeners();
    this.setLoop();
  }

  async createEverything() {
    this.createShaderMaterial();
    this.createMakuGroup();
    this.createWinds();
    this.createPostprocessingEffect();
  }

  createShaderMaterial() {
    const shaderMaterial = new THREE.ShaderMaterial({
      vertexShader: mainVertexShader,
      fragmentShader: mainFragmentShader,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uResolution: {
          value: new THREE.Vector2(
            this.container.clientWidth || window.innerWidth,
            this.container.clientHeight || window.innerHeight
          ),
        },
        uTexture: { value: null },
      },
    });
    this.shaderMaterial = shaderMaterial;
  }

  createMakuGroup() {
    this.makuGroup.clear();
    const { medias, scene, shaderMaterial, world, container } = this;

    const makus = medias.map(
      (el) =>
        new ClothMaku(el, shaderMaterial, scene, world, {
          meshSizeType: "scale",
          segments: {
            width: 6,
            height: 6,
          },
        })
    );
    this.makuGroup.addMultiple(makus);
    this.overrideTexturesFromInner();

    const first = makus[0];
    if (first && this.camera && container) {
      const cw = container.clientWidth || window.innerWidth;
      const ch = container.clientHeight || window.innerHeight;

      this.camera.aspect = cw / ch;
      this.camera.updateProjectionMatrix();

      const aspect = cw / ch;

      const clothWidth = first.rect.width || cw;
      const clothHeight = first.rect.height || ch;

      const fovDeg = this.perspectiveCameraParams.fov;
      const fovRad = THREE.MathUtils.degToRad(fovDeg);

      const distH = clothHeight / 2 / Math.tan(fovRad / 2);
      const distW = clothWidth / 2 / (Math.tan(fovRad / 2) * aspect);
      const distance = Math.max(distH, distW);

      this.camera.position.set(0, 0, distance * 1.02);
      this.lookAtPosition.set(0, 0, 0);
      this.camera.lookAt(0, 0, 0);
    }
  }

  overrideTexturesFromInner() {
    const loader = new THREE.TextureLoader();

    this.makuGroup.makus.forEach((maku) => {
      const el = maku.el;
      const inner = el.dataset.inner;
      const poster = el.dataset.poster; // NEW
      const material = maku.mesh.material;

      if (!inner || !material.uniforms || !material.uniforms.uTexture) return;

      const tag = el.tagName.toLowerCase();

      if (tag === "img") {
        loader.load(inner, (tex) => {
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.needsUpdate = true;
          material.uniforms.uTexture.value = tex;
        });
      }

      if (tag === "video") {
        const video = el;

        video.crossOrigin = "anonymous";
        video.src = inner;
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        // Helps Safari/iOS behave more consistently
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.preload = "auto";

        // 1) Immediately show poster texture on the cloth while video buffers (KEY FIX)
        if (poster) {
          loader.load(
            poster,
            (tex) => {
              tex.minFilter = THREE.LinearFilter;
              tex.magFilter = THREE.LinearFilter;
              tex.needsUpdate = true;
              material.uniforms.uTexture.value = tex;
            },
            undefined,
            () => {
              // ignore poster load errors; we’ll still try video
            }
          );
        }

        const setupVideoTexture = () => {
          const videoTexture = new THREE.VideoTexture(video);
          videoTexture.minFilter = THREE.LinearFilter;
          videoTexture.magFilter = THREE.LinearFilter;
          videoTexture.format = THREE.RGBFormat;
          material.uniforms.uTexture.value = videoTexture;
        };

        const videoReady = new Promise((resolve) => {
          if (video.readyState >= 2) resolve(); // HAVE_CURRENT_DATA
          else {
            video.addEventListener("loadeddata", resolve, { once: true });
            video.addEventListener("canplay", resolve, { once: true });
            video.addEventListener("canplaythrough", resolve, { once: true });
          }
        });

        videoReady
          .then(() => {
            return video.play().catch((e) => {
              // If autoplay fails, still set the texture (it’ll update after user gesture)
              console.warn("Autoplay failed; using VideoTexture anyway:", e);
            });
          })
          .then(() => {
            setupVideoTexture();
          })
          .catch((e) => {
            console.error("Video failed to load:", e);
          });

        video.load();
      }
    });
  }

  createWinds() {
    this.winds = this.makuGroup.makus.map(
      (maku) => new Wind(maku, this.mouseTracker, this.windConfig)
    );
  }

  createPostprocessingEffect() {
    const composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);

    const customPass = new ShaderPass({
      vertexShader: postprocessingVertexShader,
      fragmentShader: postprocessingFragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uResolution: {
          value: new THREE.Vector2(
            this.container.clientWidth || window.innerWidth,
            this.container.clientHeight || window.innerHeight
          ),
        },
      },
    });

    customPass.renderToScreen = true;
    this.customPass = customPass;
    composer.addPass(customPass);

    this.composer = composer;
  }

  updatePassTime() {
    if (!this.customPass) return;
    this.customPass.uniforms.uTime.value = this.clock.getElapsedTime();
  }

  updateMaterialUniforms() {
    const t = this.clock.getElapsedTime();
    this.makuGroup.makus.forEach((maku) => {
      const uniforms = maku.mesh.material.uniforms;
      uniforms.uTime.value = t;
    });
  }

  updateMakuGroup() {
    this.makuGroup.makus.forEach((maku) => maku.update());
  }

  updateWinds() {
    if (this.windUpdateFrameCount % this.windUpdateFrequency === 0) {
      this.winds.forEach((wind) => wind.update());
    }
    this.windUpdateFrameCount = (this.windUpdateFrameCount + 1) % 60;
  }

  applyWindToMakus() {
    this.makuGroup.makus.forEach((maku, i) => maku.applyWind(this.winds[i]));
  }

  applyMouseStretchToMakus() {
    const tracker = this.mouseTracker;
    if (!tracker) return;

    this.makuGroup.makus.forEach((maku) => {
      if (typeof maku.applyMouseStretch === "function") {
        maku.applyMouseStretch(tracker);
      }
    });
  }

  update() {
    this.updatePassTime();
    this.updateMaterialUniforms();

    this.updateWinds();
    this.applyWindToMakus();
    this.applyMouseStretchToMakus();

    this.world.step(1 / 60);
    this.updateMakuGroup();
  }
}

/* ================== REACT COMPONENT ================== */

export default function VideoCloth({
  videoSrc,
  className = "",
  title,
  description,
  children,
  posterSrc,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  const [isVisible, setIsVisible] = useState(false);
  const [clothReady, setClothReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const clothRef = useRef(null);

  // 1) Intersection Observer: only initialize when near viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { rootMargin: "200px" }
    );

    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      if (containerRef.current) observer.unobserve(containerRef.current);
      observer.disconnect();
    };
  }, []);

  // 2) Track when the <video> actually has data
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    setVideoReady(false);

    const markReady = () => setVideoReady(true);
    const markNotReady = () => setVideoReady(false);

    v.addEventListener("loadeddata", markReady);
    v.addEventListener("canplay", markReady);
    v.addEventListener("canplaythrough", markReady);
    v.addEventListener("error", markNotReady);

    return () => {
      v.removeEventListener("loadeddata", markReady);
      v.removeEventListener("canplay", markReady);
      v.removeEventListener("canplaythrough", markReady);
      v.removeEventListener("error", markNotReady);
    };
  }, [videoSrc]);

  // 3) Initialize ImageCloth when visible
  useEffect(() => {
    const containerEl = containerRef.current;
    const videoEl = videoRef.current;

    if (isVisible && containerEl && videoEl && !clothRef.current) {
      const cloth = new ImageCloth(containerEl, [videoEl], false);

      cloth
        .init()
        .then(() => setClothReady(true))
        .catch((e) => {
          console.error("ImageCloth initialization failed:", e);
          setClothReady(false);
        });

      clothRef.current = cloth;
    }

    return () => {
      if (clothRef.current) {
        clothRef.current.dispose();
        clothRef.current = null;
      }
      setClothReady(false);
      setVideoReady(false);
    };
  }, [isVisible, videoSrc]);

  // Only show WebGL once BOTH cloth + video have data
  const showCanvas = clothReady && videoReady;

  return (
    <article className={`project-card ${className}`}>
      <div
        className="project-media"
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "133%",
          overflow: "hidden",
        }}
      >
        {/* WebGL canvas target */}
        <div
          ref={containerRef}
          className="image-cloth-instance"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
            opacity: showCanvas ? 1 : 0,
            transition: "opacity 0.35s ease-in-out",
          }}
        />

        {/* TEMP PHOTO overlay (always visible until canvas is truly ready) */}
        {posterSrc && (
          <img
            src={posterSrc}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: showCanvas ? 0 : 1,
              transition: "opacity 0.35s ease-in-out",
            }}
          />
        )}

        {/* Hidden DOM <video> used only as a texture source */}
        <video
          ref={videoRef}
          className="cloth-video"
          data-inner={videoSrc}
          data-poster={posterSrc || ""} // used by ImageCloth to preload poster onto the cloth
          muted
          loop
          playsInline
          preload="auto"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      </div>

      {title && <h3 className="project-title">{title}</h3>}
      {children}
    </article>
  );
}
