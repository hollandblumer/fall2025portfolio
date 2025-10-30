import { useEffect, useRef } from "react";
import p5 from "p5";

export default function DiamondTitle({
  text = "WORK",

  // Base “design-time” parameters (tuned at baselinePx).
  rowH = 2,
  colW = 9,
  subRows = 3,
  diamondH = 1.7,
  maxW = 8,
  stagger = true,

  edgeThresh = 0.1,
  fadeEdge = 0.15,

  fontFamily = "Outfit, Helvetica, Arial, sans-serif",
  letterSpacing = 0, // unitless (multiplied by fontPx)
  fontPx, // actual font size you want (e.g., 50)
  baselinePx = 50, // the size these knobs were tuned for (keep 50)

  useGradient = false,
  fillTop = "#DBD7BD",
  fillBot = "#B88E68",
  fillSolid = "#242222",

  className,
  style,
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);
  const roRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return;

    let w = 2,
      h = 2;
    let pg = null;
    let ready = false;
    let FG_TOP, FG_BOT;

    const sketch = (p) => {
      p.setup = () => {
        p.pixelDensity(1);
        p.createCanvas(2, 2); // resize after measuring
        p.noLoop();

        FG_TOP = p.color(fillTop);
        FG_BOT = p.color(fillBot);

        pg = p.createGraphics(2, 2);
        pg.pixelDensity(1);

        ready = true;
        renderAll();

        roRef.current = new ResizeObserver(renderAll);
        roRef.current.observe(hostRef.current);
        window.addEventListener("resize", renderAll);
      };

      function getFontPx() {
        if (typeof fontPx === "number" && fontPx > 0) return fontPx;
        const cs = getComputedStyle(hostRef.current);
        const px = parseFloat(cs.fontSize || "16");
        return Number.isFinite(px) ? px : 16;
      }

      function measureAndPrepare(str) {
        if (!pg)
          return {
            fs: 16,
            ascent: 0,
            descent: 0,
            PAD_X: 0,
            PAD_Y: 0,
            tracking: 0,
          };

        const fs = getFontPx();
        pg.textFont(fontFamily);
        pg.textSize(fs);

        const ascent = pg.textAscent();
        const descent = pg.textDescent();
        const textH = ascent + descent;

        const tracking = fs * (letterSpacing || 0);

        let totalW = 0;
        for (let i = 0; i < str.length; i++) {
          totalW += pg.textWidth(str[i]);
          if (i < str.length - 1) totalW += tracking;
        }

        // padding scales with font size
        const PAD_X = Math.ceil(fs * 0.35);
        const PAD_Y = Math.ceil(fs * 0.35);

        const canvasW = Math.max(2, Math.ceil(totalW + PAD_X * 2));
        const canvasH = Math.max(2, Math.ceil(textH + PAD_Y * 2));

        if (w !== canvasW || h !== canvasH) {
          w = canvasW;
          h = canvasH;
          p.resizeCanvas(w, h);
          pg = p.createGraphics(w, h);
          pg.pixelDensity(1);
          pg.textFont(fontFamily);
          pg.textSize(fs);
        }

        return { fs, ascent, descent, PAD_X, PAD_Y, tracking };
      }

      function drawTextToBuffer(str, metr) {
        if (!pg) return;
        const { ascent, PAD_X, PAD_Y, tracking } = metr;

        pg.clear();
        pg.textAlign(pg.LEFT, pg.BASELINE);
        pg.fill(255);

        const baselineY = PAD_Y + ascent;

        let x = PAD_X;
        for (let i = 0; i < str.length; i++) {
          const ch = str[i];
          pg.text(ch, x, baselineY);
          x += pg.textWidth(ch);
          if (i < str.length - 1) x += tracking;
        }
        pg.loadPixels();
      }

      function sampleAlphaMax(x, y) {
        if (!pg) return 0;
        let m = 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const ix = p.constrain((x | 0) + ox, 0, w - 1);
            const iy = p.constrain((y | 0) + oy, 0, h - 1);
            const idx = (iy * w + ix) * 4 + 3;
            const a = pg.pixels?.[idx] ?? 0;
            m = Math.max(m, a);
          }
        }
        return m;
      }

      function diamond(cx, cy, dw, dh) {
        p.beginShape();
        p.vertex(cx, cy - dh / 2);
        p.vertex(cx + dw / 2, cy);
        p.vertex(cx, cy + dh / 2);
        p.vertex(cx - dw / 2, cy);
        p.endShape(p.CLOSE);
      }

      function drawDiamonds(metr) {
        const fs = metr.fs;
        const s = fs / baselinePx; // global scale factor

        // scale every layout knob against design baseline
        const ROW_H = rowH * s;
        const COL_W = colW * s;
        const SUB_ROWS = subRows;
        const DIAMOND_H = diamondH * s;
        const MAX_W = maxW * s;

        p.clear();
        p.noStroke();

        for (let y = ROW_H * 0.5; y < h; y += ROW_H) {
          const rowIndex = (y / ROW_H) | 0;
          const offset = stagger && rowIndex % 2 === 1 ? COL_W * 0.5 : 0;

          for (let r = 0; r < SUB_ROWS; r++) {
            const ry = y + (r - (SUB_ROWS - 1) / 2) * (DIAMOND_H * 0.7);

            for (let x = offset + COL_W * 0.5; x < w; x += COL_W) {
              const a = sampleAlphaMax(x, ry) / 255;
              if (a < edgeThresh) continue;

              const aL = sampleAlphaMax(x - COL_W * 0.4, ry) / 255;
              const aR = sampleAlphaMax(x + COL_W * 0.4, ry) / 255;
              const edgeFactor =
                1 - (fadeEdge * (Math.abs(a - aL) + Math.abs(a - aR))) / 2;

              const dw = MAX_W * a * Math.max(0, edgeFactor);
              if (dw > 0.35 * s) {
                // threshold scales too
                if (useGradient) {
                  const gy = Math.max(0, Math.min(1, ry / h));
                  p.fill(p.lerpColor(FG_TOP, FG_BOT, gy));
                } else {
                  p.fill(fillSolid);
                }
                diamond(x, ry, dw, DIAMOND_H);
              }
            }
          }
        }
      }

      function renderAll() {
        if (!ready || !pg) return;
        const metr = measureAndPrepare(text);
        drawTextToBuffer(text, metr);
        drawDiamonds(metr);
      }

      p.updateWithProps = () => renderAll();

      p.cleanup = () => {
        roRef.current?.disconnect?.();
        window.removeEventListener("resize", renderAll);
      };
    };

    p5Ref.current = new p5(sketch, hostRef.current);

    return () => {
      try {
        p5Ref.current?.cleanup?.();
      } catch {}
      try {
        p5Ref.current?.remove?.();
      } catch {}
      p5Ref.current = null;
    };
  }, [
    text,
    rowH,
    colW,
    subRows,
    diamondH,
    maxW,
    stagger,
    edgeThresh,
    fadeEdge,
    fontFamily,
    letterSpacing,
    fontPx,
    baselinePx,
    useGradient,
    fillTop,
    fillBot,
    fillSolid,
  ]);

  useEffect(() => {
    p5Ref.current?.updateWithProps?.();
  });

  return (
    <span
      ref={hostRef}
      className={className}
      style={{
        display: "inline-block",
        lineHeight: 0,
        ...style,
      }}
      aria-label={text}
    />
  );
}
