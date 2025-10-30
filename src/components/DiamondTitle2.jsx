import { useEffect, useRef } from "react";
import p5 from "p5";

export default function DiamondTitle2({
  text = "WORK",

  rowH = 2,
  colW = 3,
  subRows = 2,
  diamondH = 1.2,
  maxW = 8,
  stagger = true,

  edgeThresh = 0.06,
  fadeEdge = 0.15,

  fontFamily = "Outfit, Helvetica, Arial, sans-serif",
  startFsFrac = 0.32,
  fitMargin = 0.92,

  useGradient = false,
  fillTop = "#DBD7BD",
  fillBot = "#B88E68",
  fillSolid = "#242222",
  letterSpacing = 0,
  className,
  style,
  fitToLineHeight = true,
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return;

    let w = 2,
      h = 2,
      dpr = Math.max(1, window.devicePixelRatio || 1);
    let pg = null;
    let FG_TOP, FG_BOT;
    let ready = false;
    let ro;
    let maxWLive = maxW;

    const getBox = () => {
      const el = hostRef.current;
      if (!el) return { w: 2, h: 2 };

      const cw = Math.max(2, el.clientWidth);
      const cs = getComputedStyle(el);
      let lh = cs.lineHeight;

      if (fitToLineHeight) {
        if (lh === "normal") {
          const fs = parseFloat(cs.fontSize) || 16;
          lh = `${1.2 * fs}px`;
        }
        const hp = parseFloat(lh) || el.clientHeight || 2;
        return { w: cw, h: Math.max(2, Math.round(hp)) };
      }

      return { w: cw, h: Math.max(2, el.clientHeight || 2) };
    };

    const sketch = (p) => {
      p.setup = () => {
        const b = getBox();
        w = b.w;
        h = b.h;
        dpr = Math.max(1, window.devicePixelRatio || 1);

        const c = p.createCanvas(w, h);
        p.pixelDensity(1);
        c.elt.width = Math.round(w * dpr);
        c.elt.height = Math.round(h * dpr);
        c.elt.style.width = `${w}px`;
        c.elt.style.height = `${h}px`;
        p.drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0);

        p.noLoop();
        FG_TOP = p.color(fillTop);
        FG_BOT = p.color(fillBot);
        pg = p.createGraphics(Math.round(w * dpr), Math.round(h * dpr));
        pg.pixelDensity(1);
        pg.drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0);
        ready = true;
        renderAll({ text });

        ro = new ResizeObserver(() => {
          if (!hostRef.current) return;
          const b2 = getBox();
          if (b2.w === w && b2.h === h) return;
          w = b2.w;
          h = b2.h;

          p.resizeCanvas(w, h);
          p.canvas.width = Math.round(w * dpr);
          p.canvas.height = Math.round(h * dpr);
          p.canvas.style.width = `${w}px`;
          p.canvas.style.height = `${h}px`;
          p.drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0);
          pg = p.createGraphics(Math.round(w * dpr), Math.round(h * dpr));
          pg.pixelDensity(1);
          pg.drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0);
          renderAll({ text });
        });
        ro.observe(hostRef.current);
      };

      function drawTextToBuffer(str) {
        if (!pg) return;
        pg.clear();
        pg.textAlign(pg.LEFT, pg.CENTER);
        pg.textFont(fontFamily);
        let fs = h * startFsFrac;
        pg.textSize(fs);
        const tracking = fs * letterSpacing;
        const widthWithTracking = (s) =>
          pg.textWidth(s) + Math.max(0, s.length - 1) * tracking;
        while (widthWithTracking(str) > w * fitMargin && fs > 4) {
          fs *= 0.96;
          pg.textSize(fs);
        }
        const ascent = pg.textAscent();
        const descent = pg.textDescent();
        const textHeight = ascent + descent;
        const baselineOffset = textHeight / 2 - descent;
        const cy = h / 2 + baselineOffset * 0.1;
        const totalWidth = widthWithTracking(str);
        let x = 0;
        pg.fill(255);
        for (let ch of str) {
          pg.text(ch, x, cy);
          x += pg.textWidth(ch) + tracking;
        }
        pg.loadPixels();
      }

      function sampleAlphaMax(x, y) {
        if (!pg) return 0;
        const ix = Math.max(0, Math.min(Math.round(x * dpr), pg.width - 1));
        const iy = Math.max(0, Math.min(Math.round(y * dpr), pg.height - 1));
        let m = 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const jx = Math.max(0, Math.min(ix + ox, pg.width - 1));
            const jy = Math.max(0, Math.min(iy + oy, pg.height - 1));
            const idx = (jy * pg.width + jx) * 4 + 3;
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

      function drawDiamonds() {
        p.clear();
        p.noStroke();
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;
        const pts = [];
        for (let y = rowH * 0.5; y < h; y += rowH) {
          const rowIndex = (y / rowH) | 0;
          const offset = stagger && rowIndex % 2 === 1 ? colW * 0.5 : 0;
          for (let r = 0; r < subRows; r++) {
            const ry = y + (r - (subRows - 1)) * 0.5 * (diamondH * 0.7);
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
        const leftInset = 0;
        const dx = isFinite(minX) ? leftInset - minX : 0;
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

      function renderAll({ text: t }) {
        if (!ready || !pg) return;
        drawTextToBuffer(t);
        drawDiamonds();
      }

      p.updateWithProps = (props) => {
        if (!ready) return;
        if (props?.maxW !== undefined) maxWLive = props.maxW;
        renderAll({ text: props?.text ?? text });
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
    fitToLineHeight,
    startFsFrac,
    fitMargin,
    fillTop,
    fillBot,
    fillSolid,
    useGradient,
    edgeThresh,
    fadeEdge,
    rowH,
    colW,
    subRows,
    diamondH,
    stagger,
    fontFamily,
    letterSpacing,
  ]);

  useEffect(() => {
    p5Ref.current?.updateWithProps?.({ text, maxW });
  }, [text, maxW]);

  return (
    <span
      ref={hostRef}
      className={className}
      style={{
        display: "inline-block", // behaves like inline text
        height: "1em", // fits line-height
        verticalAlign: "baseline",
        position: "relative",
        margin: 0, // removes outer margin
        textAlign: "left", // aligns left within parent
        ...style,
      }}
      aria-label={text}
    />
  );
}
