// src/components/loading/LoadingTitleFinal.jsx
import React, { useEffect, useRef } from "react";
import p5 from "p5";

export default function LoadingTitleFinal({
  className,
  style,

  // MASTER ANCHOR — change once, everything scales
  textPx = 120,

  // Words
  wordA = "loading",
  wordB = "HOLLAND",

  // Timings (ms)
  holdMs = 2000,
  morphMs = 1200,
  postHoldMs = 1000,
  returnMs = 800,

  // Colors (top/bottom)
  topColor = "#53504e",
  botColor = "#4c4846",

  // Coverage threshold
  edgeThresh = 0.05,
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);
  const roRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const sketch = (p) => {
      /* -------------------- MASTER ANCHOR -------------------- */
      const TEXT_PX = textPx;

      /* Colors */
      let FG_TOP, FG_BOT;

      /* Derived geometry (computed from TEXT_PX) */
      let ROW_H, COL_W, SUB_ROWS, DIAMOND_H, STAGGER;
      let BASE_MAX_W, END_MAX_W;

      /* Buffers + particles */
      let pgA, pgB;
      let parts = [];
      let t0 = 0;

      const setDerivedFromTextPx = () => {
        const DESIGN_TS = 180; // design baseline for ratios
        const SCALE = TEXT_PX / DESIGN_TS;

        // lattice + diamonds (from your original numbers, scaled)
        ROW_H = 6 * SCALE;
        COL_W = 9 * SCALE;
        SUB_ROWS = 3; // integer
        DIAMOND_H = 3.2 * SCALE;
        STAGGER = true;

        // widths during phases (scaled)
        BASE_MAX_W = 32 * SCALE;
        END_MAX_W = 5 * SCALE;
      };

      function makeBuffers() {
        pgA = p.createGraphics(p.width, p.height);
        pgB = p.createGraphics(p.width, p.height);
        drawWord(pgA, wordA);
        drawWord(pgB, wordB);
      }

      function drawWord(pg, word) {
        pg.clear();
        pg.pixelDensity(1);
        pg.textAlign(p.CENTER, p.CENTER);
        pg.textFont("'Times New Roman', Times, serif");
        pg.textSize(TEXT_PX); // anchor text size here

        const lines = [word];
        const totalH = lines.length * TEXT_PX;
        let y = p.height / 2 - totalH / 2 + TEXT_PX * 0.65;

        pg.fill(255);
        for (const line of lines) {
          pg.text(line, p.width / 2, y);
          y += TEXT_PX * 1.22;
        }
        pg.loadPixels();
      }

      // Anti-aliased coverage probe
      function aNeighborhoodMax(pg, x, y) {
        let m = 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const ix = p.constrain(Math.floor(x + ox), 0, p.width - 1);
            const iy = p.constrain(Math.floor(y + oy), 0, p.height - 1);
            const a = pg.pixels[(iy * p.width + ix) * 4 + 3] / 255;
            if (a > m) m = a;
          }
        }
        return m;
      }

      function makeParticles() {
        parts.length = 0;
        const srcPts = [],
          dstPts = [];

        for (let y = ROW_H * 0.5; y < p.height; y += ROW_H) {
          const offset =
            STAGGER && Math.floor(y / ROW_H) % 2 === 1 ? COL_W * 0.5 : 0;
          for (let r = 0; r < SUB_ROWS; r++) {
            const ry = y + (r - (SUB_ROWS - 1) / 2) * (DIAMOND_H * 0.7);
            for (let x = offset + COL_W * 0.5; x < p.width; x += COL_W) {
              const aA = aNeighborhoodMax(pgA, x, ry);
              const aB = aNeighborhoodMax(pgB, x, ry);
              if (aA >= edgeThresh)
                srcPts.push({ x, y: ry, w: BASE_MAX_W * aA });
              if (aB >= edgeThresh)
                dstPts.push({ x, y: ry, w: BASE_MAX_W * aB });
            }
          }
        }

        const sorter = (p1, q1) => (p1.x === q1.x ? p1.y - q1.y : p1.x - q1.x);
        srcPts.sort(sorter);
        dstPts.sort(sorter);

        const Nsrc = srcPts.length,
          Ndst = dstPts.length;

        for (let i = 0; i < Ndst; i++) {
          const d = dstPts[i];
          const s = Nsrc
            ? srcPts[i % Nsrc]
            : { x: p.width / 2, y: p.height / 2, w: 0 };
          const isClone = i >= Nsrc;
          const jx = isClone ? p.random(-COL_W * 0.25, COL_W * 0.25) : 0;
          const jy = isClone ? p.random(-ROW_H * 0.25, ROW_H * 0.25) : 0;

          const wA_norm = (isClone ? s.w * 0.15 : s.w) / BASE_MAX_W;
          const wB_norm = d.w / BASE_MAX_W;

          parts.push({
            sx: s.x + jx,
            sy: s.y + jy,
            tx: d.x,
            ty: d.y,
            wA_norm,
            wB_norm,
          });
        }
      }

      function easeInOut(t) {
        t = p.constrain(t, 0, 1);
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      }

      const resizeToParent = () => {
        const el = hostRef.current;
        if (!el) return;
        const w = Math.max(1, Math.floor(el.clientWidth));
        const h = Math.max(1, Math.floor(el.clientHeight));
        p.resizeCanvas(w, h, false);
        setDerivedFromTextPx();
        makeBuffers();
        makeParticles();
        t0 = p.millis();
        p.loop();
      };

      p.setup = () => {
        const el = hostRef.current;
        const w = Math.max(1, Math.floor(el.clientWidth));
        const h = Math.max(1, Math.floor(el.clientHeight));

        p.pixelDensity(1);
        p.createCanvas(w, h);
        p.clear(); // transparent
        p.noStroke();

        FG_TOP = p.color(topColor);
        FG_BOT = p.color(botColor);

        setDerivedFromTextPx();
        makeBuffers();
        makeParticles();

        t0 = p.millis();
      };

      p.draw = () => {
        p.clear(); // keep transparent

        const elapsed = p.millis() - t0;
        const morphStart = holdMs;
        const morphEnd = holdMs + morphMs;

        let prog = 0;
        if (elapsed > morphStart)
          prog = easeInOut((elapsed - morphStart) / morphMs);
        if (elapsed >= morphEnd) prog = 1;

        let maxWNow;
        if (elapsed < morphStart) {
          maxWNow = BASE_MAX_W;
        } else if (elapsed < morphEnd) {
          const t = easeInOut((elapsed - morphStart) / morphMs);
          maxWNow = p.lerp(BASE_MAX_W, END_MAX_W, t);
        } else {
          const post = elapsed - morphEnd;
          if (post <= postHoldMs) {
            maxWNow = END_MAX_W;
          } else if (post <= postHoldMs + returnMs) {
            const r = easeInOut((post - postHoldMs) / returnMs);
            maxWNow = p.lerp(END_MAX_W, BASE_MAX_W, r);
          } else {
            maxWNow = BASE_MAX_W;
            p.noLoop();
          }
        }

        for (let i = 0; i < parts.length; i++) {
          const pr = parts[i];
          const x = p.lerp(pr.sx, pr.tx, prog);
          const y = p.lerp(pr.sy, pr.ty, prog);
          const w = p.lerp(pr.wA_norm, pr.wB_norm, prog) * maxWNow;
          const h = DIAMOND_H;

          const gy = p.constrain(y / p.height, 0, 1);
          const c = p.lerpColor(FG_TOP, FG_BOT, gy);
          p.fill(c);

          p.beginShape();
          p.vertex(x, y - h / 2);
          p.vertex(x + w / 2, y);
          p.vertex(x, y + h / 2);
          p.vertex(x - w / 2, y);
          p.endShape(p.CLOSE);
        }
      };

      // Expose a parent-resize hook and use ResizeObserver for accuracy
      p.onResizeHost = resizeToParent;
    };

    p5Ref.current = new p5(sketch, hostRef.current);

    // Observe parent size
    roRef.current = new ResizeObserver(() => {
      if (p5Ref.current && p5Ref.current.onResizeHost) {
        p5Ref.current.onResizeHost();
      }
    });
    roRef.current.observe(hostRef.current);

    return () => {
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }
    };
  }, [
    textPx,
    wordA,
    wordB,
    holdMs,
    morphMs,
    postHoldMs,
    returnMs,
    topColor,
    botColor,
    edgeThresh,
  ]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",

        ...style,
      }}
    />
  );
}
