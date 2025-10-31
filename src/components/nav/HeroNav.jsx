// src/components/HeroNavText.jsx
import React, { useEffect, useRef } from "react";

/**
 * HeroNavText — canvas-based “dense diamond fill inside text mask”.
 * p5-free (so it won’t collide with your p5+THREE hero background).
 *
 * To keep the exact 60px-baseline look, we DO NOT scale inside the math.
 * If you want it bigger, wrap the canvas and apply CSS transform: scale(...)
 * on the wrapper (see CSS snippet after the component).
 */
export default function HeroNavText({
  text = "ABOUT",

  /** tuned-at-baseline knobs (baselinePx=60 is the design truth) */
  letterSpacing = 10, // px @ baselinePx
  rowH = 3, // px @ baselinePx
  colW = 12, // px @ baselinePx
  subRows = 3, // integer
  diamondH = 2, // px @ baselinePx
  maxW = 18, // px @ baselinePx

  /** colors/edges */
  topColor = "#000000ff",
  botColor = "#403326",
  bgClear = true,
  fadeEdge = 0.15,
  edgeThresh = 0.05,
  stagger = true,

  /** text & layout */
  fontFamily = "Helvetica, Arial, sans-serif",
  centerAlign = true,
  lineGapFrac = 0.22,

  /** sizing mode parity with NavText3 */
  fitToCssFont = true, // if false, uses fontSizeRatio * host height
  fontSizeRatio = 0.26,
  baselinePx = 40, // ← keep this at 60 to preserve look
  tightPadPx = 30, // px @ baselinePx

  /** std React */
  className = "",
  style = {},
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const maskRef = useRef(null); // offscreen mask <canvas>

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const maskCanvas = (maskRef.current ||= document.createElement("canvas"));
    const mctx = maskCanvas.getContext("2d", { willReadFrequently: true });

    let resizeObs;

    function lerpColorHex(a, b, t) {
      const ah = +("0x" + a.replace("#", ""));
      const bh = +("0x" + b.replace("#", ""));
      const ar = (ah >> 16) & 0xff,
        ag = (ah >> 8) & 0xff,
        ab = ah & 0xff;
      const br = (bh >> 16) & 0xff,
        bg = (bh >> 8) & 0xff,
        bb = bh & 0xff;
      const rr = Math.round(ar + (br - ar) * t);
      const rg = Math.round(ag + (bg - ag) * t);
      const rb = Math.round(ab + (bb - ab) * t);
      return `rgb(${rr},${rg},${rb})`;
    }

    function readBoxAndFont() {
      const r = host.getBoundingClientRect();
      const w = Math.max(2, Math.floor(r.width));
      const cs = getComputedStyle(host);
      const cssFontPx = parseFloat(cs.fontSize) || 16;
      return { w, cssFontPx };
    }

    // NO external scale here — keep math faithful to baseline=60.
    function measureAndLayout(w, cssFontPxInput) {
      // Scale factor vs baseline (this is NOT a visual scale; it’s the
      // canonical mapping from “design at 60px” to current CSS font pixels)
      const S = Math.max(0.001, cssFontPxInput / baselinePx);

      // All baseline-tuned knobs scale by S
      const rowH_s = rowH * S;
      const colW_s = colW * S;
      const diamondH_s = diamondH * S;
      const maxW_s = maxW * S;
      const letterSpacingPx = letterSpacing * S;
      const tightPad_s = tightPadPx * S;

      // Choose the mask text size (ts)
      const ts = fitToCssFont
        ? cssFontPxInput
        : Math.max(2, Math.floor(host.getBoundingClientRect().height)) *
          fontSizeRatio;

      // Prepare to measure text widths on the mask context
      mctx.setTransform(1, 0, 0, 1, 0, 0);
      mctx.font = `${ts}px ${fontFamily}`;
      mctx.textBaseline = "alphabetic";

      const widthWithSpacing = (str) => {
        let tot = 0;
        for (const ch of str) tot += mctx.measureText(ch).width;
        if (str.length > 1) tot += letterSpacingPx * (str.length - 1);
        return tot;
      };

      const word = String(text);
      const maxLineW = w * 0.92;
      const oneW = widthWithSpacing(word);

      // Optional 2-line split if a space exists and single line would overflow
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
          const lw = widthWithSpacing(L);
          const rw = widthWithSpacing(R);
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
      const desiredH = Math.max(2, Math.ceil(totalTextH + 2 * tightPad_s));

      return {
        // scale
        S,
        ts,

        // scaled knobs
        rowH_s,
        colW_s,
        diamondH_s,
        maxW_s,
        letterSpacingPx,
        tightPad_s,

        // layout
        lineGap,
        lines,
        desiredH,
      };
    }

    function drawMask(w, h, layout) {
      const { ts, lineGap, lines, letterSpacingPx } = layout;

      maskCanvas.width = Math.max(2, Math.floor(w * dpr));
      maskCanvas.height = Math.max(2, Math.floor(h * dpr));
      mctx.setTransform(1, 0, 0, 1, 0, 0);
      mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

      mctx.scale(dpr, dpr);
      mctx.font = `${ts}px ${fontFamily}`;
      mctx.textBaseline = "alphabetic";
      mctx.fillStyle = "#fff";

      const totalH = lines.length * ts + (lines.length - 1) * lineGap;
      let y = h / 2 - totalH / 2 + ts * 0.65;

      const widthWithSpacing = (str) => {
        let tot = 0;
        for (const ch of str) tot += mctx.measureText(ch).width;
        if (str.length > 1) tot += letterSpacingPx * (str.length - 1);
        return tot;
      };

      const drawLine = (str, y0, x0) => {
        let x = x0;
        for (const ch of str) {
          mctx.fillText(ch, x, y0);
          x += mctx.measureText(ch).width + letterSpacingPx;
        }
      };

      for (const line of lines) {
        const lw = widthWithSpacing(line);
        const x = centerAlign ? w / 2 - lw / 2 : ts * 0.1;
        drawLine(line, y, x);
        y += ts + lineGap;
      }
    }

    // sample α max in a 3×3 box for a slightly thicker mask edge
    function sampleAlphaMax(mx, my) {
      const sx = Math.max(0, Math.floor(mx));
      const sy = Math.max(0, Math.floor(my));
      const id = mctx.getImageData(sx - 1, sy - 1, 3, 3).data;
      let aMax = 0;
      for (let i = 3; i < id.length; i += 4) aMax = Math.max(aMax, id[i]);
      return aMax;
    }

    function diamondPath(ctx, cx, cy, ww, hh) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - hh / 2);
      ctx.lineTo(cx + ww / 2, cy);
      ctx.lineTo(cx, cy + hh / 2);
      ctx.lineTo(cx - ww / 2, cy);
      ctx.closePath();
    }

    function render() {
      const { w, cssFontPx } = readBoxAndFont();

      // Layout (no post-math scale here!)
      const L = measureAndLayout(w, cssFontPx);
      const h = Math.max(2, L.desiredH);

      // Size the main canvas
      canvas.width = Math.max(2, Math.floor(w * dpr));
      canvas.height = Math.max(2, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      // Make mask
      drawMask(w, h, L);

      // Draw diamonds
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (bgClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
      else {
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.scale(dpr, dpr);

      for (let yy = L.rowH_s * 0.5; yy < h; yy += L.rowH_s) {
        const xOff =
          stagger && Math.floor(yy / L.rowH_s) % 2 === 1 ? L.colW_s * 0.5 : 0;

        for (let r = 0; r < subRows; r++) {
          // Slightly tighter subrow spread vs p5 version (keeps look crisp)
          const ry = yy + (r - (subRows - 1) / 2) * (L.diamondH_s * 0.7);
          const gy = Math.min(Math.max(ry / h, 0), 1);
          ctx.fillStyle = lerpColorHex(topColor, botColor, gy);

          for (let xx = xOff + L.colW_s * 0.5; xx < w; xx += L.colW_s) {
            const a = sampleAlphaMax(xx * dpr, ry * dpr);
            const t = a / 255;
            if (t < edgeThresh) continue;

            const aL = sampleAlphaMax((xx - L.colW_s * 0.4) * dpr, ry * dpr);
            const aR = sampleAlphaMax((xx + L.colW_s * 0.4) * dpr, ry * dpr);
            const edgeFactor =
              1 -
              (fadeEdge * (Math.abs(a - aL) + Math.abs(a - aR))) / (255 * 2);

            const ww = Math.max(0, maxW * L.S * t * Math.max(0, edgeFactor));
            if (ww > 0.35) {
              diamondPath(ctx, xx, ry, ww, L.diamondH_s);
              ctx.fill();
            }
          }
        }
      }

      return h;
    }

    // initial render + responsive
    const doRender = () => render();
    doRender();

    resizeObs = new ResizeObserver(() => doRender());
    resizeObs.observe(host);

    return () => {
      resizeObs && resizeObs.disconnect();
    };
  }, [
    text,
    // baseline-tuned knobs
    letterSpacing,
    rowH,
    colW,
    subRows,
    diamondH,
    maxW,
    // colors/edges
    topColor,
    botColor,
    bgClear,
    fadeEdge,
    edgeThresh,
    stagger,
    // layout
    fontFamily,
    centerAlign,
    lineGapFrac,
    // sizing mode
    fitToCssFont,
    fontSizeRatio,
    baselinePx,
    tightPadPx,
  ]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ position: "relative", width: "100%", lineHeight: 1, ...style }}
      aria-label={text}
      role="img"
    >
      {/* Wrap the canvas if you want to scale it via CSS */}
      <div className="hero-nav-scale">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
