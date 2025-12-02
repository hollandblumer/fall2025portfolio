// src/components/loading/LoadingTitleStatic.jsx
import React, { useEffect, useRef } from "react";
import p5 from "p5";

/**
 * DiamondTitleFinal (breathing)
 * - Final filled diamond grid look (no morph), but with a subtle "breathing" width animation.
 * - Each diamond's width oscillates between wMax and wMin using a smooth sine wave.
 * - Slight per-diamond phase offsets so the whole word feels alive, not synchronized.
 */
export default function DiamondTitleFinal({
  className,
  style,

  /** Sizing */
  textPx = 120, // used if autoResponsive=false
  autoResponsive = true,
  desktopPx = 110, // base when autoResponsive=true

  /** Text */
  text = "loading",

  /** Visuals */
  topColor = "#FFB310",
  botColor = "#FFB310",
  edgeThresh = 0.05, // alpha threshold for sampling

  /** Auto height */
  autoHeight = true,
  heightScale = 1.6,
  minHeightPx = 240,

  /** Responsive breakpoint scaling */
  ipadBp = 1024,
  mobileBp = 700,
  ipadScale = 0.7,
  mobileScale = 0.6,

  /** Breathing animation controls */
  breathe = true,
  // Design-space (pre-scale) min/max widths for the diamonds.
  // Per your ask: fluctuate from 32 -> 20 (design units) after scaling.
  breathWMaxDesign = 32,
  breathWMinDesign = 20,
  breathPeriodMs = 600, // how long one inhale/exhale takes
  breathEasing = "sin", // "sin" | "cos" (sin is fine)
  fps = 30, // cap to save battery

  /** Sub-structure of the diamond grid */
  subRows = 3, // vertical sub-rows per grid row (your style)
  rowHBase = 6, // design space base row height
  colWBase = 9, // design space base column width
  diamondHBase = 3.2, // design space base diamond height
  stagger = true, // stagger every other row
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);
  const roRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const sketch = (p) => {
      let TEXT_PX;

      // Derived metrics
      let ROW_H, COL_W, SUB_ROWS, DIAMOND_H, STAGGER;
      let WMAX, WMIN;

      // Buffers + parts
      let pg;
      let parts = [];
      let FG_TOP, FG_BOT;

      let t0 = 0;

      const decideTextPxBase = () => (autoResponsive ? desktopPx : textPx);

      const setDerivedFromTextPx = () => {
        const DESIGN_TS = 100; // anchor so your proportions stay familiar
        const SCALE = TEXT_PX / DESIGN_TS;

        ROW_H = rowHBase * SCALE;
        COL_W = colWBase * SCALE;
        SUB_ROWS = subRows;
        DIAMOND_H = diamondHBase * SCALE;
        STAGGER = stagger;

        // Breathing width bounds (scaled from design-space)
        WMAX = breathWMaxDesign * SCALE;
        WMIN = breathWMinDesign * SCALE;
      };

      // Word into buffer for alpha sampling
      function makeBuffer() {
        pg = p.createGraphics(p.width, p.height);
        pg.clear();
        pg.pixelDensity(1);
        pg.textAlign(p.CENTER, p.BASELINE);
        pg.textFont("'Times New Roman', Times, serif");
        pg.textSize(TEXT_PX);

        const asc = pg.textAscent();
        const desc = pg.textDescent();
        const lineH = asc + desc;
        const baselineY = p.height / 2 + (asc - lineH / 2);

        const host = hostRef.current;
        if (host) {
          host.style.setProperty("--title-baseline", `${baselineY}px`);
          host.style.setProperty("--title-capline", `${baselineY - asc}px`);
          host.style.setProperty("--title-bottom", `${baselineY + desc}px`);
        }

        pg.fill(255);
        pg.text(text, p.width / 2, baselineY);
        pg.loadPixels();
      }

      function aNeighborhoodMax(x, y) {
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

      // tiny deterministic noise from x,y to de-sync phases
      const hash2 = (x, y) => {
        // simple float hash in [0,1)
        const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return s - Math.floor(s);
      };

      // Build diamonds once (store base alpha + per-part phase)
      function makeParts() {
        parts.length = 0;

        for (let y = ROW_H * 0.5; y < p.height; y += ROW_H) {
          const offset =
            STAGGER && Math.floor(y / ROW_H) % 2 === 1 ? COL_W * 0.5 : 0;

          for (let r = 0; r < SUB_ROWS; r++) {
            const ry = y + (r - (SUB_ROWS - 1) / 2) * (DIAMOND_H * 0.7);

            for (let x = offset + COL_W * 0.5; x < p.width; x += COL_W) {
              const a = aNeighborhoodMax(x, ry);
              if (a >= edgeThresh) {
                const ph = hash2(x, ry) * Math.PI * 2; // local phase
                parts.push({
                  x,
                  y: ry,
                  a, // glyph coverage alpha (0..1)
                  phase: ph,
                });
              }
            }
          }
        }
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

        makeBuffer();
        makeParts();

        // redraw immediately
        p.redraw();
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

        FG_TOP = p.color(topColor);
        FG_BOT = p.color(botColor);

        makeBuffer();
        makeParts();

        p.frameRate(fps);
        t0 = p.millis();

        if (breathe) p.loop();
        else p.noLoop();
      };

      function breathLerp01(t) {
        // t in radians; outputs 0..1 easing
        // sin-based ease (smooth in/out)
        const s = Math.sin(t) * 0.5 + 0.5;
        return s;
      }

      p.draw = () => {
        p.clear();

        // time phase (global)
        const elapsed = p.millis() - t0;
        const basePhase = (elapsed / breathPeriodMs) * Math.PI * 2;

        for (let i = 0; i < parts.length; i++) {
          const pr = parts[i];

          // local width (breathe)
          let wNow;
          if (breathe) {
            const t = basePhase + pr.phase; // de-synced per diamond
            const k =
              breathEasing === "cos"
                ? Math.cos(t) * -0.5 + 0.5
                : breathLerp01(t);

            const wTarget = p.lerp(WMIN, WMAX, k); // between 20..32 (scaled)
            wNow = wTarget * pr.a; // respect glyph coverage alpha
          } else {
            // static at max-ish
            wNow = WMAX * pr.a;
          }

          const h = DIAMOND_H;

          const gy = p.constrain(pr.y / p.height, 0, 1);
          const c = p.lerpColor(FG_TOP, FG_BOT, gy);
          c.setAlpha(255);
          p.fill(c);
          p.noStroke();

          p.beginShape();
          p.vertex(pr.x, pr.y - h / 2);
          p.vertex(pr.x + wNow / 2, pr.y);
          p.vertex(pr.x, pr.y + h / 2);
          p.vertex(pr.x - wNow / 2, pr.y);
          p.endShape(p.CLOSE);
        }
      };

      // Expose for ResizeObserver
      p.onResizeHost = resizeToParent;
    };

    p5Ref.current = new p5(sketch, hostRef.current);

    roRef.current = new ResizeObserver(() => {
      if (p5Ref.current?.onResizeHost) p5Ref.current.onResizeHost();
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
    text,
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
    breathe,
    breathWMaxDesign,
    breathWMinDesign,
    breathPeriodMs,
    breathEasing,
    fps,
    subRows,
    rowHBase,
    colWBase,
    diamondHBase,
    stagger,
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
