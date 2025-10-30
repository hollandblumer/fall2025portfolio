// DiamondTitleFluctuate.jsx
import { useEffect, useRef } from "react";
import p5 from "p5";

export default function DiamondTitleFluctuate({
  text = "WORK",

  // lattice
  rowH = 2,
  colW = 9,
  subRows = 3,
  diamondH = 1.2,
  stagger = true,

  // edge feel
  edgeThresh = 0.06,
  fadeEdge = 0.15,

  // sizing / fitting
  fontFamily = "Outfit, Helvetica, Arial, sans-serif",
  startFsFrac = 0.32,
  fitMargin = 0.92,
  letterSpacing = 0.02,

  // color
  useGradient = false,
  fillTop = "#DBD7BD",
  fillBot = "#B88E68",
  fillSolid = "#242222",

  // fluctuation controls
  minW = 3,
  maxW = 9,
  periodSec = 3.0,
  holdMs = 160,

  className,
  style,
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return;

    let w = 2,
      h = 2;
    let pg = null;
    let FG_TOP, FG_BOT;
    let ready = false;
    let ro;

    let lastHoldSide = -1; // -1 none, 0=min, 1=max
    let holdUntil = 0;

    const sketch = (p) => {
      p.setup = () => {
        const { clientWidth, clientHeight } = hostRef.current;
        w = Math.max(2, clientWidth);
        h = Math.max(2, clientHeight);

        p.pixelDensity(1);
        p.createCanvas(w, h);
        p.noStroke();

        FG_TOP = p.color(fillTop);
        FG_BOT = p.color(fillBot);

        pg = p.createGraphics(w, h);
        pg.pixelDensity(1);

        ready = true;
        drawTextToBuffer(text);

        ro = new ResizeObserver(() => {
          if (!hostRef.current) return;
          const nw = Math.max(2, hostRef.current.clientWidth);
          const nh = Math.max(2, hostRef.current.clientHeight);
          if (nw === w && nh === h) return;
          w = nw;
          h = nh;
          p.resizeCanvas(w, h);
          pg = p.createGraphics(w, h);
          pg.pixelDensity(1);
          drawTextToBuffer(text);
        });
        ro.observe(hostRef.current);

        p.frameRate(60);
      };

      function drawTextToBuffer(str) {
        if (!pg) return;
        pg.clear();
        pg.textAlign(pg.LEFT, pg.CENTER);
        pg.textFont(fontFamily);

        let fs = h * startFsFrac;
        pg.textSize(fs);
        while (pg.textWidth(str) > w * fitMargin && fs > 4) {
          fs *= 0.96;
          pg.textSize(fs);
        }

        const ascent = pg.textAscent();
        const descent = pg.textDescent();
        const textHeight = ascent + descent;
        const baselineOffset = textHeight / 2 - descent;
        const cy = h / 2 + baselineOffset * 0.1;

        const trackingPx = fs * letterSpacing;
        const totalWidth = pg.textWidth(str) + trackingPx * (str.length - 1);
        let x = (w - totalWidth) / 2;

        pg.fill(255);
        for (let ch of str) {
          pg.text(ch, x, cy);
          x += pg.textWidth(ch) + trackingPx;
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

      function easeInOutSine(t) {
        return 0.5 - 0.5 * Math.cos(Math.PI * t);
      }

      function triangle01(t) {
        return 1 - Math.abs(2 * t - 1);
      }

      function currentMaxW(nowMs) {
        const cycleMs = Math.max(100, periodSec * 1000);
        let t = (nowMs % cycleMs) / cycleMs;
        const tri = triangle01(t);
        const eased = easeInOutSine(tri);
        let value = p.lerp(minW, maxW, eased);

        const side = tri < 0.001 ? 0 : tri > 0.999 ? 1 : -1;
        if (side !== -1 && side !== lastHoldSide) {
          holdUntil = nowMs + holdMs;
          lastHoldSide = side;
        }
        if (nowMs < holdUntil) {
          value = lastHoldSide === 0 ? minW : maxW;
        }
        return value;
      }

      function drawDiamonds(maxWLive) {
        p.clear();

        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;
        const pts = [];

        for (let y = rowH * 0.5; y < h; y += rowH) {
          const rowIndex = (y / rowH) | 0;
          const offset = stagger && rowIndex % 2 === 1 ? colW * 0.5 : 0;

          for (let r = 0; r < subRows; r++) {
            const ry = y + (r - (subRows - 1) / 2) * (diamondH * 0.7);

            for (let x = offset + colW * 0.5; x < w; x += colW) {
              const a = sampleAlphaMax(x, ry) / 255;
              if (a < edgeThresh) continue;

              const aL = sampleAlphaMax(x - colW * 0.4, ry) / 255;
              const aR = sampleAlphaMax(x + colW * 0.4, ry) / 255;
              const edgeFactor =
                1 - (fadeEdge * (Math.abs(a - aL) + Math.abs(a - aR))) / 2;

              const dw = maxWLive * a * Math.max(0, edgeFactor);
              if (dw > 0.35) {
                pts.push({ x, ry, dw });
                minX = Math.min(minX, x - dw / 2);
                maxX = Math.max(maxX, x + dw / 2);
                minY = Math.min(minY, ry - diamondH / 2);
                maxY = Math.max(maxY, ry + diamondH / 2);
              }
            }
          }
        }

        const dx = isFinite(minX) ? w / 2 - (minX + (maxX - minX) / 2) : 0;
        const dy = isFinite(minY) ? h / 2 - (minY + (maxY - minY) / 2) : 0;

        for (const d of pts) {
          if (useGradient) {
            const gy = Math.max(0, Math.min(1, d.ry / h));
            p.fill(p.lerpColor(FG_TOP, FG_BOT, gy));
          } else {
            p.fill(fillSolid);
          }
          diamond(d.x + dx, d.ry + dy, d.dw, diamondH);
        }
      }

      function renderAll(nowMs) {
        if (!ready || !pg) return;
        const wNow = currentMaxW(nowMs);
        drawDiamonds(wNow);
      }

      p.draw = () => {
        renderAll(p.millis());
      };

      p.updateWithProps = (props) => {
        if (!ready) return;
        if (props?.text !== undefined) {
          drawTextToBuffer(props.text);
        }
      };

      p.cleanup = () => {
        ro?.disconnect();
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
    stagger,
    edgeThresh,
    fadeEdge,
    fontFamily,
    startFsFrac,
    fitMargin,
    letterSpacing,
    useGradient,
    fillTop,
    fillBot,
    fillSolid,
    minW,
    maxW,
    periodSec,
    holdMs,
  ]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "160px",
        ...style,
      }}
      aria-label={text}
    />
  );
}
