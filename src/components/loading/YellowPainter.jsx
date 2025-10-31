// src/components/YellowPainter.jsx
import { useEffect, useRef } from "react";
import p5 from "p5";

/**
 * YellowPainter
 * - Flat background for holdMs
 * - Then edge-biased painting for edgeMs (left/right bands)
 * - Then normal painting, but for the first centerBiasMs of phase 2 we bias paint toward the center
 * - Shader warp (the "crease") ramps from 0 → 1 starting at creaseDelayMs over creaseDurMs
 */
export default function YellowPainter({
  className,
  style,
  // painting phases
  holdMs = 2000, // 2s: keep canvas perfectly flat (no paint, no warp)
  edgeMs = 3000, // 3s: paint more on left/right edges
  edgeBandPct = 0.18, // width percentage per side used during edge phase
  // center converge behavior (at the start of phase 2)
  centerBiasMs = 1200, // first 1.2s of phase 2: prefer painting near center
  centerBandPct = 0.32, // width band around center that gets priority during centerBiasMs
  // crease timing
  creaseDelayMs = 2000, // when warp starts (match hold by default)
  creaseDurMs = 550, // how quickly the crease forms
  // look
  background = "#FEE075",
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);

  useEffect(() => {
    if (!hostRef.current || p5Ref.current) return;

    p5Ref.current = new p5((s) => {
      /* --------------------- State --------------------- */
      let seed = Math.random() * 999999;
      let particles = [];
      let particles2 = [];
      let mySize, margin, parNum;

      // Colors
      const Y_LIGHT = "#FFE37F";
      const Y_DEEP = "#E7B500";
      const colorbg = background;

      // Phases
      let startMs = 0; // overall clock start
      let phase = 0; // 0: hold, 1: edge-biased paint, 2: normal
      let phase2Start = 0; // millis when phase 2 begins

      // Crease (shader warp) timing
      let warpStart = 0; // millis when warp should start
      let warpDur = 0; // duration of warp
      let warpAmt = 0; // 0..1 current

      // Drawing layers
      let theShader;
      let webGLCanvas; // WEBGL pass (with warp)
      let bgGraphics; // 2D painter buffer
      let mainCanvas; // visible canvas

      /* ------------------ GLSL helpers ------------------ */
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

      // u_warpAmt drives how strong the “crease” is (0 = flat, 1 = full)
      const frag = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform float u_warpAmt;
        uniform sampler2D u_tex;

        varying vec2 var_vertTexCoord;
        ${fragFns}

        void main(){
          vec2 st = var_vertTexCoord;

          // A gentle x-warp modulated by u_warpAmt
          float warp = cnoise(vec3(st * 10000.0, 1.0)) / 20.0;
          st.x += warp * u_warpAmt;

          gl_FragColor = texture2D(u_tex, st);
        }
      `;

      const vert = `
        precision highp float;
        attribute vec3 aPosition;
        attribute vec2 aTexCoord;
        varying vec2 var_vertTexCoord;
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        void main(){
          var_vertTexCoord = aTexCoord;
          gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
        }
      `;

      /* ------------------- utils ------------------- */
      const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
      const easeOutCubic = (t) => 1 - (1 - t) * (1 - t) * (1 - t);

      const inEdgeBand = (x) => {
        const band = s.width * edgeBandPct;
        return x <= band || x >= s.width - band;
      };

      // During the first centerBiasMs of phase 2, prefer painting near center
      const centerGate = (x, now) => {
        if (phase !== 2) return true;
        const tSince = now - phase2Start;
        if (tSince <= 0) return true;
        if (tSince >= centerBiasMs) return true; // gate off after bias window

        const t = clamp(tSince / centerBiasMs, 0, 1);
        const e = easeOutCubic(t);

        // band around center that gets priority; shrinks slightly as e grows
        const bandHalf = s.width * centerBandPct * (1.0 - 0.25 * e) * 0.5;
        const cx = s.width * 0.5;
        const d = Math.abs(x - cx);

        // probability mask: 1 at center, fades to ~0 past the band
        const pCenter = clamp(1.0 - d / (bandHalf + 1e-3), 0, 1);
        // As time goes, loosen gating (so outer areas start getting paint)
        const loosen = 0.15 + 0.85 * e;

        // accept if inside band with good probability, or occasionally outside
        return Math.random() < pCenter * 0.9 * loosen + 0.05 * e;
      };

      const respawnPos = (edgeOnly) => {
        if (!edgeOnly) {
          return s.createVector(
            s.random(-s.width * 0.1, s.width * 1.1),
            s.random(-s.height * 0.1, s.height * 1.1)
          );
        }
        const band = s.width * edgeBandPct;
        const left = s.random(1) < 0.5;
        const x = left
          ? s.random(-s.width * 0.1, band)
          : s.random(s.width - band, s.width * 1.1);
        const y = s.random(-s.height * 0.1, s.height * 1.1);
        return s.createVector(x, y);
      };

      // single place to do all resizing logic
      function applyResize() {
        const W = hostRef.current?.clientWidth || window.innerWidth;
        const H = hostRef.current?.clientHeight || window.innerHeight;

        s.resizeCanvas(W, H);
        webGLCanvas = s.createGraphics(W, H, s.WEBGL);
        bgGraphics = s.createGraphics(W, H);
        theShader = webGLCanvas.createShader(vert, frag);

        mySize = Math.min(s.width, s.height);
        margin = mySize / 100;

        s.background(colorbg);
        bgGraphics.background(colorbg);

        // restart timing so hold/edge/warp feel correct after resize
        startMs = s.millis();
        phase = 0;
        phase2Start = 0;
        warpStart = startMs + creaseDelayMs;
        warpDur = creaseDurMs;
        warpAmt = 0;
      }

      /* ------------------ p5 lifecycle ------------------ */
      s.setup = () => {
        s.frameRate(30);
        s.randomSeed(seed);

        const W = hostRef.current?.clientWidth || window.innerWidth;
        const H = hostRef.current?.clientHeight || window.innerHeight;

        mainCanvas = s.createCanvas(W, H);
        webGLCanvas = s.createGraphics(W, H, s.WEBGL);
        bgGraphics = s.createGraphics(W, H);
        theShader = webGLCanvas.createShader(vert, frag);

        s.colorMode(s.RGB, 255, 255, 255, 100);

        // particle density
        parNum = Math.floor(s.random(2, 4)) * Math.floor(s.random(40, 80) / 2);

        // spawn particles (painting is phase-gated)
        for (let i = 0; i < parNum; i++) {
          const p = respawnPos(false);
          particles.push(new Particle(p.x, p.y));
        }
        for (let i = 0; i < Math.floor(parNum / 2); i++) {
          const p = respawnPos(false);
          particles2.push(new Particle2(p.x, p.y));
        }

        mySize = Math.min(s.width, s.height);
        margin = mySize / 100;

        s.background(colorbg);
        bgGraphics.background(colorbg);

        // clocks
        startMs = s.millis();
        phase = 0;
        phase2Start = 0;
        warpStart = startMs + creaseDelayMs;
        warpDur = creaseDurMs;
        warpAmt = 0;
      };

      s.draw = () => {
        const now = s.millis();

        // phase transitions
        if (phase === 0 && now >= startMs + holdMs) phase = 1;
        if (phase === 1 && now >= startMs + holdMs + edgeMs) {
          phase = 2;
          phase2Start = now;
        }

        // warp progress
        if (now >= warpStart) {
          const t = clamp((now - warpStart) / Math.max(1, warpDur));
          warpAmt = easeOutCubic(t); // snappy “crease”
        } else {
          warpAmt = 0;
        }

        // shader uniforms
        webGLCanvas.shader(theShader);
        theShader.setUniform("u_resolution", [s.width, s.height]);
        theShader.setUniform("u_time", now / 1000.0);
        theShader.setUniform("u_warpAmt", warpAmt);
        theShader.setUniform("u_tex", bgGraphics);

        webGLCanvas.clear();
        webGLCanvas.noStroke();
        webGLCanvas.rect(-s.width / 2, -s.height / 2, s.width, s.height);

        // PAINT (skip entirely during hold)
        if (phase !== 0) {
          const edgeOnly = phase === 1;

          // front ellipses
          for (let i = particles.length - 1; i >= 0; i--) {
            const P = particles[i];
            P.update();
            // Gate:
            //  - phase 1: must be in edge bands
            //  - phase 2 (early): center-biased probability
            const ok = edgeOnly
              ? inEdgeBand(P.pos.x)
              : centerGate(P.pos.x, now);
            if (ok) P.show(bgGraphics);
            if (P.finished()) {
              const p = respawnPos(edgeOnly);
              particles[i] = new Particle(p.x, p.y);
            }
          }

          // gentle wash (subtle fill—helps unify texture like in Hero)
          if (s.frameCount % 25 === 0) {
            bgGraphics.noStroke();
            bgGraphics.fill(255, 210, 74, 3);
            bgGraphics.rect(0, 0, bgGraphics.width, bgGraphics.height);
          }

          // back rect strokes
          for (let i = particles2.length - 1; i >= 0; i--) {
            const P2 = particles2[i];
            P2.update();
            const ok = edgeOnly
              ? inEdgeBand(P2.pos.x)
              : centerGate(P2.pos.x, now);
            if (ok) P2.show(bgGraphics);
            if (P2.finished()) {
              const p = respawnPos(edgeOnly);
              particles2[i] = new Particle2(p.x, p.y);
            }
          }
        }

        // composite shader output to main canvas
        s.blendMode(s.BLEND);
        s.image(webGLCanvas, 0, 0);
      };

      // Let p5 call this with a real UIEvent. If YOU need to force a resize, call applyResize().
      s.windowResized = () => {
        applyResize();
      };

      s.keyTyped = () => {
        if (s.key === "s" || s.key === "S") s.saveCanvas("yellow_bg", "png");
      };

      /* ---------------- Particles ---------------- */
      function Particle(x, y) {
        this.pos = s.createVector(x, y);
        this.vel_t = s.createVector(
          s.random(-0.001, 0.001) / s.random(0.1, 0.5),
          0
        );
        this.acc_t = s.createVector(
          s.random(-0.01, 0.01) / s.random(0.001, 0.05),
          0
        );
        this.alpha2 = 100;
        this.r = (mySize / parNum) * s.random(120, 240);
        this.offset = -s.random(100) * s.random(2.0, 1.0);

        this.update = function () {
          this.vel_t.add(this.acc_t);
          this.pos.add(this.vel_t);
          this.alpha2 -= s.random(1) / 2;

          if (this.r > 100) this.r -= 100;
          else this.r = (mySize / parNum) * s.random(80, 40);

          // wrap
          if (this.pos.x < -s.width * 0.1) this.pos.x = s.width * 1.1;
          if (this.pos.x > s.width * 1.1) this.pos.x = -s.width * 0.1;
          if (this.pos.y < -s.height * 0.1) this.pos.y = s.height * 1.1;
          if (this.pos.y > s.height * 1.1) this.pos.y = -s.height * 0.1;
        };

        this.show = function (p) {
          p.stroke(255, 210, 74, 50);
          p.strokeWeight(10 * s.random(0.5));
          p.push();
          p.translate(
            this.pos.x + s.random(-this.offset, this.offset),
            this.pos.y - s.random(-this.offset, this.offset)
          );
          p.rotate(s.frameCount);

          const ctx = p.drawingContext;
          const grad = ctx.createRadialGradient(
            0,
            0,
            0,
            0,
            0,
            Math.abs(this.r / 5 - s.random(-this.offset / 20, this.offset / 20))
          );
          grad.addColorStop(0.0, Y_LIGHT);
          grad.addColorStop(1.0, Y_DEEP);
          ctx.fillStyle = grad;

          p.ellipse(
            0,
            0,
            this.r / 25 - s.random(-this.offset / 50, this.offset / 50),
            this.r / 25 - s.random(-this.offset / 10, this.offset / 10)
          );
          p.pop();
        };

        this.finished = () => this.alpha2 < 20;
      }

      function Particle2(x, y) {
        this.pos = s.createVector(x, y);
        this.vel_x = s.createVector(0, s.random(-0.01, 0.01) / 0.001);
        this.acc_x = s.createVector(
          0,
          s.random(-0.1, 0.1) / s.random(0.001, 0.05)
        );
        this.vel_y = s.createVector(s.random(-0.001, 0.001) / 0.001, 0);
        this.acc_y = s.createVector(
          s.random(-0.1, 0.1) / s.random(0.001, 0.05),
          0
        );
        this.alpha2 = 100;
        this.r = (mySize / parNum) * s.random(80, 240);
        this.offset = -s.random(10, 1) * s.random(2.0, 1.0);

        this.update = function () {
          if (s.frameCount % 2 === 0) {
            this.vel_x.add(this.acc_x);
            this.pos.add(this.vel_x);
          } else {
            this.vel_y.add(this.acc_y);
            this.pos.add(this.vel_y);
          }

          this.alpha2 -= s.random(1) / 2;

          if (this.r > 100) this.r -= 100;
          else this.r = (mySize / parNum) * s.random(80, 40);

          // wrap
          if (this.pos.x < -s.width * 0.1) this.pos.x = s.width * 1.1;
          if (this.pos.x > s.width * 1.1) this.pos.x = -s.width * 0.1;
          if (this.pos.y < -s.height * 0.1) this.pos.y = s.height * 1.1;
          if (this.pos.y > s.height * 1.1) this.pos.y = -s.height * 0.1;
        };

        this.show = function (p) {
          p.stroke(255, 210, 74, 50);
          p.strokeWeight(1 * s.random(0.5));
          p.push();
          p.translate(
            this.pos.x + s.random(-this.offset, 0),
            this.pos.y - s.random(0, this.offset)
          );

          const ctx = p.drawingContext;

          const fillGrad = ctx.createRadialGradient(
            0,
            0,
            0,
            0,
            0,
            Math.abs(
              this.r / 25 / 0.5 - s.random(-this.offset / 10, this.offset / 50)
            )
          );
          fillGrad.addColorStop(0.2, Y_LIGHT);
          fillGrad.addColorStop(1.0, Y_DEEP);
          ctx.fillStyle = fillGrad;

          const strokeGrad = ctx.createLinearGradient(
            0,
            0,
            0,
            Math.abs(
              this.r / 25 / 0.5 - s.random(-this.offset / 10, this.offset / 50)
            )
          );
          strokeGrad.addColorStop(0.15, "rgba(255,210,74,0.65)");
          strokeGrad.addColorStop(1.0, "rgba(255,210,74,0.0)");
          ctx.strokeStyle = strokeGrad;

          p.rect(
            0,
            0,
            this.r / 50 - s.random(-this.offset / 150, this.offset / 150),
            this.r / 2.5 - s.random(-this.offset / 150, this.offset / 150)
          );
          p.pop();
        };

        this.finished = () => this.alpha2 < 20;
      }
    }, hostRef.current);

    return () => {
      try {
        p5Ref.current?.remove();
      } catch {}
      p5Ref.current = null;
    };
  }, [
    holdMs,
    edgeMs,
    edgeBandPct,
    centerBiasMs,
    centerBandPct,
    creaseDelayMs,
    creaseDurMs,
    background,
  ]);

  return <div ref={hostRef} className={className} style={style} />;
}
