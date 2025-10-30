// LoadingWords.jsx
import { useEffect, useRef } from "react";
import p5 from "p5";

export default function LoadingWords({
  text = "is a creative technologist",

  // lattice (LOGICAL units; independent of the DOM box)
  rowH = 2,
  colW = 9,
  subRows = 3,
  diamondH = 1.2,
  maxW: maxWProp,
  MAX_W: MAX_WProp,
  stagger = true,

  // edge detection
  edgeThresh = 0.06,
  fadeEdge = 0.15,

  // typography + fitting (performed in LOGICAL space)
  fontFamily = "Helvetica, Arial, sans-serif",
  startFsFrac = 0.26, // fraction of logicalHeight
  fitMargin = 0.92, // target width fraction (of logicalWidth)
  fsMaxPx, // optional hard cap on font size in px (logical)

  // visual
  fillSolid = "#242222ff",
  backgroundClear = true,

  // logical canvas (decouples visuals from DOM)
  logicalWidth = 1000,
  logicalHeight = 260,
  maintainAspect = true, // letterbox if wrapper aspect differs
  contentPadding = 0, // logical padding on all sides

  // wrapper behavior
  maxCanvasScale = 1.0, // just caps the actual pixel canvas to wrapper size
  className,
  style,
}) {
  const maxW = maxWProp ?? MAX_WProp ?? 8; // diamond width in logical units

  const wrapRef = useRef(null);
  const p5Ref = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let ro;

    const sketch = (p) => {
      // actual pixel canvas
      let cw = 300,
        ch = 150;

      // offscreen buffer in LOGICAL resolution
      let pg; // p5.Graphics @ (LW x LH)
      const LW = Math.max(1, Math.floor(logicalWidth));
      const LH = Math.max(1, Math.floor(logicalHeight));
      const PAD = Math.max(0, contentPadding);

      // compute scale/letterbox from actual canvas to logical space
      const beginLogicalSpace = () => {
        const sx = cw / LW;
        const sy = ch / LH;
        if (maintainAspect) {
          const s = Math.min(sx, sy);
          const ox = (cw - LW * s) * 0.5;
          const oy = (ch - LH * s) * 0.5;
          p.translate(ox, oy);
          p.scale(s, s);
        } else {
          p.scale(sx, sy);
        }
      };

      const drawTextToBuffer = (buf, str) => {
        buf.clear();
        buf.textAlign(p.CENTER, p.CENTER);
        // Use CSS font on canvas; p5 will pass the string to ctx.font
        buf.textFont(fontFamily);

        // Start with a fraction of LOGICAL height
        let fs = LH * startFsFrac;
        if (typeof fsMaxPx === "number") fs = Math.min(fs, fsMaxPx);

        buf.textSize(fs);
        // fit text width to LOGICAL width minus padding
        const targetW = (LW - PAD * 2) * fitMargin;
        while (buf.textWidth(str) > targetW && fs > 4) {
          fs *= 0.96;
          if (typeof fsMaxPx === "number") fs = Math.min(fs, fsMaxPx);
          buf.textSize(fs);
        }

        const y = LH / 2 + fs * 0.12;
        buf.fill(255);
        buf.noStroke();
        buf.text(str, LW / 2, y);
        buf.loadPixels();
      };

      const sizeToWrapper = () => {
        if (!wrapRef.current) return;
        const rect = wrapRef.current.getBoundingClientRect();
        cw = Math.max(1, Math.floor(rect.width * maxCanvasScale));
        ch = Math.max(1, Math.floor(rect.height * maxCanvasScale));
        if (p.width !== cw || p.height !== ch) {
          p.resizeCanvas(cw, ch, true);
        }
      };

      const sampleAlphaMax = (g, x, y) => {
        // x,y are in LOGICAL coords
        let m = 0;
        // small neighborhood for a cleaner edge
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const ix = p.constrain((x | 0) + ox, 0, LW - 1);
            const iy = p.constrain((y | 0) + oy, 0, LH - 1);
            const idx = (iy * LW + ix) * 4 + 3;
            m = Math.max(m, g.pixels[idx] || 0);
          }
        }
        return m; // 0..255
      };

      const diamond = (cx, cy, w, h) => {
        p.beginShape();
        p.vertex(cx, cy - h / 2);
        p.vertex(cx + w / 2, cy);
        p.vertex(cx, cy + h / 2);
        p.vertex(cx - w / 2, cy);
        p.endShape(p.CLOSE);
      };

      p.setup = () => {
        // initial pixel canvas matches wrapper
        const rect = wrapRef.current?.getBoundingClientRect();
        if (rect) {
          cw = Math.max(1, Math.floor(rect.width * maxCanvasScale));
          ch = Math.max(1, Math.floor(rect.height * maxCanvasScale));
        }
        p.createCanvas(cw, ch);
        p.pixelDensity(1);

        // create logical buffer ONCE at fixed resolution
        pg = p.createGraphics(LW, LH);
        pg.pixelDensity(1);
        drawTextToBuffer(pg, text);

        if (wrapRef.current && "ResizeObserver" in window) {
          ro = new ResizeObserver(sizeToWrapper);
          ro.observe(wrapRef.current);
        }
      };

      p.draw = () => {
        if (backgroundClear) p.clear();

        p.noStroke();
        p.fill(fillSolid);

        // draw in logical space (stable coords)
        p.push();
        beginLogicalSpace();

        // background letterbox in case you want a color (optional)
        // p.noStroke(); p.fill(0,0,0,0); p.rect(0,0,LW,LH);

        // lattice bounds (respect padding)
        const minX = PAD;
        const maxX = LW - PAD;
        const minY = PAD;
        const maxY = LH - PAD;

        for (let y = minY + rowH * 0.5; y < maxY; y += rowH) {
          const offset = stagger && ((y / rowH) | 0) % 2 === 1 ? colW * 0.5 : 0;

          for (let r = 0; r < subRows; r++) {
            const ry = y + (r - (subRows - 1) / 2) * (diamondH * 0.7);
            if (ry < minY || ry > maxY) continue;

            for (let x = minX + offset + colW * 0.5; x < maxX; x += colW) {
              const a = sampleAlphaMax(pg, x, ry) / 255;
              if (a < edgeThresh) continue;

              const aL = sampleAlphaMax(pg, x - colW * 0.4, ry) / 255;
              const aR = sampleAlphaMax(pg, x + colW * 0.4, ry) / 255;
              const edgeFactor =
                1 - (fadeEdge * (Math.abs(a - aL) + Math.abs(a - aR))) / 2;

              const w = maxW * a * Math.max(0, edgeFactor);
              if (w > 0.35) diamond(x, ry, w, diamondH);
            }
          }
        }

        p.pop();
      };

      p.windowResized = sizeToWrapper;

      const originalRemove = p.remove.bind(p);
      p.remove = () => {
        try {
          ro?.disconnect();
        } catch {}
        originalRemove();
      };
    };

    const inst = new p5(sketch, wrapRef.current);
    p5Ref.current = inst;

    return () => {
      p5Ref.current?.remove();
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
    startFsFrac,
    fitMargin,
    fsMaxPx,
    fillSolid,
    backgroundClear,
    logicalWidth,
    logicalHeight,
    maintainAspect,
    contentPadding,
    maxCanvasScale,
  ]);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%", // parent should give a real height (e.g., 18vh)
        overflow: "hidden",
        ...style,
      }}
    />
  );
}
