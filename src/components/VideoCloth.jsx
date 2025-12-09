// src/components/VideoCloth.jsx
import React, { useEffect, useRef } from "react";

// NOTE: External dependencies (THREE, CANNON, etc.) are kept via Skypack for consistency.
// In a real project, bundling them with a tool like Webpack/Vite would be more efficient.
import * as THREE from "https://cdn.skypack.dev/three@0.124.0";
import * as CANNON from "https://cdn.skypack.dev/cannon-es@0.18.0";
// Removed unused imports (ky, SimplexNoise) from the original imports list if they aren't used elsewhere.
import imagesLoaded from "https://cdn.skypack.dev/imagesloaded@4.1.4";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/controls/OrbitControls";
import Stats from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/libs/stats.module";
// Removed unused dat.gui
import { EffectComposer } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "https://cdn.skypack.dev/three@0.124.0/examples/jsm/postprocessing/ShaderPass.js";
import gsap from "https://cdn.skypack.dev/gsap@3.6.1";
import SimplexNoise from "https://cdn.skypack.dev/simplex-noise@3.0.0";
import {
  Maku,
  MakuGroup,
  getScreenFov,
} from "https://cdn.skypack.dev/maku.js@1.0.1";

/* ================== SHADERS (Unchanged for visual consistency) ================== */

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

// 🔥 EFFICIENCY: Single, shared MouseTracker instance.
// Removed trackMouseSpeed as it was unused outside of the class itself.
class MouseTracker {
  constructor() {
    this.mousePos = new THREE.Vector2(0, 0);
    this.trackMousePos(); // Start tracking on instantiation
  }
  trackMousePos() {
    // Only set up listeners once
    window.addEventListener("mousemove", this.setMousePos.bind(this));
    window.addEventListener(
      "touchstart",
      (e) => {
        this.setMousePos(e.touches[0]);
      },
      { passive: false }
    );
    window.addEventListener("touchmove", (e) => {
      this.setMousePos(e.touches[0]);
    });
  }
  setMousePos(e) {
    const { x, y } = getNormalizedMousePos(e);
    this.mousePos.x = x;
    this.mousePos.y = y;
  }
}

