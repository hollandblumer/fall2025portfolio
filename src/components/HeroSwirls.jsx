// src/components/Hero.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import HeroNavSliced from "./nav/HeroNavSliced.jsx";
import About from "./about/About.jsx";

const DRAG_ENABLED = false;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ----------------------------- SHADERS ----------------------------- */
// Vertex: spline warping + fold, exports a surface-space UV + world data
const WAVE_VERT = `
  uniform vec3 xCurve[5];
  uniform vec3 zCurve[4];
  uniform float foldStartZ;
  uniform float foldWidth;
  uniform float foldRadius;
  uniform float foldMaxRad;
  uniform float pivotYOffset;

  varying vec2 vSurfUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  vec3 catmull(vec3 p0,vec3 p1,vec3 p2,vec3 p3,float t){
    float t2=t*t, t3=t2*t;
    return 0.5*((2.0*p1)+(-p0+p2)*t+(2.0*p0-5.0*p1+4.0*p2-p3)*t2+(-p0+3.0*p1-3.0*p2+p3)*t3);
  }
  vec3 sampleX(float p, vec3 arr[5]){
    float pt=p*4.0; int i=int(floor(pt)); float f=fract(pt);
    vec3 p0=arr[max(i-1,0)], p1=arr[i], p2=arr[min(i+1,4)], p3=arr[min(i+2,4)];
    return catmull(p0,p1,p2,p3,f);
  }
  vec3 sampleZ(float p, vec3 arr[4]){
    float pt=p*3.0; int i=int(floor(pt)); float f=fract(pt);
    vec3 p0=arr[max(i-1,0)], p1=arr[i], p2=arr[min(i+1,3)], p3=arr[min(i+2,3)];
    return catmull(p0,p1,p2,p3,f);
  }

  void main(){
    vec3 pos = position;

    // spline bends
    vec3 xo = sampleX((pos.x+50.0)*0.01, xCurve); pos.x = xo.x; pos.yz += xo.yz;
    vec3 zo = sampleZ((pos.z+50.0)*0.01, zCurve); pos.z = zo.z; pos.xy += zo.xy;

    // fold capture
    float captureStart = foldStartZ - foldWidth;
    float tCapture = clamp((pos.z - captureStart) / max(foldWidth, 0.0001), 0.0, 1.0);
    tCapture = smoothstep(0.0, 1.0, tCapture);
    float ang = tCapture * foldMaxRad;

    // curl around pivot
    float yPivot = pivotYOffset;
    float zPivot = foldStartZ;

    vec2 yz = vec2(pos.y - yPivot, pos.z - zPivot);
    vec2 onCircle = vec2(0.0, foldRadius);
    float c = cos(ang), s = sin(ang);
    float cy =  onCircle.x * c - onCircle.y * s;
    float cz =  onCircle.x * s + onCircle.y * c;
    vec2 curledYZ = mix(yz, vec2(cy, cz), tCapture);

    pos.y = yPivot + curledYZ.x;
    pos.z = zPivot + curledYZ.y;

    // surface UV rides the deformed xz
    vSurfUv = pos.xz * 0.02;

    // world data
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

// Fragment: your simplex shader + upward motion + env reflections
const WAVE_FRAG = `
  uniform vec2  uOffsetRepeat;   // y = surface scale
  uniform vec3  uColorStart;
  uniform vec3  uColorEnd;

  uniform samplerCube envMap;    // IBL
  uniform float uEnvStrength;    // 0..1
  uniform float uMetallic;       // 0..1
  uniform float uSpecBoost;      // 0..2
  uniform float uTime;           // time for conveyor scroll

  varying vec2 vSurfUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  //	Simplex 3D Noise 
  //	by Ian McEwan, Ashima Arts
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;

    i = mod(i, 289.0 ); 
    vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 1.0/7.0; // N=7
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    // base UV that rides the surface
    vec2 uv = (vSurfUv - 0.5) * uOffsetRepeat.y + 0.5;

    // 🔸 conveyor-belt motion: slide the pattern upward, but keep it periodic
    uv.y = fract(uv.y + uTime * 0.05);

    // use *static* noise pattern (no time in the noise itself)
    vec2 displacedUv = uv + snoise(vec3(uv * 1.0, 0.0));
    float strength   = snoise(vec3(displacedUv * 5.0, 0.0));

    strength += step(-0.2, strength) * 0.8;
    strength = clamp(strength, 0.0, 1.0);
    vec3 base = mix(uColorStart, uColorEnd, strength);

    // reflections
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 R = reflect(-V, N);
    vec3 env = textureCube(envMap, R).rgb;

    float F0 = mix(0.04, 1.0, uMetallic);
    float fres = pow(1.0 - clamp(dot(N,V), 0.0, 1.0), 5.0);
    float Fr = F0 + (1.0 - F0) * fres;

    vec3 spec = env * (Fr * uEnvStrength * (0.6 + 0.4 * uSpecBoost));
    vec3 diff = base * (1.0 - uMetallic * 0.5);

    gl_FragColor = vec4(diff + spec, 1.0);
  }
