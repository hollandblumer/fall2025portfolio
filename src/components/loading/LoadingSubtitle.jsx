// src/components/LoadingSubTitle.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import p5 from "p5";

/** LoadingSubTitle — diamond text with optional per-chunk plain overlays */
export default function LoadingSubTitle({
  text = "is a creative technologist",
  // Example use:
  // mix={[
  //   { text: "is a",               style: "diamond" },
  //   { text: "creative developer", style: "plain"   },
  //   { text: "based in",           style: "diamond" },
  //   { text: "Brooklyn, NY",       style: "plain"   },
  // ]}
  mix = null,

  // diamond-only knobs
  letterSpacing = 0,
  rowH = 3,
  colW = 12,
  subRows = 3,
  diamondH = 2,
  maxW = 18,

  // diamond-only colors/edges
  topColor = "#0c0c0cff",
  botColor = "#070707ff",
  bgClear = true,
  fadeEdge = 0.15,
  edgeThresh = 0.05,
  stagger = true,

  // layout
  fontFamily = "Helvetica, Arial, sans-serif",
  centerAlign = true,
  lineGapFrac = 0.22,

  // sizing
  fitToCssFont = true,
  fontSizeRatio = 0.26,

  // scaling baseline
  baselinePx = 60,
  tightPadPx = 0,

  className = "",
  style = {},
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);
  const roRef = useRef(null);

  // overlay positions for plain chunks
  const [plainSpans, setPlainSpans] = useState([]); // [{text,x,y,ts}]

  // make mix stable for the effect deps
  const mixKey = useMemo(() => JSON.stringify(mix || []), [mix]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let w = 2,
      h = 2;
    let pg;
    let FG_TOP, FG_BOT;
    let resizingGuard = 0;

    // choose chunks
    const chunks =
      Array.isArray(mix) && mix.length
        ? mix.map((c) => ({
            text: String(c.text || ""),
            style: c.style === "plain" ? "plain" : "diamond",
          }))
        : [{ text: String(text), style: "diamond" }];

    const sketch = (p) => {
      function readBoxAndFont() {
        const r = host.getBoundingClientRect();
        w = Math.max(2, Math.floor(r.width));
        const cs = getComputedStyle(host);
        const cssFontPx = parseFloat(cs.fontSize) || 16;
        return cssFontPx;
      }

      function ensurePg(width, height) {
        p.pixelDensity(1);
        p.resizeCanvas(width, height);
        if (pg) pg.remove();
        pg = p.createGraphics(width, height);
        pg.pixelDensity(1);
      }

      let letterSpacingPx = letterSpacing;

      function chunkWidth(c) {
        let total = 0;
        for (const ch of c.text) total += pg.textWidth(ch);
        if (c.text.length > 1) total += letterSpacingPx * (c.text.length - 1);
        return total;
      }

      function drawChunkText(str, y, x0) {
        let x = x0;
        for (const ch of str) {
          pg.text(ch, x, y);
          x += pg.textWidth(ch) + letterSpacingPx;
        }
      }

      function layoutAndMask(ts, tightPadScaled) {
        pg.textFont(fontFamily);
        pg.textSize(ts);

        const spaceW = pg.textWidth(" ");
        const interChunkGap = spaceW;

        const widths = chunks.map((c) => chunkWidth(c));
        let totalW = 0;
        for (let i = 0; i < widths.length; i++) {
          totalW += widths[i];
          if (i < widths.length - 1) totalW += interChunkGap;
        }

        const desiredH = Math.max(2, Math.ceil(ts + 2 * tightPadScaled)); // single line
        h = desiredH;
        ensurePg(w, h);

        const startX = centerAlign ? w / 2 - totalW / 2 : ts * 0.1;

        // draw mask for diamond chunks; collect plain chunk rects
        pg.clear();
        pg.textAlign(p.LEFT, p.CENTER);
        pg.textFont(fontFamily);
        pg.textSize(ts);
        pg.fill(255);

        const newPlainSpans = [];
        let xCursor = startX;
        chunks.forEach((c, idx) => {
          if (c.style === "diamond") {
            drawChunkText(c.text, h / 2, xCursor);
          } else {
            newPlainSpans.push({ text: c.text, x: xCursor, y: h / 2, ts });
          }
          xCursor += widths[idx];
          if (idx < widths.length - 1) xCursor += interChunkGap;
        });

        pg.loadPixels();
        setPlainSpans(newPlainSpans);
      }

      function sampleAlphaMax(x, y) {
        let m = 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const ix = p.constrain(Math.floor(x + ox), 0, w - 1);
            const iy = p.constrain(Math.floor(y + oy), 0, h - 1);
            const idx = (iy * w + ix) * 4 + 3;
            m = Math.max(m, pg.pixels[idx] || 0);
          }
        }
        return m;
      }

      function diamond(cx, cy, ww, hh) {
        p.beginShape();
        p.vertex(cx, cy - hh / 2);
        p.vertex(cx + ww / 2, cy);
        p.vertex(cx, cy + hh / 2);
        p.vertex(cx - ww / 2, cy);
        p.endShape(p.CLOSE);
      }

      // scaled knobs
      let S = 1;
      let rowH_s = rowH,
        colW_s = colW,
        diamondH_s = diamondH,
        maxW_s = maxW,
        tightPad_s = tightPadPx;

      function updateScaledKnobs(cssFontPx) {
        S = Math.max(0.001, cssFontPx / baselinePx);
        rowH_s = rowH * S;
        colW_s = colW * S;
        diamondH_s = diamondH * S;
        maxW_s = maxW * S;
        letterSpacingPx = letterSpacing * S;
        tightPad_s = tightPadPx * S;
      }

      function allocInitial() {
        const cssFontPx = readBoxAndFont();
        updateScaledKnobs(cssFontPx);

        const tempH = fitToCssFont
          ? Math.ceil(cssFontPx * 1.4)
          : Math.max(2, Math.floor(host.getBoundingClientRect().height));
        ensurePg(w, tempH);

        const ts = fitToCssFont ? cssFontPx : tempH * fontSizeRatio;
        layoutAndMask(ts, tightPad_s);
      }

      function maybeResizeToFit() {
        if (!fitToCssFont) return;
        const cssFontPx = readBoxAndFont();
        updateScaledKnobs(cssFontPx);
        layoutAndMask(cssFontPx, tightPad_s);
      }

      p.setup = () => {
        p.createCanvas(2, 2).parent(host);
        p.noStroke();
        FG_TOP = p.color(topColor);
        FG_BOT = p.color(botColor);
        allocInitial();
        setTimeout(maybeResizeToFit, 0);
      };

      p.draw = () => {
        if (!pg) return;
        if (bgClear) p.clear();
        else p.background(0, 0);

        for (let yy = rowH_s * 0.5; yy < h; yy += rowH_s) {
          const xOff =
            stagger && Math.floor(yy / rowH_s) % 2 === 1 ? colW_s * 0.5 : 0;

          for (let r = 0; r < subRows; r++) {
            const ry = yy + (r - (subRows - 1) / 2) * (diamondH_s * 0.7);
            const gy = Math.min(Math.max(ry / h, 0), 1);
            p.fill(p.lerpColor(FG_TOP, FG_BOT, gy));

            for (let xx = xOff + colW_s * 0.5; xx < w; xx += colW_s) {
              const a = sampleAlphaMax(xx, ry);
              const t = a / 255;
              if (t < edgeThresh) continue;

              const aL = sampleAlphaMax(xx - colW_s * 0.4, ry);
              const aR = sampleAlphaMax(xx + colW_s * 0.4, ry);
              const edgeFactor =
                1 -
                (fadeEdge * (Math.abs(a - aL) + Math.abs(a - aR))) / (255 * 2);

              const ww = p.lerp(0, maxW_s, t) * Math.max(0, edgeFactor);
              if (ww > 0.35) diamond(xx, ry, ww, diamondH_s);
            }
          }
        }
      };

      p.windowResized = () => {
        const cssFontPx = readBoxAndFont();
        updateScaledKnobs(cssFontPx);
        ensurePg(w, Math.max(h, 2));
        const ts = fitToCssFont ? cssFontPx : h * fontSizeRatio;
        layoutAndMask(ts, tightPad_s);
      };
    };

    p5Ref.current = new p5(sketch);

    roRef.current = new ResizeObserver(() => {
      if (p5Ref.current?.windowResized) p5Ref.current.windowResized();
    });
    roRef.current.observe(host);

    return () => {
      roRef.current?.disconnect();
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, [
    text,
    mixKey,
    letterSpacing,
    rowH,
    colW,
    subRows,
    diamondH,
    maxW,
    topColor,
    botColor,
    bgClear,
    fadeEdge,
    edgeThresh,
    stagger,
    fontFamily,
    centerAlign,
    lineGapFrac,
    fitToCssFont,
    fontSizeRatio,
    baselinePx,
    tightPadPx,
  ]);

  const aria =
    Array.isArray(mix) && mix.length ? mix.map((c) => c.text).join(" ") : text;

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ position: "relative", width: "100%", lineHeight: 1, ...style }}
      role="img"
      aria-label={aria}
    >
      {/* overlay plain spans */}
      {plainSpans.map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${s.x}px`,
            top: `${s.y - s.ts * 0.65}px`, // align to p5 baseline
            fontFamily,
            // When fitToCssFont is true, we let CSS control font-size.
            // Otherwise we lock to computed ts px:
            fontSize: fitToCssFont ? undefined : `${s.ts}px`,
            lineHeight: 1.2,
            whiteSpace: "pre",
            pointerEvents: "auto",
          }}
        >
          {s.text}
        </span>
      ))}
    </div>
  );
}
