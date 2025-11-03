// src/components/loading/LoadingTitle.jsx
import { useEffect, useRef } from "react";
import p5 from "p5";

export default function LoadingTitle({
  onFinish,
  className,
  style,

  // words
  wordA = "loading",
  wordB = "holland",

  // force text size (px). Omit/undefined to auto-fit
  textSizePx = 150,

  // visuals
  gradient = false,
  fontFamily = "Helvetica, Arial, sans-serif",
  vBias = 0,
  topPadPct = 0.0,
  botPadPct = 0.0,

  // per-word grids
  gridLoading = {
    targetColWidth: 12,
    rowHeightMul: 0.7,
    subRows: 2,
    stagger: true,
    sideMargin: 50,
  },
  gridHolland = {
    targetColWidth: 10,
    rowHeightMul: 0.6,
    subRows: 2,
    stagger: true,
    sideMargin: 50,
  },

  // per-word diamond/edge settings
  loading = { edgeThreshold: 0.06, diamondHeight: 3.8, baseMaxWidth: 64 },
  holland = {
    edgeThreshold: 0.14,
    diamondHeight: 4.2,
    baseMaxWidth: 18,
    endMaxWidth: 18,
    returnMaxWidth: 44,

    // anti-skinny + smoothing knobs
    minAspect: 1.6, // w/h floor
    maxAspect: 8.0, // optional ceiling
    minWidthPx: 6, // absolute width floor in px
    morphFatBias: 0.18, // adds “fat” at mid-morph (0..0.4)
    tipCutPct: 0.28, // trims diamond tips into a soft octagon (0..0.45)
  },

  // timings
  timings = {
    holdMs: 1200,
    overlapMs: 350,
    morphMs: 900,
    postHoldMs: 400,
    returnMs: 600,
  },
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);
  const roRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const merge = (a, b) => ({ ...a, ...(b || {}) });
    const GRID_A = merge(
      {
        targetColWidth: 12,
        rowHeightMul: 0.7,
        subRows: 2,
        stagger: true,
        sideMargin: 50,
      },
      gridLoading
    );
    const GRID_B = merge(
      {
        targetColWidth: 12,
        rowHeightMul: 0.7,
        subRows: 2,
        stagger: true,
        sideMargin: 50,
      },
      gridHolland
    );
    const LOADING = merge(
      { edgeThreshold: 0.06, diamondHeight: 3.8, baseMaxWidth: 64 },
      loading
    );
    const HOLLAND = merge(
      {
        edgeThreshold: 0.14,
        diamondHeight: 3.2,
        baseMaxWidth: 28,
        endMaxWidth: 18,
        returnMaxWidth: 64,
        minAspect: 1.6,
        maxAspect: 8.0,
        minWidthPx: 6,
        morphFatBias: 0.18,
        tipCutPct: 0.28,
      },
      holland
    );
    const T = merge(
      {
        holdMs: 1200,
        overlapMs: 350,
        morphMs: 900,
        postHoldMs: 400,
        returnMs: 600,
      },
      timings
    );

    const getHostRect = () => {
      const r = host.getBoundingClientRect();
      return {
        w: Math.max(1, Math.round(r.width)),
        h: Math.max(1, Math.round(r.height)),
      };
    };

    const maybeInit = () => {
      if (p5Ref.current) return;
      const { w, h } = getHostRect();
      if (w < 2 || h < 2) return;

      const sketch = (p) => {
        // -------- helpers --------
        const easeInOutSine = (t) =>
          -(Math.cos(Math.PI * p.constrain(t, 0, 1)) - 1) / 2;
        const smoothstep = (t) => {
          t = p.constrain(t, 0, 1);
          return t * t * (3 - 2 * t);
        };
        // bell: 0 at ends, 1 in middle
        const bell01 = (t) => {
          t = p.constrain(t, 0, 1);
          return 1 - Math.abs(2 * t - 1);
        };

        const sizeToHost = () => {
          const { w, h } = getHostRect();
          p.resizeCanvas(w, h);
        };

        // -------- state --------
        const WORD_A = wordA;
        const WORD_B = wordB;
        const FONT_NAME = fontFamily;
        let pgA, pgB;
        let parts = [];
        let t0 = 0;
        let fittedTextSize = 0;

        p.setup = () => {
          const { w, h } = getHostRect();
          p.createCanvas(w, h).parent(host);
          p.clear();
          p.pixelDensity(1);
          p.noStroke();
          rebuildAll();
          t0 = p.millis();
        };

        p.windowResized = () => {
          sizeToHost();
          p.pixelDensity(1);
          rebuildAll();
          t0 = p.millis();
          p.loop();
        };

        function rebuildAll() {
          makeBuffers();
          makeParticles();
        }

        function makeBuffers() {
          const W = Math.max(1, p.width);
          const H = Math.max(1, p.height);
          pgA = p.createGraphics(W, H);
          pgB = p.createGraphics(W, H);
          pgA.pixelDensity(1);
          pgB.pixelDensity(1);
          fittedTextSize =
            typeof textSizePx === "number" && textSizePx > 0
              ? textSizePx
              : Math.min(H * 0.7, W * 0.16);
          drawWord(pgA, WORD_A, fittedTextSize);
          drawWord(pgB, WORD_B, fittedTextSize);
        }

        function drawWord(pg, word, ts) {
          pg.clear();
          pg.textAlign(p.CENTER, p.CENTER);
          pg.textFont(FONT_NAME);
          pg.textSize(ts);
          const topPad = p.height * topPadPct;
          const botPad = p.height * botPadPct;
          const contentH = Math.max(1, p.height - topPad - botPad);
          const cy = topPad + contentH / 2;
          const y = cy - ts / 2 + ts * 0.65 + vBias * contentH;
          pg.fill(255);
          pg.text(word, p.width / 2, y);
          pg.loadPixels();
        }

        // smoother edge coverage (5×5 max alpha neighborhood)
        const aNeighborhoodMax = (pg, x, y) => {
          let m = 0;
          for (let oy = -2; oy <= 2; oy++) {
            for (let ox = -2; ox <= 2; ox++) {
              const ix = p.constrain(Math.floor(x + ox), 0, p.width - 1);
              const iy = p.constrain(Math.floor(y + oy), 0, p.height - 1);
              const a = pg.pixels[(iy * p.width + ix) * 4 + 3] / 255;
              if (a > m) m = a;
            }
          }
          return m;
        };

        function collectPoints(pg, GRID, WORD_SETTINGS) {
          const pts = [];
          const COL_W = p.constrain(Math.round(GRID.targetColWidth), 4, 64);
          const ROW_H = Math.max(
            3,
            Math.round(COL_W * (GRID.rowHeightMul ?? 0.7))
          );
          const SUB_ROWS = Math.max(1, Math.round(GRID.subRows ?? 1));
          const STAGGER = !!GRID.stagger;
          const SIDE_MARGIN = GRID.sideMargin ?? 50;
          const dH = WORD_SETTINGS.diamondHeight ?? 3.8;
          const thresh = WORD_SETTINGS.edgeThreshold ?? 0.05;
          const baseMax = Math.max(1e-3, WORD_SETTINGS.baseMaxWidth ?? 64);

          for (let y = ROW_H * 0.5; y < p.height; y += ROW_H) {
            const offset =
              STAGGER && Math.floor(y / ROW_H) % 2 === 1 ? COL_W * 0.5 : 0;
            for (let r = 0; r < SUB_ROWS; r++) {
              const ry = y + (r - (SUB_ROWS - 1) / 2) * (dH * 0.7);
              for (
                let x = SIDE_MARGIN + offset + COL_W * 0.5;
                x < p.width - SIDE_MARGIN;
                x += COL_W
              ) {
                const a = aNeighborhoodMax(pg, x, ry);
                if (a >= thresh) pts.push({ x, y: ry, w: baseMax * a });
              }
            }
          }
          return {
            pts,
            COL_W,
            ROW_H,
            SUB_ROWS,
            SIDE_MARGIN,
            STAGGER,
            dH,
            baseMax,
          };
        }

        function makeParticles() {
          parts.length = 0;
          const src = collectPoints(pgA, GRID_A, LOADING);
          const dst = collectPoints(pgB, GRID_B, HOLLAND);
          src.pts.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
          dst.pts.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

          const Nsrc = src.pts.length;
          const Ndst = dst.pts.length;

          for (let i = 0; i < Ndst; i++) {
            const d = dst.pts[i];
            const s = Nsrc
              ? src.pts[i % Nsrc]
              : { x: p.width / 2, y: p.height / 2, w: 0 };
            const isClone = i >= Nsrc;

            const jx = isClone
              ? p.random(
                  -(GRID_B.targetColWidth || 12) * 0.25,
                  (GRID_B.targetColWidth || 12) * 0.25
                )
              : 0;
            const jy = isClone
              ? p.random(
                  -(GRID_B.targetColWidth || 12) *
                    (GRID_B.rowHeightMul || 0.7) *
                    0.25,
                  (GRID_B.targetColWidth || 12) *
                    (GRID_B.rowHeightMul || 0.7) *
                    0.25
                )
              : 0;

            const wA_norm =
              (isClone ? s.w * 0.15 : s.w) /
              Math.max(1e-3, LOADING.baseMaxWidth);
            const wB_norm = d.w / Math.max(1e-3, HOLLAND.baseMaxWidth);

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

        // soft diamond renderer with aspect clamp + tip trimming
        function drawSoftDiamond(x, y, w, h, tipCutPct, minAspect, maxAspect) {
          const eps = 1e-3;

          // --- aspect clamp (prevents skinny needles) ---
          let aspect = w / Math.max(h, eps);
          const minA = minAspect ?? 1.6;
          const maxA = maxAspect ?? 8.0;

          if (aspect < minA) {
            w = Math.max(h * minA, w);
          } else if (aspect > maxA) {
            h = Math.max(w / maxA, h);
          }

          const cut = p.constrain(tipCutPct || 0, 0, 0.49);
          const Vtop = { x, y: y - h / 2 };
          const Vright = { x: x + w / 2, y };
          const Vbot = { x, y: y + h / 2 };
          const Vleft = { x: x - w / 2, y };
          const L = (A, B, t) => ({
            x: p.lerp(A.x, B.x, t),
            y: p.lerp(A.y, B.y, t),
          });

          const TL = L(Vtop, Vleft, cut);
          const TR = L(Vtop, Vright, cut);
          const RT = L(Vright, Vtop, cut);
          const RB = L(Vright, Vbot, cut);
          const BR = L(Vbot, Vright, cut);
          const BL = L(Vbot, Vleft, cut);
          const LB = L(Vleft, Vbot, cut);
          const LT = L(Vleft, Vtop, cut);

          p.beginShape();
          p.vertex(TL.x, TL.y);
          p.vertex(TR.x, TR.y);
          p.vertex(RT.x, RT.y);
          p.vertex(RB.x, RB.y);
          p.vertex(BR.x, BR.y);
          p.vertex(BL.x, BL.y);
          p.vertex(LB.x, LB.y);
          p.vertex(LT.x, LT.y);
          p.endShape(p.CLOSE);
        }

        p.draw = () => {
          p.clear();

          // --- global morph timing ---
          const elapsed = p.millis() - t0;
          const morphStart = Math.max(0, T.holdMs - T.overlapMs);
          const morphEnd = morphStart + T.morphMs;

          let prog =
            elapsed > morphStart
              ? easeInOutSine((elapsed - morphStart) / T.morphMs)
              : 0;
          if (elapsed >= morphEnd) prog = 1;

          // baseW slowly shrinks during the initial hold
          const u = easeInOutSine(Math.min(elapsed / T.holdMs, 1));
          const baseW = p.lerp(32, 10, u);

          // animated global max width
          let maxW;
          if (elapsed < morphEnd) {
            maxW = p.lerp(baseW, HOLLAND.endMaxWidth ?? 18, prog);
          } else {
            const post = elapsed - morphEnd;
            if (post <= T.postHoldMs) {
              maxW = HOLLAND.endMaxWidth ?? 18;
            } else if (post <= T.postHoldMs + T.returnMs) {
              const r = easeInOutSine((post - T.postHoldMs) / T.returnMs);
              maxW = p.lerp(
                HOLLAND.endMaxWidth ?? 18,
                HOLLAND.returnMaxWidth ?? 64,
                r
              );
            } else {
              maxW = HOLLAND.returnMaxWidth ?? 64;
              p.noLoop();
              onFinish && onFinish();
            }
          }

          // smoother morph & fat bias
          const t = smoothstep(prog);
          const bell = bell01(t);
          const fatK = HOLLAND.morphFatBias ?? 0.18;

          for (const pr of parts) {
            const x = p.lerp(pr.sx, pr.tx, t);
            const y = p.lerp(pr.sy, pr.ty, t);

            // width morph with mid-morph “fat” so it never pinches
            const wNormA = pr.wA_norm;
            const wNormB = pr.wB_norm;
            let wNorm = p.lerp(wNormA, wNormB, t);
            const maxNorm = Math.max(wNormA, wNormB);
            wNorm = p.lerp(wNorm, Math.max(wNorm, maxNorm), fatK * bell);

            let w = Math.max(wNorm * maxW, HOLLAND.minWidthPx ?? 6);

            // height morph stays modest to keep shapes stout
            let h = p.lerp(
              LOADING.diamondHeight ?? 3.8,
              HOLLAND.diamondHeight ?? 3.2,
              t
            );

            // fill
            if (gradient) {
              const gy = p.constrain(y / p.height, 0, 1);
              p.fill(
                p.lerpColor(p.color("#8c4b99ff"), p.color("#000000ff"), gy)
              );
            } else {
              p.fill("#8e296fff");
            }

            // soft diamond (aspect clamp + trimmed tips)
            drawSoftDiamond(
              x,
              y,
              w,
              h,
              HOLLAND.tipCutPct ?? 0.28,
              HOLLAND.minAspect ?? 1.6,
              HOLLAND.maxAspect ?? 8.0
            );
          }
        };
      };

      p5Ref.current = new p5(sketch, host);
    };

    maybeInit();

    const ro = new ResizeObserver(() => {
      if (p5Ref.current) p5Ref.current.windowResized();
      else maybeInit();
    });
    ro.observe(host);
    roRef.current = ro;

    return () => {
      ro.disconnect();
      if (p5Ref.current) p5Ref.current.remove();
      p5Ref.current = null;
    };
  }, [
    wordA,
    wordB,
    textSizePx,
    gradient,
    fontFamily,
    vBias,
    topPadPct,
    botPadPct,
    gridLoading,
    gridHolland,
    loading,
    holland,
    timings,
    onFinish,
  ]);

  // predictable intrinsic height so subtitle can tuck underneath
  const fixedHeightPx =
    typeof textSizePx === "number" ? Math.round(textSizePx * 1.35) : undefined;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: fixedHeightPx ? `${fixedHeightPx}px` : "auto",
        overflow: "visible",
        background: "transparent",
        ...style,
      }}
    >
      <div
        ref={hostRef}
        style={{ position: "relative", width: "100%", height: "100%" }}
      />
    </div>
  );
}
