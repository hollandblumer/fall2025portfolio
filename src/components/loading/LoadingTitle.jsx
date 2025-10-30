// src/components/loading/LoadingTitle.jsx
import { useEffect, useRef } from "react";
import p5 from "p5";
import YellowPainter from "./YellowPainter";

export default function LoadingTitle({
  onFinish,
  className,
  style,
  background = "transparent",
  targetColWidth = 12,
  subRows = 2,
  gradient = false,
  fontFamily = "Helvetica, Arial, sans-serif",
  vBias = 0,
  topPadPct = 0.0,
  botPadPct = 0.0,
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);
  const roRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

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
        const WORD_A = "loading";
        const WORD_B = "HOLLAND";
        const FONT_NAME = fontFamily;

        /* --- built-in HOLLAND settings --- */
        const HOLLAND_SETTINGS = {
          edgeThreshold: 0.05,
          diamondHeight: 3.8,
          baseMaxWidth: 64,
          endMaxWidth: 3.5,
          returnMaxWidth: 72,
        };

        const SIDE_MARGIN = 50;
        const STAGGER = true;

        let COL_W = targetColWidth;
        let ROW_H = 6;
        const SUB_ROWS = subRows;

        const HOLD_MS = 1200;
        const OVERLAP_MS = 350;
        const MORPH_MS = 900;
        const POST_HOLD_MS = 400;
        const RETURN_MS = 600;

        let FG_FLAT, FG_TOP, FG_BOT;
        let pgA, pgB;
        let parts = [];
        let t0 = 0;
        let fittedTextSize = 0;

        const easeInOutSine = (t) => {
          t = p.constrain(t, 0, 1);
          return -(Math.cos(Math.PI * t) - 1) / 2;
        };

        const sizeToHost = () => {
          const { w, h } = getHostRect();
          p.resizeCanvas(w, h);
        };

        p.setup = () => {
          const { w, h } = getHostRect();
          p.createCanvas(w, h).parent(host);
          p.clear(); // transparent background
          p.pixelDensity(1);
          p.noStroke();
          p.frameRate(60);

          FG_FLAT = p.color("#dcd7ba");
          FG_TOP = p.color("#dcd7ba");
          FG_BOT = p.color("#dcd7ba");

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
          COL_W = p.constrain(Math.round(targetColWidth), 8, 18);
          ROW_H = Math.max(5, Math.round(COL_W * 0.7));
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
          fittedTextSize = fitTextSizeToWidth(
            [WORD_A, WORD_B],
            W - SIDE_MARGIN * 2,
            FONT_NAME
          );
          drawWord(pgA, WORD_A, fittedTextSize);
          drawWord(pgB, WORD_B, fittedTextSize);
        }

        function fitTextSizeToWidth(words, maxW, ff) {
          const topPad = p.height * topPadPct;
          const botPad = p.height * botPadPct;
          const contentH = Math.max(1, p.height - topPad - botPad);

          const meas = p.createGraphics(1, 1);
          meas.pixelDensity(1);
          meas.textAlign(p.CENTER, p.CENTER);
          meas.textFont(ff);
          meas.textSize(contentH * 0.26);

          let widest = 0;
          for (const w of words) widest = Math.max(widest, meas.textWidth(w));
          meas.remove();

          const ts = Math.min((contentH * maxW) / widest, contentH * 0.5);
          return ts;
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

        function aNeighborhoodMax(pg, x, y) {
          let m = 0;
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              const ix = p.constrain(Math.floor(x + ox), 0, p.width - 1);
              const iy = p.constrain(Math.floor(y + oy), 0, p.height - 1);
              const a = pg.pixels[(iy * p.width + ix) * 4 + 3] / 255;
              if (a > m) m = a;
            }
          }
          return m;
        }

        function makeParticles() {
          parts.length = 0;
          const srcPts = [];
          const dstPts = [];

          for (let y = ROW_H * 0.5; y < p.height; y += ROW_H) {
            const offset =
              STAGGER && Math.floor(y / ROW_H) % 2 === 1 ? COL_W * 0.5 : 0;

            for (let r = 0; r < SUB_ROWS; r++) {
              const ry =
                y +
                (r - (SUB_ROWS - 1) / 2) *
                  (HOLLAND_SETTINGS.diamondHeight * 0.7);
              for (
                let x = SIDE_MARGIN + offset + COL_W * 0.5;
                x < p.width - SIDE_MARGIN;
                x += COL_W
              ) {
                const aA = aNeighborhoodMax(pgA, x, ry);
                const aB = aNeighborhoodMax(pgB, x, ry);
                if (aA >= HOLLAND_SETTINGS.edgeThreshold)
                  srcPts.push({
                    x,
                    y: ry,
                    w: HOLLAND_SETTINGS.baseMaxWidth * aA,
                  });
                if (aB >= HOLLAND_SETTINGS.edgeThreshold)
                  dstPts.push({
                    x,
                    y: ry,
                    w: HOLLAND_SETTINGS.baseMaxWidth * aB,
                  });
              }
            }
          }

          const sorter = (a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x);
          srcPts.sort(sorter);
          dstPts.sort(sorter);

          const Nsrc = srcPts.length;
          const Ndst = dstPts.length;

          for (let i = 0; i < Ndst; i++) {
            const d = dstPts[i];
            const s = Nsrc
              ? srcPts[i % Nsrc]
              : { x: p.width / 2, y: p.height / 2, w: 0 };
            const isClone = i >= Nsrc;
            const jx = isClone ? p.random(-COL_W * 0.25, COL_W * 0.25) : 0;
            const jy = isClone ? p.random(-ROW_H * 0.25, ROW_H * 0.25) : 0;
            const wA_norm =
              (isClone ? s.w * 0.15 : s.w) / HOLLAND_SETTINGS.baseMaxWidth;
            const wB_norm = d.w / HOLLAND_SETTINGS.baseMaxWidth;

            parts.push({
              sx: s.x + jx,
              sy: s.y + jy,
              tx: d.x,
              ty: d.y,
              wA_norm,
              wB_norm,
              fill: FG_FLAT,
            });
          }
        }

        p.draw = () => {
          p.clear();
          const elapsed = p.millis() - t0;
          const morphStart = Math.max(0, HOLD_MS - OVERLAP_MS);
          const morphEnd = morphStart + MORPH_MS;

          let prog = 0;
          if (elapsed > morphStart)
            prog = easeInOutSine((elapsed - morphStart) / MORPH_MS);
          if (elapsed >= morphEnd) prog = 1;

          const u = easeInOutSine(Math.min(elapsed / HOLD_MS, 1));
          const baseW = p.lerp(32, 10, u);
          let maxW;

          if (elapsed < morphEnd) {
            maxW = p.lerp(baseW, HOLLAND_SETTINGS.endMaxWidth, prog);
          } else {
            const post = elapsed - morphEnd;
            if (post <= POST_HOLD_MS) {
              maxW = HOLLAND_SETTINGS.endMaxWidth;
            } else if (post <= POST_HOLD_MS + RETURN_MS) {
              const r = easeInOutSine((post - POST_HOLD_MS) / RETURN_MS);
              maxW = p.lerp(
                HOLLAND_SETTINGS.endMaxWidth,
                HOLLAND_SETTINGS.returnMaxWidth,
                r
              );
            } else {
              maxW = HOLLAND_SETTINGS.returnMaxWidth;
              p.noLoop();
              onFinish && onFinish();
            }
          }

          for (const pr of parts) {
            const x = p.lerp(pr.sx, pr.tx, prog);
            const y = p.lerp(pr.sy, pr.ty, prog);
            const w = p.lerp(pr.wA_norm, pr.wB_norm, prog) * maxW;
            const h = HOLLAND_SETTINGS.diamondHeight;

            if (gradient) {
              const gy = p.constrain(y / p.height, 0, 1);
              p.fill(p.lerpColor(FG_TOP, FG_BOT, gy));
            } else {
              p.fill(pr.fill);
            }

            p.beginShape();
            p.vertex(x, y - h / 2);
            p.vertex(x + w / 2, y);
            p.vertex(x, y + h / 2);
            p.vertex(x - w / 2, y);
            p.endShape(p.CLOSE);
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
      roRef.current = null;
      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }
    };
  }, [
    onFinish,
    targetColWidth,
    subRows,
    gradient,
    fontFamily,
    vBias,
    topPadPct,
    botPadPct,
  ]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        ...style,
      }}
    >
      <YellowPainter />
      <div
        ref={hostRef}
        style={{
          position: "absolute",
          inset: 0,
          background: "transparent",
        }}
      />
    </div>
  );
}
