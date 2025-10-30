import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const P5_CDN = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.2/p5.min.js";

/* ----------------------------- p5 SINGLETON LOADER ----------------------------- */
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

/* ------------------------------ HANDSHAKE HELPERS ------------------------------ */
async function waitForP5Canvas(timeout = 4000) {
  const t0 = performance.now();
  while (!window.__p5CanvasForThree) {
    if (performance.now() - t0 > timeout)
      throw new Error("p5 canvas not ready in time");
    await new Promise((r) => setTimeout(r, 16));
  }
  return window.__p5CanvasForThree;
}

export default function Hero() {
  // HERO-only refs
  const heroRef = useRef(null); // this wraps ONLY the hero (texture lives here)
  const threeRef = useRef(null); // THREE mount inside hero
  const p5HostRef = useRef(null); // hidden p5 host

  const labelRefs = {
    social: useRef(null),
    contact: useRef(null),
    work: useRef(null),
    about: useRef(null),
  };

  const [menuOpen, setMenuOpen] = useState(false);

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
    let tex;
    let cleanupP5 = null;
    let cleanupThree = null;
    let ro; // ResizeObserver for hero

    // labels state (scoped)
    const LABELS = [
      { key: "social", t: -0.14, settling: true, forceBottom: false },
      { key: "contact", t: -0.18, settling: true, forceBottom: false },
      { key: "work", t: -0.22, settling: true, forceBottom: false },
      { key: "about", t: -0.26, settling: true, forceBottom: false },
    ];

    const getW = () => threeRef.current?.clientWidth || window.innerWidth;
    const getH = () => threeRef.current?.clientHeight || window.innerHeight;

    /* --------------------------------- THREE MESHES --------------------------------- */
    class Wave extends THREE.Mesh {
      constructor(xCurve, zCurve, gridTex) {
        const geom = new THREE.PlaneGeometry(100, 100, 160, 160);
        geom.rotateX(-Math.PI * 0.5);
        const mat = new THREE.ShaderMaterial({
          uniforms: {
            map: { value: gridTex },
            offsetRepeat: { value: new THREE.Vector4(0, 0, 1.5, 2.0) },
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
            void main(){ vec2 uv=vUv*offsetRepeat.zw+offsetRepeat.xy; gl_FragColor=texture2D(map,uv); }
          `,
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
        const w = 2.6,
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
        g.addColorStop(0.0, "rgba(255,226,120,0.26)");
        g.addColorStop(0.5, "rgba(231,181,0,0.40)");
        g.addColorStop(1.0, "rgba(255,226,120,0.26)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h),
          d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          d[i + 3] = Math.min(
            255,
            Math.max(0, d[i + 3] + (Math.random() * 64 - 32))
          );
        }
        ctx.putImageData(img, 0, 0);
        return new THREE.CanvasTexture(c);
      }
    }

    /* ------------------------------ LABEL MATH HELPERS ------------------------------ */
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
      let pt = THREE.MathUtils.clamp(u, 0, 1) * segs;
      let i = Math.floor(pt);
      let f = pt - i;
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
    const findUForScreenY = (targetY, biasToBottom = false) => {
      let lo = -0.02,
        hi = 1.02;
      if (biasToBottom) lo = 0.4;
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
      return bestU;
    };
    const targetScreenYs = () => {
      const h = getH();
      const center = h * 0.5;
      const first = labelRefs.social.current;
      const fs = first
        ? parseFloat(getComputedStyle(first).fontSize) || 24
        : 24;
      const gap = Math.max(28, Math.min(60, fs * 1.35));
      const n = 4;
      const start = center - ((n - 1) * gap) / 2;
      return new Array(n).fill(0).map((_, i) => start + i * gap);
    };

    /* ------------------------------------ p5 BOOT ----------------------------------- */
    async function bootP5() {
      const TEX_N = 1024;
      const PAINT_FRAMES = 320;
      let paintCount = 0;
      let particles = [],
        particles_2 = [];
      let parNum, mySize;
      const Y_LIGHT = "#FFE37F";
      const Y_DEEP = "#E7B500";
      const colorbg = "#FFFFFF";

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
          gx1-=sz1*(step(0.0,gx1)-0.5); gy1-=sz1*(step(0.0,gy1)-0.5);
          vec3 g000=vec3(gx0.x,gy0.x,gz0.x), g100=vec3(gx0.y,gy0.y,gz0.y);
          vec3 g010=vec3(gx0.z,gy0.z,gz0.z), g110=vec3(gx0.w,gy0.w,gz0.w);
          vec3 g001=vec3(gx1.x,gy1.x,gx1.x), g101=vec3(gx1.y,gy1.y,gx1.y);
          vec3 g011=vec3(gx1.z,gy1.z,gx1.z), g111=vec3(gx1.w,gy1.w,gx1.w);
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

          webGLCanvas = p.createGraphics(TEX_N, TEX_N, p.WEBGL);
          bgGraphics = p.createGraphics(TEX_N, TEX_N);
          webGLCanvas.pixelDensity(1);
          bgGraphics.pixelDensity(1);

          webGLCanvas.canvas.style.display = "none";
          theShader = webGLCanvas.createShader(vert, frag);
          p.frameRate(30);
          mySize = TEX_N;

          window.__p5CanvasForThree = webGLCanvas.elt;
          window.__p5UpdateHook = () => {
            webGLCanvas.shader(theShader);
            theShader.setUniform("u_resolution", [TEX_N, TEX_N]);
            theShader.setUniform("u_time", p.millis() / 1000);
            theShader.setUniform("u_tex", bgGraphics);
            webGLCanvas.clear();
            webGLCanvas.noStroke();
            webGLCanvas.rect(-TEX_N / 2, -TEX_N / 2, TEX_N, TEX_N);

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
          window.__p5ResetPaint = () => {
            paintCount = 0;
            initParticles();
            bgGraphics.clear();
            bgGraphics.background(colorbg);
            window.__p5NeedsRebind = true;
          };

          webGLCanvas.elt.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            window.__p5NeedsRebind = true;
          });
          webGLCanvas.elt.addEventListener("webglcontextrestored", () => {
            window.__p5NeedsRebind = true;
          });

          initParticles();
          bgGraphics.background(colorbg);
        };

        const initParticles = () => {
          particles.length = 0;
          particles_2.length = 0;
          parNum =
            Math.floor(p.random(2, 4)) * Math.floor(p.random(40, 80) / 2);
          for (let i = 0; i < parNum; i++)
            particles.push(new Particle(p, randX(), randY()));
          for (let i = 0; i < Math.floor(parNum / 2); i++)
            particles_2.push(new Particle2(p, randX(), randY()));
        };
        const randX = () => p.random(-TEX_N * 0.1, TEX_N * 1.1);
        const randY = () => p.random(-TEX_N * 0.1, TEX_N * 1.1);

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
            if (this.pos.x < -TEX_N * 0.1) this.pos.x = TEX_N * 1.1;
            if (this.pos.x > TEX_N * 1.1) this.pos.x = -TEX_N * 0.1;
            if (this.pos.y < -TEX_N * 0.1) this.pos.y = TEX_N * 1.1;
            if (this.pos.y > TEX_N * 1.1) this.pos.y = -TEX_N * 0.1;
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
            if (this.pos.x < -TEX_N * 0.1) this.pos.x = TEX_N * 1.1;
            if (this.pos.x > TEX_N * 1.1) this.pos.x = -TEX_N * 0.1;
            if (this.pos.y < -TEX_N * 0.1) this.pos.y = TEX_N * 1.1;
            if (this.pos.y > TEX_N * 1.1) this.pos.y = -TEX_N * 0.1;
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
        delete window.__p5ResetPaint;
        delete window.__p5NeedsRebind;
      };
    }

    /* ---------------------------------- THREE BOOT ---------------------------------- */
    async function bootThree() {
      const mount = threeRef.current;
      if (!mount) return () => {};

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
      tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
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
      const onKey = (e) => {
        const k = e.key;
        if (k === "ArrowLeft" || k === "ArrowRight" || k === "[" || k === "]")
          e.preventDefault();
        if (k === "[")
          wave.scrollSpeed = Math.max(0.005, wave.scrollSpeed * 0.6);
        if (k === "]") wave.scrollSpeed = Math.min(0.6, wave.scrollSpeed * 1.5);
        if (k === "r" || k === "R")
          window.__p5ResetPaint && window.__p5ResetPaint();
        const step = 6.0;
        if (k === "ArrowLeft") {
          curveShift -= step;
          applyCurveShift();
        }
        if (k === "ArrowRight") {
          curveShift += step;
          applyCurveShift();
        }
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

      // Observe the HERO only (so texture sizing follows hero size)
      if (heroRef.current) {
        ro = new ResizeObserver(() => onResize());
        ro.observe(heroRef.current);
      }
      window.addEventListener("keydown", onKey, { passive: false });

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
        or.x = Math.sin(performance.now() * 0.0007) * 0.002;
        seamVeil.position.x = seamX();

        const finalYs = targetScreenYs();
        const minGap = 24;
        const h = getH();
        const topY = 6;
        const screenTargets = [];
        LABELS.forEach((L, i) => {
          const goalY = finalYs[i];
          const uGoal = findUForScreenY(goalY, !!L.forceBottom);
          const maxStep = 0.035 * dt;
          const diff = uGoal - L.t;
          const step = THREE.MathUtils.clamp(diff, -maxStep, maxStep);
          L.t += step;
          const pos = seamPoint(THREE.MathUtils.clamp(L.t, -0.02, 1.02));
          const scr = worldToScreen(pos);
          let yTarget = Math.min(scr.y, goalY);
          if (i > 0) {
            const prev = screenTargets[i - 1];
            if (yTarget - prev.y < minGap) yTarget = prev.y + minGap;
          }
          yTarget = Math.max(topY, Math.min(h - 6, yTarget));
          const uForPushed = findUForScreenY(yTarget, !!L.forceBottom);
          if (uForPushed > L.t) L.t = uForPushed;
          const pos2 = seamPoint(THREE.MathUtils.clamp(L.t, -0.02, 1.02));
          const scr2 = worldToScreen(pos2);
          screenTargets.push({ x: scr2.x, y: yTarget, z: pos2.z, uGoal });
          if (Math.abs(uGoal - L.t) < 0.0015) {
            L.t = uGoal;
            L.settling = false;
          }
        });
        LABELS.forEach((L, i) => {
          const target = screenTargets[i];
          const el = labelRefs[L.key].current;
          if (!el) return;
          el.style.left = `${target.x}px`;
          el.style.top = `${target.y}px`;
          const s = THREE.MathUtils.clamp(1.2 - target.z / 120, 0.85, 1.15);
          el.style.transform = `translate(-50%, -50%) scale(${s.toFixed(3)})`;
        });

        renderer.render(scene, camera);
      };
      animate();

      // cleanup THREE
      return () => {
        cancelAnimationFrame(rafId);
        try {
          ro && ro.disconnect();
        } catch {}
        window.removeEventListener("keydown", onKey);
        try {
          renderer?.dispose();
          if (renderer?.domElement?.parentElement) {
            renderer.domElement.parentElement.removeChild(renderer.domElement);
          }
        } catch {}
        scene?.traverse((obj) => {
          if (obj.material) {
            if (Array.isArray(obj.material))
              obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
          if (obj.geometry) obj.geometry.dispose();
        });
      };
    }

    /* ------------------------------ BOOT SEQUENCE ------------------------------ */
    (async () => {
      try {
        await ensureP5();
        if (!alive) return;
        cleanupP5 = await bootP5();
        if (!alive) {
          cleanupP5 && cleanupP5();
          return;
        }
        cleanupThree = await bootThree();
      } catch (e) {
        console.error(e);
      }
    })();

    /* ------------------------------------- CLEANUP ----------------------------------- */
    return () => {
      alive = false;
      try {
        cleanupThree && cleanupThree();
      } catch {}
      try {
        typeof cleanupP5 === "function" && cleanupP5();
      } catch {}
    };
  }, []);

  const onLabelClick = (key, e) => {
    if (key === "about") {
      e.preventDefault();
      const target = document.getElementById("about");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* Global smooth scrolling for the “slides down” feel */}
      <style>{`html{scroll-behavior:smooth}`}</style>

      {/* HERO (texture lives ONLY here) */}
      <section ref={heroRef} style={styles.hero}>
        <style>{`
          .hero-canvas{ position:absolute; inset:0; }
          .seam-label{
            position:absolute; left:0; top:0; transform:translate(-50%,-50%);
            z-index:20; color:#403326; font-weight:800; letter-spacing:.01em;
            text-decoration:none; user-select:none; cursor:pointer; will-change:transform,left,top;
          }
          .seam-label:active{ transform:translate(-50%,-50%) scale(.98); }
          .menu-btn{
            position:fixed; right:16px; top:16px; z-index:15; background:#403326; color:#e9f259;
            border:none; border-radius:999px; padding:.6rem .9rem; font-weight:700; letter-spacing:.02em; cursor:pointer;
          }
          .slide-panel{
            position:fixed; top:16px; right:16px; width:min(380px, 70vw); height:56vh; background:#f6f1e7;
            box-shadow:0 10px 30px rgba(0,0,0,.18); border-radius:16px;
            transform:translateY(-16px) translateX(${
              menuOpen ? "0" : "calc(100% + 16px)"
            });
            transition:transform .38s cubic-bezier(.22,.61,.36,1); z-index:16; overflow:hidden; display:flex; flex-direction:column;
          }
          .panel-head{ padding:14px 16px; font-weight:800; color:#403326; border-bottom:1px solid rgba(0,0,0,.08); }
          .panel-body{ padding:14px 16px; color:#403326; font-size:14px; line-height:1.5; opacity:.9; }
        `}</style>

        {/* hidden p5 host */}
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

        {/* Seam labels (float over hero only) */}
        <a ref={labelRefs.social} className="seam-label" href="#social">
          Social
        </a>
        <a ref={labelRefs.contact} className="seam-label" href="#contact">
          Contact
        </a>
        <a ref={labelRefs.work} className="seam-label" href="#work">
          Work
        </a>
        <a
          ref={labelRefs.about}
          className="seam-label"
          href="#about"
          onClick={(e) => onLabelClick("about", e)}
        >
          About
        </a>

        {/* Menu button + panel */}
        <button className="menu-btn" onClick={() => setMenuOpen((v) => !v)}>
          {menuOpen ? "Close" : "Menu"}
        </button>
        <div className="slide-panel" aria-hidden={!menuOpen}>
          <div className="panel-head">Menu</div>
          <div className="panel-body">
            <p>
              <strong>Hint:</strong> [ and ] adjust wave speed. R reseeds the
              texture. ← → nudges the seam.
            </p>
            <p>This panel sits under the labels, above the THREE canvas.</p>
          </div>
        </div>
      </section>

      {/* ABOUT (separate sibling: NO texture) */}
      <section id="about" style={styles.about}>
        <div>
          <h1 style={styles.h1}>About</h1>
          <p style={styles.p}>Replace with your content.</p>
        </div>
      </section>
    </>
  );
}

const styles = {
  hero: {
    position: "relative",
    width: "100vw",
    height: "100svh",
    background: "#e9f259", // Hermès-y bg behind the textured wave
    fontFamily: "Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial",
    overflow: "hidden",
  },
  about: {
    position: "relative",
    width: "100vw",
    minHeight: "100svh",
    display: "grid",
    placeItems: "center",
    background: "#f6f1e7",
    color: "#222",
  },
  h1: { margin: 0, fontSize: "clamp(28px,6vw,74px)" },
  p: { margin: "8px 0 0", opacity: 0.7 },
};
