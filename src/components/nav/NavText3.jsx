// NavText3.jsx
import React, { useEffect, useRef } from "react";
import p5 from "p5";

/** NavText3 — dense diamond text, canvas height matches text height.
 *  All “look” params are tuned at baselinePx and then scaled by (cssFontPx / baselinePx).
 */
export default function NavText3({
  text = "WORK",

  /** tuned-at-baseline knobs */
  letterSpacing = 0, // px at baselinePx
  rowH = 3, // px at baselinePx
  colW = 12, // px at baselinePx
  subRows = 3, // integer (not scaled)
  diamondH = 2, // px at baselinePx
  maxW = 18, // px at baselinePx

  /** colors/edges */
  topColor = "#ff663e",
  botColor = "#ff663e",
  bgClear = true,
  fadeEdge = 0.15,
  edgeThresh = 0.05,
  stagger = true,

  /** text & layout */
  fontFamily = "Helvetica, Arial, sans-serif",
  centerAlign = true,
  lineGapFrac = 0.22,

  /** sizing mode */
  fitToCssFont = true, // if false, uses fontSizeRatio * height (legacy)
  fontSizeRatio = 0.26,

  /** baseline scaling */
  baselinePx = 60, // 👈 NEW: “design-time” reference, e.g., 60px
  tightPadPx = 0, // px at baselinePx

  className = "",
  style = {},
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);
  const roRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return;

    let w = 2,
      h = 2;
    let pg;
    let FG_TOP, FG_BOT;
    let resizingGuard = 0;

    const sketch = (p) => {
      /** Read width & current CSS font px */
      function readBoxAndFont() {
        const r = hostRef.current.getBoundingClientRect();
        w = Math.max(2, Math.floor(r.width));
        const cs = getComputedStyle(hostRef.current);
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

      /** We’ll inject the scaled letterSpacingPx when we know the scale */
      let letterSpacingPx = letterSpacing;

      function textWidthWithSpacing(str) {
        if (!str) return 0;
        let total = 0;
        for (const ch of str) total += pg.textWidth(ch);
        if (str.length > 1) total += letterSpacingPx * (str.length - 1);
        return total;
      }

      function drawLine(str, y, x0) {
        let x = x0;
        for (const ch of str) {
          pg.text(ch, x, y);
          x += pg.textWidth(ch) + letterSpacingPx;
        }
      }

      /** Given text size ts, compute lines & final height (with scaled padding) */
      function layoutFor(ts, tightPadScaled) {
        pg.textFont(fontFamily);
        pg.textSize(ts);

        const word = String(text);
        const maxLineW = w * 0.92;
        const oneW = textWidthWithSpacing(word);

        let lines = [word];
        if (oneW > maxLineW && word.includes(" ")) {
          const parts = word.trim().split(/\s+/);
          let best = {
            i: Math.floor(parts.length / 2),
            diff: Infinity,
            ok: false,
          };
          for (let i = 1; i < parts.length; i++) {
            const L = parts.slice(0, i).join(" ");
            const R = parts.slice(i).join(" ");
            const lw = textWidthWithSpacing(L);
            const rw = textWidthWithSpacing(R);
            const fits = lw <= maxLineW && rw <= maxLineW;
            const diff = Math.abs(lw - rw);
            if (fits && diff < best.diff) best = { i, diff, ok: true };
          }
          if (best.ok)
            lines = [
              parts.slice(0, best.i).join(" "),
              parts.slice(best.i).join(" "),
            ];
        }

        const lineGap = ts * lineGapFrac;
        const totalTextH = lines.length * ts + (lines.length - 1) * lineGap;
        const desiredH = Math.max(
          2,
          Math.ceil(totalTextH + 2 * tightPadScaled)
        );
        return { lines, ts, lineGap, desiredH };
      }

      function drawMask(lines, ts, lineGap) {
        pg.clear();
        pg.textAlign(p.LEFT, p.CENTER);
        pg.textFont(fontFamily);
        pg.textSize(ts);

        const totalH = lines.length * ts + (lines.length - 1) * lineGap;
        let y = h / 2 - totalH / 2 + ts * 0.65;

        pg.fill(255);
        for (const line of lines) {
          const lw = textWidthWithSpacing(line);
          const x = centerAlign ? w / 2 - lw / 2 : ts * 0.1;
          drawLine(line, y, x);
          y += ts + lineGap;
        }
        pg.loadPixels();
      }

      /** Sampling helpers */
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

      /** Scaled knobs (recomputed whenever size changes) */
      let S = 1; // scale = cssFontPx / baselinePx
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

        // temp height for measuring:
        const tempH = fitToCssFont
          ? Math.ceil(cssFontPx * 1.4)
          : Math.max(
              2,
              Math.floor(hostRef.current.getBoundingClientRect().height)
            );

        ensurePg(w, tempH);

        // choose ts
        const ts = fitToCssFont ? cssFontPx : tempH * fontSizeRatio;

        const { lines, ts: _ts, lineGap, desiredH } = layoutFor(ts, tightPad_s);
        h = desiredH;
        ensurePg(w, h);
        drawMask(lines, _ts, lineGap);
      }

      function maybeResizeToFit() {
        if (!fitToCssFont) return;
        const cssFontPx = readBoxAndFont();
        updateScaledKnobs(cssFontPx);

        const { lines, ts, lineGap, desiredH } = layoutFor(
          cssFontPx,
          tightPad_s
        );

        if (Math.abs(desiredH - h) > 1 && resizingGuard < 2) {
          resizingGuard++;
          h = desiredH;
          ensurePg(w, h);
          drawMask(lines, ts, lineGap);
          resizingGuard--;
        } else {
          drawMask(lines, ts, lineGap);
        }
      }

      p.setup = () => {
        p.createCanvas(2, 2, p.P2D).parent(hostRef.current);
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
        const { lines, ts: _ts, lineGap, desiredH } = layoutFor(ts, tightPad_s);

        if (Math.abs(desiredH - h) > 1) {
          h = desiredH;
          ensurePg(w, h);
        }
        drawMask(lines, _ts, lineGap);
      };
    };

    p5Ref.current = new p5(sketch);

    roRef.current = new ResizeObserver(() => {
      if (p5Ref.current?.windowResized) p5Ref.current.windowResized();
    });
    roRef.current.observe(hostRef.current);

    return () => {
      roRef.current?.disconnect();
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, [
    text,
    /** baseline-tuned knobs */
    letterSpacing,
    rowH,
    colW,
    subRows,
    diamondH,
    maxW,
    /** colors/edges */
    topColor,
    botColor,
    bgClear,
    fadeEdge,
    edgeThresh,
    stagger,
    /** layout */
    fontFamily,
    centerAlign,
    lineGapFrac,
    /** sizing */
    fitToCssFont,
    fontSizeRatio,
    baselinePx,
    tightPadPx,
  ]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        lineHeight: 1,
        ...style,
      }}
      aria-label={text}
      role="img"
    />
  );
}
