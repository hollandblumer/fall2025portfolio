// NavText2.jsx
import { useEffect, useRef } from "react";
import p5 from "p5";

export default function NavText2({
  text = "is a creative technologist",
  fontPx = "inherit", // number | "inherit"
  fitToWidth = false,
  fitMargin = 0.92,
  className,
  style,
  colors = { top: "#D6B089", bot: "#B88E68", solid: "#B88E68" },
  useGradient = true,
  slightScale = { minWidth: 360, maxWidth: 1200, minScale: 0.9 },
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);
  const roRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const getBaseFontPx = () => {
      if (fontPx === "inherit") {
        const fs = parseFloat(
          window.getComputedStyle(hostRef.current).fontSize || "48"
        );
        return isFinite(fs) && fs > 0 ? fs : 48;
      }
      return fontPx || 48;
    };

    let sketch = (p) => {
      // ===== baseline knobs (for 48px font) =====
      const ROW_H0 = 2,
        COL_W0 = 9,
        SUB_ROWS = 3,
        DIAMOND_H0 = 0.8,
        MAX_W0 = 5;
      const STAGGER = true,
        EDGE_THRESH = 0.06,
        FADE_EDGE = 0.15;
      const FONT_FAMILY = "Helvetica, Arial, sans-serif";

      const USE_GRADIENT = useGradient;
      const FILL_TOP = colors.top ?? "#D6B089";
      const FILL_BOT = colors.bot ?? "#B88E68";
      const FILL_SOLID = colors.solid ?? "#B88E68";

      // spikes / hover
      const SPIKE_AMP = 3.0,
        SPIKE_FREQ = 0.005,
        SPIKE_SPEED = 0.35;
      const RARE_PROB = 0.015,
        RARE_MULT = 4.5;
      const GHOST_ON = true,
        GHOST_STRENGTH = 0.9,
        GHOST_EXPAND = true;
      const GHOST_SIGMA_BASE0 = 140;

      // ===== internals =====
      let pg; // offscreen text buffer (taller than host by 2*padY)
      let pgPadY = 0; // vertical pad added to pg
      let FG_TOP, FG_BOT;
      let kx = 1; // width-only factor if fitToWidth
      let t0 = 0;
      let hostW = 2,
        hostH = 2;
      let baseFont = getBaseFontPx();

      function slightScaleFactor(width) {
        const minW = slightScale.minWidth ?? 360;
        const maxW = slightScale.maxWidth ?? 1200;
        const minS = slightScale.minScale ?? 0.9;
        if (width >= maxW) return 1;
        if (width <= minW) return minS;
        const t = (width - minW) / (maxW - minW);
        return minS + t * (1 - minS);
      }

      // ===== utils =====
      function lerpHex(a, b, t) {
        return p.lerpColor(p.color(a), p.color(b), t);
      }

      function sampleAlphaMax(g, x, y) {
        let m = 0;
        const W = g.width,
          H = g.height;
        const xi = x | 0,
          yi = y | 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const ix = p.constrain(xi + ox, 0, W - 1);
            const iy = p.constrain(yi + oy, 0, H - 1);
            const idx = (iy * W + ix) * 4 + 3;
            m = Math.max(m, g.pixels[idx]);
          }
        }
        return m; // 0..255
      }

      function hash2(xi, yi) {
        let n = xi * 374761393 + yi * 668265263;
        n = (n ^ (n >> 13)) * 1274126177;
        n = (n ^ (n >> 16)) >>> 0;
        return (n % 4294967296) / 4294967296;
      }

      function diamond(cx, cy, w, h) {
        p.beginShape();
        p.vertex(cx, cy - h / 2);
        p.vertex(cx + w / 2, cy);
        p.vertex(cx, cy + h / 2);
        p.vertex(cx - w / 2, cy);
        p.endShape(p.CLOSE);
      }

      function ghostScale(mx, my, x, y, sigma) {
        if (!GHOST_ON) return 1.0;
        const dx = x - mx;
        const dy = y - my;
        const d2 = dx * dx + dy * dy;
        const s2 = sigma * sigma;
        const f = Math.exp(-d2 / (2 * s2));
        return GHOST_EXPAND ? 1 + GHOST_STRENGTH * f : 1 - GHOST_STRENGTH * f;
      }

      // ===== text buffer with vertical padding (clip-safe) =====
      function drawTextToBuffer(buf) {
        buf.clear();
        buf.textAlign(p.CENTER, p.BASELINE);
        buf.textFont(FONT_FAMILY);

        const S = slightScaleFactor(hostW);
        let fs = baseFont * S;
        buf.textSize(fs);

        // width-fit (does NOT change lattice scale)
        if (fitToWidth) {
          while (
            buf.textWidth(text) > hostW * fitMargin &&
            buf.textSize() > 4
          ) {
            buf.textSize(buf.textSize() * 0.96);
          }
          kx = buf.textSize() / fs;
          fs = buf.textSize();
        } else {
          kx = 1;
        }

        // true metrics + vertical clamp
        const vPad = Math.max(2, Math.round(fs * 0.15)); // breathing room
        for (let i = 0; i < 24; i++) {
          const asc = buf.textAscent();
          const dsc = buf.textDescent();
          if (asc + dsc + 2 * vPad <= hostH || buf.textSize() <= 6) break;
          buf.textSize(buf.textSize() * 0.965);
        }
        const asc = buf.textAscent();
        const dsc = buf.textDescent();
        const textBlockH = asc + dsc;

        // compute baseline y inside host box, then offset by pad we added to pg
        const baselineYInHost = Math.round(
          (hostH - textBlockH) / 2 + asc + buf.textSize() * 0.015
        );
        const y = pgPadY + baselineYInHost;

        buf.fill(255);
        buf.text(text, hostW / 2, y);
        buf.loadPixels();
      }

      // ===== lifecycle =====
      function makeCanvas() {
        const rect = hostRef.current.getBoundingClientRect();
        hostW = Math.max(2, Math.round(rect.width));
        hostH = Math.max(2, Math.round(rect.height));
        baseFont = getBaseFontPx();

        if (p._renderer) p.resizeCanvas(hostW, hostH);
        else p.createCanvas(hostW, hostH);

        p.pixelDensity(1);
        // lock CSS size
        p.canvas.style.display = "block";
        p.canvas.style.width = "100%";
        p.canvas.style.height = "100%";
        p.canvas.style.verticalAlign = "middle"; // don't use baseline alignment

        FG_TOP = p.color(FILL_TOP);
        FG_BOT = p.color(FILL_BOT);

        // compute pad from intended font size (prevents glyph crop)
        const S = slightScaleFactor(hostW);
        const fs = baseFont * S;
        pgPadY = Math.max(4, Math.round(fs * 0.25)); // <-- extra vertical pad

        // create taller offscreen buffer
        pg = p.createGraphics(hostW, hostH + 2 * pgPadY);
        pg.pixelDensity(1);

        drawTextToBuffer(pg);
        t0 = p.millis();
      }

      p.setup = () => {
        makeCanvas();
        p.noStroke();
      };

      p.draw = () => {
        p.clear();
        const tt = (p.millis() - t0) * 0.001 * SPIKE_SPEED;

        const S = slightScaleFactor(hostW);
        const fontScale = (baseFont / 48) * S;

        const COL_W = COL_W0 * fontScale;
        const MAX_W = MAX_W0 * fontScale;
        const ROW_H = ROW_H0 * fontScale;
        const DIAMOND_H = DIAMOND_H0 * fontScale;
        const GHOST_SIGMA = GHOST_SIGMA_BASE0 * fontScale;

        const inside =
          p.mouseX >= 0 &&
          p.mouseY >= 0 &&
          p.mouseX <= hostW &&
          p.mouseY <= hostH;
        const mx = inside ? p.mouseX : -9999;
        const my = inside ? p.mouseY : -9999;

        for (let y = ROW_H * 0.5; y < hostH; y += ROW_H) {
          const rowIndex = (y / ROW_H) | 0;
          const offset = STAGGER && rowIndex % 2 === 1 ? COL_W * 0.5 : 0;

          for (let r = 0; r < SUB_ROWS; r++) {
            const ry = y + (r - (SUB_ROWS - 1) / 2) * (DIAMOND_H * 0.7);

            if (USE_GRADIENT) {
              const gy = p.constrain(ry / hostH, 0, 1);
              p.fill(lerpHex(FG_TOP, FG_BOT, gy));
            } else {
              p.fill(FILL_SOLID);
            }

            for (
              let x = offset + COL_W * 0.5, xi = 0;
              x < hostW;
              x += COL_W, xi++
            ) {
              // sample alpha from the padded buffer (shift by +pgPadY)
              const a = sampleAlphaMax(pg, x, ry + pgPadY) / 255;
              if (a < EDGE_THRESH) continue;

              // soften near outer edges (also sample with +pgPadY)
              const aL = sampleAlphaMax(pg, x - COL_W * 0.4, ry + pgPadY) / 255;
              const aR = sampleAlphaMax(pg, x + COL_W * 0.4, ry + pgPadY) / 255;
              const edgeFactor =
                1.0 - (FADE_EDGE * (Math.abs(a - aL) + Math.abs(a - aR))) / 2;

              const w = MAX_W * a * Math.max(0, edgeFactor) * kx;

              // vertical spikes
              const n = p.noise(x * SPIKE_FREQ, ry * SPIKE_FREQ, tt);
              const nPunch = Math.pow(n, 3.0);
              let h = DIAMOND_H * (1.0 + SPIKE_AMP * nPunch);

              // rare needles
              const hRnd = hash2(xi + (rowIndex << 6), r + (rowIndex << 3));
              if (hRnd < RARE_PROB) h *= RARE_MULT;

              // ghost
              const gS = ghostScale(mx, my, x, ry, GHOST_SIGMA);
              const w2 = w * gS;
              const h2 = h * gS;

              if (w2 > 0.35) diamond(x, ry, w2, h2);
            }
          }
        }
      };

      p.windowResized = () => {
        const rect = hostRef.current.getBoundingClientRect();
        hostW = Math.max(2, Math.round(rect.width));
        hostH = Math.max(2, Math.round(rect.height));
        baseFont = getBaseFontPx();

        p.resizeCanvas(hostW, hostH);
        p.canvas.style.display = "block";
        p.canvas.style.width = "100%";
        p.canvas.style.height = "100%";

        // recompute pad & recreate pg
        const S = slightScaleFactor(hostW);
        const fs = baseFont * S;
        pgPadY = Math.max(4, Math.round(fs * 0.25));
        pg = p.createGraphics(hostW, hostH + 2 * pgPadY);
        pg.pixelDensity(1);

        drawTextToBuffer(pg);
      };
    };

    // mount p5
    p5Ref.current = new p5(sketch, hostRef.current);

    // keep canvas in sync with parent size & inherited font size
    roRef.current = new ResizeObserver(() => {
      if (p5Ref.current?.windowResized) p5Ref.current.windowResized();
    });
    roRef.current.observe(hostRef.current);

    return () => {
      roRef.current?.disconnect();
      roRef.current = null;
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, [text, fontPx, fitToWidth, fitMargin, useGradient, colors, slightScale]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        ...style,
      }}
    />
  );
}
