// AboutVoronoi.jsx
import { useEffect, useRef } from "react";
import p5 from "p5";

export default function AboutVoronoi() {
  const containerRef = useRef(null);

  useEffect(() => {
    let pInstance;

    const sketch = (p) => {
      // ===================== CONFIG =====================
      const BG_COLOR = "#c5c5c5";
      const TEXT_COLOR = [247, 233, 169, 255]; // #F7E9A9
      const SHARD_COLOR = [247, 233, 169, 255];

      const WORD = "ABOUT";
      const letters = WORD.split("");

      // horizontal motion (how much letters overlap)
      const MIN_SPACING_FACTOR = 0.18;
      const MAX_SPACING_FACTOR = 0.9;
      const TRACK_SPEED = 0.0008;

      // internal canvas size: wide band, not super tall
      const BASE_WIDTH = 1080;
      const BASE_HEIGHT = 260;

      // Voronoi / shards
      let RESAMPLED_VERTS = 14;
      let TARGET_POINTS_PER_SHARD = 60;
      let SHARD_COUNT = 20;

      let overlapMask;
      let letterMasks = [];

      const isMobile = () => p.windowWidth <= 820;

      function initGraphics() {
        RESAMPLED_VERTS = isMobile() ? 18 : 14;
        TARGET_POINTS_PER_SHARD = isMobile() ? 46 : 60;
        SHARD_COUNT = isMobile() ? 26 : 20;

        overlapMask = p.createGraphics(p.width, p.height);
        overlapMask.pixelDensity(1);

        letterMasks = letters.map(() => {
          const g = p.createGraphics(p.width, p.height);
          g.pixelDensity(1);
          return g;
        });

        p.textFont("sans-serif");
      }

      // ===================== P5 LIFECYCLE =====================
      p.setup = () => {
        const parent = containerRef.current;
        const canvas = p.createCanvas(BASE_WIDTH, BASE_HEIGHT);
        canvas.parent(parent);
        p.pixelDensity(1);

        // scale visually like a heading, but keep internal res high
        canvas.elt.style.width = "100%";
        canvas.elt.style.height = "auto";
        canvas.elt.style.maxHeight = "160px"; // tweak if you want shorter/taller

        initGraphics();
      };

      // we keep internal size fixed; just recompute params on resize
      p.windowResized = () => {
        initGraphics();
      };

      p.draw = () => {
        p.background(BG_COLOR);

        const t = p.millis();
        const cx = p.width * 0.5;
        const cy = p.height * 0.5;

        // key line: font uses ~48% of band height instead of 70%
        const fontSize = p.height * 0.48;

        const s = p.sin(t * TRACK_SPEED) * 0.5 + 0.5;
        const spacing = p.lerp(
          fontSize * MIN_SPACING_FACTOR,
          fontSize * MAX_SPACING_FACTOR,
          s
        );

        // clear masks for this frame
        letterMasks.forEach((g) => g.clear());

        // 1) draw letters + masks
        p.push();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(fontSize);
        p.textFont("sans-serif");
        p.noStroke();
        p.fill(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2], TEXT_COLOR[3]);

        const n = letters.length;
        for (let i = 0; i < n; i++) {
          const ch = letters[i];
          const x = cx + (i - (n - 1) / 2) * spacing;
          const y = cy;

          // main canvas
          p.text(ch, x, y);

          // mask for this letter
          drawLetterMask(letterMasks[i], ch, x, y, fontSize);
        }
        p.pop();

        // 2) overlap mask
        buildOverlapMaskFromLetters();

        // 3) shards
        const shards = buildShardsFromMask(overlapMask, SHARD_COUNT);

        // 4) cut overlap out of letters
        cutOutOverlap();

        // 5) draw shards
        renderShards(shards);
      };

      // ===================== LETTER MASKS =====================
      function drawLetterMask(g, ch, x, y, fontSize) {
        g.push();
        g.textAlign(p.CENTER, p.CENTER);
        g.textSize(fontSize);
        g.textFont("sans-serif");
        g.noStroke();
        g.fill(255);
        g.text(ch, x, y);
        g.pop();
      }

      function buildOverlapMaskFromLetters() {
        overlapMask.clear();
        overlapMask.loadPixels();

        const n = letterMasks.length;
        const pixelsArray = letterMasks.map((g) => {
          g.loadPixels();
          return g.pixels;
        });

        const radius = 3; // thickening like your original Voronoi style

        for (let y = 0; y < p.height; y++) {
          const row = y * p.width;
          for (let x = 0; x < p.width; x++) {
            const idx = 4 * (row + x);

            let count = 0;
            for (let i = 0; i < n; i++) {
              if (pixelsArray[i][idx + 3] > 180) {
                count++;
                if (count >= 2) break;
              }
            }

            if (count >= 2) {
              for (let oy = -radius; oy <= radius; oy++) {
                const ny = y + oy;
                if (ny < 0 || ny >= p.height) continue;
                const base = ny * p.width;
                for (let ox = -radius; ox <= radius; ox++) {
                  const nx = x + ox;
                  if (nx < 0 || nx >= p.width) continue;
                  const nidx = 4 * (base + nx);
                  overlapMask.pixels[nidx] = 255;
                  overlapMask.pixels[nidx + 1] = 255;
                  overlapMask.pixels[nidx + 2] = 255;
                  overlapMask.pixels[nidx + 3] = 255;
                }
              }
            }
          }
        }

        overlapMask.updatePixels();
      }

      function cutOutOverlap() {
        const ctx = p.drawingContext;
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        p.image(overlapMask, 0, 0);
        ctx.restore();
      }

      // ===================== VORONOI SHARDS =====================
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
          out.push({ pts: res });
        }
        return out;
      }

      function sampleOpaqueAdaptive(g, k, perShard) {
        g.loadPixels();
        const target = Math.max(Math.floor(k * perShard), k * 10);

        let coarseStride = 6;
        let countOpaque = 0;
        for (let y = 0; y < g.height; y += coarseStride) {
          const row = y * g.width;
          for (let x = 0; x < g.width; x += coarseStride) {
            const idx = 4 * (row + x);
            if (g.pixels[idx + 3] > 2) countOpaque++;
          }
        }
        const coarseCells =
          Math.ceil(g.width / coarseStride) *
          Math.ceil(g.height / coarseStride);
        const opaqueRatio = countOpaque / (coarseCells || 1);
        const estOpaque = g.width * g.height * opaqueRatio;
        const stride = p.constrain(
          Math.floor(Math.sqrt(estOpaque / target)),
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
        centers.push(points[Math.floor(p.random(points.length))]);
        while (centers.length < k) {
          let bestIdx = 0;
          let bestDist = -1;
          for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            let dn = Infinity;
            for (const c of centers) {
              const dx = pt.x - c.x;
              const dy = pt.y - c.y;
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
        for (const pt of points) {
          let which = 0;
          let best = (pt.x - centers[0].x) ** 2 + (pt.y - centers[0].y) ** 2;
          for (let j = 1; j < centers.length; j++) {
            const d = (pt.x - centers[j].x) ** 2 + (pt.y - centers[j].y) ** 2;
            if (d < best) {
              best = d;
              which = j;
            }
          }
          groups[which].push(pt);
        }
        return groups;
      }

      // ===================== GEOMETRY =====================
      function convexHull(points) {
        const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
        if (pts.length <= 1) return pts;
        const lower = [];
        for (const pt of pts) {
          while (
            lower.length >= 2 &&
            cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0
          ) {
            lower.pop();
          }
          lower.push(pt);
        }
        const upper = [];
        for (let i = pts.length - 1; i >= 0; i--) {
          const pt = pts[i];
          while (
            upper.length >= 2 &&
            cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0
          ) {
            upper.pop();
          }
          upper.push(pt);
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
          L.push(L[i] + Math.hypot(b.x - a.x, b.y - a.y));
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

      // ===================== RENDER SHARDS =====================
      function renderShards(list) {
        p.noStroke();
        p.fill(SHARD_COLOR[0], SHARD_COLOR[1], SHARD_COLOR[2], SHARD_COLOR[3]);
        for (const s of list) {
          p.beginShape();
          for (const v of s.pts) {
            p.vertex(v.x, v.y);
          }
          p.endShape(p.CLOSE);
        }
      }
    };

    pInstance = new p5(sketch);

    return () => {
      pInstance?.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="about-voronoi"
      style={{
        width: "100%",
        background: "#c5c5c5",
        overflow: "hidden",
      }}
    />
  );
}
