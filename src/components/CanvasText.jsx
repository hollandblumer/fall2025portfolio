// Role3D.jsx
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Bronze dodecahedron particle text — width-fit camera
 * Props (all optional):
 * - count: number of instances (default 90000)
 * - withBackground: boolean to render a gradient background div behind the canvas
 * - style: style object passed to the canvas
 */
export default function CanvasText({
  count = 90000,
  withBackground = false,
  style,
}) {
  const canvasRef = useRef(null);
  const bgRef = useRef(null);

  useEffect(() => {
    // ------- CSS variable fallbacks (works even if not defined on :root) -------
    const cs = getComputedStyle(document.documentElement);
    const metalBase = cs.getPropertyValue("--metal-base").trim() || "#c48c5a";
    const metalEmissive =
      cs.getPropertyValue("--metal-emissive").trim() || "#5b3a23";
    const fogColor = cs.getPropertyValue("--fog").trim() || "#cfa882";

    // ----------------- Tunables (mirrors your HTML version) -----------------
    const COUNT = count;
    const BOX_SIZE = 2.4;
    const SCALE = 0.75;
    const TRACKING_PX = 56,
      LINE_GAP_PX = 240,
      FONT_PX = 280;

    const EDGE_BURST_FRACTION = 0.5;
    const BURST_SPEED_MIN = 110,
      BURST_SPEED_MAX = 260;
    const TANGENT_JITTER = 0.55,
      BURST_TIME = 1.6;

    const NUM_STAMPS = 22;
    const STAMP_PULL = 32;
    const STAMP_EDGE_FRAY = 0.45;
    const STAMP_SHARPNESS_MIN = 0.8,
      STAMP_SHARPNESS_MAX = 1.6;
    const STAMP_SIZE_MIN = 180,
      STAMP_SIZE_MAX = 420;

    const HALO_SPAWN_WEIGHT = 0.22;
    const HALO_BAND_PX = 26;
    const HALO_OFFSET_PX = 8;
    const HALO_PULL_NEAR = 38;
    const HALO_AVOID = 120;
    const HALO_NOISE = 0.35;
    const HALO_ACTIVE_RANGE = HALO_BAND_PX * 2.2;

    const OUTLIER_CHANCE = 0.06;
    const GRAVITY = 26;
    const DRAG = 0.985;

    const MOUSE_RADIUS = 260,
      MOUSE_FORCE = 38,
      CLICK_BOOST = 2.2,
      STUCK_WIGGLE_CAP = 1.2;

    const VIEW_OVERSCAN_SPAWN = 1.45;

    const INFLATE_DELAY = BURST_TIME;
    const INFLATE_DURATION = 0.9;
    const INFLATE_BAND = 110;
    const INFLATE_STRENGTH = 220;

    // ---------------- Scene / Camera / Renderer ----------------
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      4000
    );
    camera.position.set(0, 220, 900);
    camera.lookAt(0, 0, 0);
    scene.rotation.x = -0.13;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas,
    });
    renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // ---------------- Helper: draw text with tracking ----------------
    function drawWithTracking(ctx, text, cx, y, tr, fontPx, weight = "900") {
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `${weight} ${fontPx}px "Arial Black", Arial, sans-serif`;
      const cs = [...text],
        ws = cs.map((c) => ctx.measureText(c).width);
      const total = ws.reduce((a, b) => a + b, 0) + tr * (cs.length - 1);
      let x = cx - total / 2;
      for (let i = 0; i < cs.length; i++) {
        const w = ws[i];
        ctx.save();
        ctx.translate(x + w / 2, y);
        ctx.fillText(cs[i], 0, 0);
        ctx.restore();
        x += w + (i < cs.length - 1 ? tr : 0);
      }
    }

    // ---------------- Letter mask for HOLLAND / BLUMER ----------------
    const MASK_W = 3600,
      MASK_H = 1000;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = MASK_W;
    maskCanvas.height = MASK_H;
    const mctx = maskCanvas.getContext("2d");

    (function buildMask() {
      mctx.setTransform(1, 0, 0, 1, 0, 0);
      mctx.clearRect(0, 0, MASK_W, MASK_H);
      // White = allowed area; Black = letters (forbidden to enter)
      mctx.fillStyle = "#fff";
      mctx.fillRect(0, 0, MASK_W, MASK_H);
      mctx.fillStyle = "#000";
      const cx = MASK_W / 2,
        cy = MASK_H / 2;
      drawWithTracking(
        mctx,
        "HOLLAND",
        cx,
        cy - LINE_GAP_PX / 2,
        TRACKING_PX,
        FONT_PX
      );
      drawWithTracking(
        mctx,
        "BLUMER",
        cx,
        cy + LINE_GAP_PX / 2,
        TRACKING_PX,
        FONT_PX
      );
    })();
    const maskData = mctx.getImageData(0, 0, MASK_W, MASK_H).data;

    // ---------------- Derived world sizes ----------------
    const WORLD_W = MASK_W * SCALE,
      WORLD_H = MASK_H * SCALE,
      TEXT_Z_PLANE = 0;
    const maskIndex = (x, y) => (y * MASK_W + x) * 4;
    function inLetterMask(xw, yw) {
      const x = Math.round(((xw + WORLD_W / 2) / WORLD_W) * (MASK_W - 1));
      const y = Math.round(((WORLD_H / 2 - yw) / WORLD_H) * (MASK_H - 1));
      if (x < 0 || x >= MASK_W || y < 0 || y >= MASK_H) return false;
      return maskData[maskIndex(x, y)] < 50;
    }
    function letterNormal(xw, yw) {
      const h = 6,
        sL = inLetterMask(xw - h, yw) ? 1 : 0,
        sR = inLetterMask(xw + h, yw) ? 1 : 0,
        sD = inLetterMask(xw, yw - h) ? 1 : 0,
        sU = inLetterMask(xw, yw + h) ? 1 : 0;
      let nx = sL - sR,
        ny = sD - sU;
      const len = Math.hypot(nx, ny) || 1;
      return { x: nx / len, y: ny / len };
    }

    // ---------------- View helpers ----------------
    function viewHalf() {
      const hh =
        Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) *
        (camera.position.z - TEXT_Z_PLANE);
      return { halfH: hh, halfW: hh * camera.aspect };
    }
    let VIEW = viewHalf();

    // ---------------- Width-fit camera (driven by width) ----------------
    function fitWorldToViewportWidth(fraction = 0.92) {
      const frac = Math.max(0.85, Math.min(0.95, fraction)); // avoid too tiny
      const fovRad = THREE.MathUtils.degToRad(camera.fov);
      const aspect = window.innerWidth / window.innerHeight;
      const halfWDesired = WORLD_W / 2 / frac;
      const distance = halfWDesired / (Math.tan(fovRad * 0.5) * aspect);
      camera.aspect = aspect;
      camera.position.z = TEXT_Z_PLANE + distance;
      camera.updateProjectionMatrix();
      VIEW = viewHalf();
    }
    fitWorldToViewportWidth(0.92);

    // ---------------- Noise + utilities ----------------
    const noise2 = (x, y) =>
      Math.sin(x * 0.0027 + y * 0.0031) * Math.cos(x * 0.0019 - y * 0.0023);
    const rand = (a, b) => a + Math.random() * (b - a);

    // ---------------- Irregular stamps ----------------
    const stamps = [];
    function spawnStamps() {
      stamps.length = 0;
      const w = VIEW.halfW * VIEW_OVERSCAN_SPAWN,
        h = VIEW.halfH * VIEW_OVERSCAN_SPAWN;
      for (let i = 0; i < NUM_STAMPS; i++) {
        const ax = rand(STAMP_SIZE_MIN, STAMP_SIZE_MAX);
        const ay = ax * rand(0.55, 1.35);
        stamps.push({
          x: (Math.random() * 2 - 1) * w,
          y: (Math.random() * 2 - 1) * h,
          ax,
          ay,
          rot: rand(0, Math.PI * 2),
          p: rand(STAMP_SHARPNESS_MIN, STAMP_SHARPNESS_MAX),
          fray: STAMP_EDGE_FRAY * rand(0.7, 1.2),
          tight: rand(0.9, 1.5),
          seed: rand(-10000, 10000),
        });
      }
    }
    spawnStamps();

    function stampR(s, x, y) {
      const dx = x - s.x,
        dy = y - s.y;
      const c = Math.cos(s.rot),
        si = Math.sin(s.rot);
      const u = (dx * c + dy * si) / s.ax;
      const v = (-dx * si + dy * c) / s.ay;
      const r = Math.pow(
        Math.pow(Math.abs(u), s.p) + Math.pow(Math.abs(v), s.p),
        1.0 / s.p
      );
      return { r, u, v, c, si };
    }
    function stampWeight(s, x, y) {
      const o = stampR(s, x, y);
      const jitter =
        1.0 -
        0.35 *
          s.fray *
          (noise2((x + s.seed) * 0.01, (y - s.seed) * 0.01) * 0.5 + 0.5);
      const w = Math.exp(-s.tight * o.r * o.r) * jitter;
      return Math.min(1, Math.max(0, w));
    }
    function stampForce(s, x, y) {
      const o = stampR(s, x, y);
      const dPdu = (2 * o.u) / (s.ax * s.ax),
        dPdv = (2 * o.v) / (s.ay * s.ay);
      const gx = dPdu * o.c - dPdv * o.si;
      const gy = dPdu * o.si + dPdv * o.c;
      const w = stampWeight(s, x, y);
      return { fx: -STAMP_PULL * gx * w, fy: -STAMP_PULL * gy * w };
    }
    const randomStamp = () => stamps[(Math.random() * stamps.length) | 0];

    // ---------------- Edge emitters ----------------
    const edgeEmitters = [];
    (function buildEdgeEmitters() {
      const step = 10;
      for (let y = step; y < MASK_H - step; y += step) {
        for (let x = step; x < MASK_W - step; x += step) {
          const i = (y * MASK_W + x) * 4;
          if (maskData[i] < 50) continue; // only white -> outside letters
          let near = false;
          for (let dy = -1; dy <= 1 && !near; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const j = ((y + dy) * MASK_W + (x + dx)) * 4;
              if (maskData[j] < 50) {
                near = true;
                break;
              }
            }
          }
          if (!near) continue;
          const wx = (x / (MASK_W - 1)) * WORLD_W - WORLD_W / 2,
            wy = WORLD_H / 2 - (y / (MASK_H - 1)) * WORLD_H;
          const n = letterNormal(wx, wy);
          edgeEmitters.push({ x: wx, y: wy, nx: n.x, ny: n.y });
        }
      }
    })();

    // ---------------- HALO helpers ----------------
    function signedEdgeDistance(xw, yw, maxProbe) {
      const n = letterNormal(xw, yw);
      let d = 0,
        sx = xw,
        sy = yw;
      for (let k = 0; k < maxProbe; k++) {
        sx -= n.x;
        sy -= n.y;
        d += 1;
        if (inLetterMask(sx, sy)) return HALO_OFFSET_PX - d;
      }
      return maxProbe + HALO_OFFSET_PX;
    }
    function haloForce(xw, yw) {
      if (inLetterMask(xw, yw)) {
        const n = letterNormal(xw, yw);
        return { fx: n.x * HALO_AVOID, fy: n.y * HALO_AVOID };
      }
      const d = signedEdgeDistance(xw, yw, 64);
      const ad = Math.abs(d);
      if (ad > HALO_ACTIVE_RANGE) return { fx: 0, fy: 0 };
      const n = letterNormal(xw, yw);
      const target = 0;
      const err = d - target;
      const nearT = 1 - Math.min(1, ad / HALO_ACTIVE_RANGE);
      const fall = nearT * nearT * (3 - 2 * nearT);
      const k = -HALO_PULL_NEAR * Math.tanh(err / (HALO_BAND_PX * 0.8)) * fall;
      const fr = 1 + HALO_NOISE * (noise2(xw * 0.02, yw * 0.02) * 0.5);
      return { fx: n.x * k * fr, fy: n.y * k * fr };
    }

    // ---------------- Sampling ----------------
    function viewRandomPoint() {
      return {
        x: (Math.random() * 2 - 1) * VIEW.halfW * VIEW_OVERSCAN_SPAWN,
        y: (Math.random() * 2 - 1) * VIEW.halfH * VIEW_OVERSCAN_SPAWN,
      };
    }
    function sampleFromStamp() {
      const s = randomStamp();
      const a = Math.random() * Math.PI * 2,
        r = Math.sqrt(Math.random());
      const ex = s.ax * r * Math.cos(a),
        ey = s.ay * r * Math.sin(a);
      const c = Math.cos(s.rot),
        si = Math.sin(s.rot);
      const x = s.x + (ex * c - ey * si);
      const y = s.y + (ex * si + ey * c);
      return { x, y, stampIndex: stamps.indexOf(s) };
    }
    function sampleFromEdge() {
      const e = edgeEmitters[(Math.random() * edgeEmitters.length) | 0];
      const d = 6 + Math.random() * 16,
        jitterA = (Math.random() - 0.5) * TANGENT_JITTER * 10;
      return {
        x: e.x + e.nx * d + Math.cos(jitterA) * 2.5,
        y: e.y + e.ny * d + Math.sin(jitterA) * 2.5,
        nx: e.nx,
        ny: e.ny,
        fromEdge: 1,
      };
    }
    function sampleFromHalo() {
      for (let tries = 0; tries < 1500; tries++) {
        const p = viewRandomPoint();
        const dist = Math.abs(signedEdgeDistance(p.x, p.y, 64));
        if (!inLetterMask(p.x, p.y) && dist <= HALO_BAND_PX * 1.1) {
          const n = letterNormal(p.x, p.y);
          return {
            x: p.x + n.x * HALO_OFFSET_PX,
            y: p.y + n.y * HALO_OFFSET_PX,
            fromHalo: 1,
            nx: n.x,
            ny: n.y,
          };
        }
      }
      return sampleFromEdge();
    }
    function randomAllowedPoint() {
      const roll = Math.random();
      if (roll < EDGE_BURST_FRACTION) return sampleFromEdge();
      if (roll < EDGE_BURST_FRACTION + HALO_SPAWN_WEIGHT)
        return sampleFromHalo();

      if (Math.random() < 0.6) {
        let p = sampleFromStamp();
        if (inLetterMask(p.x, p.y)) {
          const n = noise2(p.x, p.y) > 0 ? 1 : -1;
          p.x += n * 12;
        }
        return { x: p.x, y: p.y, stampIndex: p.stampIndex };
      } else {
        let tries = 0;
        while (tries++ < 1500) {
          const q = viewRandomPoint();
          if (
            !inLetterMask(q.x, q.y) &&
            (Math.random() < 0.85 || Math.random() < OUTLIER_CHANCE)
          ) {
            let bestI = -1,
              bestD2 = 1e12;
            for (let s = 0; s < stamps.length; s++) {
              const dx = q.x - stamps[s].x,
                dy = q.y - stamps[s].y,
                d2 = dx * dx + dy * dy;
              if (d2 < bestD2) {
                bestD2 = d2;
                bestI = s;
              }
            }
            return { x: q.x, y: q.y, stampIndex: bestI };
          }
        }
        return { x: 0, y: 0, stampIndex: 0 };
      }
    }

    // ---------------- Instanced particles (dodecahedrons) ----------------
    const geometry = new THREE.DodecahedronGeometry(BOX_SIZE * 0.75, 0);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(metalBase),
      emissive: new THREE.Color(metalEmissive),
      roughness: 0.28,
      metalness: 0.82,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = false;
    scene.add(mesh);

    const key = new THREE.DirectionalLight(0xfff2e1, 0.95);
    key.position.set(-520, 380, 520);
    scene.add(key);
    const brass = new THREE.PointLight(0xd9a566, 1.65, 2200);
    brass.position.set(0, 200, 260);
    scene.add(brass);
    scene.add(new THREE.AmbientLight(0x3a2a22, 0.55));

    scene.fog = new THREE.FogExp2(new THREE.Color(fogColor), 0.00042);

    // ---------------- State arrays ----------------
    const m = new THREE.Matrix4(),
      tmpPos = new THREE.Vector3(),
      tmpQuat = new THREE.Quaternion(),
      tmpScale = new THREE.Vector3(1, 1, 1);
    const vx = new Float32Array(COUNT),
      vy = new Float32Array(COUNT),
      vx3 = new Float32Array(COUNT),
      vy3 = new Float32Array(COUNT);
    const ox = new Float32Array(COUNT),
      oy = new Float32Array(COUNT),
      oz = new Float32Array(COUNT),
      zspd = new Float32Array(COUNT);
    const stuck = new Uint8Array(COUNT),
      targetZ = new Float32Array(COUNT),
      edged = new Uint8Array(COUNT);
    const baseScale = new Float32Array(COUNT),
      homeStamp = new Int16Array(COUNT),
      fromHalo = new Uint8Array(COUNT);

    function reset(i) {
      stuck[i] = 0;
      const p = randomAllowedPoint();
      ox[i] = p.x + rand(-3, 3);
      oy[i] = p.y + rand(-3, 3);
      oz[i] = rand(-500, -200);
      zspd[i] = rand(4, 7.5);
      vx[i] = rand(-0.24, 0.24);
      vy[i] = rand(-0.24, 0.24);

      const sp = rand(BURST_SPEED_MIN, BURST_SPEED_MAX);
      const nx = p.nx ?? 0,
        ny = p.ny ?? -1;
      const tangent = (Math.random() < 0.5 ? 1 : -1) * TANGENT_JITTER,
        tx = -ny * tangent,
        ty = nx * tangent;
      vx3[i] = nx * sp + tx * sp * 0.25;
      vy3[i] = ny * sp + ty * 0.25;

      targetZ[i] = rand(-18, 18);
      edged[i] = p.fromEdge ? 1 : 0;
      fromHalo[i] = p.fromHalo ? 1 : 0;
      baseScale[i] = 0.6 + Math.random() * 0.35;
      homeStamp[i] = p.stampIndex != null ? p.stampIndex : 0;
    }

    const PRE = Math.floor(COUNT * 0.28);
    for (let i = 0; i < PRE; i++) {
      const p = randomAllowedPoint();
      ox[i] = p.x + rand(-2, 2);
      oy[i] = p.y + rand(-2, 2);
      oz[i] = TEXT_Z_PLANE + rand(-12, 12);
      vx[i] = vy[i] = 0;
      zspd[i] = 0;
      stuck[i] = 1;
      targetZ[i] = oz[i] - TEXT_Z_PLANE;
      const sp = 0.5 * rand(BURST_SPEED_MIN, BURST_SPEED_MAX);
      const nx = p.nx ?? 0,
        ny = p.ny ?? -1;
      const tangent = (Math.random() < 0.5 ? 1 : -1) * TANGENT_JITTER;
      const tx = -ny * tangent,
        ty = nx * tangent;
      vx3[i] = nx * sp + tx * sp * 0.25;
      vy3[i] = ny * sp + ty * 0.25;
      edged[i] = p.fromEdge ? 1 : 0;
      fromHalo[i] = p.fromHalo ? 1 : 0;
      baseScale[i] = 0.6 + Math.random() * 0.35;
      homeStamp[i] = p.stampIndex != null ? p.stampIndex : 0;
    }
    for (let i = PRE; i < COUNT; i++) reset(i);

    // ---------------- Mouse (project to text plane) ----------------
    const raycaster = new THREE.Raycaster(),
      mouseNDC = new THREE.Vector2(),
      mouseWorld = new THREE.Vector2(NaN, NaN);
    let mouseDown = false;

    function updateMouseWorld(cx, cy) {
      mouseNDC.x = (cx / window.innerWidth) * 2 - 1;
      mouseNDC.y = -(cy / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouseNDC, camera);
      const { origin, direction } = raycaster.ray;
      const t = (TEXT_Z_PLANE - origin.z) / direction.z;
      const p = origin.clone().add(direction.clone().multiplyScalar(t));
      mouseWorld.set(p.x, p.y);
    }
    const R2_MAX = MOUSE_RADIUS * MOUSE_RADIUS;

    function applyMouseForce(i) {
      if (Number.isNaN(mouseWorld.x)) return;
      const dx = ox[i] - mouseWorld.x,
        dy = oy[i] - mouseWorld.y,
        r2 = dx * dx + dy * dy;
      if (r2 > R2_MAX || r2 === 0) return;
      const r = Math.sqrt(r2),
        fall = 1 - r / MOUSE_RADIUS,
        k = (mouseDown ? CLICK_BOOST : 1) * MOUSE_FORCE * fall;
      const nx = dx / (r + 1e-4),
        ny = dy / (r + 1e-4);
      let nxPos = ox[i] + nx * k,
        nyPos = oy[i] + ny * k;
      if (inLetterMask(nxPos, nyPos)) return;
      if (stuck[i]) {
        const cap = STUCK_WIGGLE_CAP;
        nxPos = ox[i] + Math.max(-cap, Math.min(cap, nx * k));
        nyPos = oy[i] + Math.max(-cap, Math.min(cap, ny * k));
        if (inLetterMask(nxPos, nyPos)) return;
      }
      ox[i] = nxPos;
      oy[i] = nyPos;
    }

    // ---------------- Inflate helpers ----------------
    function smoothstep01(u) {
      return u * u * (3 - 2 * u);
    }
    function inflateWeight(t) {
      const u = (t - INFLATE_DELAY) / INFLATE_DURATION;
      if (u <= 0 || u >= 1) return 0;
      const s = smoothstep01(u);
      return s * (1 - u);
    }

    // ---------------- Animation loop ----------------
    let raf = 0;
    let prev = performance.now();
    let tSec = 0;

    function frame(now) {
      const dt = Math.min(0.05, (now - prev) / 1000); // clamp delta
      prev = now;
      tSec += dt;

      const burstWeight = Math.max(0, 1 - tSec / BURST_TIME); // 1 -> 0

      for (let i = 0; i < COUNT; i++) {
        if (!stuck[i]) {
          vx[i] += vx3[i] * burstWeight * dt;
          vy[i] += vy3[i] * burstWeight * dt;

          const s = stamps[homeStamp[i] % stamps.length];
          const F = stampForce(s, ox[i], oy[i]);
          vx[i] += F.fx * dt;
          vy[i] += F.fy * dt;

          const H = haloForce(ox[i], oy[i]);
          vx[i] += H.fx * dt;
          vy[i] += H.fy * dt;

          // post-burst inflation
          const infl = inflateWeight(tSec);
          if (infl > 0) {
            const d = Math.abs(signedEdgeDistance(ox[i], oy[i], 64));
            if (!inLetterMask(ox[i], oy[i]) && d <= INFLATE_BAND) {
              const n = letterNormal(ox[i], oy[i]);
              const fall = 1 - d / INFLATE_BAND;
              const k = INFLATE_STRENGTH * infl * fall * fall;
              vx[i] += n.x * k * dt;
              vy[i] += n.y * k * dt;
            }
          }

          // curl/noise motion
          const n1 = noise2(ox[i] + tSec * 120, oy[i] - tSec * 90);
          const n2 = noise2(ox[i] - tSec * 95, oy[i] + tSec * 110);
          vx[i] +=
            (n1 * 0.9 + Math.sin(tSec * 0.7 + i * 0.013) * 0.3) * 14.0 * dt;
          vy[i] +=
            (n2 * 0.9 + Math.cos(tSec * 0.8 + i * 0.017) * 0.3) * 14.0 * dt;

          // gravity/drag/advance
          vy[i] -= GRAVITY * dt;
          vx[i] *= DRAG;
          vy[i] *= DRAG;
          ox[i] += vx[i] * dt;
          oy[i] += vy[i] * dt;

          // keep outside letters
          if (inLetterMask(ox[i], oy[i])) {
            const n = letterNormal(ox[i], oy[i]);
            ox[i] += n.x * 10;
            oy[i] += n.y * 10;
            vx[i] *= 0.6;
            vy[i] *= 0.6;
          }

          applyMouseForce(i);

          // settle to target Z
          oz[i] += zspd[i];
          if (oz[i] >= TEXT_Z_PLANE + targetZ[i]) {
            if (!inLetterMask(ox[i], oy[i])) {
              oz[i] = TEXT_Z_PLANE + targetZ[i];
              zspd[i] = 0;
              stuck[i] = 1;
            } else reset(i);
          }

          tmpScale.set(1, 1, 1);
        } else {
          const s = 1.0 + Math.sin(tSec * 3.0 + i * 0.07) * 0.05;
          tmpScale.set(s, s, s);
          applyMouseForce(i);
          if (inLetterMask(ox[i], oy[i])) {
            const n = letterNormal(ox[i], oy[i]);
            ox[i] += n.x * 8;
            oy[i] += n.y * 8;
          }
        }

        // subtle vertical size bias (depth cue)
        const yNorm = (oy[i] - -VIEW.halfH) / (2 * VIEW.halfH);
        tmpScale.multiplyScalar(baseScale[i] * (0.92 + (1.04 - yNorm * 0.1)));

        // write instance matrix
        const rx = tSec * 0.2 + i * 0.001,
          ry = tSec * 0.27 + i * 0.002,
          rz = tSec * 0.23 + i * 0.0014;
        tmpQuat.setFromEuler(new THREE.Euler(rx, ry, rz));
        tmpPos.set(ox[i], oy[i], oz[i]);
        m.compose(tmpPos, tmpQuat, tmpScale);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // ---------------- Events ----------------
    function onResize() {
      renderer.setSize(window.innerWidth, window.innerHeight);
      fitWorldToViewportWidth(0.92);
      spawnStamps();
    }
    function onMouseMove(e) {
      updateMouseWorld(e.clientX, e.clientY);
    }
    function onMouseDown() {
      mouseDown = true;
    }
    function onMouseUp() {
      mouseDown = false;
    }
    function onMouseLeave() {
      mouseWorld.set(NaN, NaN);
      mouseDown = false;
    }
    function onTouchStart(e) {
      const t = e.touches[0];
      updateMouseWorld(t.clientX, t.clientY);
      mouseDown = true;
    }
    function onTouchMove(e) {
      const t = e.touches[0];
      updateMouseWorld(t.clientX, t.clientY);
    }
    function onTouchEnd() {
      mouseDown = false;
      mouseWorld.set(NaN, NaN);
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    // ---------------- Cleanup ----------------
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);

      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [count]);

  return (
    <>
      {withBackground && (
        <div
          ref={bgRef}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            backgroundImage:
              "linear-gradient(135deg, var(--bg-top, #8c5c3e), var(--bg-bottom, #d6ae8e))",
          }}
        />
      )}
      <canvas
        ref={canvasRef}
        className="main"
        style={{
          position: "fixed",
          inset: 0,
          display: "block",
          zIndex: 1,
          ...style,
        }}
      />
    </>
  );
}
