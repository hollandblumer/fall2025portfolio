// src/components/SpringyBlobText.jsx
import React, { useRef, useEffect } from "react";
import p5 from "p5";

export default function SpringyBlobText({
  text = "TEMPLATES",
  className,
  style,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    let p5Instance = null;

    const sketch = (p) => {
      /* ================================
         CONFIG
      ================================ */

      const TEXT_STRING = text; // <- change via prop
      let letterFont = null;
      const FONT_URL =
        "https://assets.codepen.io/9259849/RubikMonoOne-Regular_1.ttf";

      const vertexDistanceRel = 0.008;
      let effectiveVertexDistance;

      let fontLoaded = false;

      // helper: wrap p.loadFont in a Promise so we can use async/await
      function loadFontAsync(url) {
        return new Promise((resolve, reject) => {
          p.loadFont(
            url,
            (font) => resolve(font),
            (err) => reject(err)
          );
        });
      }

      /* ================================
         Spring physics (PolyWave style)
      ================================ */

      class Point {
        constructor(x, y) {
          this.x = x;
          this.y = y;
        }
        moveTo(x, y) {
          this.x = x;
          this.y = y;
          return this;
        }
        delta(p2) {
          return [this.x - p2.x, this.y - p2.y];
        }
        distance(p2) {
          const dx = p2.x - this.x;
          const dy = p2.y - this.y;
          return Math.sqrt(dx * dx + dy * dy);
        }
      }

      const ELASTICITY = 0.03;
      const DAMPING = 0.75;
      const MASS = 2;
      const ADJACENT_SPRING_CONSTANT = 0.1;

      let MOUSE_STRENGTH = 0.7;
      let MOUSE_RADIUS;

      /** A spring point that behaves like your PolyWave springs */
      class Spring extends Point {
        constructor({
          x,
          y,
          mass = MASS,
          elasticity = ELASTICITY,
          damping = DAMPING,
        }) {
          super(x, y);
          this.ox = x;
          this.oy = y;
          this.vx = 0;
          this.vy = 0;
          this.fx = 0;
          this.fy = 0;
          this.mass = mass;
          this.elasticity = elasticity;
          this.damping = damping;
          this.attractors = [];
        }

        applyForce(x, y) {
          this.fx += x;
          this.fy += y;
        }

        addAttractor(pt) {
          this.attractors.push(pt);
        }

        setForceFromAttractors() {
          // IMPORTANT: match original – only one applyForce
          this.attractors.forEach((pt) => {
            const fx = ADJACENT_SPRING_CONSTANT * pt.vx;
            const fy = ADJACENT_SPRING_CONSTANT * pt.vy;
            this.applyForce(fx, fy);
          });
        }

        applyForceFromMouse(pointer) {
          const distance = this.distance(pointer.position);
          if (distance < MOUSE_RADIUS) {
            const [dx, dy] = pointer.delta();
            const power = (1 - distance / MOUSE_RADIUS) * MOUSE_STRENGTH;
            this.applyForce(dx * power, dy * power);
          }
        }

        setSpringForce() {
          const fx = (this.ox - this.x) * this.elasticity;
          const fy = (this.oy - this.y) * this.elasticity;
          this.fx += fx;
          this.fy += fy;
        }

        solveVelocity() {
          if (this.fx === 0 && this.fy === 0) return;
          const ax = this.fx / this.mass;
          const ay = this.fy / this.mass;
          this.vx = this.damping * this.vx + ax;
          this.vy = this.damping * this.vy + ay;
          this.x += this.vx;
          this.y += this.vy;
          this.fx = 0;
          this.fy = 0;
        }

        update(pointer) {
          this.setForceFromAttractors();
          this.applyForceFromMouse(pointer);
          this.setSpringForce();
          this.solveVelocity();
        }
      }

      /* ================================
         Pointer (p5-based)
      ================================ */

      class SpringPointer {
        constructor(x, y) {
          this.position = new Point(x, y);
          this.lastPosition = new Point(x, y);
        }
        updateFromMouse(mx, my) {
          this.lastPosition.moveTo(this.position.x, this.position.y);
          this.position.moveTo(mx, my);
        }
        delta() {
          return this.position.delta(this.lastPosition);
        }
      }

      /* ================================
         Global state
      ================================ */

      let pointer;
      let springs = []; // flat list of all springs
      let blobs = []; // per letter: { loops: [ [spring,...], ... ] }

      /* ================================
         p5 lifecycle
      ================================ */

      // p5 2.0–safe: no preload(), use async setup
      p.setup = async () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.colorMode(p.RGB, 255);
        p.background("#252f3d");
        p.noStroke();

        effectiveVertexDistance = vertexDistanceRel * p.min(p.width, p.height);
        MOUSE_RADIUS = p.min(p.width, p.height) * 0.18;

        pointer = new SpringPointer(p.width / 2, p.height / 2);

        try {
          letterFont = await loadFontAsync(FONT_URL);
          fontLoaded = true;
          buildLetters();
        } catch (err) {
          console.error("Failed to load font:", err);
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        p.background("#252f3d");
        effectiveVertexDistance = vertexDistanceRel * p.min(p.width, p.height);
        MOUSE_RADIUS = p.min(p.width, p.height) * 0.18;
        if (fontLoaded) {
          buildLetters();
        }
      };

      /* ================================
         Build per-letter blobs (loops with counters)
      ================================ */

      function buildLetters() {
        if (!fontLoaded || !letterFont) return;

        springs = [];
        blobs = [];

        const minLength = p.min(p.width, p.height);
        const radius = minLength * 0.16;
        const fontSize = radius * 1.7;

        const txt = TEXT_STRING;
        const chars = txt.split("");

        // measure each character for layout
        const charInfos = chars.map((ch) => {
          if (ch === " ")
            return { char: " ", width: radius * 0.8, isSpace: true };
          const b = letterFont.textBounds(ch, 0, 0, fontSize);
          return { char: ch, width: b.w, isSpace: false };
        });

        const LETTER_GAP = radius * 0.25;

        // total width
        let totalW = 0;
        for (let i = 0; i < charInfos.length; i++) {
          totalW += charInfos[i].width;
          if (i < charInfos.length - 1) totalW += LETTER_GAP;
        }

        const targetWidth = totalW * 0.9;
        const scaleX = targetWidth / totalW;

        // baseline & horizontal start
        const lineStartX = (p.width - targetWidth) / 2;
        const baseY = p.height * 0.55;

        let xCursor = 0;
        for (let i = 0; i < charInfos.length; i++) {
          const info = charInfos[i];
          if (info.isSpace) {
            xCursor += info.width;
            if (i < charInfos.length - 1) xCursor += LETTER_GAP;
            continue;
          }

          const cx = lineStartX + (xCursor + info.width / 2) * scaleX;

          const blobLoops = generateLetterLoops(
            cx,
            baseY,
            radius,
            info.char,
            fontSize
          );
          blobs.push({ loops: blobLoops });

          // collect springs
          blobLoops.forEach((loop) => {
            loop.forEach((s) => springs.push(s));
          });

          xCursor += info.width;
          if (i < charInfos.length - 1) xCursor += LETTER_GAP;
        }

        // neighbor attractors within each contour loop
        blobs.forEach((blob) => {
          blob.loops.forEach((loop) => {
            const len = loop.length;
            if (len < 2) return;
            for (let i = 0; i < len; i++) {
              const curr = loop[i];
              const prev = loop[(i - 1 + len) % len];
              const next = loop[(i + 1) % len];
              curr.addAttractor(prev);
              curr.addAttractor(next);
            }
          });
        });
      }

      /**
       * generateLetterLoops: returns loops of Spring points
       */
      function generateLetterLoops(offsetX, offsetY, radius, letter, fontSize) {
        if (!fontLoaded || !letterFont) return [];

        const bounds = letterFont.textBounds(letter, 0, 0, fontSize);
        const bx = bounds.x;
        const by = bounds.y;
        const bw = bounds.w;
        const bh = bounds.h;

        const rawPoints = letterFont.textToPoints(letter, 0, 0, fontSize, {
          sampleFactor: 0.6,
          simplifyThreshold: 0,
        });

        const allLoops = [];
        let currentLoop = [];
        let lastRaw = null;

        const breakThreshold = effectiveVertexDistance * 8;

        for (let i = 0; i < rawPoints.length; i++) {
          const pt = rawPoints[i];

          if (lastRaw) {
            const rawD = p.dist(lastRaw.x, lastRaw.y, pt.x, pt.y);
            if (rawD > breakThreshold && currentLoop.length > 0) {
              allLoops.push(currentLoop);
              currentLoop = [];
            }
          }
          lastRaw = { x: pt.x, y: pt.y };

          const px = pt.x - bx - bw * 0.5 + offsetX;
          const py = pt.y - by - bh * 0.5 + offsetY;

          const PARTICLE_SPACING = effectiveVertexDistance * 1.0;

          if (currentLoop.length === 0) {
            const s = new Spring({
              x: px,
              y: py,
              elasticity: p.random(0.02, 0.04),
              damping: p.random(0.7, 0.8),
            });
            currentLoop.push(s);
          } else {
            const last = currentLoop[currentLoop.length - 1];
            const d = p.dist(last.x, last.y, px, py);
            if (d >= PARTICLE_SPACING) {
              const s = new Spring({
                x: px,
                y: py,
                elasticity: p.random(0.02, 0.04),
                damping: p.random(0.7, 0.8),
              });
              currentLoop.push(s);
            }
          }
        }

        if (currentLoop.length > 0) allLoops.push(currentLoop);

        // filter out teeny loops
        const processedLoops = allLoops.filter((loop) => loop.length >= 3);
        return processedLoops;
      }

      /* ================================
         Draw
      ================================ */

      p.draw = () => {
        p.background("#252f3d");

        if (!fontLoaded) {
          // you can show nothing or a loading text
          return;
        }

        // pointer
        pointer.updateFromMouse(p.mouseX, p.mouseY);

        // pointer halo
        p.noFill();
        p.stroke(165, 165, 165, 90);
        p.strokeWeight(1.5);
        p.circle(pointer.position.x, pointer.position.y, MOUSE_RADIUS * 0.8);

        // update springs
        for (let i = 0; i < springs.length; i++) {
          springs[i].update(pointer);
        }

        // draw each letter blob (own counters, own even-odd fill)
        for (let b = 0; b < blobs.length; b++) {
          drawLetterBlob(blobs[b]);
        }
      };

      /**
       * Draw a letter blob with even-odd fill so counters punch out
       */
      function drawLetterBlob(blob) {
        if (!blob.loops || blob.loops.length === 0) return;

        const contours = [];

        for (let li = 0; li < blob.loops.length; li++) {
          const contour = blob.loops[li];
          if (contour.length < 3) continue;

          const len = contour.length;
          let smooth = new Array(len);

          // copy positions
          for (let i = 0; i < len; i++) {
            const pt = contour[i];
            smooth[i] = { x: pt.x, y: pt.y };
          }

          // smoothing passes
          const passes = 4;
          for (let k = 0; k < passes; k++) {
            const tmp = new Array(len);
            for (let i = 0; i < len; i++) {
              const prev = smooth[(i - 1 + len) % len];
              const curr = smooth[i];
              const next = smooth[(i + 1) % len];
              tmp[i] = {
                x: (prev.x + curr.x * 2 + next.x) / 4,
                y: (prev.y + curr.y * 2 + next.y) / 4,
              };
            }
            smooth = tmp;
          }

          // wrap for continuity
          const curvePts = [];
          curvePts.push(smooth[len - 2]);
          curvePts.push(smooth[len - 1]);
          for (let i = 0; i < len; i++) {
            curvePts.push(smooth[i]);
          }
          curvePts.push(smooth[0]);
          curvePts.push(smooth[1]);

          contours.push(curvePts);
        }

        if (!contours.length) return;

        const ctx = p.drawingContext;
        ctx.save();
        ctx.fillStyle = "#F7E9A9";
        ctx.beginPath();

        contours.forEach((curvePts) => {
          if (!curvePts.length) return;
          ctx.moveTo(curvePts[0].x, curvePts[0].y);
          for (let i = 1; i < curvePts.length; i++) {
            const pt = curvePts[i];
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
        });

        ctx.fill("evenodd");
        ctx.restore();
      }
    };

    if (containerRef.current) {
      p5Instance = new p5(sketch, containerRef.current);
    }

    return () => {
      if (p5Instance) {
        p5Instance.remove();
      }
    };
  }, [text]);

  return <div ref={containerRef} className={className} style={style} />;
}
