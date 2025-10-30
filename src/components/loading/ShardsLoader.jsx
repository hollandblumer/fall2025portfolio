import React, { useMemo } from "react";

export default function ShardsLoader({
  wordA = "LOADING",
  wordB = "HOLLAND",
  bg = "white",
  height = "100vh",
}) {
  const srcDoc = useMemo(() => {
    // Your original HTML, with WORD_A / WORD_B / background injected
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>LOADING → HOLLAND — sharper shards (with metallic break effect)</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html,body{
    margin:0;height:100%;
    background:${bg};
    overflow:hidden;
  }
  canvas{display:block;background:transparent}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.2/p5.min.js"></script>
</head>
<body>
<script>
/* ===================== Config ===================== */
const WORD_A = ${JSON.stringify(wordA)};
const WORD_B = ${JSON.stringify(wordB)};
const FONT_FAMILY = "sans-serif";

/* mobile-aware knobs */
const isMobile = () => windowWidth <= 820;
const FINAL_COUNT_DESKTOP = 140;
const FINAL_COUNT_MOBILE  = 140;

/* hard cap on corners to keep facets straight/pointy */
const MAX_VERTS_DESKTOP = 10;
const MAX_VERTS_MOBILE  = 8;

/* tracking/margins */
let LETTER_TRACKING = 0.08; // em
let TEXT_MARGIN = 0.12;

/* timing */
const STEP_MS = 520;             // time per refinement step during LOADING break
const HOLD_AFTER_STEPS_MS = 420; // hold final LOADING shards before morph
const MORPH_MS = 1200;           // LOADING → HOLLAND morph

/* will be set per device size */
let MAX_VERTS = MAX_VERTS_DESKTOP;
let TARGET_POINTS_PER_SHARD = 60;

/* ===== Metallic look knobs ===== */
const METAL_RATIO = 0.5;               // % of shards that render as “metal”
const LIGHT_DIR   = {x: 0.7, y: -0.5}; // screen-space light direction
const SPEC_STREAK = 0.85;              // 0..1 position of specular stripe
const NOISE_ALPHA = 0.06;              // subtle noise overlay on metallic shards

/* ===== Break effect knobs (only for LOADING refinement) ===== */
const BREAK_JITTER_MIN = 6;            // px radial jitter from parent centroid
const BREAK_JITTER_MAX = 16;           // px
const BREAK_FADE_PARENTS_EXP = 1.3;    // faster fade of parent chunk
const BREAK_SCALE_PULSE = 0.08;        // slight start “pop” on children

/* ===================== State ===================== */
let gMaskA, gMaskB;
let loadingFinal = [], loadingStages = [], parentToChildren = [];
let shardsB = [], pairsToB = [];
let effectiveCounts = [];
let transitions = 0, t0 = 0;

/* ===================== p5 ===================== */
function setup(){
  sizeToWindow();
  pixelDensity(1);
  noStroke();
  textFont(FONT_FAMILY);
  rebuildAll();
  t0 = millis();
}

function draw(){
  clear();
  const t = millis() - t0;
  const stepsTotalMs = transitions * STEP_MS;

  // Phase 1: LOADING refinement (big → medium → small) with BREAK effect
  if (t < stepsTotalMs){
    const k = floor(t / STEP_MS);
    const u = easeInOutCubic((t - k*STEP_MS) / STEP_MS);
    renderRefineBreak(k, u);  // <<— upgraded break animation
    return;
  }

  // Small hold on final LOADING
  if (t < stepsTotalMs + HOLD_AFTER_STEPS_MS){
    renderShards(loadingStages.at(-1),1.0);
    return;
  }

  // Phase 2: Morph LOADING (final) → HOLLAND
  const morphT = t - (stepsTotalMs + HOLD_AFTER_STEPS_MS);
  if (morphT <= MORPH_MS){
    const u = easeInOutCubic(morphT / MORPH_MS);
    renderInterpolated(loadingStages.at(-1), shardsB, pairsToB, u);
    return;
  }

  // End state: show HOLLAND
  renderShards(shardsB,1.0);
}

function windowResized(){
  sizeToWindow();
  rebuildAll();
  t0 = millis();
}

/* ===================== Build / Rebuild ===================== */
function sizeToWindow(){
  createCanvas(windowWidth, windowHeight);
  MAX_VERTS = isMobile() ? MAX_VERTS_MOBILE : MAX_VERTS_DESKTOP;
  TARGET_POINTS_PER_SHARD = isMobile() ? 46 : 60;
  TEXT_MARGIN = isMobile() ? 0.08 : 0.12;
  LETTER_TRACKING = isMobile() ? 0.06 : 0.08;
}

function desiredFinalCount(){
  return isMobile() ? FINAL_COUNT_MOBILE : FINAL_COUNT_DESKTOP;
}

function rebuildAll(){
  randomSeed(1337);
  const tsA = fitTextSize(WORD_A);
  const tsB = fitTextSize(WORD_B);
  gMaskA = drawWordMask(WORD_A, tsA);
  gMaskB = drawWordMask(WORD_B, tsB);

  const desiredFinal = desiredFinalCount();
  loadingFinal = buildShardsFromMask(gMaskA, desiredFinal);
  const FINAL_COUNT_ACTUAL = loadingFinal.length;

  shardsB = buildShardsFromMask(gMaskB, FINAL_COUNT_ACTUAL);

  const n = min(loadingFinal.length, shardsB.length);
  pairsToB = matchByCentroid(loadingFinal.slice(0,n), shardsB.slice(0,n));

  // 3 refinement steps: big → medium → small
  const stage1 = max(1, round(FINAL_COUNT_ACTUAL * 0.33));
  const stage2 = max(stage1+1, round(FINAL_COUNT_ACTUAL * 0.66));
  effectiveCounts = [stage1, stage2, FINAL_COUNT_ACTUAL];

  const hierarchy = buildMergeHierarchy(loadingFinal, effectiveCounts);

  loadingStages = [];
  parentToChildren = [];
  for (let s=0; s<effectiveCounts.length; s++){
    const snapshot = hierarchy.snapshots[s];
    const stage = groupsToPolys(snapshot, loadingFinal);
    loadingStages.push(stage);

    if (s < effectiveCounts.length - 1){
      const nextSnapshot = hierarchy.snapshots[s+1];
      const nextMembers = nextSnapshot.map(g=> new Set(g));
      const map = [];
      for (let i=0;i<snapshot.length;i++){
        const parentSet = new Set(snapshot[i]);
        const childIdxs = [];
        for (let j=0;j<nextSnapshot.length;j++){
          if (isSubset(nextMembers[j], parentSet)) childIdxs.push(j);
        }
        map[i] = childIdxs;
      }
      parentToChildren.push(map);
    }
  }
  transitions = max(0, effectiveCounts.length - 1);
}

/* ===================== Hierarchy helpers ===================== */
function buildMergeHierarchy(finalShards, counts){
  let groups = finalShards.map((_,i)=>[i]);
  const centers = finalShards.map(s=>s.centroid);
  const groupCentroid = (g)=>{
    let x=0,y=0; for(const idx of g){ x+=centers[idx].x; y+=centers[idx].y; }
    const k=g.length||1; return {x:x/k,y:y/k};
  };
  let groupCenters = groups.map(groupCentroid);

  const targets = counts.slice().sort((a,b)=>b-a);
  const minTarget = targets[targets.length-1];
  const snapshotByCount = {};
  if (targets.includes(groups.length)) snapshotByCount[groups.length]=groups.map(g=>g.slice());

  while (groups.length > minTarget){
    let bestI=-1,bestJ=-1,bestD=Infinity;
    for (let i=0;i<groups.length;i++){
      const ci = groupCenters[i];
      for (let j=i+1;j<groups.length;j++){
        const cj = groupCenters[j];
        const d = (ci.x-cj.x)**2 + (ci.y-cj.y)**2;
        if (d<bestD){bestD=d;bestI=i;bestJ=j;}
      }
    }
    const merged = groups[bestI].concat(groups[bestJ]);
    groups.splice(bestJ,1);
    groupCenters.splice(bestJ,1);
    groups[bestI] = merged;
    groupCenters[bestI] = groupCentroid(merged);

    if (targets.includes(groups.length)) snapshotByCount[groups.length] = groups.map(g=>g.slice());
  }
  const ordered = counts.map(c => snapshotByCount[c] || groups.map(g=>g.slice()));
  return { snapshots: ordered };
}
function isSubset(aSet,bSet){ for (const v of aSet){ if(!bSet.has(v)) return false; } return true; }

/* turn group indices into polygons with *sharp* facets */
function groupsToPolys(groups, baseShards){
  const out=[];
  for (const g of groups){
    const pts=[];
    for (const idx of g){ for (const p of baseShards[idx].pts) pts.push({x:p.x,y:p.y}); }
    if (pts.length<3) continue;
    const hull = convexHull(pts);
    if (!hull || hull.length<3) continue;
    const sharp = shardifyHull(hull, MAX_VERTS);
    // average base color, pick metallic flag deterministically per group (stable)
    const avg = averageBronze(g.map(i=>baseShards[i].fill));
    const metal = (hashInt(g[0]*2654435761 >>> 0) % 1000)/1000 < METAL_RATIO;
    out.push({ 
      pts:sharp, 
      centroid:centroid(sharp), 
      fill: avg,
      metal 
    });
  }
  return out;
}

/* ===================== Rendering ===================== */
function renderShards(list, alphaScale){
  for (const s of list){
    if (s.metal){
      drawMetalShard(s, alphaScale ?? 1);
    } else {
      const a = (s.fill[3] ?? 232) * (alphaScale ?? 1);
      fill(s.fill[0], s.fill[1], s.fill[2], a);
      beginShape(); for (let v of s.pts) vertex(v.x, v.y); endShape(CLOSE);
    }
  }
}

/* ---------- NEW: “Break” animation for LOADING refinement ---------- */
function renderRefineBreak(stageIndex, u){
  const parents = loadingStages[stageIndex];
  const children = loadingStages[stageIndex+1];
  const mapping = parentToChildren[stageIndex];

  // Parents fade a bit faster so break reads cleanly
  const parentAlpha = pow(1 - u, BREAK_FADE_PARENTS_EXP);
  renderShardsAlphaOverride(parents, parentAlpha);

  // Children burst from parent centroid with slight jitter & overshoot
  const ub = easeOutBack(u); // snappy ease to sell the break
  for (let pi=0; pi<mapping.length; pi++){
    const parent = parents[pi];
    const pc = parent.centroid;

    // small deterministic jitter seed (per child)
    for (const ci of mapping[pi]){
      const child = children[ci];

      // jitter vector for this child (stable, seeded by ci)
      const jv = seededJitter(ci, BREAK_JITTER_MIN, BREAK_JITTER_MAX);

      // start points near parent's centroid (with tiny outward bias)
      const startCx = pc.x + jv.x;
      const startCy = pc.y + jv.y;

      // slight “pop” scale on early frames around the centroid
      const pulse = 1.0 + BREAK_SCALE_PULSE * (1 - u);

      // build interpolated polygon
      const interp = [];
      for (const p of child.pts){
        const sx = startCx + (p.x - pc.x) * 0.0; // start collapsed near centroid
        const sy = startCy + (p.y - pc.y) * 0.0;
        // pulse around centroid early, then land on true vertex
        const px = pc.x + (sx - pc.x) * pulse;
        const py = pc.y + (sy - pc.y) * pulse;
        interp.push({
          x: lerp(px, p.x, ub),
          y: lerp(py, p.y, ub)
        });
      }

      // draw child shard with progressive alpha = u
      const shard = { pts: interp, centroid: centroid(interp), fill: child.fill, metal: child.metal };
      if (shard.metal) drawMetalShard(shard, u);
      else {
        const a = (shard.fill[3] ?? 232) * u;
        fill(shard.fill[0], shard.fill[1], shard.fill[2], a);
        beginShape(); for (const v of shard.pts) vertex(v.x, v.y); endShape(CLOSE);
      }
    }
  }
}

function renderShardsAlphaOverride(list, aScale){
  for (const s of list){
    const a = (s.fill[3] ?? 232) * (aScale ?? 1);
    if (s.metal) drawMetalShard(s, a / 255); else {
      fill(s.fill[0], s.fill[1], s.fill[2], a);
      beginShape(); for (let v of s.pts) vertex(v.x, v.y); endShape(CLOSE);
    }
  }
}

function renderInterpolated(A,B,P,u){
  const N = min(P.length, A.length, B.length);
  for (let i=0;i<N;i++){
    const {aIndex,bIndex} = P[i];
    const sA = A[aIndex], sB = B[bIndex];

    // interpolate polygon & color
    const ax = sA.pts, bx = sB.pts;
    const m = min(ax.length, bx.length);
    const poly = [];
    for (let j=0;j<m;j++){
      poly.push({ x: lerp(ax[j].x, bx[j].x, u), y: lerp(ax[j].y, bx[j].y, u) });
    }
    const r = lerp(sA.fill[0], sB.fill[0], u);
    const g = lerp(sA.fill[1], sB.fill[1], u);
    const b = lerp(sA.fill[2], sB.fill[2], u);
    const a = lerp(sA.fill[3] ?? 232, sB.fill[3] ?? 232, u);

    const metal = sA.metal || sB.metal;
    const shard = { pts: poly, centroid: centroid(poly), fill:[r,g,b,a], metal };
    if (metal) drawMetalShard(shard, 1.0);
    else {
      fill(r,g,b,a);
      beginShape(); for (const v of poly) vertex(v.x, v.y); endShape(CLOSE);
    }
  }
}

/* ====== Metallic painter (canvas 2D gradient + clip + tiny noise) ====== */
function drawMetalShard(s, alphaScale){
  const ctx = drawingContext;
  if (!s || !s.pts || s.pts.length<3) return;

  const base = {r: s.fill[0], g: s.fill[1], b: s.fill[2]};
  const hsl = rgbToHsl(base.r, base.g, base.b);
  const dark = hslAdjust(hsl, 0, +0.15, -0.28);
  const mid1 = hslAdjust(hsl, 0, -0.05, +0.00);
  const bright= hslAdjust(hsl, 0, -0.18, +0.24);
  const mid2 = hslAdjust(hsl, 0, -0.03, -0.02);
  const rgba = (c,a)=>\`rgba(\${c.r},\${c.g},\${c.b},\${(a*(alphaScale??1)).toFixed(3)})\`;

  const bb = bboxOfPoly(s.pts);
  const cx = s.centroid.x, cy = s.centroid.y;
  const L = norm2(LIGHT_DIR.x, LIGHT_DIR.y);
  const dirx = LIGHT_DIR.x / L, diry = LIGHT_DIR.y / L;
  const halfDiag = 0.65 * Math.hypot(bb.w, bb.h);
  const x1 = cx - dirx * halfDiag, y1 = cy - diry * halfDiag;
  const x2 = cx + dirx * halfDiag, y2 = cy + diry * halfDiag;

  const grad = ctx.createLinearGradient(x1,y1,x2,y2);
  grad.addColorStop(0.00, rgba(dark,  0.95));
  grad.addColorStop(0.28, rgba(mid1,  0.98));
  grad.addColorStop(SPEC_STREAK*0.98, rgba(bright, 1.00));
  grad.addColorStop(Math.min(1, SPEC_STREAK+0.015), rgba(mid2, 0.98));
  grad.addColorStop(1.00, rgba(dark,  0.95));

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s.pts[0].x, s.pts[0].y);
  for (let i=1;i<s.pts.length;i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.globalCompositeOperation = 'lighter';
  const streak = ctx.createLinearGradient(x1,y1,x2,y2);
  const brightRGB = hslToRgbObj(hsl.h, clamp01(hsl.s*0.5), clamp01(hsl.l*0.9));
  streak.addColorStop(Math.max(0,SPEC_STREAK-0.02), \`rgba(\${brightRGB.r},\${brightRGB.g},\${brightRGB.b},\${0.06*(alphaScale??1)})\`);
  streak.addColorStop(SPEC_STREAK, \`rgba(\${brightRGB.r},\${brightRGB.g},\${brightRGB.b},\${0.14*(alphaScale??1)})\`);
  streak.addColorStop(Math.min(1,SPEC_STREAK+0.02), \`rgba(\${brightRGB.r},\${brightRGB.g},\${brightRGB.b},\${0.06*(alphaScale??1)})\`);
  ctx.fillStyle = streak;
  ctx.fill();

  if (NOISE_ALPHA > 0){
    const n = 10;
    ctx.globalCompositeOperation = 'overlay';
    for (let i=0;i<n;i++){
      ctx.globalAlpha = NOISE_ALPHA*(alphaScale??1);
      const nx = x1 + (x2-x1)*random();
      const ny = y1 + (y2-y1)*random();
      const r = 0.35*Math.min(bb.w,bb.h)*(0.2+0.8*random());
      const no = ctx.createRadialGradient(nx,ny,0, nx,ny,r);
      no.addColorStop(0, 'rgba(255,255,255,0.12)');
      no.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = no;
      ctx.fill();
    }
  }

  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/* ===================== Text → Mask → Shards ===================== */
function fitTextSize(str){
  const usableW = width * (1 - TEXT_MARGIN*2);
  const usableH = height * (1 - TEXT_MARGIN*2);

  let ts = min(usableW, usableH);
  textSize(ts);

  const totalWidth = (size)=>{
    let total=0, track=size*LETTER_TRACKING;
    for (let i=0;i<str.length;i++){
      total += textWidth(str[i]);
      if (i<str.length-1) total += track;
    }
    return total;
  };

  while (totalWidth(ts) > usableW && ts > 8){ ts *= 0.94; textSize(ts); }
  const asc = textAscent(), dsc = textDescent();
  while ((asc+dsc) > usableH && ts > 8){ ts *= 0.94; textSize(ts); }

  return ts;
}

function drawWordMask(str, ts){
  const g = createGraphics(width, height);
  g.pixelDensity(1);
  g.clear();
  g.fill(255); g.noStroke();
  g.textFont(FONT_FAMILY);
  g.textStyle(BOLD);
  g.textSize(ts);

  // total width (+ tracking) for horizontal centering
  let totalW=0, track=ts*LETTER_TRACKING;
  for (let i=0;i<str.length;i++){
    totalW += g.textWidth(str[i]);
    if (i<str.length-1) totalW += track;
  }
  const left = (width - totalW) * 0.5;

  // vertical centering using ascent/descent
  const asc = g.textAscent(), dsc = g.textDescent();
  const baseY = height/2 + (asc - dsc)/2;

  let x = left;
  for (let i=0;i<str.length;i++){
    g.text(str[i], x, baseY);
    x += g.textWidth(str[i]) + (i<str.length-1 ? track : 0);
  }
  return g;
}

/* ===================== Sampling / Clustering / Geometry ===================== */
function buildShardsFromMask(g, shardCount){
  const samples = sampleOpaqueAdaptive(g, shardCount, TARGET_POINTS_PER_SHARD);
  const groups = seededKMeansSinglePass(samples, shardCount);
  const out=[];
  for (const pts of groups){
    if (!pts || pts.length<3) continue;
    const hull = convexHull(pts);
    if (!hull || hull.length<3) continue;
    const sharp = shardifyHull(hull, MAX_VERTS);
    out.push({ 
      pts:sharp, 
      fill: bronzeColor(), 
      centroid: centroid(sharp),
      metal: random() < METAL_RATIO
    });
  }
  return out;
}

function sampleOpaqueAdaptive(g, k, perShard){
  g.loadPixels();
  const target = max(floor(k * perShard), k*10);

  let coarseStride = 6, countOpaque = 0;
  for (let y=0; y<g.height; y+=coarseStride){
    const row = y * g.width;
    for (let x=0; x<g.width; x+=coarseStride){
      const idx = 4 * (row + x);
      if (g.pixels[idx+3] > 2) countOpaque++;
    }
  }
  const coarseCells = Math.ceil(g.width/coarseStride) * Math.ceil(g.height/coarseStride);
  const opaqueRatio = countOpaque / (coarseCells || 1);
  const estOpaque = g.width * g.height * opaqueRatio;
  const stride = constrain(Math.floor(Math.sqrt(estOpaque/target)), 2, isMobile()?12:12);

  const pts=[];
  for (let y=0; y<g.height; y+=stride){
    const row = y * g.width;
    for (let x=0; x<g.width; x+=stride){
      const idx = 4 * (row + x);
      if (g.pixels[idx+3] > 2){
        const jx = x + random(-0.35*stride, 0.35*stride);
        const jy = y + random(-0.35*stride, 0.35*stride);
        pts.push({x:jx,y:jy});
      }
    }
  }
  return pts;
}

function seededKMeansSinglePass(points,k){
  if (!points.length || k<=1) return [points];
  const centers=[];
  centers.push(points[floor(random(points.length))]);
  while (centers.length<k){
    let bestIdx=0, bestDist=-1;
    for (let i=0;i<points.length;i++){
      const p = points[i];
      let dn = Infinity;
      for (const c of centers){
        const dx=p.x-c.x, dy=p.y-c.y;
        const d=dx*dx+dy*dy;
        if (d<dn) dn=d;
      }
      if (dn>bestDist){bestDist=dn; bestIdx=i;}
    }
    centers.push(points[bestIdx]);
  }
  const groups=Array.from({length:k},()=>[]);
  for (const p of points){
    let which=0, best=(p.x-centers[0].x)**2+(p.y-centers[0].y)**2;
    for (let j=1;j<centers.length;j++){
      const d=(p.x-centers[j].x)**2+(p.y-centers[j].y)**2;
      if (d<best){best=d; which=j;}
    }
    groups[which].push(p);
  }
  return groups;
}

/* ---------- Geometry utils ---------- */
function convexHull(points){
  const pts = points.slice().sort((a,b)=>(a.x-b.x)||(a.y-b.y));
  if (pts.length<=1) return pts;
  const lower=[]; for (const p of pts){ while (lower.length>=2 && cross(lower[lower.length-2],lower[lower.length-1],p)<=0) lower.pop(); lower.push(p); }
  const upper=[]; for (let i=pts.length-1;i>=0;i--){ const p=pts[i]; while (upper.length>=2 && cross(upper[upper.length-2],upper[upper.length-1],p)<=0) upper.pop(); upper.push(p); }
  upper.pop(); lower.pop(); return lower.concat(upper);
}
function cross(o,a,b){ return (a.x-o.x)*(b.y-o.y) - (a.y-o.y)*(b.x-o.x); }
function centroid(poly){
  let cx=0,cy=0; for (const p of poly){ cx+=p.x; cy+=p.y; }
  const n=poly.length||1; return {x:cx/n,y:cy/n};
}
function bboxOfPoly(poly){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const p of poly){ if (p.x<minX) minX=p.x; if (p.y<minY) minY=p.y; if (p.x>maxX) maxX=p.x; if (p.y>maxY) maxY=p.y; }
  return {x:minX,y:minY,w:maxX-minX,h:maxY-minY};
}
function norm2(x,y){ return Math.hypot(x,y)||1; }

/* ===================== Shardifier (RDP + greedy decimator) ===================== */
function shardifyHull(hull, maxVerts){
  const H = ensureClockwise(hull.slice());
  const eps = Math.max(1.5, 0.002 * Math.max(width, height));
  let simp = rdpClosed(H, eps);
  if (simp.length > maxVerts) simp = decimateByAngleImportance(simp, maxVerts);
  if (simp.length < 3){
    const a = H[0], b = H[Math.floor(H.length/3)], c = H[Math.floor(2*H.length/3)];
    return [a,b,c];
  }
  return simp;
}

function ensureClockwise(poly){
  let area=0;
  for (let i=0;i<poly.length;i++){
    const a=poly[i], b=poly[(i+1)%poly.length];
    area += (a.x*b.y - b.x*a.y);
  }
  if (area>0) poly.reverse();
  return poly;
}

function rdpClosed(poly, eps){
  const open = poly.slice(); open.push(poly[0]);
  const simplified = rdpOpen(open, eps); simplified.pop();
  return simplified;
}
function rdpOpen(pts, eps){
  if (pts.length <= 2) return pts.slice();
  const [first, last] = [pts[0], pts[pts.length-1]];
  let maxDist = -1, idx = -1;
  for (let i=1; i<pts.length-1; i++){
    const d = perpDist(pts[i], first, last);
    if (d > eps && d > maxDist){ maxDist = d; idx = i; }
  }
  if (maxDist > eps){
    const left = rdpOpen(pts.slice(0, idx+1), eps);
    const right = rdpOpen(pts.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}
function perpDist(p, a, b){
  const vx=b.x-a.x, vy=b.y-a.y;
  const wx=p.x-a.x, wy=p.y-a.y;
  const L2 = vx*vx + vy*vy || 1;
  const t = Math.max(0, Math.min(1, (wx*vx + wy*vy)/L2));
  const projx = a.x + t*vx, projy = a.y + t*vy;
  const dx=p.x-projx, dy=p.y-projy;
  return Math.hypot(dx,dy);
}
function decimateByAngleImportance(poly, targetCount){
  const imp = () => poly.map((_,i)=>{
    const a = poly[(i-1+poly.length)%poly.length];
    const b = poly[i];
    const c = poly[(i+1)%poly.length];
    const v1 = {x:b.x-a.x, y:b.y-a.y};
    const v2 = {x:c.x-b.x, y:c.y-b.y};
    const n1 = Math.hypot(v1.x,v1.y)||1, n2 = Math.hypot(v2.x,v2.y)||1;
    const dot = (v1.x*v2.x + v1.y*v2.y)/(n1*n2);
    const clamped = Math.max(-1, Math.min(1, dot));
    const angle = Math.acos(clamped);
    return {i, score: Math.sin(angle)};
  });
  while (poly.length > targetCount && poly.length > 3){
    const scores = imp().sort((a,b)=>a.score-b.score);
    const kill = scores[0].i;
    poly.splice(kill,1);
  }
  return poly;
}

/* ===================== Pairing ===================== */
function matchByCentroid(listA,listB){
  const used=new Array(listB.length).fill(false);
  const pairs=[];
  for (let i=0;i<listA.length;i++){
    let bestJ=-1,bestD=Infinity;
    const ca=listA[i].centroid;
    for (let j=0;j<listB.length;j++){
      if (used[j]) continue;
      const cb=listB[j].centroid;
      const d=(ca.x-cb.x)**2+(ca.y-cb.y)**2;
      if (d<bestD){bestD=d; bestJ=j;}
    }
    if (bestJ>=0){ used[bestJ]=true; pairs.push({aIndex:i,bIndex:bestJ}); }
  }
  return pairs;
}

/* ===================== Colors ===================== */
function bronzeColor(){
  const h = random(26, 38);
  const s = random(36, 56);
  const l = random(40, 58);
  const a = 232;
  const [r,g,b] = hslToRgb(h/360, s/100, l/100);
  return [r,g,b,a];
}
function averageBronze(arr){
  let r=0,g=0,b=0,a=0,n=arr.length||1;
  for (const c of arr){ r+=c[0]; g+=c[1]; b+=c[2]; a+=(c[3]??232); }
  return [Math.round(r/n),Math.round(g/n),Math.round(b/n),Math.round(a/n)];
}
function hslToRgb(h,s,l){
  if (s===0){ const v=Math.round(l*255); return [v,v,v]; }
  const q = l<0.5 ? l*(1+s) : l + s - l*s;
  const p = 2*l - q;
  return [hue2rgb(p,q,h+1/3), hue2rgb(p,q,h), hue2rgb(p,q,h-1/3)].map(v=>Math.round(v*255));
}
function hue2rgb(p,q,t){
  if (t<0) t+=1; if (t>1) t-=1;
  if (t<1/6) return p + (q-p)*6*t;
  if (t<1/2) return q;
  if (t<2/3) return p + (q-p)*(2/3 - t)*6;
  return p;
}

/* ===== helpers for metallic palette ===== */
function rgbToHsl(r,g,b){
  r/=255; g/=255; b/=255;
  const maxv=Math.max(r,g,b), minv=Math.min(r,g,b);
  let h,s,l=(maxv+minv)/2;
  if (maxv===minv){ h=s=0; }
  else {
    const d=maxv-minv;
    s = l>0.5 ? d/(2-maxv-minv) : d/(maxv+minv);
    switch(maxv){
      case r: h=(g-b)/d + (g<b?6:0); break;
      case g: h=(b-r)/d + 2; break;
      case b: h=(r-g)/d + 4; break;
    }
    h/=6;
  }
  return {h,s,l};
}
function hslToRgbObj(h,s,l){
  const arr=hslToRgb(h,s,l);
  return {r:arr[0], g:arr[1], b:arr[2]};
}
function hslAdjust(hsl, dh, ds, dl){
  return hslToRgbObj( (hsl.h+dh+1)%1, clamp01(hsl.s+ds), clamp01(hsl.l+dl) );
}
function clamp01(x){ return Math.max(0, Math.min(1, x)); }

/* ===================== Easing ===================== */
function easeInOutCubic(x){ return x<0.5 ? 4*x*x*x : 1 - Math.pow(-2*x+2,3)/2; }
function easeOutBack(x){
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3*Math.pow(x-1,3) + c1*Math.pow(x-1,2);
}

/* ===================== Small utils ===================== */
function hashInt(v){
  v = ((v>>>16) ^ v) * 0x45d9f3b;
  v = ((v>>>16) ^ v) * 0x45d9f3b;
  v =  (v>>>16) ^ v;
  return v>>>0;
}

// Stable small jitter per id (for break directions)
function seededJitter(id, minR, maxR){
  let h = hashInt(id*2654435761 >>> 0);
  const rand01 = ()=> (h = hashInt(h+0x9e3779b9) ) / 0xffffffff;
  const ang = rand01()*TWO_PI;
  const rad = lerp(minR, maxR, rand01());
  return { x: Math.cos(ang)*rad, y: Math.sin(ang)*rad };
}
</script>
</body>
</html>`;
  }, [wordA, wordB, bg]);

  return (
    <iframe
      title="Shards Loader"
      style={{ width: "100%", height, border: "0", display: "block" }}
      sandbox="allow-scripts allow-same-origin"
      srcDoc={srcDoc}
    />
  );
}
