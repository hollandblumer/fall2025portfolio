// NavText.jsx
import { useEffect, useRef, useState } from "react";
import p5 from "p5";

/** Diamond-text nav label with hover/active animation. */
export default function NavText({
  text = "WORK",

  // lattice & shape (dense defaults so letters read at small sizes)
  rowH = 1.3,
  colW = 20.8,
  subRows = 10,
  diamondH = 1.2,
  stagger = true,

  // diamond width control
  minW = 2.2,
  maxW = 4.5,

  // edges
  edgeThresh = 0.04,
  fadeEdge = 0.1,

  // sizing / fitting
  fontFamily = "Outfit, Helvetica, Arial, sans-serif",
  startFsFrac = 0.4, // starting guess before grow-to-fit
  fitMargin = 0.94, // target width fraction

  // color
  useGradient = false,
  fillTop = "#DBD7BD",
  fillBot = "#B88E68",
  idleFill = "#222222",

  // animation
  active = false, // mark as route-active to animate
  oscSpeed = 1.25, // cycles per second for min<->max
  easing = 0.22, // 0..1 lerp toward target width each frame

  // typography
  letterSpacing = 0.06, // in “fs units” (fs * letterSpacing)

  className,
  style,
  height = 68, // fixed height for nav labels
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);
  const [hovered, setHovered] = useState(false);

  // Create & own the p5 instance (stable deps; hover fed via updateWithProps)
  useEffect(() => {
    if (!hostRef.current) return;

    let w = 2,
      h = 2;
    let pg = null;
    let FG_TOP, FG_BOT, IDLE;
    let ready = false;
    let ro;

    // animation state
    let live = active || hovered;
    let t = 0; // time (s)
    let currW = minW; // eased instantaneous width

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
        IDLE = p.color(idleFill);

        pg = p.createGraphics(w, h);
        pg.pixelDensity(1);

        ready = true;
        layoutText(text);
        drawFrame(0);

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
          layoutText(text);
          drawFrame(0);
        });
        ro.observe(hostRef.current);
      };

      function layoutText(str) {
        if (!pg) return;
        pg.clear();
        pg.textAlign(pg.LEFT, pg.CENTER);
        pg.textFont(fontFamily);

        // grow-to-fit (then shrink if overshoot), respects tracking
        let fs = h * startFsFrac;
        pg.textSize(fs);

        const measure = (s) => {
          const trackingPx = fs * (letterSpacing || 0);
          return pg.textWidth(s) + trackingPx * (s.length - 1);
        };

        const widthTarget = w * fitMargin;
        const maxFsByHeight = h * 0.9; // keep vertical breathing room

        while (measure(str) < widthTarget && fs < maxFsByHeight) {
          fs *= 1.04;
          pg.textSize(fs);
        }
        while (measure(str) > widthTarget && fs > 4) {
          fs *= 0.96;
          pg.textSize(fs);
        }

        // baseline
        const ascent = pg.textAscent();
        const descent = pg.textDescent();
        const textHeight = ascent + descent;
        const baselineOffset = textHeight / 2 - descent;
        const cy = h / 2 + baselineOffset * 0.08;

        // tracking placement
        const tracking = fs * (letterSpacing || 0);
        const totalWidth = pg.textWidth(str) + tracking * (str.length - 1);
        let x = (w - totalWidth) / 2;

        pg.fill(255);
        for (let ch of str) {
          pg.text(ch, x, cy);
          x += pg.textWidth(ch) + tracking;
        }
        pg.loadPixels();
      }

      // wider pickup (5x3 kernel) for better small-size reading
      function sampleAlphaMax(x, y) {
        if (!pg) return 0;
        let m = 0;
        for (let oy = -2; oy <= 2; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const ix = p.constrain((x | 0) + ox, 0, w - 1);
            const iy = p.constrain((y | 0) + oy, 0, h - 1);
            const idx = (iy * w + ix) * 4 + 3;
            m = Math.max(m, pg.pixels[idx] || 0);
          }
        }
        return m;
      }

      // gamma + min-width + soft shadow for contrast
      function drawDiamonds(currMaxW) {
        p.clear();

        const gamma = 0.8; // <1.0 = bolder mid-tones
        const minDW = 0.9; // minimum diamond width (px)
        const shadowPx = 0.6; // subtle drop shadow offset
        const shadowAlpha = 28;

        let minX = Infinity,
          maxX = -Infinity;
        let minY = Infinity,
          maxY = -Infinity;
        const pts = [];

        for (let y = rowH * 0.5; y < h; y += rowH) {
          const rowIndex = (y / rowH) | 0;
          const offset = stagger && rowIndex % 2 === 1 ? colW * 0.5 : 0;

          for (let r = 0; r < subRows; r++) {
            const ry = y + (r - (subRows - 1) / 2) * (diamondH * 0.7);

            for (let x = offset + colW * 0.5; x < w; x += colW) {
              let a = sampleAlphaMax(x, ry) / 255;
              a = Math.pow(a, gamma); // gamma curve
              if (a < edgeThresh) continue;

              const aL = sampleAlphaMax(x - colW * 0.4, ry) / 255;
              const aR = sampleAlphaMax(x + colW * 0.4, ry) / 255;
              const edgeFactor =
                1 - (fadeEdge * (Math.abs(a - aL) + Math.abs(a - aR))) / 2;

              let dw = currMaxW * a * Math.max(0, edgeFactor);
              if (dw > 0.001) dw = Math.max(dw, minDW);
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

        // shadow pass
        if (pts.length) {
          p.fill(0, 0, 0, shadowAlpha);
          for (const d of pts) {
            p.beginShape();
            p.vertex(d.x + dx + shadowPx, d.ry + dy - diamondH / 2 + shadowPx);
            p.vertex(d.x + dx + d.dw / 2 + shadowPx, d.ry + dy + shadowPx);
            p.vertex(d.x + dx + shadowPx, d.ry + dy + diamondH / 2 + shadowPx);
            p.vertex(d.x + dx - d.dw / 2 + shadowPx, d.ry + dy + shadowPx);
            p.endShape(p.CLOSE);
          }
        }

        // main pass
        for (const d of pts) {
          if (useGradient) {
            const gy = Math.max(0, Math.min(1, d.ry / h));
            p.fill(p.lerpColor(FG_TOP, FG_BOT, gy));
          } else {
            const frac = live ? 0.35 : 0; // subtle sheen when live
            const gy = Math.max(0, Math.min(1, d.ry / h));
            const gradish = p.lerpColor(FG_TOP, FG_BOT, gy);
            const mixed = p.lerpColor(IDLE, gradish, frac);
            p.fill(mixed);
          }
          p.beginShape();
          p.vertex(d.x + dx, d.ry + dy - diamondH / 2);
          p.vertex(d.x + dx + d.dw / 2, d.ry + dy);
          p.vertex(d.x + dx, d.ry + dy + diamondH / 2);
          p.vertex(d.x + dx - d.dw / 2, d.ry + dy);
          p.endShape(p.CLOSE);
        }
      }

      function drawFrame(dt) {
        const targetLive = active || hovered;
        if (targetLive !== live) {
          live = targetLive;
          if (live) p.loop();
          else p.noLoop();
        }

        let targetW = minW;
        if (live) {
          const amp = 0.5 + 0.5 * Math.sin(2 * Math.PI * oscSpeed * t);
          targetW = minW + (maxW - minW) * amp;
        }
        currW = currW + (targetW - currW) * Math.min(1, Math.max(0.0, easing));
        drawDiamonds(currW);
      }

      p.draw = () => {
        const dt = p.deltaTime / 1000;
        t += dt;
        drawFrame(dt);
      };

      p.updateWithProps = (props) => {
        if (!ready) return;
        let needsRelayout = false;

        if (props?.text !== undefined) {
          layoutText(props.text);
          needsRelayout = true;
        }
        if (props?.active !== undefined) {
          live = props.active || hovered;
          if (live) p.loop();
          else p.noLoop();
        }
        if (props?.minW !== undefined) {
          currW = Math.max(0.1, props.minW);
        }
        if (needsRelayout) drawFrame(0);
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
    active,
    fillTop,
    fillBot,
    idleFill,
    useGradient,
    rowH,
    colW,
    subRows,
    diamondH,
    stagger,
    minW,
    maxW,
    edgeThresh,
    fadeEdge,
    fontFamily,
    startFsFrac,
    fitMargin,
    letterSpacing,
    oscSpeed,
    easing,
  ]);

  // runtime prop sync without recreating the sketch
  useEffect(() => {
    p5Ref.current?.updateWithProps?.({ text, active, minW });
  }, [text, active, minW]);

  // hover toggles live-state
  useEffect(() => {
    p5Ref.current?.updateWithProps?.({ active: active || hovered });
  }, [hovered, active]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height,
        ...style,
      }}
      aria-label={text}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    />
  );
}
