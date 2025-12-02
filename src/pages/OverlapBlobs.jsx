// OverlapBlobs.jsx
import React, { useRef, useEffect } from "react";
import p5 from "p5";

export default function OverlapBlobs({
  word = "WORK",
  color = "#F7E9A9", // shard + letter color (like your target)
  background = "#C5C5C5", // canvas background
  className,
  style,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    let instance = null;

    const sketch = (p) => {
      const FONT_FAMILY = "Inter, system-ui, sans-serif";

      const isMobile = () => p.windowWidth <= 820;
      const VERTS_DESKTOP = 14;
      const VERTS_MOBILE = 18;

      let LETTER_TRACKING = -0.18;
      let TEXT_MARGIN = 0.12;

      let RESAMPLED_VERTS = VERTS_DESKTOP;
      let TARGET_POINTS_PER_SHARD = 250;

      let gWordMask = null;
      let letterMasks = [];
      let overlapMasks = [];
      let shards = [];

      const TARGET_COLOR_RGB = [
        parseInt(color.substring(1, 3), 16),
        parseInt(color.substring(3, 5), 16),
        parseInt(color.substring(5, 7), 16),
        255,
      ];

      p.setup = () => {
        const parent = containerRef.current || document.body;
        const w = parent.clientWidth || p.windowWidth;
        const h = parent.clientHeight || p.windowHeight;

        p.createCanvas(w, h);
        p.pixelDensity(1);
        p.textStyle(p.BOLD);
        p.textFont(FONT_FAMILY);

        if (p.canvas) {
          p.canvas.style.filter = "url(#overlap-goo)";
        }

        sizeParamsToWindow();
        rebuildAll();
      };

      p.windowResized = () => {
        const parent = containerRef.current || document.body;
        const w = parent.clientWidth || p.windowWidth;
        const h = parent.clientHeight || p.windowHeight;

        p.resizeCanvas(w, h);
        if (p.canvas) {
          p.canvas.style.filter = "url(#overlap-goo)";
        }
        sizeParamsToWindow();
        rebuildAll();
      };

      function sizeParamsToWindow() {
        RESAMPLED_VERTS = isMobile() ? VERTS_MOBILE : VERTS_DESKTOP;
        TARGET_POINTS_PER_SHARD = isMobile() ? 200 : 250;
        TEXT_MARGIN = isMobile() ? 0.08 : 0.12;
        LETTER_TRACKING = isMobile() ? -0.16 : -0.2;
      }

      function rebuildAll() {
        p.randomSeed(1337);

        const ts = fitTextSize(word);
        const layout = computeLayout(word, ts);

        // per-letter masks
        letterMasks = buildLetterMasks(layout);

        // one overlap mask per adjacent pair
        overlapMasks = buildOverlapMasksPerPair(letterMasks);

        // union of all overlaps → for cutting out of solid word
        const unionMask = buildUnionMask(overlapMasks);

        // word mask with overlaps removed
        gWordMask = buildWordMask(layout, unionMask);

        // one shard per overlap region
        shards = [];
        for (const om of overlapMasks) {
          const oneShard = buildShardsFromMask(om, 1); // exactly 1 per overlap
          shards.push(...oneShard);
        }
      }

      p.draw = () => {
        p.clear();
        p.background(background);

        drawSolidWord();
        renderShards(shards);
      };

      /* ===================== Rendering ===================== */

      function drawSolidWord() {
        if (!gWordMask) return;
        p.push();
        p.tint(
          TARGET_COLOR_RGB[0],
          TARGET_COLOR_RGB[1],
          TARGET_COLOR_RGB[2],
          255
        );
        p.image(gWordMask, 0, 0);
        p.pop();
      }

      // draw convex polygon shards – same look as the plain p5 demo
      function renderShards(list) {
        p.noStroke();
        for (const s of list) {
          const a = s.fill[3] ?? 232;
          p.fill(s.fill[0], s.fill[1], s.fill[2], a);
          p.beginShape();
          for (const v of s.pts) {
            p.vertex(v.x, v.y);
          }
          p.endShape(p.CLOSE);
        }
      }

      /* ===================== Layout + Masks ===================== */

      function fitTextSize(str) {
        const usableW = p.width * (1 - TEXT_MARGIN * 2);
        const usableH = p.height * (1 - TEXT_MARGIN * 2);

        let ts = Math.min(usableW, usableH);
        p.textSize(ts);

        const totalWidth = (size) => {
          let total = 0;
          const track = size * LETTER_TRACKING;
          for (let i = 0; i < str.length; i++) {
            total += p.textWidth(str[i]);
            if (i < str.length - 1) total += track;
          }
          return total;
        };

        while (totalWidth(ts) > usableW && ts > 8) {
          ts *= 0.94;
          p.textSize(ts);
        }
        const asc = p.textAscent();
        const dsc = p.textDescent();
        while (asc + dsc > usableH && ts > 8) {
          ts *= 0.94;
          p.textSize(ts);
        }
        return ts;
      }

      function computeLayout(str, ts) {
        p.textSize(ts);

        const track = ts * LETTER_TRACKING;
        let totalW = 0;
        const widths = [];

        for (let i = 0; i < str.length; i++) {
          const w = p.textWidth(str[i]);
          widths.push(w);
          totalW += w;
          if (i < str.length - 1) totalW += track;
        }

        const left = (p.width - totalW) * 0.5;
        const asc = p.textAscent();
        const dsc = p.textDescent();
        const baseY = p.height / 2 + (asc - dsc) / 2;

        let x = left;
        const letters = [];
        for (let i = 0; i < str.length; i++) {
          letters.push({ ch: str[i], x });
          x += widths[i] + (i < str.length - 1 ? track : 0);
        }

        return { letters, baseY, ts };
      }

      function buildWordMask(layout, unionMask) {
        const g = p.createGraphics(p.width, p.height);
        g.pixelDensity(1);
        g.clear();
        g.fill(255);
        g.noStroke();
        g.textFont(FONT_FAMILY);
        g.textSize(layout.ts);
        g.textStyle(p.BOLD);

        for (const l of layout.letters) {
          g.text(l.ch, l.x, layout.baseY);
        }

        if (unionMask) {
          g.loadPixels();
          unionMask.loadPixels();
          for (let y = 0; y < g.height; y++) {
            const row = y * g.width;
            for (let x = 0; x < g.width; x++) {
              const idx = 4 * (row + x);
              const aO = unionMask.pixels[idx + 3];
              if (aO > 2) {
                g.pixels[idx + 3] = 0; // cut out overlap
              }
            }
          }
          g.updatePixels();
        }

        return g;
      }

      function buildLetterMasks(layout) {
        const out = [];
        for (const l of layout.letters) {
          const g = p.createGraphics(p.width, p.height);
          g.pixelDensity(1);
          g.clear();
          g.fill(255);
          g.noStroke();
          g.textFont(FONT_FAMILY);
          g.textSize(layout.ts);
          g.textStyle(p.BOLD);
          g.text(l.ch, l.x, layout.baseY);
          out.push(g);
        }
        return out;
      }

      function buildOverlapMasksPerPair(masks) {
        const result = [];
        const radius = 3; // thickness of overlap cutout

        for (let i = 0; i < masks.length - 1; i++) {
          const A = masks[i];
          const B = masks[i + 1];

          const g = p.createGraphics(p.width, p.height);
          g.pixelDensity(1);
          g.clear();
          g.loadPixels();

          A.loadPixels();
          B.loadPixels();

          for (let y = 0; y < g.height; y++) {
            for (let x = 0; x < g.width; x++) {
              const idx = 4 * (y * g.width + x);
              const aA = A.pixels[idx + 3];
              const aB = B.pixels[idx + 3];

              if (aA > 180 && aB > 180) {
                // thicken around this overlap pixel
                for (let oy = -radius; oy <= radius; oy++) {
                  const ny = y + oy;
                  if (ny < 0 || ny >= g.height) continue;
                  const row = ny * g.width;
                  for (let ox = -radius; ox <= radius; ox++) {
                    const nx = x + ox;
                    if (nx < 0 || nx >= g.width) continue;
                    const nidx = 4 * (row + nx);
                    g.pixels[nidx] = 255;
                    g.pixels[nidx + 1] = 255;
                    g.pixels[nidx + 2] = 255;
                    g.pixels[nidx + 3] = 255;
                  }
                }
              }
            }
          }

          g.updatePixels();
          result.push(g);
        }

        return result;
      }

      function buildUnionMask(overlapMasks) {
        if (!overlapMasks || overlapMasks.length === 0) return null;
        const g = p.createGraphics(p.width, p.height);
        g.pixelDensity(1);
        g.clear();
        g.loadPixels();

        for (const m of overlapMasks) {
          m.loadPixels();
          for (let y = 0; y < g.height; y++) {
            const row = y * g.width;
            for (let x = 0; x < g.width; x++) {
              const idx = 4 * (row + x);
              if (m.pixels[idx + 3] > 2) {
                g.pixels[idx] = 255;
                g.pixels[idx + 1] = 255;
                g.pixels[idx + 2] = 255;
                g.pixels[idx + 3] = 255;
              }
            }
          }
        }

        g.updatePixels();
        return g;
      }

      /* ===================== Mask → Shards ===================== */

      function buildShardsFromMask(g, shardCount) {
        const samples = sampleOpaqueAdaptive(
          g,
          shardCount,
          TARGET_POINTS_PER_SHARD
        );
        const groups = seededKMeansSinglePass(samples, shardCount);
        const out = [];
        for (const pts of groups) {
          if (!pts || pts.length < 3) continue;
          const hull = convexHull(pts);
          if (!hull || hull.length < 3) continue;
          const res = resampleClosedPolyline(hull, RESAMPLED_VERTS);
          out.push({
            pts: res,
            fill: TARGET_COLOR_RGB,
            centroid: centroid(res),
          });
        }
        return out;
      }

      function sampleOpaqueAdaptive(g, k, perShard) {
        g.loadPixels();
        const target = Math.max(p.floor(k * perShard), k * 10);

        const coarseStride = 6;
        let countOpaque = 0;
        for (let y = 0; y < g.height; y += coarseStride) {
          const row = y * g.width;
          for (let x = 0; x < g.width; x += coarseStride) {
            const idx = 4 * (row + x);
            if (g.pixels[idx + 3] > 2) countOpaque++;
          }
        }

        const coarseCells =
          p.ceil(g.width / coarseStride) * p.ceil(g.height / coarseStride);
        const opaqueRatio = countOpaque / (coarseCells || 1);
        const estOpaque = g.width * g.height * opaqueRatio;
        const stride = p.constrain(
          p.floor(Math.sqrt(estOpaque / target)),
          2,
          isMobile() ? 12 : 12
        );

        const pts = [];
        for (let y = 0; y < g.height; y += stride) {
          const row = y * g.width;
          for (let x = 0; x < g.width; x += stride) {
            const idx = 4 * (row + x);
            if (g.pixels[idx + 3] > 2) {
              const jx = x + p.random(-0.35 * stride, 0.35 * stride);
              const jy = y + p.random(-0.35 * stride, 0.35 * stride);
              pts.push({ x: jx, y: jy });
            }
          }
        }
        return pts;
      }

      function seededKMeansSinglePass(points, k) {
        if (!points.length || k <= 1) return [points];

        const centers = [];
        centers.push(points[p.floor(p.random(points.length))]);

        while (centers.length < k) {
          let bestIdx = 0;
          let bestDist = -1;
          for (let i = 0; i < points.length; i++) {
            const pnt = points[i];
            let dn = Infinity;
            for (const c of centers) {
              const dx = pnt.x - c.x;
              const dy = pnt.y - c.y;
              const d = dx * dx + dy * dy;
              if (d < dn) dn = d;
            }
            if (dn > bestDist) {
              bestDist = dn;
              bestIdx = i;
            }
          }
          centers.push(points[bestIdx]);
        }

        const groups = Array.from({ length: k }, () => []);
        for (const pnt of points) {
          let which = 0;
          let best = (pnt.x - centers[0].x) ** 2 + (pnt.y - centers[0].y) ** 2;
          for (let j = 1; j < centers.length; j++) {
            const d = (pnt.x - centers[j].x) ** 2 + (pnt.y - centers[j].y) ** 2;
            if (d < best) {
              best = d;
              which = j;
            }
          }
          groups[which].push(pnt);
        }
        return groups;
      }

      /* ===================== Geometry ===================== */

      function convexHull(points) {
        const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
        if (pts.length <= 1) return pts;

        const lower = [];
        for (const pnt of pts) {
          while (
            lower.length >= 2 &&
            cross(lower[lower.length - 2], lower[lower.length - 1], pnt) <= 0
          ) {
            lower.pop();
          }
          lower.push(pnt);
        }

        const upper = [];
        for (let i = pts.length - 1; i >= 0; i--) {
          const pnt = pts[i];
          while (
            upper.length >= 2 &&
            cross(upper[upper.length - 2], upper[upper.length - 1], pnt) <= 0
          ) {
            upper.pop();
          }
          upper.push(pnt);
        }

        upper.pop();
        lower.pop();
        return lower.concat(upper);
      }

      function cross(o, a, b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
      }

      function resampleClosedPolyline(poly, n) {
        const oriented = ensureClockwise(poly.slice());
        const L = [0];
        for (let i = 0; i < oriented.length; i++) {
          const a = oriented[i];
          const b = oriented[(i + 1) % oriented.length];
          L.push(L[i] + p.dist(a.x, a.y, b.x, b.y));
        }
        const total = L[L.length - 1] || 1;
        const step = total / n;
        const out = [];
        for (let k = 0; k < n; k++) {
          const target = k * step;
          out.push(pointAtLength(oriented, L, target));
        }
        return out;
      }

      function ensureClockwise(poly) {
        let area = 0;
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i];
          const b = poly[(i + 1) % poly.length];
          area += a.x * b.y - b.x * a.y;
        }
        if (area > 0) poly.reverse();
        return poly;
      }

      function pointAtLength(poly, L, t) {
        const total = L[L.length - 1] || 1;
        let s = ((t % total) + total) % total;
        let i = 0;
        while (i < L.length - 1 && L[i + 1] < s) i++;
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const segLen = L[i + 1] - L[i] || 1;
        const u = (s - L[i]) / segLen;
        return {
          x: p.lerp(a.x, b.x, u),
          y: p.lerp(a.y, b.y, u),
        };
      }

      function centroid(poly) {
        let cx = 0;
        let cy = 0;
        for (const pnt of poly) {
          cx += pnt.x;
          cy += pnt.y;
        }
        const n = poly.length || 1;
        return { x: cx / n, y: cy / n };
      }
    };

    if (containerRef.current) {
      instance = new p5(sketch, containerRef.current);
    }

    return () => {
      if (instance) instance.remove();
    };
  }, [word, color, background]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    >
      {/* SVG goo filter for the canvas */}
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="overlap-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 18 -9"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
