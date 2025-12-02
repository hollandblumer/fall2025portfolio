// src/components/loading/LoadingTitleFinal.jsx
import React, { useEffect, useRef } from "react";
import p5 from "p5";

export default function LoadingTitleFinal({
  className,
  style,

  // If autoResponsive=false, this fixed size is used
  textPx = 120,

  // Responsive control: we now scale off desktopPx with breakpoints below
  autoResponsive = true,
  desktopPx = 110,

  // Words
  wordA = "loading",
  wordB = "HOLLAND",

  // Timings (ms)
  holdMs = 2000,
  morphMs = 1200,
  postHoldMs = 400, // shorter default hold after filled so it stays snappy
  returnMs = 800,

  // Grow-into-itself: happens inside the hold window (doesn't shift morph timing)
  growMs = 0,
  growOvershoot = 1.6,

  // Fill smoothing
  fillLeadMs = 250,
  fillExtendMs = 200,

  // Colors (top/bottom)
  topColor = "#e9a80fff",
  botColor = "#fcc23cff",

  // Coverage threshold
  edgeThresh = 0.05,

  // Auto height
  autoHeight = true,
  heightScale = 1.6,
  minHeightPx = 240,

  // Responsive scaling controls
  ipadBp = 1024,
  mobileBp = 700,
  ipadScale = 0.7,
  mobileScale = 0.6,

  // Seed grow (during initial hold)
  seedGrowMs = 700,
  seedGrowFrom = 0.25,

  /* -------------------- NEW: Breathing controls -------------------- */
  breathe = true, // enable/disable breathing overlay
  breathWMaxDesign = 32, // design-space max width for breathing
  breathWMinDesign = 20, // design-space min width for breathing
  breathBlend = 0.35, // 0..1: how much to mix breathing into base width
  breathPeriodMs = 300, // duration of a full inhale/exhale
  breathFps = 30, // cap frame rate for battery
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);
  const roRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const sketch = (p) => {
      let TEXT_PX;
      let firedReady = false;

      const decideTextPxBase = () => (autoResponsive ? desktopPx : textPx);

      let FG_TOP, FG_BOT;

      let ROW_H, COL_W, SUB_ROWS, DIAMOND_H, STAGGER;
      let BASE_MAX_W, END_MAX_W;

      // Breathing (scaled per current TEXT_PX)
      let BREATH_WMAX, BREATH_WMIN;

      let pgA, pgB;
      let parts = [];
      let t0 = 0;

      // Derive grid metrics from TEXT_PX
      const setDerivedFromTextPx = () => {
        const DESIGN_TS = 180;
        const SCALE = TEXT_PX / DESIGN_TS;

        ROW_H = 6 * SCALE;
        COL_W = 9 * SCALE;
        SUB_ROWS = 3;
        DIAMOND_H = 3.2 * SCALE;
        STAGGER = true;

        BASE_MAX_W = 32 * SCALE; // your base before fill
        END_MAX_W = 28 * SCALE; // your filled width

        // breathing bounds (independent of morph; can be wider/narrower)
        BREATH_WMAX = breathWMaxDesign * SCALE;
        BREATH_WMIN = breathWMinDesign * SCALE;
      };

      function makeBuffers() {
        pgA = p.createGraphics(p.width, p.height);
        pgB = p.createGraphics(p.width, p.height);
        drawWord(pgA, wordA);
        drawWord(pgB, wordB);
      }

      // Center text using ascent/descent
      function drawWord(pg, word) {
        pg.clear();
        pg.pixelDensity(1);
        pg.textAlign(p.CENTER, p.BASELINE);
        pg.textFont("'Times New Roman', Times, serif");
        pg.textSize(TEXT_PX);

        const asc = pg.textAscent();
        const desc = pg.textDescent();
        const lineH = asc + desc;

        // Center baseline vertically
        const baselineY = p.height / 2 + (asc - lineH / 2);

        // expose text metrics to CSS on the host
        const host = hostRef.current;
        if (host) {
          host.style.setProperty("--title-baseline", `${baselineY}px`);
          host.style.setProperty("--title-capline", `${baselineY - asc}px`);
          host.style.setProperty("--title-bottom", `${baselineY + desc}px`);
        }

        pg.fill(255);
        pg.text(word, p.width / 2, baselineY);
        pg.loadPixels();
      }

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

      // small deterministic hash for per-diamond phase
      const hash2 = (x, y) => {
        const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return s - Math.floor(s); // [0,1)
      };

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

          // assign a deterministic breathing phase based on target coords
          const phase = hash2(d.x, d.y) * Math.PI * 2;

          parts.push({
            sx: s.x + jx,
            sy: s.y + jy,
            tx: d.x,
            ty: d.y,
            wA_norm,
            wB_norm,
            phase, // for breathing
          });
        }
      }

      function easeInOut(t) {
        t = p.constrain(t, 0, 1);
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      }
      function easeOutCubic(t) {
        t = p.constrain(t, 0, 1);
        return 1 - Math.pow(1 - t, 3);
      }

      const computeScaleFactor = (w) => {
        if (w <= mobileBp) return mobileScale;
        if (w <= ipadBp) return ipadScale;
        return 1;
      };

      const resizeToParent = () => {
        const el = hostRef.current;
        if (!el) return;

        const w = Math.max(1, Math.floor(el.clientWidth));
        const hAvail = Math.max(1, Math.floor(el.clientHeight || 300));
        const scaleFactor = computeScaleFactor(w);

        let desiredPx = decideTextPxBase() * scaleFactor;
        const minHScaled = Math.max(Math.floor(minHeightPx * scaleFactor), 120);
        const targetH = autoHeight
          ? Math.max(minHScaled, Math.floor(desiredPx * heightScale))
          : hAvail;

        if (!autoHeight) {
          desiredPx = Math.min(
            desiredPx,
            Math.floor(targetH / Math.max(1e-6, heightScale))
          );
        }

        TEXT_PX = desiredPx;
        setDerivedFromTextPx();

        const h = autoHeight ? targetH : hAvail;
        if (autoHeight) el.style.height = `${h}px`;

        p.resizeCanvas(w, h, false);

        makeBuffers();
        makeParticles();
        t0 = p.millis();
        firedReady = false;
        p.loop();
      };

      p.setup = () => {
        const el = hostRef.current;
        const w = Math.max(1, Math.floor(el.clientWidth));
        const hAvail = Math.max(1, Math.floor(el.clientHeight || 300));

        const scaleFactor = computeScaleFactor(w);
        let desiredPx = decideTextPxBase() * scaleFactor;

        const minHScaled = Math.max(Math.floor(minHeightPx * scaleFactor), 120);
        const preH = autoHeight
          ? Math.max(minHScaled, Math.floor(desiredPx * heightScale))
          : hAvail;

        if (!autoHeight) {
          desiredPx = Math.min(
            desiredPx,
            Math.floor(preH / Math.max(1e-6, heightScale))
          );
        }

        TEXT_PX = desiredPx;
        setDerivedFromTextPx();

        const h = autoHeight ? preH : hAvail;
        if (autoHeight) el.style.height = `${h}px`;

        p.pixelDensity(1);
        p.createCanvas(w, h);
        p.clear();
        p.noStroke();

        FG_TOP = p.color(topColor);
        FG_BOT = p.color(botColor);

        makeBuffers();
        makeParticles();
        t0 = p.millis();

        p.frameRate(breathe ? breathFps : 60);
      };

      // 0..1 sine easing
      function breath01(rad) {
        return Math.sin(rad) * 0.5 + 0.5;
      }

      p.draw = () => {
        p.clear();

        const elapsed = p.millis() - t0;

        // windows
        const morphStart = holdMs;
        const morphEnd = holdMs + morphMs;

        // fill window overlaps morph
        const fillStart = Math.max(0, morphStart - Math.max(0, fillLeadMs));
        const fillDuration = morphMs + Math.max(0, fillExtendMs);
        const fillEnd = fillStart + fillDuration;

        // seed-grow (inside hold)
        const seedWindow = Math.min(seedGrowMs, Math.max(0, holdMs));
        const seedProg =
          seedWindow > 0
            ? easeOutCubic(p.constrain(elapsed / seedWindow, 0, 1))
            : 1;

        // overshoot grow (inside hold)
        const growWindow = Math.min(growMs, holdMs);
        const growProg =
          growWindow > 0
            ? easeOutCubic(p.constrain(elapsed / growWindow, 0, 1))
            : 1;

        // position morph progress
        let prog = 0;
        if (elapsed > morphStart)
          prog = easeInOut((elapsed - morphStart) / morphMs);
        if (elapsed >= morphEnd) prog = 1;

        // width fill progress
        let fillProg = 0;
        if (elapsed >= fillStart) {
          fillProg = easeInOut((elapsed - fillStart) / fillDuration);
          if (elapsed >= fillEnd) fillProg = 1;
        }

        // base (non-breathing) max diamond width
        let maxWBase;
        if (elapsed < fillStart) {
          // PRE-FILL (LOADING)
          if (seedWindow > 0) {
            const baseStart = BASE_MAX_W * seedGrowFrom;
            if (growWindow > 0) {
              const overshootTarget = BASE_MAX_W * growOvershoot;
              const seedW = p.lerp(baseStart, overshootTarget, seedProg);
              const settleW = p.lerp(overshootTarget, BASE_MAX_W, growProg);
              const blend = Math.max(seedProg, growProg);
              maxWBase = p.lerp(seedW, settleW, blend);
            } else {
              maxWBase = p.lerp(baseStart, BASE_MAX_W, seedProg);
            }
          } else if (growWindow > 0) {
            maxWBase = p.lerp(BASE_MAX_W * growOvershoot, BASE_MAX_W, growProg);
          } else {
            maxWBase = BASE_MAX_W;
          }
        } else if (elapsed < fillEnd) {
          // FILL: narrow toward END_MAX_W
          maxWBase = p.lerp(BASE_MAX_W, END_MAX_W, fillProg);
        } else {
          // after fill
          const post = elapsed - fillEnd;

          if (!firedReady) {
            firedReady = true;
            window.dispatchEvent(new CustomEvent("loading:title:ready"));
          }

          if (post <= postHoldMs) {
            maxWBase = END_MAX_W;
          } else if (post <= postHoldMs + returnMs) {
            const r = easeInOut((post - postHoldMs) / returnMs);
            maxWBase = p.lerp(END_MAX_W, BASE_MAX_W, r);
          } else {
            maxWBase = BASE_MAX_W;
            // keep looping if breathe, otherwise stop
            if (!breathe) p.noLoop();
          }
        }

        // global breathing phase
        const basePhase =
          (breathe ? elapsed / breathPeriodMs : 0) * Math.PI * 2;

        for (let i = 0; i < parts.length; i++) {
          const pr = parts[i];

          // position morph
          const x = p.lerp(pr.sx, pr.tx, prog);
          const y = p.lerp(pr.sy, pr.ty, prog);

          // per-diamond width morph factor (A->B)
          const wNorm = p.lerp(pr.wA_norm, pr.wB_norm, prog);

          // breathing width (independent target range 20..32 design units, scaled)
          let wBreath = maxWBase; // fallback
          if (breathe) {
            const k = breath01(basePhase + pr.phase); // 0..1
            const wTarget = p.lerp(BREATH_WMIN, BREATH_WMAX, k);
            // mix breathing target with base max width (keeps morph logic intact)
            const maxWFinal = p.lerp(maxWBase, wTarget, breathBlend);
            wBreath = maxWFinal;
          }

          const w = wNorm * (breathe ? wBreath : maxWBase);
          const h = DIAMOND_H;

          const gy = p.constrain(y / p.height, 0, 1);
          const c = p.lerpColor(FG_TOP, FG_BOT, gy);
          c.setAlpha(255);
          p.fill(c);

          p.beginShape();
          p.vertex(x, y - h / 2);
          p.vertex(x + w / 2, y);
          p.vertex(x, y + h / 2);
          p.vertex(x - w / 2, y);
          p.endShape(p.CLOSE);
        }
      };

      p.onResizeHost = resizeToParent;
    };

    p5Ref.current = new p5(sketch, hostRef.current);

    roRef.current = new ResizeObserver(() => {
      if (p5Ref.current && p5Ref.current.onResizeHost) {
        p5Ref.current.onResizeHost();
      }
    });
    roRef.current.observe(hostRef.current);

    return () => {
      roRef.current?.disconnect();
      p5Ref.current?.remove();
    };
  }, [
    textPx,
    autoResponsive,
    desktopPx,
    wordA,
    wordB,
    holdMs,
    morphMs,
    postHoldMs,
    returnMs,
    growMs,
    growOvershoot,
    fillLeadMs,
    fillExtendMs,
    topColor,
    botColor,
    edgeThresh,
    autoHeight,
    heightScale,
    minHeightPx,
    ipadBp,
    mobileBp,
    ipadScale,
    mobileScale,
    seedGrowMs,
    seedGrowFrom,
    // breathing deps
    breathe,
    breathWMaxDesign,
    breathWMinDesign,
    breathBlend,
    breathPeriodMs,
    breathFps,
  ]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: autoHeight ? undefined : "300px",
        overflow: "visible",
        ...style,
      }}
    />
  );
}
