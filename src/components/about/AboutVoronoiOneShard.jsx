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
      const MIN_SPACING_FACTOR = 0.4;
      const MAX_SPACING_FACTOR = 0.55;
      const TRACK_SPEED = 0.0008;

      // internal canvas size: wide band, not super tall
      const BASE_WIDTH = 1080;
      const BASE_HEIGHT = 460;

      // Calculate the intended aspect ratio
      const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT; // ~2.348

      // Voronoi / shards
      let RESAMPLED_VERTS = 14;
      let TARGET_POINTS_PER_SHARD = 60;

      // GOOEY EFFECT CONFIG (NEW)
      const NOISE_SCALE = 0.01; // How zoomed in the Perlin Noise is (smoother effect)
      const MAX_GOOEY_DISTORTION = 6; // Max pixel distance to move vertices
      const NOISE_SPEED = 0.001; // Speed of the gooey animation
      let noiseOffset = 0; // The current noise offset based on time

      let overlapMasks = [];
      let combinedOverlapMask;
      let letterMasks = [];

      const isMobile = () => p.windowWidth <= 820;

      function initGraphics() {
        RESAMPLED_VERTS = isMobile() ? 18 : 14;
        TARGET_POINTS_PER_SHARD = isMobile() ? 46 : 60;

        combinedOverlapMask = p.createGraphics(p.width, p.height);
        combinedOverlapMask.pixelDensity(1);

        letterMasks = letters.map(() => {
          const g = p.createGraphics(p.width, p.height);
          g.pixelDensity(1);
          return g;
        });

        overlapMasks = Array.from({ length: letters.length - 1 }, () => {
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

        canvas.elt.style.width = "100%";
        canvas.elt.style.height = `calc(100% / ${ASPECT_RATIO})`;

        initGraphics();
      };

      p.windowResized = () => {
        initGraphics();
      };

      p.draw = () => {
        p.background(BG_COLOR);

        const t = p.millis();
        const cx = p.width * 0.5;
        const cy = p.height * 0.5;

        // NEW: Update noise offset for animation
        noiseOffset += p.deltaTime * NOISE_SPEED;

        const fontSize = p.height * 0.75;

        const s = p.sin(t * TRACK_SPEED) * 0.5 + 0.5;
        const spacing = p.lerp(
          fontSize * MIN_SPACING_FACTOR,
          fontSize * MAX_SPACING_FACTOR,
          s
        );

        // clear masks for this frame
        letterMasks.forEach((g) => g.clear());
        overlapMasks.forEach((g) => g.clear());
        combinedOverlapMask.clear();

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

        // 2) Build separate overlap masks for each pair (A/B, B/O, etc.)
        buildAllOverlapMasks(letterMasks, overlapMasks, combinedOverlapMask);

        // Array to hold all final shards (one per overlap mask)
        const allShards = [];

        // 3) Process each overlap mask into a single shard
        for (const overlapGfx of overlapMasks) {
          // Pass 1 as the shard count to get one large shard per mask.
          const shard = buildShardFromMask(overlapGfx, 1);
          if (shard) {
            allShards.push(shard);
          }
        }

        // 4) cut overlap out of letters using the combined mask
        cutOutOverlap(combinedOverlapMask);

        // 5) draw shards
        // Pass the noiseOffset for the gooey effect
        renderShards(allShards, noiseOffset);
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

      function buildAllOverlapMasks(letterMasks, overlapMasks, combinedMask) {
        const n = letterMasks.length;
        if (n < 2) return;

        const radius = 3;

        combinedMask.loadPixels();

        const pixelsArray = letterMasks.map((g) => {
          g.loadPixels();
          return g.pixels;
        });

        for (let i = 0; i < n - 1; i++) {
          const currentPairMask = overlapMasks[i];
          currentPairMask.loadPixels();

          const pxA = pixelsArray[i];
          const pxB = pixelsArray[i + 1];

          for (let y = 0; y < p.height; y++) {
            const row = y * p.width;
            for (let x = 0; x < p.width; x++) {
              const idx = 4 * (row + x);

              if (pxA[idx + 3] > 180 && pxB[idx + 3] > 180) {
                for (let oy = -radius; oy <= radius; oy++) {
                  const ny = y + oy;
                  if (ny < 0 || ny >= p.height) continue;
                  const base = ny * p.width;
                  for (let ox = -radius; ox <= radius; ox++) {
                    const nx = x + ox;
                    if (nx < 0 || nx >= p.width) continue;
                    const nidx = 4 * (base + nx);

                    currentPairMask.pixels[nidx] = 255;
                    currentPairMask.pixels[nidx + 1] = 255;
                    currentPairMask.pixels[nidx + 2] = 255;
                    currentPairMask.pixels[nidx + 3] = 255;

                    combinedMask.pixels[nidx] = 255;
                    combinedMask.pixels[nidx + 1] = 255;
                    combinedMask.pixels[nidx + 2] = 255;
                    combinedMask.pixels[nidx + 3] = 255;
                  }
                }
              }
            }
          }
          currentPairMask.updatePixels();
        }

        combinedMask.updatePixels();
      }

      function cutOutOverlap(g) {
        const ctx = p.drawingContext;
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        p.image(g, 0, 0);
        ctx.restore();
      }

      // ===================== VORONOI SHARDS =====================
      function buildShardFromMask(g, shardCount = 1) {
        const samples = sampleOpaqueAdaptive(
          g,
          shardCount,
          TARGET_POINTS_PER_SHARD
        );

        if (!samples.length) return null;

        const groups = seededKMeansSinglePass(samples, 1);

        const pts = groups[0];

        if (!pts || pts.length < 3) return null;

        const hull = convexHull(pts);
        if (!hull || hull.length < 3) return null;

        // We use RESAMPLED_VERTS to provide points for the noise-based distortion
        const res = resampleClosedPolyline(hull, RESAMPLED_VERTS);
        return { pts: res };
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
          const row = y * p.width;
          for (let x = 0; x < p.width; x += stride) {
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
              const dSq = dx * dx + dy * dy;
              if (dSq < dn) dn = dSq;
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

      // ===================== GEOMETRY (Unchanged) =====================
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

      // ===================== RENDER SHARDS (UPDATED for Gooey Effect) =====================
      function renderShards(list, timeOffset) {
        p.noStroke();
        p.fill(SHARD_COLOR[0], SHARD_COLOR[1], SHARD_COLOR[2], SHARD_COLOR[3]);

        for (const s of list) {
          p.beginShape();
          for (let i = 0; i < s.pts.length; i++) {
            const v = s.pts[i];

            // Perlin Noise offset calculation
            // Base the noise lookup on position, vertex index, and timeOffset
            const xNoise = p.noise(
              v.x * NOISE_SCALE,
              v.y * NOISE_SCALE,
              timeOffset
            );
            const yNoise = p.noise(
              v.x * NOISE_SCALE + 100, // Offset x-noise space to get different noise values
              v.y * NOISE_SCALE + 100,
              timeOffset
            );

            // Map noise from [0, 1] to [-1, 1] then scale by MAX_GOOEY_DISTORTION
            const dx = p.map(xNoise, 0, 1, -1, 1) * MAX_GOOEY_DISTORTION;
            const dy = p.map(yNoise, 0, 1, -1, 1) * MAX_GOOEY_DISTORTION;

            p.vertex(v.x + dx, v.y + dy);
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
