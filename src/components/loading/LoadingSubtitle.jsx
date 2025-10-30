import React, { useEffect, useRef } from "react";
import p5 from "p5";

/**
 * LoadingSubTitle — vertical-diamond subtitle (width-responsive)
 *
 * Props
 * - text: string (default: "is a creative technologist")
 * - useGradient: boolean (default: true)
 * - fillTop: string (default: "#D6B089")
 * - fillBot: string (default: "#B88E68")
 * - fillSolid: string (default: "#B88E68")
 * - fontFamily: string (default: "Helvetica, Arial, sans-serif")
 * - fitMargin: number 0..1 (default: 0.92)
 * - startFsFrac: number (default: 0.26)
 * - maxCanvasScale: number (default: 1)
 * - settings: optional overrides for lattice & edge feel:
 *    {
 *      rowH, colW, subRows, diamondH, maxW, stagger,
 *      edgeThresh, fadeEdge
 *    }
 * - className: wrapper div className
 * - style: inline style for wrapper
 */
export default function LoadingSubTitle({
  text = "is a creative technologist",
  useGradient = true,
  fillTop = "#D6B089",
  fillBot = "#B88E68",
  fillSolid = "#B88E68",
  fontFamily = "Helvetica, Arial, sans-serif",
  fitMargin = 0.92,
  startFsFrac = 0.26,
  maxCanvasScale = 1,
  settings = {},
  className,
  style,
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const sketch = (s) => {
      /* ===================== Your original knobs (defaults) ===================== */
      // layout of the diamond lattice
      const ROW_H = settings.rowH ?? 2; // vertical spacing between bands
      const COL_W = settings.colW ?? 9; // horizontal spacing between diamonds
      const SUB_ROWS = settings.subRows ?? 3; // 2–4 looks good
      const DIAMOND_H = settings.diamondH ?? 1.2; // diamond height
      const MAX_W = settings.maxW ?? 8; // max diamond width inside the glyph
      const STAGGER = settings.stagger ?? true; // offset every other row

      // edge feel
      const EDGE_THRESH = settings.edgeThresh ?? 0.06; // alpha threshold
      const FADE_EDGE = settings.fadeEdge ?? 0.15; // softens outer rim

      // text sizing / fitting
      const MAX_CANVAS_SCALE = maxCanvasScale; // 1.0 = full container size
      const FONT_FAMILY = fontFamily;
      const START_FS_FRAC = startFsFrac; // starting guess: height * this
      const FIT_MARGIN = fitMargin; // fit to 92% of width

      // color
      const USE_GRADIENT = useGradient;
      const FILL_TOP = fillTop;
      const FILL_BOT = fillBot;
      const FILL_SOLID = fillSolid;
      /* ======================================================================= */

      // Internal state
      let pg, FG_TOP, FG_BOT;
      let refTW = null; // reference text width at first layout
      let kx = 1; // width-only scale factor (currentTW / refTW)

      const getHostSize = () => {
        const el = hostRef.current;
        if (!el) return { w: window.innerWidth, h: window.innerHeight };
        const r = el.getBoundingClientRect();
        return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
      };

      s.setup = () => {
        const { w, h } = getHostSize();
        s.pixelDensity(1);
        s.createCanvas(
          Math.round(w * MAX_CANVAS_SCALE),
          Math.round(h * MAX_CANVAS_SCALE),
          s.P2D
        );

        FG_TOP = s.color(FILL_TOP);
        FG_BOT = s.color(FILL_BOT);

        pg = s.createGraphics(s.width, s.height);
        pg.pixelDensity(1);
        drawTextToBuffer(pg, text, true); // establish refTW
        s.noStroke();
      };

      s.windowResized = () => {
        const { w, h } = getHostSize();
        s.resizeCanvas(
          Math.round(w * MAX_CANVAS_SCALE),
          Math.round(h * MAX_CANVAS_SCALE)
        );
        pg = s.createGraphics(s.width, s.height);
        pg.pixelDensity(1);
        drawTextToBuffer(pg, text, false); // recompute kx from current text width
      };

      function drawTextToBuffer(buf, str, setReference) {
        buf.clear();
        buf.textAlign(s.CENTER, s.CENTER);
        buf.textFont(FONT_FAMILY);

        // Fit to width (derive fs from container height first)
        let fs = s.height * START_FS_FRAC;
        buf.textSize(fs);
        while (buf.textWidth(str) > s.width * FIT_MARGIN && fs > 4) {
          fs *= 0.96;
          buf.textSize(fs);
        }

        const y = s.height / 2 + fs * 0.12; // optical centering
        buf.fill(255);
        buf.text(str, s.width / 2, y);
        buf.loadPixels();

        const tw = buf.textWidth(str);
        if (setReference || refTW === null) {
          refTW = Math.max(1, tw);
          kx = 1;
        } else {
          kx = s.constrain(tw / refTW, 0.5, 2.5);
        }
      }

      function sampleAlphaMax(g, x, y) {
        let m = 0;
        const W = g.width,
          H = g.height;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const ix = s.constrain((x | 0) + ox, 0, W - 1);
            const iy = s.constrain((y | 0) + oy, 0, H - 1);
            const idx = (iy * W + ix) * 4 + 3;
            m = Math.max(m, g.pixels[idx]);
          }
        }
        return m; // 0..255
      }

      function diamond(cx, cy, w, h) {
        s.beginShape();
        s.vertex(cx, cy - h / 2);
        s.vertex(cx + w / 2, cy);
        s.vertex(cx, cy + h / 2);
        s.vertex(cx - w / 2, cy);
        s.endShape(s.CLOSE);
      }

      s.draw = () => {
        s.clear(); // transparent

        // Only horizontal metrics scale with width changes
        const COL_W_eff = COL_W * kx;
        const MAX_W_eff = MAX_W * kx;

        for (let y = ROW_H * 0.5; y < s.height; y += ROW_H) {
          const offset =
            STAGGER && ((y / ROW_H) | 0) % 2 === 1 ? COL_W_eff * 0.5 : 0;

          for (let r = 0; r < SUB_ROWS; r++) {
            const ry = y + (r - (SUB_ROWS - 1) / 2) * (DIAMOND_H * 0.7);

            if (USE_GRADIENT) {
              const gy = s.constrain(ry / s.height, 0, 1);
              s.fill(s.lerpColor(FG_TOP, FG_BOT, gy));
            } else {
              s.fill(FILL_SOLID);
            }

            for (
              let x = offset + COL_W_eff * 0.5;
              x < s.width;
              x += COL_W_eff
            ) {
              const a = sampleAlphaMax(pg, x, ry) / 255;
              if (a < EDGE_THRESH) continue;

              const aL = sampleAlphaMax(pg, x - COL_W_eff * 0.4, ry) / 255;
              const aR = sampleAlphaMax(pg, x + COL_W_eff * 0.4, ry) / 255;
              const edgeFactor =
                1.0 - (FADE_EDGE * (Math.abs(a - aL) + Math.abs(a - aR))) / 2;

              const w = MAX_W_eff * a * Math.max(0, edgeFactor);
              if (w > 0.35) {
                diamond(x, ry, w, DIAMOND_H); // keep vertical feel unchanged
              }
            }
          }
        }
      };
    };

    p5Ref.current = new p5(sketch, hostRef.current);

    return () => {
      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }
    };
  }, [
    text,
    useGradient,
    fillTop,
    fillBot,
    fillSolid,
    fontFamily,
    fitMargin,
    startFsFrac,
    maxCanvasScale,
    settings,
  ]);

  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", ...style }}
      ref={hostRef}
    />
  );
}