// 🔥 EFFICIENCY: Create a single instance to be shared across all components
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
    // Use the global tracker instance
    this.mouseTracker = GLOBAL_MOUSE_TRACKER;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.stats = null;
    this.shaderMaterial = null;
    this.composer = null;
  }
  // ... rest of Base methods (unchanged)
  init() {
    this.createScene();
    this.createPerspectiveCamera();
    this.createRenderer();
    this.createLight();
    this.createOrbitControls();
    this.createDebugUI();
    this.addListeners();
    this.setLoop();
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

    // 🔥 force canvas DOM size to follow the container
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
    window.addEventListener("resize", () => {
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
    });
  }

  update() {}

  setLoop() {
    this.renderer.setAnimationLoop(() => {
      this.update();
      if (this.controls) this.controls.update();
      if (this.stats) this.stats.update();
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
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
    // 🔥 EFFICIENCY: Reduce iterations from 20 to 12.
    solver.iterations = 12;
    solver.tolerance = 1e-3;
    world.solver = solver;
    world.gravity.copy(this.gravity);
    this.world = world;
  }

  update() {
    this.sync();
    // Physics step is fixed at 1/60 for stability
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

    // 🔥 Force cloth size to match its allocated video/card area
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

      // scale the mesh so its width/height == container width/height
      this.mesh.scale.set(
        this.mesh.scale.x * sx,
        this.mesh.scale.y * sy,
        this.mesh.scale.z
      );

      // update rect so downstream physics/camera use the new size
      this.rect.width = cw;
      this.rect.height = ch;

      // center it in the local scene so the camera can look at (0,0,0)
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

      // base position (flat plane)
      const pos = new CANNON.Vec3(
        position.getX(i) * width,
        position.getY(i) * height,
        position.getZ(i)
      );

      // 🔹 VERY SUBTLE INWARD CURVE
      const centerRow = segments.height / 2;
      const centerCol = segments.width / 2;

      const nx = (col - centerCol) / centerCol; // -1 .. 1
      const ny = (row - centerRow) / centerRow; // -1 .. 1
      const dist = Math.sqrt(nx * nx + ny * ny); // 0 center -> ~1 edges

      const bulgeStrength = 4; // ⬅️ was 35 — smaller = less curve
      const bulge = (1.0 - Math.min(dist, 1.0)) * bulgeStrength;

      // negative Z = inward/away from camera
      pos.z -= bulge;

      const isCorner =
        (row === 0 || row === last) && (col === 0 || col === last);
      const isEdge =
        !isCorner && (row === 0 || row === last || col === 0 || col === last);

      let mass;
      if (isCorner) {
        mass = 0; // pinned corners
      } else if (isEdge) {
        mass = 0.001;
      } else {
        mass = 0.0002;
      }

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
      if (col < gridSize) {
        this.connect(this.stitches[i], this.stitches[i + 1]);
      }
      // Fixed vertical constraint index
      if (row < gridSize) {
        this.connect(this.stitches[i], this.stitches[i + gridSize + 1]);
      }
    });
  }

  // 🔥 EFFICIENCY: Use a traditional 'for' loop for marginal gain
  update() {
    const { mesh, rect, stitches } = this;
    const { width, height } = rect;
    const position = mesh.geometry.attributes.position;

    // safety: avoid divide-by-0 if something is weird
    const w = width || 1;
    const h = height || 1;
    const count = position.count;

    for (let i = 0; i < count; i++) {
      const stitch = stitches[i];
      const sx = stitch.position.x / w;
      const sy = stitch.position.y / h;
      let sz = stitch.position.z;

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
    this.mouseTracker = mouseTracker; // 🔥 EFFICIENCY: Injected tracker

    const {
      baseForce = 2,
      off = 0.02,
      direction = new THREE.Vector3(0.5, 0, -1),
      seed = Math.random() * 1000,
    } = config;

    const position = maku.mesh.geometry.attributes.position;
    const count = position.count;
    const force = baseForce / count;
    const clock = new THREE.Clock();
    const flowField = new Array(count);

    this.flowField = flowField;
    this.off = off;
    this.force = force;
    this.clock = clock;
    this.direction = direction;
    this.seed = seed;
    this.time = 0;

    const noise = new SimplexNoise();
    this.noise = noise;

    this.update();
    this.directionFollowMouse();
  }

  // 🔥 EFFICIENCY: Decouple wind calculation from the 60fps render loop
  update() {
    this.time += 1 / 60; // Use fixed physics time step for stability

    const { maku, off, seed } = this;
    const position = maku.mesh.geometry.attributes.position;
    const size = maku.segments.width;
    const count = position.count;

    // 🔥 EFFICIENCY: Use 'for' loop for sequential array writes
    for (let i = 0; i < count; i++) {
      const { row, col } = this.maku.getPositionRowCol(i, size);

      const force = this.noise.noise3D(
        row * off + seed,
        col * off + seed,
        this.time + seed * 0.1 // Use this.time instead of clock.getElapsedTime()
      );

      const centeredForce = 0.5 * force + 0.5;
      const realForce = centeredForce * this.force;
      const forceVector = this.direction.clone().multiplyScalar(realForce);
      this.flowField[i] = forceVector;
    }
  }

  // 🔥 EFFICIENCY: Listener only added once here per Wind instance
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

    // 🔥 EFFICIENCY: Variable to control wind update frequency (e.g., update every 3 frames)
    this.windUpdateFrameCount = 0;
    this.windUpdateFrequency = 3; // Lower this number for more frequent/responsive wind
  }
  async init() {
    if (!this.container) return;
    this.createWorld();
    this.createScene();
    this.createPerspectiveCamera();
    this.createRenderer();

    // 🎯 FIX for CSS/Sizing: Re-sizing the renderer immediately before object creation
    // ensures the WebGL canvas dimensions match the container's final CSS-defined size.
    this.resizeRendererToDisplaySize();

    // 🔥 EFFICIENCY: Removed preloadImages("img") as it only uses video texture
    this.createEverything();
    this.addListeners();
    this.setLoop();
  }

  createEverything() {
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
          // 🔥 EFFICIENCY: Reduced segments to 6x6.
          segments: {
            width: 6, // Reduced from 8
            height: 6, // Reduced from 8
          },
        })
    );
    this.makuGroup.addMultiple(makus);
    this.overrideTexturesFromInner();

    // 🔥 Camera: fit cloth to the canvas (card) exactly
    const first = makus[0];
    if (first && this.camera && container) {
      const cw = container.clientWidth || window.innerWidth;
      const ch = container.clientHeight || window.innerHeight;

      // 🎯 FIX for Mobile Cropping: Explicitly update the camera's aspect ratio
      // to match the container's final CSS aspect (which is tall/narrow on mobile)
      this.camera.aspect = cw / ch;
      this.camera.updateProjectionMatrix(); // Apply the new aspect ratio immediately

      const aspect = cw / ch;

      const clothWidth = first.rect.width || cw;
      const clothHeight = first.rect.height || ch;

      const fovDeg = this.perspectiveCameraParams.fov;
      const fovRad = THREE.MathUtils.degToRad(fovDeg);

      const distH = clothHeight / 2 / Math.tan(fovRad / 2);
      const distW = clothWidth / 2 / (Math.tan(fovRad / 2) * aspect);
      // Use the greater distance to ensure the whole object fits in the frame
      const distance = Math.max(distH, distW);

      // look at cloth center (we set mesh.position to 0,0,0 above)
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

        // IMPORTANT: allow canvas texture, avoid CORS black
        video.crossOrigin = "anonymous";
        video.src = inner;
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;

        video.load();
        video.play().catch(() => {});

        // Three.js texture creation is relatively efficient
        const videoTexture = new THREE.VideoTexture(video);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBFormat;

        material.uniforms.uTexture.value = videoTexture;
      }
    });
  }

  createWinds() {
    // 🔥 EFFICIENCY: Pass the single shared MouseTracker instance
    const winds = this.makuGroup.makus.map((maku) => {
      const wind = new Wind(maku, this.mouseTracker, this.windConfig);
      return wind;
    });
    this.winds = winds;
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
    const uniforms = this.customPass.uniforms;
    const elapsedTime = this.clock.getElapsedTime();
    uniforms.uTime.value = elapsedTime;
  }

  updateMaterialUniforms() {
    const elapsedTime = this.clock.getElapsedTime();
    this.makuGroup.makus.forEach((maku) => {
      // Direct access is fine and avoids re-calling the getter
      const uniforms = maku.mesh.material.uniforms;
      uniforms.uTime.value = elapsedTime;
    });
  }

  updateMakuGroup() {
    this.makuGroup.makus.forEach((maku) => {
      maku.update();
    });
  }

  updateWinds() {
    // 🔥 EFFICIENCY: Run wind update only every N frames
    if (this.windUpdateFrameCount % this.windUpdateFrequency === 0) {
      this.winds.forEach((wind) => {
        wind.update();
      });
    }
    this.windUpdateFrameCount = (this.windUpdateFrameCount + 1) % 60; // Loop frame count
  }

  applyWindToMakus() {
    this.makuGroup.makus.forEach((maku, i) => {
      maku.applyWind(this.winds[i]);
    });
  }

  update() {
    this.updatePassTime();
    this.updateMaterialUniforms();

    // The order here is crucial for the cloth simulation stability
    this.sync();
    this.world.step(1 / 60);
    this.updateMakuGroup();
    // 🔥 EFFICIENCY: Winds are now updated only once every 3 frames
    this.updateWinds();
    this.applyWindToMakus();
  }
}