`;

/* ----------------------------- COMPONENT ----------------------------- */
export default function Hero() {
  const heroRef = useRef(null);
  const threeRef = useRef(null);

  const labelRefs = {
    about: useRef(null),
    work: useRef(null),
    contact: useRef(null),
    social: useRef(null),
  };

  const socialRefs = {
    linkedin: useRef(null),
    instagram: useRef(null),
    github: useRef(null),
    codepen: useRef(null),
  };

  const [coverOpen, setCoverOpen] = useState(false);
  const [btnMode, setBtnMode] = useState("restart");

  useEffect(() => {
    let alive = true;

    let renderer,
      scene,
      camera,
      clock,
      rafId = 0;
    let wave, seamVeil;
    let xCurveBase,
      zCurveBase,
      xCurve,
      zCurve,
      curveShift = 0;
    let ro;

    // NO 5-second wait
    const FIRST_HOLD_MS = 0;
    const THREE_EASE_MS = 1200;
    const bootStarted = performance.now();

    const intro = { active: true, started: performance.now(), duration: 900 };

    const aboutFall = {
      active: false,
      y: 0,
      vy: 0,
      ay: 10.05,
      bottomY: 0,
      restoring: false,
      restoreStart: 0,
      restoreDur: 600,
    };

    const social = {
      active: false,
      items: [
        {
          key: "linkedin",
          href: "https://www.linkedin.com/in/hollandblumer/",
          u: -0.04,
          delay: 0,
          speed: 0.012,
        },
        {
          key: "instagram",
          href: "https://www.instagram.com/",
          u: -0.04,
          delay: 240,
          speed: 0.012,
        },
        {
          key: "github",
          href: "https://github.com/hollandblumer",
          u: -0.04,
          delay: 480,
          speed: 0.012,
        },
        {
          key: "codepen",
          href: "https://codepen.io/",
          u: -0.04,
          delay: 720,
          speed: 0.012,
        },
      ],
      started: 0,
    };
    social.items.forEach((it) => {
      it.ref = socialRefs[it.key].current;
      if (it.ref) {
        it.ref.style.opacity = "0";
        it.ref.style.pointerEvents = "none";
        it.ref.style.transform = "translate(-50%,-50%) scale(0.85)";
      }
    });

    const LABELS = [
      { key: "about", t: -0.26 },
      { key: "work", t: -0.22 },
      { key: "contact", t: -0.18 },
      { key: "social", t: -0.14 },
    ];

    const getW = () => heroRef.current?.clientWidth || window.innerWidth;
    const getH = () => heroRef.current?.clientHeight || window.innerHeight;

    /* ----------------------------- Curve helpers ----------------------------- */
    const catmull = (p0, p1, p2, p3, t) => {
      const t2 = t * t,
        t3 = t2 * t;
      return new THREE.Vector3(
        0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        0.5 *
          (2 * p1.z +
            (-p0.z + p2.z) * t +
            (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
            (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3)
      );
    };
    const sampleCurve = (arr, u) => {
      const segs = arr.length === 5 ? 4 : 3;
      let pt = clamp(u, 0, 1) * segs;
      let i = Math.floor(pt),
        f = pt - i;
      i = Math.max(0, Math.min(segs - 1, i));
      const p0 = arr[Math.max(i - 1, 0)],
        p1 = arr[i],
        p2 = arr[Math.min(i + 1, arr.length - 1)],
        p3 = arr[Math.min(i + 2, arr.length - 1)];
      return catmull(p0, p1, p2, p3, f);
    };
    const seamX = () => sampleCurve(xCurve, 0.5).x;
    const seamPoint = (u) => {
      const sx = sampleCurve(xCurve, 0.5);
      const cx = sampleCurve(xCurve, u);
      const cz = sampleCurve(zCurve, u);
      return new THREE.Vector3(sx.x, cx.y + cz.y, cz.z);
    };
    const worldToScreen = (v) => {
      const p = v.clone().project(camera);
      const r = renderer;
      return {
        x: ((p.x * 0.5 + 0.5) * r.domElement.width) / r.getPixelRatio(),
        y: ((-p.y * 0.5 + 0.5) * r.domElement.height) / r.getPixelRatio(),
        z: p.z,
      };
    };
    const targetScreenYs = () => {
      const h = getH();
      const first = labelRefs.about.current;
      const fs = first
        ? parseFloat(getComputedStyle(first).fontSize) || 24
        : 24;
      const gap = Math.max(28, Math.min(100, fs * 4.85));
      const n = 4;
      const center = h * 0.5;
      const start = center - ((n - 1) * gap) / 2;
      return new Array(n).fill(0).map((_, i) => start + i * gap);
    };
    const findUForScreenY = (targetY) => {
      let lo = -0.02,
        hi = 1.02,
        bestU = lo,
        bestDy = Infinity;
      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) * 0.5;
        const y = worldToScreen(seamPoint(mid)).y;
        const dy = Math.abs(y - targetY);
        if (dy < bestDy) {
          bestDy = dy;
          bestU = mid;
        }
        if (y < targetY) lo = mid;
        else hi = mid;
      }
      return Math.min(0.985, bestU);
    };

    /* ----------------------------- THREE boot ----------------------------- */
    async function bootThree() {
      const mount = threeRef.current;
      if (!mount) return () => {};

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(getW(), getH());
      renderer.setClearColor("#ffffff");
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      mount.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(55, getW() / getH(), 0.1, 1000);
      camera.position.set(0, 20, 60);
      camera.lookAt(0, 20, 0);

      // curves
      xCurveBase = [
        new THREE.Vector3(-120, 0, 0),
        new THREE.Vector3(-25, 0, 0),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(25, 0, 0),
        new THREE.Vector3(120, 0, 0),
      ];
      zCurveBase = [
        new THREE.Vector3(0, 100, -50),
        new THREE.Vector3(0, 20, -5),
        new THREE.Vector3(0, 10, 25),
        new THREE.Vector3(0, 0, 50),
      ];
      xCurve = xCurveBase.map((v) => v.clone());
      zCurve = zCurveBase.map((v) => v.clone());
      const xCurveFlat = xCurveBase.map((v) => new THREE.Vector3(v.x, 0, 0));
      const zCurveFlat = zCurveBase.map(() => new THREE.Vector3(0, 0, 0));

      // dummy black cubemap
      function makeBlackCube() {
        const sides = new Array(6).fill(0).map(() => {
          const cnv = document.createElement("canvas");
          cnv.width = cnv.height = 4;
          const cx = cnv.getContext("2d");
          cx.fillStyle = "#000";
          cx.fillRect(0, 0, 4, 4);
          return cnv;
        });
        const tex = new THREE.CubeTexture(sides);
        tex.colorSpace = THREE.LinearSRGBColorSpace;
        tex.needsUpdate = true;
        return tex;
      }

      class Wave extends THREE.Mesh {
        constructor(xCurve, zCurve) {
          const geom = new THREE.PlaneGeometry(100, 100, 160, 160);
          geom.rotateX(-Math.PI * 0.5);
          const mat = new THREE.ShaderMaterial({
            uniforms: {
              xCurve: { value: xCurve },
              zCurve: { value: zCurve },
              foldStartZ: { value: 30.0 },
              foldWidth: { value: 22.0 },
              foldRadius: { value: 22.0 },
              foldMaxRad: { value: Math.PI },
              pivotYOffset: { value: 0.0 },

              uOffsetRepeat: { value: new THREE.Vector2(0.0, 1.25) },
              uColorStart: {
                value: new THREE.Color("#f2e9b8").convertSRGBToLinear(),
              },
              uColorEnd: {
                value: new THREE.Color("#e85a2a").convertSRGBToLinear(),
              },

              envMap: { value: makeBlackCube() },
              uEnvStrength: { value: 0.6 },
              uMetallic: { value: 0.7 },
              uSpecBoost: { value: 1.2 },
              uTime: { value: 0.0 },
            },
            vertexShader: WAVE_VERT,
            fragmentShader: WAVE_FRAG,
            side: THREE.DoubleSide,
          });
          super(geom, mat);
        }
        update() {}
      }

      wave = new Wave(xCurve, zCurve);
      scene.add(wave);

      class SeamVeil extends THREE.Mesh {
        constructor(xPos, height) {
          const w = 3.2,
            h = height;
          const geom = new THREE.PlaneGeometry(w, h, 1, 1);
          geom.rotateY(Math.PI / 2);
          const c = document.createElement("canvas");
          c.width = 64;
          c.height = 512;
          const ctx = c.getContext("2d");
          const g = ctx.createLinearGradient(0, 0, 0, c.height);
          g.addColorStop(0.0, "rgba(194,14,44,0.18)");
          g.addColorStop(0.5, "rgba(231,181,0,0.36)");
          g.addColorStop(1.0, "rgba(255,226,120,0.20)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, c.width, c.height);
          const tex = new THREE.CanvasTexture(c);
          tex.colorSpace = THREE.SRGBColorSpace;
          const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            depthTest: false,
            depthWrite: false,
          });
          super(geom, mat);
          this.position.set(xPos, h * 0.5 - 20, 0);
          this.renderOrder = 9999;
        }
      }
      seamVeil = new SeamVeil(seamX(), 140);
      scene.add(seamVeil);

      // HDR env
      const pmrem = new THREE.PMREMGenerator(renderer);
      new RGBELoader().setDataType(THREE.FloatType).load(
        "/env/studio_small_09_1k.hdr",
        (hdr) => {
          const envTex = pmrem.fromEquirectangular(hdr).texture;
          scene.environment = envTex;
          if (wave) {
            wave.material.uniforms.envMap.value = envTex;
            wave.material.uniforms.uEnvStrength.value = 1.0;
            wave.material.uniforms.uMetallic.value = 0.9;
          }
          hdr.dispose();
          pmrem.dispose();
        },
        undefined,
        () => {
          if (wave) wave.material.uniforms.uEnvStrength.value = 0.6;
        }
      );

      // start flat then bend
      wave.material.uniforms.foldMaxRad.value = 0.0;
      xCurve.forEach((v, i) => v.copy(xCurveFlat[i]));
      zCurve.forEach((v, i) => v.copy(zCurveFlat[i]));
      wave.material.uniforms.xCurve.value = xCurve;
      wave.material.uniforms.zCurve.value = zCurve;

      const TARGET_FOLD = Math.PI;
      const lerp = (a, b, t) => a + (b - a) * t;
      const lerpV3 = (out, a, b, t) =>
        out.set(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));

      clock = new THREE.Clock();

      const onResize = () => {
        if (!renderer || !camera) return;
        let w = getW(),
          h = getH();
        if (!w || !h || w < 2 || h < 2) {
          w = window.innerWidth || 1;
          h = window.innerHeight || 1;
        }
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize, { passive: true });
      if (heroRef.current) {
        ro = new ResizeObserver(onResize);
        ro.observe(heroRef.current);
      }
      onResize();
      requestAnimationFrame(onResize);

      if (DRAG_ENABLED && heroRef.current) {
        const el = heroRef.current;
        const dragging = { on: false, sx: 0, sShift: 0 };
        const onPointerDown = (e) => {
          dragging.on = true;
          dragging.sx = "touches" in e ? e.touches[0].clientX : e.clientX;
          dragging.sShift = curveShift;
        };
        const onPointerMove = (e) => {
          if (!dragging.on) return;
          const x = "touches" in e ? e.touches[0].clientX : e.clientX;
          const dx = x - dragging.sx;
          curveShift = dragging.sShift + dx * 0.08;
        };
        const onPointerUp = () => {
          dragging.on = false;
        };
        el.addEventListener("mousedown", onPointerDown, { passive: true });
        el.addEventListener("mousemove", onPointerMove, { passive: true });
        window.addEventListener("mouseup", onPointerUp, { passive: true });
        el.addEventListener("touchstart", onPointerDown, { passive: true });
        el.addEventListener("touchmove", onPointerMove, { passive: true });
        window.addEventListener("touchend", onPointerUp, { passive: true });
      }

      const animate = () => {
        if (!alive) return;
        rafId = requestAnimationFrame(animate);

        const tNow = performance.now();
        const sinceBoot = tNow - bootStarted;

        const dtReal = clock.getDelta();
        const dt = (dtReal * 60) / 60;

        // advance shader time for upward motion
        if (wave && wave.material && wave.material.uniforms.uTime) {
          wave.material.uniforms.uTime.value += dtReal;
        }

        // fold / curve easing (no long flat hold, FIRST_HOLD_MS = 0)
        if (sinceBoot <= FIRST_HOLD_MS) {
          wave.material.uniforms.foldMaxRad.value = 0.0;
          for (let i = 0; i < xCurve.length; i++) xCurve[i].copy(xCurveFlat[i]);
          for (let i = 0; i < zCurve.length; i++) zCurve[i].copy(zCurveFlat[i]);
          wave.material.uniforms.xCurve.value = xCurve;
          wave.material.uniforms.zCurve.value = zCurve;
        } else {
          const k = clamp((sinceBoot - FIRST_HOLD_MS) / THREE_EASE_MS, 0, 1);
          const e = easeInOutCubic(k);
          wave.material.uniforms.foldMaxRad.value = lerp(0.0, TARGET_FOLD, e);
          for (let i = 0; i < xCurve.length; i++)
            lerpV3(xCurve[i], xCurveFlat[i], xCurveBase[i], e);
          for (let i = 0; i < zCurve.length; i++)
            lerpV3(zCurve[i], zCurveFlat[i], zCurveBase[i], e);
          wave.material.uniforms.xCurve.value = xCurve;
          wave.material.uniforms.zCurve.value = zCurve;
        }

        seamVeil.position.x = seamX();

        const finalYs = targetScreenYs();
        const topStart = -40;
        const it = intro.active
          ? clamp((performance.now() - intro.started) / intro.duration)
          : 1;
        const introE = easeOutCubic(it);
        if (intro.active && it >= 1) intro.active = false;

        LABELS.forEach((L, i) => {
          let goalY = Math.round(topStart + (finalYs[i] - topStart) * introE);
          if (L.key === "about" && aboutFall.active) {
            aboutFall.vy += aboutFall.ay * dt;
            aboutFall.y = Math.min(
              aboutFall.y + aboutFall.vy,
              aboutFall.bottomY
            );
            goalY = aboutFall.y;
          }
          if (L.key === "about" && aboutFall.restoring) {
            const rT = clamp(
              (performance.now() - aboutFall.restoreStart) /
                aboutFall.restoreDur
            );
            const rE = easeInOutCubic(rT);
            goalY = Math.round(aboutFall.y * (1 - rE) + finalYs[i] * rE);
            if (rT >= 1) aboutFall.restoring = false;
          }

          const uGoal = findUForScreenY(goalY);
          const maxStep = 0.035 * dt;
          const diff = uGoal - L.t;
          L.t += THREE.MathUtils.clamp(diff, -maxStep, maxStep);

          const pos = seamPoint(THREE.MathUtils.clamp(L.t, -0.02, 1.02));
          const scr = worldToScreen(pos);
          const el = labelRefs[L.key].current;
          if (el) {
            el.style.left = `${scr.x}px`;
            el.style.top = `${goalY}px`;
            const s = THREE.MathUtils.clamp(1.2 - pos.z / 120, 0.85, 1.15);
            el.style.transform = `translate(-50%, -50%) scale(${s.toFixed(3)})`;
          }
        });

        if (social.active) {
          const now = performance.now();
          social.items.forEach((it) => {
            if (!it.ref) return;
            if (now < social.started + it.delay) return;
            const maxU = 0.985;
            it.u = Math.min(maxU, it.u + it.speed * dt);
            const pos = seamPoint(it.u);
            const scr = worldToScreen(pos);
            it.ref.style.left = `${scr.x}px`;
            it.ref.style.top = `${scr.y}px`;
            const s = THREE.MathUtils.clamp(1.18 - pos.z / 120, 0.82, 1.18);
            it.ref.style.transform = `translate(-50%,-50%) scale(${s.toFixed(
              3
            )})`;
            it.ref.style.opacity = "1";
            it.ref.style.pointerEvents = "auto";
          });
        }

        renderer.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(rafId);
        try {
          ro && ro.disconnect();
        } catch {}
        try {
          window.removeEventListener("resize", onResize);
        } catch {}
        try {
          renderer?.dispose();
          const el = renderer?.domElement;
          el?.parentElement?.removeChild(el);
        } catch {}
        scene?.traverse((o) => {
          if (o.material)
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(
              (m) => m.dispose()
            );
          if (o.geometry) o.geometry.dispose();
        });
      };
    }

    let cleanupThree;
    (async () => {
      try {
        cleanupThree = await bootThree();
      } catch (e) {
        console.error(e);
      }
    })();

    // expose controls for buttons
    const startAboutFall = () => {
      if (aboutFall.active) return;
      intro.active = false;
      const el = labelRefs.about.current;
      aboutFall.y = el
        ? Math.round(
            el.getBoundingClientRect().top +
              el.getBoundingClientRect().height / 2
          )
        : Math.round(
            worldToScreen(seamPoint(LABELS.find((l) => l.key === "about").t)).y
          );
      aboutFall.vy = 0;
      aboutFall.bottomY = getH() * 0.9;
      aboutFall.active = true;

      const tickToBottom = () => {
        if (!aboutFall.active) return;
        if (Math.abs(aboutFall.y - aboutFall.bottomY) < 0.5) {
          aboutFall.active = false;
          const target = document.getElementById("about");
          if (target)
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => {
            aboutFall.restoring = true;
            aboutFall.restoreStart = performance.now();
          }, 220);
        } else {
          requestAnimationFrame(tickToBottom);
        }
      };
      requestAnimationFrame(tickToBottom);
    };
    heroRef.current && (heroRef.current._startAboutFall = startAboutFall);

    const startSocialChips = () => {
      social.items.forEach((it) => {
        it.u = -0.04;
        if (it.ref) {
          it.ref.style.opacity = "0";
          it.ref.style.pointerEvents = "none";
        }
      });
      social.active = true;
      social.started = performance.now();
    };
    heroRef.current && (heroRef.current._startSocialChips = startSocialChips);

    const restartAll = () => {
      intro.active = true;
      intro.started = performance.now();
    };
    heroRef.current && (heroRef.current._restartAll = restartAll);

    const aboutEl = document.getElementById("about");
    let io;
    if (aboutEl) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries)
            setBtnMode(
              e.isIntersecting && e.intersectionRatio > 0.25 ? "up" : "restart"
            );
        },
        { threshold: [0, 0.25, 0.5, 0.75, 1] }
      );
      io.observe(aboutEl);
    }

    return () => {
      alive = false;
      try {
        cleanupThree && cleanupThree();
      } catch {}
      if (io) io.disconnect();
    };
  }, []);

  /* ----------------------------- UI handlers ----------------------------- */
  function triggerAboutDropWhenVisible() {
    const target = document.getElementById("about");
    if (!target) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting && e.intersectionRatio > 0.4) {
          window.dispatchEvent(new Event("about:drop"));
          io.disconnect();
        }
      },
      { threshold: [0, 0.25, 0.4, 0.6, 0.75] }
    );
    io.observe(target);
  }

  const onAboutClick = (e) => {
    e.preventDefault();
    const el = heroRef.current;
    el && el._startAboutFall && el._startAboutFall();
    triggerAboutDropWhenVisible();
  };
  const onWorkClick = (e) => {
    e.preventDefault();
    const base = import.meta.env.BASE_URL || "/";
    window.location.assign(`${base}work`);
  };
  const onContactClick = (e) => {
    e.preventDefault();
    window.location.href = "mailto:hollandblumer6@icloud.com";
  };
  const onSocialClick = (e) => {
    e.preventDefault();
    const el = heroRef.current;
    el && el._startSocialChips && el._startSocialChips();
  };

  const onRestartOrUp = () => {
    if (btnMode === "up") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        const el = heroRef.current;
        el && el._restartAll && el._restartAll();
      }, 150);
    } else {
      const el = heroRef.current;
      el && el._restartAll && el._restartAll();
    }
  };

  return (
    <>
      <section
        ref={heroRef}
        className="hero-fullbleed"
        style={styles.hero}
        aria-label="Hero seam"
      >
        <div ref={threeRef} className="hero-canvas" />

        {/* Labels */}
        <div ref={labelRefs.about} className="navtext" onClick={onAboutClick}>
          <HeroNavSliced text="about" skewDegAbs={2} direction="left" />
          <button aria-label="About" />
        </div>
        <div ref={labelRefs.work} className="navtext" onClick={onWorkClick}>
          <HeroNavSliced text="work" skewDegAbs={2} direction="left" />
          <button aria-label="Work" />
        </div>
        <div
          ref={labelRefs.contact}
          className="navtext"
          onClick={onContactClick}
        >
          <HeroNavSliced text="contact" skewDegAbs={2} direction="left" />
          <button aria-label="Contact" />
        </div>
        <div ref={labelRefs.social} className="navtext" onClick={onSocialClick}>
          <HeroNavSliced text="social" skewDegAbs={2} direction="left" />
          <button aria-label="Social" />
        </div>

        {/* SOCIAL chips */}
        <div
          ref={socialRefs.linkedin}
          className="socialchip"
          style={{ background: "#0A66C2" }}
          title="LinkedIn"
        >
          <a
            href="https://www.linkedin.com/in/hollandblumer/"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
          />
          <span>in</span>
        </div>
        <div
          ref={socialRefs.instagram}
          className="socialchip"
          style={{ background: "#E1306C" }}
          title="Instagram"
        >
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
          />
          <span>IG</span>
        </div>
        <div
          ref={socialRefs.github}
          className="socialchip"
          style={{ background: "#171515" }}
          title="GitHub"
        >
          <a
            href="https://github.com/hollandblumer"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          />
          <span>GH</span>
        </div>
        <div
          ref={socialRefs.codepen}
          className="socialchip"
          style={{ background: "#111111" }}
          title="CodePen"
        >
          <a
            href="https://codepen.io/"
            target="_blank"
            rel="noreferrer"
            aria-label="CodePen"
          />
          <span>CP</span>
        </div>

        {/* Menu */}
        <button className="menu-btn" onClick={() => setCoverOpen((v) => !v)}>
          {coverOpen ? "Close" : "Menu"}
        </button>

        <div
          className={`cover ${coverOpen ? "open" : ""}`}
          aria-hidden={!coverOpen}
          onClick={() => setCoverOpen(false)}
        />
        <div className="restart-pad" aria-label="Restart or Up">
          <button
            onClick={onRestartOrUp}
            title={btnMode === "up" ? "Back to top" : "Restart"}
          >
            {btnMode === "up" ? "↑" : "↻"}
          </button>
        </div>
      </section>

      <section id="about" style={styles.about}>
        <About />
      </section>
    </>
  );
}

const styles = {
  hero: {
    position: "relative",
    width: "100vw",
    maxWidth: "100vw",
    height: "100svh",
    background: "#ffffff",
    fontFamily: "Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial",
    overflow: "hidden",
    touchAction: "none",
    outline: "none",
    padding: 0,
    margin: 0,
  },
  about: {
    position: "relative",
    width: "100vw",
    minHeight: "100svh",
    display: "grid",
    placeItems: "center",
    background: "transparent",
    color: "#222",
  },
};
