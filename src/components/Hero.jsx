// src/components/Hero.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import HeroNav from "../components/nav/HeroNav.jsx";
import About from "./about/About.jsx";

const P5_CDN = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.2/p5.min.js";

/* ----------------------------- p5 loader (singleton) ---------------------------- */
const ensureP5 = (() => {
  let promise;
  return () => {
    if (typeof window !== "undefined" && window.p5) return Promise.resolve();
    if (promise) return promise;
    promise = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = P5_CDN;
      s.onload = () => res();
      s.onerror = rej;
      document.head.appendChild(s);
    });
    return promise;
  };
})();

/* -------------------------------- handshake ----------------------------------- */
async function waitForP5Canvas(timeout = 4000) {
  const t0 = performance.now();
  while (!window.__p5CanvasForThree) {
    if (performance.now() - t0 > timeout)
      throw new Error("p5 canvas not ready");
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 16));
  }
  return window.__p5CanvasForThree;
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function Hero() {
  const heroRef = useRef(null);
  const threeRef = useRef(null);
  const p5HostRef = useRef(null);

  const labelRefs = {
    about: useRef(null),
    work: useRef(null),
    contact: useRef(null),
    social: useRef(null),
  };

  // Social chip DOM refs
  const socialRefs = {
    linkedin: useRef(null),
    instagram: useRef(null),
    github: useRef(null),
    codepen: useRef(null),
  };

  const [coverOpen, setCoverOpen] = useState(false); // full-screen menu cover
  const [btnMode, setBtnMode] = useState("restart"); // 'restart' ↻ on hero; 'up' ↑ on about

  useEffect(() => {
    let alive = true;

    let renderer,
      scene,
      camera,
      clock,
      rafId = 0;
    let wave, seamVeil, tex;
    let xCurveBase,
      zCurveBase,
      xCurve,
      zCurve,
      curveShift = 0;
    let cleanupP5 = null,
      cleanupThree = null,
      ro;

    // INTRO slide (top -> center-ish)
    const intro = { active: true, started: performance.now(), duration: 900 };

    // ABOUT-only fall (DOM-based start Y)
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

    // SOCIAL chips state (lives outside React to avoid re-renders)
    const social = {
      active: false,
      items: [
        {
          key: "linkedin",
          ref: null,
          href: "https://www.linkedin.com/in/hollandblumer/",
          label: "in",
          bg: "#0A66C2",
          fg: "#fff",
          u: -0.04,
          delay: 0,
          speed: 0.012,
        },
        {
          key: "instagram",
          ref: null,
          href: "https://www.instagram.com/",
          label: "IG",
          bg: "#E1306C",
          fg: "#fff",
          u: -0.04,
          delay: 240,
          speed: 0.012,
        },
        {
          key: "github",
          ref: null,
          href: "https://github.com/hollandblumer",
          label: "GH",
          bg: "#171515",
          fg: "#fff",
          u: -0.04,
          delay: 480,
          speed: 0.012,
        },
        {
          key: "codepen",
          ref: null,
          href: "https://codepen.io/",
          label: "CP",
          bg: "#111111",
          fg: "#fff",
          u: -0.04,
          delay: 720,
          speed: 0.012,
        },
      ],
      started: 0,
    };

    // attach DOM refs now that we’re in effect
    social.items.forEach((it) => {
      it.ref = socialRefs[it.key].current;
      if (it.ref) {
        it.ref.style.opacity = "0";
        it.ref.style.pointerEvents = "none";
        it.ref.style.transform = "translate(-50%,-50%) scale(0.85)";
      }
    });

    // ABOUT, WORK, CONTACT, SOCIAL
    const LABELS = [
      { key: "about", t: -0.26 },
      { key: "work", t: -0.22 },
      { key: "contact", t: -0.18 },
      { key: "social", t: -0.14 },
    ];

    const getW = () => threeRef.current?.clientWidth || window.innerWidth;
    const getH = () => threeRef.current?.clientHeight || window.innerHeight;

    /* --------------------------------- THREE bits ---------------------------------- */
    class Wave extends THREE.Mesh {
      constructor(xCurve, zCurve, gridTex) {
        const geom = new THREE.PlaneGeometry(100, 100, 160, 160);
        geom.rotateX(-Math.PI * 0.5);
        const mat = new THREE.ShaderMaterial({
          uniforms: {
            map: { value: gridTex },
            offsetRepeat: {
              value: new THREE.Vector4(0.0011, 0.0, 1.503, 2.011),
            },
            xCurve: { value: xCurve },
            zCurve: { value: zCurve },
          },
          side: THREE.DoubleSide,
          vertexShader: `
            uniform vec3 xCurve[5]; uniform vec3 zCurve[4]; varying vec2 vUv;
            vec3 catmull(vec3 p0,vec3 p1,vec3 p2,vec3 p3,float t){
              float t2=t*t, t3=t2*t;
              return 0.5*((2.0*p1)+(-p0+p2)*t+(2.0*p0-5.0*p1+4.0*p2-p3)*t2+(-p0+3.0*p1-3.0*p2+p3)*t3);
            }
            vec3 sampleX(float p){
              float pt=p*4.0; int i=int(floor(pt)); float f=fract(pt);
              vec3 p0=xCurve[max(i-1,0)], p1=xCurve[i], p2=xCurve[min(i+1,4)], p3=xCurve[min(i+2,4)];
              return catmull(p0,p1,p2,p3,f);
            }
            vec3 sampleZ(float p){
              float pt=p*3.0; int i=int(floor(pt)); float f=fract(pt);
              vec3 p0=zCurve[max(i-1,0)], p1=zCurve[i], p2=zCurve[min(i+1,3)], p3=zCurve[min(i+2,3)];
              return catmull(p0,p1,p2,p3,f);
            }
            void main(){
              vUv = uv;
              vec3 pos=position;
              vec3 xo=sampleX((pos.x+50.0)*0.01); pos.x=xo.x; pos.yz+=xo.yz;
              vec3 zo=sampleZ((pos.z+50.0)*0.01); pos.z=zo.z; pos.xy+=zo.xy;
              gl_Position = projectionMatrix*modelViewMatrix*vec4(pos,1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D map; uniform vec4 offsetRepeat; varying vec2 vUv;
            void main(){
              vec2 uv = vUv * offsetRepeat.zw + offsetRepeat.xy;
              uv = uv * 0.994 + 0.003; // inner-bleed kills texture seam
              gl_FragColor = texture2D(map, uv);
            }
          `,
          transparent: false,
        });
        super(geom, mat);
        this.scrollSpeed = 0.05;
      }
      update(dt) {
        const o = this.material.uniforms.offsetRepeat.value;
        o.y -= this.scrollSpeed * dt;
      }
    }

    class SeamVeil extends THREE.Mesh {
      constructor(xPos, height) {
        const w = 3.2,
          h = height;
        const geom = new THREE.PlaneGeometry(w, h, 1, 1);
        geom.rotateY(Math.PI / 2);
        const tex = SeamVeil.makeVeilTexture(64, 512);
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
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
      static makeVeilTexture(w, h) {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0.0, "rgba(255,226,120,0.20)");
        g.addColorStop(0.5, "rgba(231,181,0,0.36)");
        g.addColorStop(1.0, "rgba(255,226,120,0.20)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h),
          d = img.data;
        for (let i = 0; i < d.length; i += 4)
          d[i + 3] = Math.min(
            255,
            Math.max(0, d[i + 3] + (Math.random() * 40 - 20))
          );
        ctx.putImageData(img, 0, 0);
        return new THREE.CanvasTexture(c);
      }
    }

    /* -------------------------------- seam helpers --------------------------------- */
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
        hi = 1.02;
      let bestU = lo,
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

    /* ------------------------------------ p5 boot ----------------------------------- */
    async function bootP5() {
      const TEX_N = 1024;
      const PAINT_FRAMES = 320;
      let paintCount = 0;
      let particles = [],
        particles_2 = [];
      let parNum, mySize;
      const Y_LIGHT = "#FFE37F",
        Y_DEEP = "#E7B500";

      const fragFns = `
        #define PI 3.141592653589793
        vec4 permute(vec4 x){return mod(((x*1000.0)+1.0)*x, 2009.0);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
        vec3 fade(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
        float cnoise(vec3 P){
          vec3 Pi0=floor(P), Pi1=Pi0+vec3(1.0);
          Pi0=mod(Pi0,243.0); Pi1=mod(Pi1,289.0);
          vec3 Pf0=fract(P), Pf1=Pf0-vec3(1.0);
          vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);
          vec4 iy=vec4(Pi0.yy,Pi1.yy);
          vec4 iz0=Pi0.zzzz, iz1=Pi1.zzzz;
          vec4 ixy=permute(permute(ix)+iy);
          vec4 ixy0=permute(ixy+iz0), ixy1=permute(ixy+iz1);
          vec4 gx0=ixy0/7.0, gy0=fract(floor(gx0)/7.0)-0.5; gx0=fract(gx0);
          vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0); vec4 sz0=step(gz0,vec4(0.0));
          gx0-=sz0*(step(0.0,gx0)-0.5); gy0-=sz0*(step(0.0,gy0)-0.5);
          vec4 gx1=ixy1/7.0, gy1=fract(floor(gx1)/7.0)-0.5; gx1=fract(gx1);
          vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1); vec4 sz1=step(gz1,vec4(0.0));
          gx1-=sz1*(step(0.0,gx1)-0.5); gy1-=sz1*(step(0.0,gy0)-0.5);
          vec3 g000=vec3(gx0.x,gy0.x,gz0.x), g100=vec3(gx0.y,gy0.y,gz0.y);
          vec3 g010=vec3(gx0.z,gy0.z,gz0.z), g110=vec3(gx0.w,gy0.w,gz0.w);
          vec3 g001=vec3(gx1.x,gy1.x,gx1.x), g101=vec3(gx1.y,gy1.y,gx1.y);
          vec3 g011=vec3(gx1.z,gy1.z,gx1.x), g111=vec3(gx1.w,gy1.w,gx1.x);
          vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
          g000*=norm0.x; g010*=norm0.y; g100*=norm0.z; g110*=norm0.w;
          vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
          g001*=norm1.x; g011*=norm1.y; g101*=norm1.z; g111*=norm1.w;
          float n000=dot(g000,Pf0); float n100=dot(g100,vec3(Pf1.x,Pf0.yz));
          float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z)); float n110=dot(g110,vec3(Pf1.xy,Pf0.z));
          float n001=dot(g001,vec3(Pf0.xy,Pf1.z)); float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));
          float n011=dot(g011,vec3(Pf0.x,Pf1.yz)); float n111=dot(g111,Pf1);
          vec3 fade_xyz=fade(Pf0);
          vec4 n_z=mix(vec4(n000,n100,n010,n110), vec4(n001,n101,n011,n111), fade_xyz.z);
          vec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);
          return 2.2*mix(n_yz.x,n_yz.y,fade_xyz.x);
        }
      `;
      const frag = `
        precision highp float;
        uniform vec2 u_resolution; uniform float u_time; uniform sampler2D u_tex;
        varying vec2 var_vertTexCoord; ${fragFns}
        void main(){
          vec2 st = var_vertTexCoord;
          st.x += cnoise(vec3(st*10000.0, 1.0))/20.0;
          gl_FragColor = texture2D(u_tex, st);
        }
      `;
      const vert = `
        precision highp float;
        attribute vec3 aPosition; attribute vec2 aTexCoord; varying vec2 var_vertTexCoord;
        uniform mat4 uModelViewMatrix, uProjectionMatrix;
        void main(){ var_vertTexCoord = aTexCoord; gl_Position = uProjectionMatrix*uModelViewMatrix*vec4(aPosition,1.0); }
      `;

      const sketch = (p) => {
        let webGLCanvas, bgGraphics, theShader, host;

        p.setup = () => {
          host = p.createCanvas(1, 1);
          if (p5HostRef.current) p5HostRef.current.appendChild(host.elt);

          const TEX_N = 1024;
          webGLCanvas = p.createGraphics(TEX_N, TEX_N, p.WEBGL);
          bgGraphics = p.createGraphics(TEX_N, TEX_N);
          webGLCanvas.pixelDensity(1);
          bgGraphics.pixelDensity(1);
          webGLCanvas.canvas.style.display = "none";
          theShader = webGLCanvas.createShader(vert, frag);
          p.frameRate(30);

          window.__p5CanvasForThree = webGLCanvas.elt;

          window.__p5UpdateHook = () => {
            theShader && webGLCanvas.shader(theShader);
            theShader && theShader.setUniform("u_resolution", [TEX_N, TEX_N]);
            theShader && theShader.setUniform("u_time", p.millis() / 1000);
            theShader && theShader.setUniform("u_tex", bgGraphics);
            webGLCanvas.clear();
            webGLCanvas.noStroke();
            webGLCanvas.rect(-TEX_N / 2, -TEX_N / 2, TEX_N, TEX_N);

            // painter
            if (paintCount < PAINT_FRAMES) {
              for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                particles[i].show(bgGraphics);
                if (particles[i].finished())
                  particles[i] = new Particle(p, randX(), randY());
              }
              for (let i = particles_2.length - 1; i >= 0; i--) {
                particles_2[i].update();
                particles_2[i].show(bgGraphics);
                if (particles_2[i].finished()) particles_2.splice(i, 1);
              }
              if (p.frameCount % 60 === 0) {
                bgGraphics.noStroke();
                bgGraphics.fill(255, 210, 74, 0.8);
                bgGraphics.rect(0, 0, bgGraphics.width, bgGraphics.height);
              }
              paintCount++;
            }
          };

          // Hard restart hook
          window.__p5HardRestart = () => {
            paintCount = 0;
            initParticles();
            bgGraphics.clear();
            bgGraphics.background("#FFFFFF");
            window.__p5NeedsRebind = true;
          };

          initParticles();
          bgGraphics.background("#FFFFFF");
        };

        const initParticles = () => {
          particles.length = 0;
          particles_2.length = 0;
          parNum =
            Math.floor(p.random(2, 4)) * Math.floor(p.random(40, 80) / 2);
          mySize = 1024;
          for (let i = 0; i < parNum; i++)
            particles.push(new Particle(p, randX(), randY()));
          for (let i = 0; i < Math.floor(parNum / 2); i++)
            particles_2.push(new Particle2(p, randX(), randY()));
        };
        const randX = () => p.random(-mySize * 0.1, mySize * 1.1);
        const randY = () => p.random(-mySize * 0.1, mySize * 1.1);

        function Particle(p, x, y) {
          this.pos = p.createVector(x, y);
          this.vel_tate = p.createVector(
            p.random(-0.001, 0.001) / p.random(0.1, 0.5),
            0
          );
          this.acc_tate = p.createVector(
            p.random(-0.01, 0.01) / p.random(0.001, 0.05),
            0
          );
          this.alpha2 = 100;
          this.r = (mySize / parNum) * p.random(120, 240);
          this.offset = -p.random(100) * p.random(2.0, 1.0);
          this.update = () => {
            this.vel_tate.add(this.acc_tate);
            this.pos.add(this.vel_tate);
            this.alpha2 -= p.random(0.5);
            this.r =
              this.r > 100
                ? this.r - 100
                : (mySize / parNum) * p.random(80, 40);
            if (this.pos.x < -mySize * 0.1) this.pos.x = mySize * 1.1;
            if (this.pos.x > mySize * 1.1) this.pos.x = -mySize * 0.1;
            if (this.pos.y < -mySize * 0.1) this.pos.y = mySize * 1.1;
            if (this.pos.y > mySize * 1.1) this.pos.y = -mySize * 0.1;
          };
          this.show = (g) => {
            g.stroke(255, 210, 74, 32);
            g.strokeWeight(8 * p.random(0.5));
            g.push();
            g.translate(
              this.pos.x + p.random(-this.offset, this.offset),
              this.pos.y - p.random(-this.offset, this.offset)
            );
            g.rotate(p.frameCount);
            const grad = g.drawingContext.createRadialGradient(
              0,
              0,
              0,
              0,
              0,
              Math.abs(
                this.r / 5 - p.random(-this.offset / 20, this.offset / 20)
              )
            );
            grad.addColorStop(0.0, Y_LIGHT);
            grad.addColorStop(1.0, Y_DEEP);
            g.drawingContext.fillStyle = grad;
            g.ellipse(
              0,
              0,
              this.r / 25 - p.random(-this.offset / 50, this.offset / 50),
              this.r / 25 - p.random(-this.offset / 10, this.offset / 10)
            );
            g.pop();
          };
          this.finished = () => this.alpha2 < 20;
        }
        function Particle2(p, x, y) {
          this.pos = p.createVector(x, y);
          this.vel = p.createVector(0, 0);
          this.alpha2 = 100;
          this.r = (mySize / parNum) * p.random(80, 240);
          this.offset = -p.random(10, 1) * p.random(2.0, 1.0);
          this.update = () => {
            if (p.frameCount % 2 === 0)
              this.vel.add(
                p.createVector(0, p.random(-0.1, 0.1) / p.random(0.001, 0.05))
              );
            else
              this.vel.add(
                p.createVector(p.random(-0.1, 0.1) / p.random(0.001, 0.05), 0)
              );
            this.pos.add(this.vel);
            this.alpha2 -= p.random(0.5);
            this.r =
              this.r > 100
                ? this.r - 100
                : (mySize / parNum) * p.random(80, 40);
            if (this.pos.x < -mySize * 0.1) this.pos.x = mySize * 1.1;
            if (this.pos.x > mySize * 1.1) this.pos.x = -mySize * 0.1;
            if (this.pos.y < -mySize * 0.1) this.pos.y = mySize * 1.1;
            if (this.pos.y > mySize * 1.1) this.pos.y = -mySize * 0.1;
          };
          this.show = (g) => {
            g.stroke(255, 210, 74, 28);
            g.strokeWeight(0.5);
            g.push();
            g.translate(
              this.pos.x + p.random(-this.offset, 0),
              this.pos.y - p.random(0, this.offset)
            );
            const grad = g.drawingContext.createRadialGradient(
              0,
              0,
              0,
              0,
              0,
              Math.abs(
                this.r / 25 / 0.5 -
                  p.random(-this.offset / 10, this.offset / 50)
              )
            );
            grad.addColorStop(0.2, Y_LIGHT);
            grad.addColorStop(1.0, Y_DEEP);
            g.drawingContext.fillStyle = grad;
            const grad2 = g.drawingContext.createLinearGradient(
              0,
              0,
              0,
              Math.abs(
                this.r / 25 / 0.5 -
                  p.random(-this.offset / 10, this.offset / 50)
              )
            );
            grad2.addColorStop(0.15, "rgba(255,210,74,0.4)");
            grad2.addColorStop(1.0, "rgba(255,210,74,0.0)");
            g.drawingContext.strokeStyle = grad2;
            g.rect(
              0,
              0,
              this.r / 50 - p.random(-this.offset / 150, this.offset / 150),
              this.r / 2.5 - p.random(-this.offset / 150, this.offset / 150)
            );
            g.pop();
          };
          this.finished = () => this.alpha2 < 20;
        }
      };

      const inst = new window.p5(sketch);
      return () => {
        try {
          inst.remove();
        } catch {}
        delete window.__p5CanvasForThree;
        delete window.__p5UpdateHook;
        delete window.__p5HardRestart;
        delete window.__p5NeedsRebind;
      };
    }

    /* ---------------------------------- THREE boot --------------------------------- */
    async function bootThree() {
      const mount = threeRef.current;
      if (!mount) return () => {};

      const dragging = { on: false, sx: 0, sShift: 0 };

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(getW(), getH());
      renderer.setClearColor("#e9f259");
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(55, getW() / getH(), 0.1, 1000);
      camera.position.set(0, 20, 60);
      camera.lookAt(0, 20, 0);

      // seam curves
      xCurveBase = [
        new THREE.Vector3(-120, -8, 0),
        new THREE.Vector3(-25, 4, 0),
        new THREE.Vector3(0, -5, 0),
        new THREE.Vector3(25, 4, 0),
        new THREE.Vector3(120, -8, 0),
      ];
      zCurveBase = [
        new THREE.Vector3(0, 100, -50),
        new THREE.Vector3(0, 20, -5),
        new THREE.Vector3(0, 10, 25),
        new THREE.Vector3(0, 0, 50),
      ];
      xCurve = xCurveBase.map((v) => v.clone());
      zCurve = zCurveBase.map((v) => v.clone());

      const p5Canvas = await waitForP5Canvas();
      tex = new THREE.CanvasTexture(p5Canvas);
      tex.wrapS = THREE.MirroredRepeatWrapping;
      tex.wrapT = THREE.MirroredRepeatWrapping;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = Math.max(4, renderer.capabilities.getMaxAnisotropy());
      tex.colorSpace = THREE.SRGBColorSpace;

      function rebindCanvasTexture() {
        if (!window.__p5CanvasForThree) return;
        if (tex.image !== window.__p5CanvasForThree)
          tex.image = window.__p5CanvasForThree;
        tex.needsUpdate = true;
      }

      wave = new Wave(xCurve, zCurve, tex);
      scene.add(wave);
      seamVeil = new SeamVeil(seamX(), 140);
      scene.add(seamVeil);

      clock = new THREE.Clock();

      const onResize = () => {
        if (!renderer) return;
        const w = getW(),
          h = getH();
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      const applyCurveShift = () => {
        xCurve.forEach((v, i) => {
          v.copy(xCurveBase[i]);
          v.x += curveShift;
        });
        wave.material.uniforms.xCurve.value = xCurve;
        wave.material.uniformsNeedUpdate = true;
        seamVeil.position.x = seamX();
      };

      // Drag-to-nudge seam
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
        applyCurveShift();
      };
      const onPointerUp = () => {
        dragging.on = false;
      };

      if (heroRef.current) {
        ro = new ResizeObserver(() => onResize());
        ro.observe(heroRef.current);
      }
      heroRef.current.addEventListener("mousedown", onPointerDown, {
        passive: true,
      });
      heroRef.current.addEventListener("mousemove", onPointerMove, {
        passive: true,
      });
      window.addEventListener("mouseup", onPointerUp, { passive: true });
      heroRef.current.addEventListener("touchstart", onPointerDown, {
        passive: true,
      });
      heroRef.current.addEventListener("touchmove", onPointerMove, {
        passive: true,
      });
      window.addEventListener("touchend", onPointerUp, { passive: true });

      const animate = () => {
        if (!alive) return;
        rafId = requestAnimationFrame(animate);
        const dt = (clock.getDelta() * 60) / 60;

        window.__p5UpdateHook && window.__p5UpdateHook();
        if (window.__p5NeedsRebind) {
          rebindCanvasTexture();
          window.__p5NeedsRebind = false;
        }
        if (tex) tex.needsUpdate = true;

        wave.update(dt);
        const or = wave.material.uniforms.offsetRepeat.value;
        or.x = Math.sin(performance.now() * 0.0007) * 0.0021;
        seamVeil.position.x = seamX();

        // Layout labels
        const finalYs = targetScreenYs();
        const topStart = -40;

        const it = intro.active
          ? clamp((performance.now() - intro.started) / intro.duration)
          : 1;
        const introE = easeOutCubic(it);
        if (intro.active && it >= 1) intro.active = false;

        LABELS.forEach((L, i) => {
          let goalY = Math.round(topStart + (finalYs[i] - topStart) * introE);

          // ABOUT falling overrides Y
          if (L.key === "about" && aboutFall.active) {
            aboutFall.vy += aboutFall.ay * dt;
            aboutFall.y = Math.min(
              aboutFall.y + aboutFall.vy,
              aboutFall.bottomY
            );
            goalY = aboutFall.y;
          }
          // ABOUT restoring to slot
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

        // Layout SOCIAL chips riding the same seam
        if (social.active) {
          const now = performance.now();
          social.items.forEach((it) => {
            if (!it.ref) return;
            // stagger
            if (now < social.started + it.delay) return;

            // advance along seam
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
          renderer?.dispose();
          if (renderer?.domElement?.parentElement) {
            renderer.domElement.parentElement.removeChild(renderer.domElement);
          }
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

    (async () => {
      try {
        await ensureP5();
        if (!alive) return;
        const p5Cleanup = await bootP5();
        if (!alive) {
          p5Cleanup && p5Cleanup();
          return;
        }
        cleanupP5 = p5Cleanup;
        cleanupThree = await bootThree();
      } catch (e) {
        console.error(e);
      }
    })();

    // ABOUT drop — start from the DOM position (exact current center on screen)
    const startAboutFall = () => {
      if (aboutFall.active) return;
      intro.active = false; // freeze intro so it doesn’t yank upward

      const el = labelRefs.about.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        aboutFall.y = Math.round(rect.top + rect.height / 2); // viewport Y
      } else {
        // fallback: use current curve mapping if DOM missing
        const L = LABELS.find((l) => l.key === "about");
        const pos = seamPoint(L.t);
        aboutFall.y = Math.round(worldToScreen(pos).y);
      }

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

    // Start SOCIAL chips run (spawn at top, slide down seam)
    const startSocialChips = () => {
      social.items.forEach((it) => {
        it.u = -0.04; // above the visible seam start
        if (it.ref) {
          it.ref.style.opacity = "0";
          it.ref.style.pointerEvents = "none";
        }
      });
      social.active = true;
      social.started = performance.now();
    };
    heroRef.current && (heroRef.current._startSocialChips = startSocialChips);

    // Restart intro + painter
    const restartAll = () => {
      intro.active = true;
      intro.started = performance.now();
      if (typeof window.__p5HardRestart === "function")
        window.__p5HardRestart();
      else window.__p5NeedsRebind = true;
    };
    heroRef.current && (heroRef.current._restartAll = restartAll);

    // Flip ↻/↑ based on About visibility
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
      try {
        typeof cleanupP5 === "function" && cleanupP5();
      } catch {}
      if (io) io.disconnect();
    };
  }, []);

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

  // Click handlers
  const onAboutClick = (e) => {
    e.preventDefault();
    const el = heroRef.current;
    el && el._startAboutFall && el._startAboutFall();
    triggerAboutDropWhenVisible();
  };
  // replace your onWorkClick with this:
  const onWorkClick = (e) => {
    e.preventDefault();
    const base = import.meta.env.BASE_URL || "/";
    // goes to https://<user>.github.io/fall2025portfolio/work
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
      <style>{`html{scroll-behavior:smooth}`}</style>

      <section ref={heroRef} style={styles.hero} aria-label="Hero seam">
        <style>{`
          .hero-canvas{ position:absolute; inset:0; z-index:0; }

          /* Labels stay on top of the cover */
          .navtext{
            position:absolute; left:0; top:0; transform:translate(-50%, -50%);
            z-index:50; width:max(120px, 12vw); pointer-events:auto;
            user-select:none; cursor:pointer; will-change:transform,left,top;
          }
          .navtext button {
            position:absolute; inset:0; border:0; background:transparent; padding:0; cursor:pointer;
          }

          /* Social chips — ride the same seam; default hidden until run */
          .socialchip{
            position:absolute; left:0; top:0; transform:translate(-50%,-50%);
            z-index:55; width:44px; height:44px; border-radius:999px;
            display:grid; place-items:center; font-weight:800; letter-spacing:.02em;
            box-shadow: 0 4px 10px rgba(0,0,0,.15);
            transition:opacity .25s ease;
            user-select:none;
          }
          .socialchip a{ position:absolute; inset:0; border-radius:999px; }
          .socialchip span{ pointer-events:none; font-size:14px; color:#fff; }

          /* Full-screen cover menu (under labels, above texture & restart) */
          .cover {
            position:fixed; inset:0; z-index:30;
            background:rgba(246,241,231,0.86);
            backdrop-filter: blur(6px);
            transform:translateX(100%);
            transition:transform .42s cubic-bezier(.22,.61,.36,1);
          }
          .cover.open { transform:translateX(0); }
          .cover-inner{
            position:absolute; right:0; top:0; bottom:0; width:min(520px, 92vw);
            padding:20px 22px; color:#403326; overflow:auto;
          }
          .menu-btn{
            position:fixed; right:16px; top:16px; z-index:60; background:#403326; color:#e9f259;
            border:none; border-radius:999px; padding:.6rem .9rem; font-weight:700; letter-spacing:.02em; cursor:pointer;
          }

          /* bottom-left control (↻ or ↑) — will be covered by .cover */
          .restart-pad{
            position:fixed; left:12px; bottom:12px; z-index:20;
          }
          .restart-pad button{
            width:56px; height:56px; border-radius:14px; border:0; background:#403326; color:#e9f259;
            font-weight:900; font-size:22px; cursor:pointer; opacity:.95;
          }
          .restart-pad button:active{ transform:translateY(1px); }
        `}</style>

        {/* p5 offscreen host */}
        <div
          ref={p5HostRef}
          style={{
            position: "fixed",
            left: -9999,
            top: -9999,
            width: 1,
            height: 1,
          }}
        />

        {/* THREE mount */}
        <div ref={threeRef} className="hero-canvas" />

        {/* Labels (always above the cover) */}
        <div ref={labelRefs.about} className="navtext" onClick={onAboutClick}>
          <HeroNav
            text="ABOUT"
            letterSpacing={10}
            baselinePx={60}
            fitToCssFont
            tightPadPx={30}
            topColor="#403326"
            botColor="#403326"
          />
          <button aria-label="About" />
        </div>
        <div ref={labelRefs.work} className="navtext" onClick={onWorkClick}>
          <HeroNav
            text="WORK"
            letterSpacing={10}
            baselinePx={60}
            fitToCssFont
            tightPadPx={30}
            topColor="#403326"
            botColor="#403326"
          />
          <button aria-label="Work" />
        </div>
        <div
          ref={labelRefs.contact}
          className="navtext"
          onClick={onContactClick}
        >
          <HeroNav
            text="CONTACT"
            letterSpacing={10}
            baselinePx={60}
            fitToCssFont
            tightPadPx={30}
            topColor="#403326"
            botColor="#403326"
          />
          <button aria-label="Contact" />
        </div>
        <div ref={labelRefs.social} className="navtext" onClick={onSocialClick}>
          <HeroNav
            text="SOCIAL"
            letterSpacing={10}
            baselinePx={60}
            fitToCssFont
            tightPadPx={30}
            topColor="#403326"
            botColor="#403326"
          />
          <button aria-label="Social" />
        </div>

        {/* Sliding SOCIAL chips (spawn at top and ride the seam) */}
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

        {/* Menu toggle (stays above labels so you can always close) */}
        <button className="menu-btn" onClick={() => setCoverOpen((v) => !v)}>
          {coverOpen ? "Close" : "Menu"}
        </button>

        {/* Full-screen sliding cover (under labels, over texture & restart) */}
        <div
          className={`cover ${coverOpen ? "open" : ""}`}
          aria-hidden={!coverOpen}
          onClick={() => setCoverOpen(false)}
        ></div>

        {/* bottom-left control */}
        <div className="restart-pad" aria-label="Restart or Up">
          <button
            onClick={onRestartOrUp}
            title={btnMode === "up" ? "Back to top" : "Restart"}
          >
            {btnMode === "up" ? "↑" : "↻"}
          </button>
        </div>
      </section>

      {/* About lives OUTSIDE hero (no texture) */}
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
    height: "100svh",
    background: "#e9f259",
    fontFamily: "Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial",
    overflow: "hidden",
    touchAction: "none",
    outline: "none",
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