/* ================== REACT COMPONENT (Unchanged - already good React practice) ================== */

export default function VideoCloth({
  videoSrc,
  className = "",
  title,
  description,
  children,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const containerEl = containerRef.current;
    const videoEl = videoRef.current;
    if (!containerEl || !videoEl) return;

    const cloth = new ImageCloth(containerEl, [videoEl], false);
    cloth.init();

    return () => {
      if (cloth.renderer) {
        cloth.renderer.setAnimationLoop(null);
        cloth.renderer.dispose();
      }
      if (containerEl.firstChild) {
        // Safe cleanup for the canvas element
        containerEl.removeChild(containerEl.firstChild);
      }
      // Note: Event listeners added to window (like MouseTracker and Wind.directionFollowMouse)
      // are not explicitly removed here, which can lead to memory leaks if the component is mounted/unmounted frequently.
      // For full robustness, those listeners should be tracked and removed.
    };
  }, []); // Run only once on mount

  return (
    <article className={`project-card ${className}`}>
      <div
        className="project-media"
        style={{
          position: "relative",
          width: "100%",
          // 3:4-ish frame; tweak as you like
          paddingBottom: "133%",
          overflow: "hidden",
        }}
      >
        {/* WebGL canvas target – size == card */}
        <div
          ref={containerRef}
          className="image-cloth-instance"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        />

        {/* DOM <video> only used as texture source */}
        <video
          ref={videoRef}
          className="cloth-video"
          data-inner={videoSrc}
          muted
          loop
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            opacity: 0, // keep it invisible, Three.js renders the cloth
          }}
        />
      </div>

      {title && <h3 className="project-title">{title}</h3>}
      {/* {description && <p className="project-desc">{description}</p>} */}
      {children}
    </article>
  );
}
