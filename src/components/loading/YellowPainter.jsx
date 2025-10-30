// YellowPainter.jsx
import { useEffect, useRef } from "react";
import p5 from "p5";

export default function YellowPainter({
  className,
  style,
  holdMs = 2000, // 2 seconds plain yellow
  edgeMs = 3000, // ~3 seconds side-biased spawn
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);

  useEffect(() => {
    if (!hostRef.current || p5Ref.current) return;

    const sketch = (s) => {
      // ===== Config =====
      let seed = Math.random() * 999999;
      let particles = [];
      let particles_2 = [];
      let mySize, margin;
      let parNum;

      // phases: 0 hold, 1 edge-biased, 2 normal
      let startMs = 0;
      let phase = 0;

      // Yellow palette
      const Y_MAIN = "#FFD24A";
      const Y_LIGHT = "#FFE37F";
      const Y_DEEP = "#E7B500";
      let colorbg = Y_MAIN;
      let color_vision = 1;

      // Buffers + shader
      let shaderPG, paintPG, theShader;

      const fragFunctions = `
        #define PI 3.141592653589793
        #define TAU 6.283185307179586
        float rand(vec2 c){ return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453); }
        mat2 rotate2d(float _angle){ return mat2(cos(_angle),-sin(_angle), sin(_angle),cos(_angle)); }
        mat2 scale2d(vec2 _scale){ return mat2(_scale.x,0.0, 0.0,_scale.y); }
        vec2 tile (vec2 _st, float _zoom) { _st *= _zoom; return fract(_st); }

        // Classic Perlin 3D Noise (Stefan Gustavson)
        vec4 permute(vec4 x){return mod(((x*1000.0)+1.0)*x, 2009.0);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
        vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
        float cnoise(vec3 P){
          vec3 Pi0 = floor(P);
          vec3 Pi1 = Pi0 + vec3(1.0);
          Pi0 = mod(Pi0, 243.0);
          Pi1 = mod(Pi1, 289.0);
          vec3 Pf0 = fract(P);
          vec3 Pf1 = Pf0 - vec3(1.0);
          vec4 ix = vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);
          vec4 iy = vec4(Pi0.yy,Pi1.yy);
          vec4 iz0 = Pi0.zzzz;
          vec4 iz1 = Pi1.zzzz;
          vec4 ixy = permute(permute(ix) + iy);
          vec4 ixy0 = permute(ixy + iz0);
          vec4 ixy1 = permute(ixy + iz1);
          vec4 gx0 = ixy0 / 7.0;
          vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
          gx0 = fract(gx0);
          vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
          vec4 sz0 = step(gz0, vec4(0.0));
          gx0 -= sz0 * (step(0.0, gx0) - 0.5);
          gy0 -= sz0 * (step(0.0, gy0) - 0.5);
          vec4 gx1 = ixy1 / 7.0;
          vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
          gx1 = fract(gx1);
          vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
          vec4 sz1 = step(gz1, vec4(0.0));
          gx1 -= sz1 * (step(0.0, gx1) - 0.5);
          gy1 -= sz1 * (step(0.0, gy1) - 0.5);
          vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
          vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
          vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
          vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
          vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
          vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
          vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
          vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
          vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
          g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
          vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
          g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
          float n000 = dot(g000, Pf0);
          float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
          float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
          float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
          float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
          float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
          float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
          float n111 = dot(g111, Pf1);
          vec3 fade_xyz = fade(Pf0);
          vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
          vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
          float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
          return 2.2 * n_xyz;
        }
      `;

      const frag = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform float u_time;
        uniform sampler2D u_tex;

        varying vec2 var_vertTexCoord;

        ${fragFunctions}

        void main(){
          vec2 st = var_vertTexCoord;
          st.x += cnoise(vec3(st * 10000.0, 1.0)) / 20.0;
          vec4 texColor = texture2D(u_tex, st);
          gl_FragColor = texColor;
        }
      `;

      const vert = `
        precision highp float;
        attribute vec3 aPosition;
        attribute vec2 aTexCoord;

        varying vec2 var_vertTexCoord;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        void main() {
          gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
          var_vertTexCoord = aTexCoord;
        }
      `;

      // ===== p5 setup =====
      s.setup = () => {
        s.frameRate(25);
        s.randomSeed(seed);

        mySize = Math.min(
          hostRef.current.clientWidth || window.innerWidth,
          hostRef.current.clientHeight || window.innerHeight
        );
        margin = mySize / 100;

        const w = hostRef.current.clientWidth || window.innerWidth;
        const h = hostRef.current.clientHeight || window.innerHeight;

        s.createCanvas(w, h).parent(hostRef.current);
        shaderPG = s.createGraphics(w, h, s.WEBGL);
        paintPG = s.createGraphics(w, h);
        theShader = shaderPG.createShader(vert, frag);

        s.colorMode(s.RGB, 255, 255, 255, 100);

        parNum = Math.floor(s.random(2, 4)) * Math.floor(s.random(40, 80) / 2);

        // initial plain yellow
        s.background(colorbg);
        paintPG.background(colorbg);

        startMs = s.millis();
        phase = 0;
      };

      // ===== p5 draw =====
      s.draw = () => {
        const elapsed = s.millis() - startMs;

        if (phase === 0 && elapsed >= holdMs) phase = 1;
        if (phase === 1 && elapsed >= holdMs + edgeMs) phase = 2;

        // shader pass
        shaderPG.shader(theShader);
        theShader.setUniform("u_resolution", [s.width, s.height]);
        theShader.setUniform("u_time", s.millis() / 1000.0);
        theShader.setUniform("u_mouse", [
          s.mouseX / Math.max(1, s.width),
          s.mouseY / Math.max(1, s.height),
        ]);
        theShader.setUniform("u_tex", paintPG);

        shaderPG.clear();
        shaderPG.noStroke();
        shaderPG.rect(-s.width / 2, -s.height / 2, s.width, s.height);

        if (phase === 0) {
          // still solid yellow; composite paintPG (plain) via shader
          s.blendMode(s.BLEND);
          s.image(shaderPG, 0, 0);
          return;
        }

        if (phase === 1) {
          // edge-biased sporadic emission
          if (s.random() < 0.6) emitEdgeBiased();
          if (s.random() < 0.25) emitEdgeBiased(true);
        }

        if (phase === 2) {
          if (particles.length < parNum && s.random() < 0.6) {
            particles.push(
              new Particle(
                s,
                s.random(-s.width * 0.1, s.width * 1.1),
                s.random(-s.height * 0.1, s.height * 1.1)
              )
            );
          }
          if (particles_2.length < parNum / 2 && s.random() < 0.4) {
            particles_2.push(
              new Particle2(
                s,
                s.random(-s.width * 0.1, s.width * 1.1),
                s.random(-s.height * 0.1, s.height * 1.1)
              )
            );
          }
        }

        // Front layer
        for (let i = particles.length - 1; i >= 0; i--) {
          particles[i].color_vision = color_vision;
          particles[i].update();
          particles[i].show(paintPG);
          if (particles[i].finished()) {
            if (phase === 1) {
              const { x, y } = edgeSpawnPos();
              particles[i] = new Particle(s, x, y);
            } else {
              particles[i] = new Particle(
                s,
                s.random(-s.width * 0.1, s.width * 1.1),
                s.random(-s.height * 0.1, s.height * 1.1)
              );
            }
          }
        }

        // Composite shader output
        s.blendMode(s.BLEND);
        s.image(shaderPG, 0, 0);

        // Gentle wash
        s.blendMode(s.SOFT_LIGHT);
        if (s.frameCount % 25 === 0) {
          paintPG.noStroke();
          paintPG.fill(255, 210, 74, 3);
          paintPG.rect(0, 0, paintPG.width, paintPG.height);
        }

        // Back layer
        for (let i = particles_2.length - 1; i >= 0; i--) {
          particles_2[i].color_vision = color_vision;
          particles_2[i].update();
          particles_2[i].show(paintPG);
          if (particles_2[i].finished()) {
            particles_2.splice(i, 1);
          }
        }
      };

      // ===== Helpers =====
      function edgeSpawnPos() {
        const band = s.random();
        let x;
        if (band < 0.45) {
          x = s.random(-s.width * 0.1, s.width * 0.15); // left
        } else if (band < 0.9) {
          x = s.random(s.width * 0.85, s.width * 1.1); // right
        } else {
          x = s.random(s.width * 0.35, s.width * 0.65); // occasional middle
        }
        const y = s.random(-s.height * 0.1, s.height * 1.1);
        return { x, y };
      }

      function emitEdgeBiased(doubleUp = false) {
        const n1 = Math.floor(s.random(2, 5));
        for (let i = 0; i < n1; i++) {
          const { x, y } = edgeSpawnPos();
          particles.push(new Particle(s, x, y));
        }
        const n2 = doubleUp
          ? Math.floor(s.random(1, 3))
          : Math.floor(s.random(0, 2));
        for (let i = 0; i < n2; i++) {
          const { x, y } = edgeSpawnPos();
          particles_2.push(new Particle2(s, x, y));
        }
      }

      // ===== Particles =====
      function Particle(s, x, y) {
        this.pos = s.createVector(x, y);
        this.vel_yoko = s.createVector(0, s.random(-0.001, 0.001) / 0.001);
        this.acc_yoko = s.createVector(
          0,
          s.random(-0.01, 0.01) / s.random(0.001, 0.05)
        );
        this.vel_tate = s.createVector(
          s.random(-0.001, 0.001) / s.random(0.1, 0.5),
          0
        );
        this.acc_tate = s.createVector(
          s.random(-0.01, 0.01) / s.random(0.001, 0.05),
          0
        );
        this.alpha1 = Math.floor(s.random(50));
        this.alpha2 = 100;
        this.r = (mySize / Math.max(1, parNum || 60)) * s.random(120, 240);
        this.grad = 0;
        this.offset = -s.random(100) * s.random(2.0, 1.0);
        this.switch = 1;

        this.update = () => {
          this.vel_tate.add(this.acc_tate);
          this.pos.add(this.vel_tate);

          this.alpha2 -= s.random(1) / 2;
          this.alpha1 += s.random(1);

          if (this.r > 100) this.r -= 100;
          else this.r = (mySize / Math.max(1, parNum || 60)) * s.random(80, 40);

          if (s.frameCount % 25 === 0) {
            this.switch++;
            this.r -= 1;
          }

          // wrap
          if (this.pos.x < -s.width * 0.1) this.pos.x = s.width * 1.1;
          if (this.pos.x > s.width * 1.1) this.pos.x = -s.width * 0.1;
          if (this.pos.y < -s.height * 0.1) this.pos.y = s.height * 1.1;
          if (this.pos.y > s.height * 1.1) this.pos.y = -s.height * 0.1;
        };

        this.show = (g) => {
          g.stroke(255, 210, 74, 50);
          g.strokeWeight(10 * s.random(0.5));

          g.push();
          g.translate(
            this.pos.x + s.random(-this.offset, this.offset),
            this.pos.y - s.random(-this.offset, this.offset)
          );
          g.rotate(s.frameCount);

          const ctx = g.drawingContext;
          const rad = Math.abs(
            this.r / 5 - s.random(-this.offset / 20, this.offset / 20)
          );
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
          grad.addColorStop(0.0, Y_LIGHT);
          grad.addColorStop(1.0, Y_DEEP);
          ctx.fillStyle = grad;

          g.ellipse(
            0,
            0,
            this.r / 25 - s.random(-this.offset / 50, this.offset / 50),
            this.r / 25 - s.random(-this.offset / 10, this.offset / 10)
          );
          g.pop();
        };

        this.finished = () => this.alpha2 < 20;
      }

      function Particle2(s, x, y) {
        this.pos = s.createVector(x, y);
        this.vel_yoko = s.createVector(0, s.random(-0.01, 0.01) / 0.001);
        this.acc_yoko = s.createVector(
          0,
          s.random(-0.1, 0.1) / s.random(0.001, 0.05)
        );
        this.vel_tate = s.createVector(s.random(-0.001, 0.001) / 0.001, 0);
        this.acc_tate = s.createVector(
          s.random(-0.1, 0.1) / s.random(0.001, 0.05),
          0
        );
        this.alpha1 = Math.floor(s.random(25));
        this.alpha2 = 100;
        this.r = (mySize / Math.max(1, parNum || 60)) * s.random(80, 240);
        this.grad = 0;
        this.grad2 = 0;
        this.offset = -s.random(10, 1) * s.random(2.0, 1.0);
        this.switch = 1;

        this.update = () => {
          if (s.frameCount % 2 === 0) {
            this.vel_yoko.add(this.acc_yoko);
            this.pos.add(this.vel_yoko);
          } else {
            this.vel_tate.add(this.acc_tate);
            this.pos.add(this.vel_tate);
          }

          this.alpha2 -= s.random(1) / 2;
          this.alpha1 += s.random(1);

          if (this.r > 100) this.r -= 100;
          else this.r = (mySize / Math.max(1, parNum || 60)) * s.random(80, 40);

          if (s.frameCount % 25 === 0) {
            this.switch++;
            this.r -= 1;
          }

          // wrap
          if (this.pos.x < -s.width * 0.1) this.pos.x = s.width * 1.1;
          if (this.pos.x > s.width * 1.1) this.pos.x = -s.width * 0.1;
          if (this.pos.y < -s.height * 0.1) this.pos.y = s.height * 1.1;
          if (this.pos.y > s.height * 1.1) this.pos.y = -s.height * 0.1;
        };

        this.show = (g) => {
          g.stroke(255, 210, 74, 50);
          g.strokeWeight(1 * s.random(0.5));
          g.push();
          g.translate(
            this.pos.x + s.random(-this.offset, 0),
            this.pos.y - s.random(0, this.offset)
          );

          const ctx = g.drawingContext;
          const rad = Math.abs(
            this.r / 25 / 0.5 - s.random(-this.offset / 10, this.offset / 50)
          );
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
          grad.addColorStop(0.2, Y_LIGHT);
          grad.addColorStop(1.0, Y_DEEP);
          ctx.fillStyle = grad;

          const grad2 = ctx.createLinearGradient(0, 0, 0, rad);
          grad2.addColorStop(0.15, "rgba(255,210,74,0.65)");
          grad2.addColorStop(1.0, "rgba(255,210,74,0.0)");
          ctx.strokeStyle = grad2;

          g.rect(
            0,
            0,
            this.r / 5 / 10 - s.random(-this.offset / 150, this.offset / 150),
            this.r / 25 / 0.1 - s.random(-this.offset / 150, this.offset / 150)
          );
          g.pop();
        };

        this.finished = () => this.alpha2 < 20;
      }

      // ===== Resize =====
      s.windowResized = () => {
        const w = hostRef.current?.clientWidth || window.innerWidth;
        const h = hostRef.current?.clientHeight || window.innerHeight;

        s.resizeCanvas(w, h);
        shaderPG = s.createGraphics(w, h, s.WEBGL);
        paintPG = s.createGraphics(w, h);
        theShader = shaderPG.createShader(vert, frag);

        mySize = Math.min(w, h);
        margin = mySize / 100;

        s.background(colorbg);
        paintPG.background(colorbg);
      };
    };

    p5Ref.current = new p5(sketch);

    return () => {
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, [holdMs, edgeMs]);

  return <div ref={hostRef} className={className} style={style} />;
}
