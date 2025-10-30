import React, { useEffect, useRef } from "react";
import p5 from "p5";

/**
 * PageStrings — auto-height (no wrapper needed)
 * - Width follows parent; height is computed so nothing is clipped.
 * - Transparent canvas; no base wave / cursor motion.
 * - Shaped halo with soft/noisy edge + static zig-zag bias.
 */
export default function PageStrings({
  text = "WORK",
  densityScale = 0.85,
  maxWordWidthFrac = 0.9,
  stringColor = "#E6C46E",
  diamondColor = "#dcd7ba",
  showStrings = false,
  zigStrength = 0.85,
  haloRadiusPx = 70,
  haloSoftPx = 20,
  haloNoiseFreq = 0.015,
  haloNoiseAmp = 20,
  className = "",
  style = {},
}) {
  const containerRef = useRef(null);
  const p5Ref = useRef(null);
  const roRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p) => {
      /* ========= base design ========= */
      const BASE = {
        GRID_X_STEP: 9,
        GRID_Y_STEP: 2,
        SUBS_PER_ROW: 3,
        DIAMOND_H_PX: 1.2,
        MAX_W: 10,
        SAFETY_MARGIN: 0.6,
        DENSITY_KEEP_PROB: 0.92,
        // used only for static zig bias amplitude
        CURSOR_MAX_ANGLE: 0.4,
        CURSOR_MAX_AMPL: 48,
        CURSOR_FREQ_Y: 0.008,
        CURSOR_COL_PHASE: 0.3,
        CURSOR_LOCAL_GAIN_MIN: 0.55,
        CURSOR_LOCAL_GAIN_MAX: 1.15,
        CURSOR_LOCAL_PHASE_JIT: 1.6,
      };

      /* ========= derived (scale) ========= */
      let S = Math.max(0.4, Math.min(1.4, densityScale));
      const PX = (v) => Math.max(0.5, v * S);

      let GRID_X_STEP = Math.max(6, Math.round(BASE.GRID_X_STEP * S));
      let GRID_Y_STEP = Math.max(1, Math.round(BASE.GRID_Y_STEP * S));
      let SUBS_PER_ROW = Math.max(2, Math.round(BASE.SUBS_PER_ROW * S));
      let DIAMOND_H_PX = BASE.DIAMOND_H_PX * S;
      let BASE_MAX_W = Math.max(3.5, BASE.MAX_W * (0.85 + 0.25 * S));
      let SAFETY_MARGIN = BASE.SAFETY_MARGIN;
      let DENSITY_KEEP_PROB = BASE.DENSITY_KEEP_PROB * (0.96 + 0.08 * S);
      let CELL = Math.max(10, Math.round(18 * S));

      let HALO_R = haloRadiusPx * S;
      let HALO_SOFT = haloSoftPx * S;
      let HALO_FREQ = haloNoiseFreq;
      let HALO_AMP = haloNoiseAmp * S;

      const STATIC_ZIG_BASE =
        Math.sin(BASE.CURSOR_MAX_ANGLE) *
        (BASE.CURSOR_MAX_AMPL * Math.max(0, Math.min(1, zigStrength)));

      /* ========= utils ========= */
      const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
      function mixHash(ix, iy, salt = 0) {
        let x =
          (ix | 0) * 374761393 + (iy | 0) * 668265263 + (salt | 0) * 1442695041;
        x = (x ^ (x >>> 13)) * 1274126177;
        x = (x ^ (x >>> 16)) >>> 0;
        return (x % 1000003) / 1000003;
      }
      function smoothstep(e0, e1, x) {
        const t = (x - e0) / Math.max(1e-6, e1 - e0);
        const u = t < 0 ? 0 : t > 1 ? 1 : t;
        return u * u * (3 - 2 * u);
      }

      function baseSubtleWave() {
        return 0;
      }
      function staticZigOffset(colIndex, y, seed) {
        const localGain =
          BASE.CURSOR_LOCAL_GAIN_MIN +
          (BASE.CURSOR_LOCAL_GAIN_MAX - BASE.CURSOR_LOCAL_GAIN_MIN) * seed;
        const localPhase = BASE.CURSOR_LOCAL_PHASE_JIT * (seed - 0.5);
        const phase =
          colIndex * BASE.CURSOR_COL_PHASE +
          y * BASE.CURSOR_FREQ_Y +
          localPhase;
        return STATIC_ZIG_BASE * Math.sin(phase) * localGain;
      }

      /* ========= state ========= */
      let maskW = 0,
        maskH = 0,
        mask = null;
      let minY = 0,
        maxY = 0; // glyph bounds (for auto-height)
      let edgePts = [],
        edgeHash;
      let numCols = 0,
        colsInitial = [],
        pairs = [];

      /* ========= mask + edges (returns glyph bounds) ========= */
      function fitAndBuildMask(word) {
        const g = p.createGraphics(p.width, p.height);
        g.pixelDensity(1);
        g.background(0);
        g.textFont("ohno-softie-variable");
        g.textStyle(p.BOLD);
        g.fill(255);
        g.noStroke();
        g.textAlign(p.CENTER, p.CENTER);

        // initial size guess (based on height), clamp by width
        const targetW = p.width * maxWordWidthFrac;
        const targetH = p.height * 0.85; // temp: will be recomputed in auto-height pass
        let size = Math.max(10, Math.floor(targetH));
        g.textSize(size);
        const w = g.textWidth(word);
        if (w > targetW) {
          size = Math.max(10, Math.floor(size * (targetW / Math.max(1, w))));
          g.textSize(size);
        }
        g.text(word, p.width / 2, p.height / 2);

        g.loadPixels();
        maskW = g.width;
        maskH = g.height;
        mask = new Uint8Array(maskW * maskH);
        const px = g.pixels;

        let minYY = maskH,
          maxYY = -1;
        for (let i = 0, m = 0, y = 0; y < maskH; y++) {
          for (let x = 0; x < maskW; x++, i += 4, m++) {
            const inside = px[i] > 128 ? 1 : 0;
            mask[m] = inside;
            if (inside) {
              if (y < minYY) minYY = y;
              if (y > maxYY) maxYY = y;
            }
          }
        }
        // if nothing detected, avoid NaNs
        if (maxYY < minYY) {
          minYY = 0;
          maxYY = 0;
        }
        minY = minYY;
        maxY = maxYY;

        // edge buckets
        edgePts = [];
        const STRIDE = 2;
        for (let y = STRIDE; y < maskH - STRIDE; y += STRIDE) {
          const row = y * maskW;
          for (let x = STRIDE; x < maskW - STRIDE; x += STRIDE) {
            const idx = row + x;
            if (mask[idx] !== 1) continue;
            if (
              mask[idx - 1] === 0 ||
              mask[idx + 1] === 0 ||
              mask[idx - maskW] === 0 ||
              mask[idx + maskW] === 0
            ) {
              edgePts.push({ x, y });
            }
          }
        }
        edgeHash = new Map();
        for (let i = 0; i < edgePts.length; i++) {
          const pnt = edgePts[i];
          const cx = (pnt.x / CELL) | 0;
          const cy = (pnt.y / CELL) | 0;
          const key = cx + "," + cy;
          const arr = edgeHash.get(key);
          if (arr) arr.push(pnt);
          else edgeHash.set(key, [pnt]);
        }
      }

      function isTextAt(x, y) {
        if (x < 0 || y < 0 || x >= maskW || y >= maskH) return 0;
        return mask[(y | 0) * maskW + (x | 0)] === 1;
      }
      function neighborsFor(x, y, r) {
        const minCX = ((x - r) / CELL) | 0,
          maxCX = ((x + r) / CELL) | 0;
        const minCY = ((y - r) / CELL) | 0,
          maxCY = ((y + r) / CELL) | 0;
        const out = [];
        for (let cy = minCY; cy <= maxCY; cy++) {
          for (let cx = minCX; cx <= maxCX; cx++) {
            const arr = edgeHash.get(cx + "," + cy);
            if (arr) out.push(...arr);
          }
        }
        return out;
      }
      function nearestEdgeDist(x, y) {
        const searchR = HALO_R + HALO_AMP + HALO_SOFT + 8;
        const cands = neighborsFor(x, y, searchR);
        if (!cands.length) return Infinity;
        let minD2 = Infinity;
        for (let i = 0; i < cands.length; i++) {
          const dx = cands[i].x - x,
            dy = cands[i].y - y;
          const d2 = dx * dx + dy * dy;
          if (d2 < minD2) minD2 = d2;
        }
        return Math.sqrt(minD2);
      }

      /* ========= columns ========= */
      function columnAccept(col, y, halfH) {
        for (let i = col.length - 1; i >= 0; i--) {
          const n = col[i],
            minGap = n.halfH + halfH + 0.6;
          if (Math.abs(y - n.baseY) < minGap) return false;
          if (n.baseY + minGap < y - GRID_Y_STEP * 3) break;
        }
        return true;
      }

      function buildColumns() {
        numCols = ((p.width / GRID_X_STEP) | 0) + 1;
        const cols = Array.from({ length: numCols }, () => []);

        for (let gx = 0; gx < p.width; gx += GRID_X_STEP) {
          const col = cols[(gx / GRID_X_STEP) | 0];

          for (let gy = 0; gy < p.height; gy += GRID_Y_STEP) {
            for (let sub = 0; sub < SUBS_PER_ROW; sub++) {
              const frac = (sub - (SUBS_PER_ROW - 1) / 2) / SUBS_PER_ROW;
              const y0 = gy + frac * GRID_Y_STEP;
              if (y0 < 0 || y0 > p.height) continue;

              if (mixHash(gx, (y0 * 10) | 0, 11) > DENSITY_KEEP_PROB) continue;

              if (isTextAt(gx | 0, y0 | 0)) continue;
              const d = nearestEdgeDist(gx, y0);
              if (!isFinite(d)) continue;

              const haloLocal =
                HALO_R +
                HALO_AMP * (p.noise(gx * HALO_FREQ, y0 * HALO_FREQ) - 0.5);

              const outerFade =
                1.0 -
                smoothstep(haloLocal - HALO_SOFT, haloLocal + HALO_SOFT, d);
              if (outerFade <= 0) continue;

              const nearFrac = 1.0 - clamp01(d / Math.max(1e-6, haloLocal));
              const weight =
                outerFade * (0.55 + 0.45 * smoothstep(0.25, 0.7, nearFrac));
              const keepProb = DENSITY_KEEP_PROB * (0.6 + 0.4 * weight);
              if (mixHash(gx, (y0 * 10) | 0, 311) > keepProb) continue;

              let w =
                (GRID_X_STEP - SAFETY_MARGIN) *
                (0.65 + 0.35 * mixHash(gx, (y0 * 10) | 0, 23));
              w *= 0.9 + 0.2 * nearFrac;
              w = Math.min(w, BASE_MAX_W);
              if (w <= 0.45) continue;

              const halfH = DIAMOND_H_PX * 0.5;
              if (!columnAccept(col, y0, halfH)) continue;
              col.push({ x: gx, y: y0, baseY: y0, size: w, halfH });
            }
          }
          col.sort((a, b) => a.baseY - b.baseY);
        }
        return cols;
      }

      function extractPairs(rawCols) {
        numCols = ((p.width / GRID_X_STEP) | 0) + 1;
        const out = [];
        for (let c = 0; c < numCols; c++) {
          const list = (rawCols[c] || [])
            .map((it) => ({
              baseY: it.baseY,
              size: Math.min(it.size, BASE_MAX_W),
            }))
            .sort((a, b) => a.baseY - b.baseY);
          out[c] = { x: c * GRID_X_STEP, list };
        }
        return out;
      }

      /* ========= auto-height sizing ========= */
      function computeDesiredHeight() {
        const glyphH = Math.max(0, maxY - minY); // glyph bounds
        const haloPad = HALO_R + HALO_SOFT + HALO_AMP + DIAMOND_H_PX * 2;
        const margin = GRID_Y_STEP * 4; // breathing room
        return Math.ceil(glyphH + 2 * haloPad + margin);
      }

      function buildAll(word) {
        // 1) temp full-height to measure text
        // Use parent's width, a generous measuring height
        const parent = containerRef.current;
        const w = Math.max(1, parent.clientWidth);
        const measureH = Math.max(200, Math.round(w * 0.5)); // temp height just for measuring
        if (p.width !== w || p.height !== measureH) {
          p.resizeCanvas(w, measureH, true);
          p.pixelDensity(1);
          p.clear();
        }

        // 2) build mask to find glyph bounds
        fitAndBuildMask(word);

        // 3) compute desired height and resize
        const desiredH = computeDesiredHeight();
        if (desiredH !== p.height) {
          p.resizeCanvas(w, desiredH, true);
          p.pixelDensity(1);
          p.clear();
          // re-run mask at final height (so text stays vertically centered)
          fitAndBuildMask(word);
        }

        // set container's height to match canvas
        if (parent) {
          parent.style.height = desiredH + "px";
        }

        // 4) with final size, place columns
        colsInitial = buildColumns();
        pairs = extractPairs(colsInitial);
      }

      /* ========= p5 lifecycle ========= */
      p.setup = () => {
        const parent = containerRef.current;
        const w = Math.max(1, parent.clientWidth);
        const h = 10; // small boot size; we'll grow in buildAll
        const c = p.createCanvas(w, h);
        c.parent(parent);
        // make the canvas control layout height
        c.elt.style.width = "100%";
        c.elt.style.height = h + "px";

        p.pixelDensity(1);
        p.clear();
        buildAll(text);
      };

      p.draw = () => {
        p.clear();

        // diamonds
        p.noStroke();
        p.fill(diamondColor);
        const colPts = new Array(numCols);

        for (let c = 0; c < numCols; c++) {
          const colX = c * GRID_X_STEP;
          const list = pairs[c]?.list || [];
          const pts = [];
          for (let i = 0; i < list.length; i++) {
            const it = list[i];
            const y = it.baseY;
            const seed = mixHash(c, Math.floor(y), 777);
            const x = colX + baseSubtleWave(c, y) + staticZigOffset(c, y, seed);
            const w = Math.min(it.size, BASE_MAX_W);
            drawDiamond(x, y, w, DIAMOND_H_PX);
            pts.push({ colX, y, seed });
          }
          pts.sort((a, b) => a.y - b.y);
          colPts[c] = pts;
        }

        if (showStrings) {
          const sc = p.color(stringColor);
          sc.setAlpha(72);
          p.stroke(sc);
          p.strokeWeight(Math.max(1.5, PX(2.6)));
          p.noFill();

          for (let ci = 0; ci < numCols; ci++) {
            const pts = colPts[ci];
            if (!pts || pts.length < 2) continue;
            p.beginShape();
            for (let i = 0; i < pts.length; i++) {
              const y = pts[i].y;
              const seed = pts[i].seed;
              const x =
                pts[i].colX +
                baseSubtleWave(ci, y) +
                staticZigOffset(ci, y, seed);
              p.vertex(x, y);
            }
            p.endShape();

            p.push();
            p.strokeWeight(Math.max(1, PX(1.3)));
            for (let i = 0; i < pts.length; i++) {
              const y = pts[i].y;
              const seed = pts[i].seed;
              const x =
                pts[i].colX +
                baseSubtleWave(ci, y) +
                staticZigOffset(ci, y, seed);
              p.line(x - PX(3), y, x + PX(3), y);
            }
            p.pop();
          }
        }
      };

      function drawDiamond(cx, cy, w, h) {
        const rx = w / 2,
          ry = h / 2;
        p.beginShape();
        p.vertex(cx, cy - ry);
        p.vertex(cx + rx, cy);
        p.vertex(cx, cy + ry);
        p.vertex(cx - rx, cy);
        p.endShape(p.CLOSE);
      }

      function rebuildOnWidthChange() {
        const parent = containerRef.current;
        if (!parent) return;
        const w = Math.max(1, parent.clientWidth);
        // keep same scale S; recompute all params that depend on S
        GRID_X_STEP = Math.max(6, Math.round(BASE.GRID_X_STEP * S));
        GRID_Y_STEP = Math.max(1, Math.round(BASE.GRID_Y_STEP * S));
        SUBS_PER_ROW = Math.max(2, Math.round(BASE.SUBS_PER_ROW * S));
        DIAMOND_H_PX = BASE.DIAMOND_H_PX * S;
        BASE_MAX_W = Math.max(3.5, BASE.MAX_W * (0.85 + 0.25 * S));
        DENSITY_KEEP_PROB = BASE.DENSITY_KEEP_PROB * (0.96 + 0.08 * S);
        CELL = Math.max(10, Math.round(18 * S));
        HALO_R = haloRadiusPx * S;
        HALO_SOFT = haloSoftPx * S;
        HALO_FREQ = haloNoiseFreq;
        HALO_AMP = haloNoiseAmp * S;

        // rebuild with new width; height will be derived to avoid clipping
        if (p.width !== w) p.resizeCanvas(w, p.height, true);
        p.clear();
        buildAll(text);
      }

      p._rebuildOnWidthChange = rebuildOnWidthChange;
    };

    p5Ref.current = new p5(sketch);

    // Observe parent WIDTH; recompute height to fit content
    roRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (p5Ref.current && p5Ref.current._rebuildOnWidthChange) {
        p5Ref.current._rebuildOnWidthChange();
      }
    });
    roRef.current.observe(containerRef.current);

    return () => {
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }
    };
  }, [
    text,
    densityScale,
    maxWordWidthFrac,
    stringColor,
    diamondColor,
    showStrings,
    zigStrength,
    haloRadiusPx,
    haloSoftPx,
    haloNoiseFreq,
    haloNoiseAmp,
  ]);

  return (
    <div
      className={`page-strings ${className}`}
      // width is controlled by parent; height is set by the component
      style={{ position: "relative", width: "100%", ...style }}
      ref={containerRef}
    />
  );
}
