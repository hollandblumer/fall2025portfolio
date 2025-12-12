// HeroNavSliced.jsx
import React, { useMemo } from "react";

export default function WorkNavSliced({
  text = "CONTACT",
  rows = 3,
  fontSizePx = 30,
  color = "#A5A5A5",
  direction = "left", // "left" | "right"
  skewDegAbs = 1.5,
  offsetsPx = [-0.4, 0.25, -0.2],

  letterSpacing = 0,
  fontFamily = "''Times New Roman', Times, serif'",
  italic = true,
  fontWeight = 800,

  // motion
  jitter = true,
  ampPxRange = [0.2, 1.8],
  durMsRange = [1800, 3600],
  delayMsRange = [-1200, 0],

  // grain (masked to glyphs)
  grain = true,
  grainAmount = 0.9,
  grainContrast = 1.25,
  grainAlpha = 0.2,
  className = "",
  style = {},
  title,
}) {
  const sliceSize = 100 / rows;
  const label = title || text;
  const signedSkew = (direction === "right" ? 1 : -1) * Math.abs(skewDegAbs);

  const id = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const kf = `hns-wobble-${id}`;
  const filterId = `hns-grain-${id}`;
  const clipBase = `hns-clip-${id}`;

  const rng = (min, max) => min + Math.random() * (max - min);
  const baseOffsetPx = (i) => offsetsPx[i] ?? offsetsPx[offsetsPx.length - 1];

  const perSlice = useMemo(() => {
    return Array.from({ length: rows }).map((_, i) => ({
      idx: i,
      topPct: i * sliceSize,
      botPct: 100 - (i + 1) * sliceSize,
      heightPct: sliceSize,
      basePx: baseOffsetPx(i), // tiny per-row bias (can be 0 for perfect symmetry)
      ampPx: rng(ampPxRange[0], ampPxRange[1]) * (Math.random() < 0.5 ? -1 : 1),
      durMs: Math.round(rng(durMsRange[0], durMsRange[1])),
      delayMs: Math.round(rng(delayMsRange[0], delayMsRange[1])),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rows,
    sliceSize,
    JSON.stringify(offsetsPx),
    ...ampPxRange,
    ...durMsRange,
    ...delayMsRange,
  ]);

  // clamp grain params
  const _freq = Math.max(0.05, Math.min(2.0, grainAmount));
  const _contrast = Math.max(0.8, Math.min(2.0, grainContrast));
  const _alpha = Math.max(0, Math.min(1, grainAlpha));

  return (
    <span
      className={`hns-wrap hns-${id} ${className}`}
      aria-label={label}
      style={{
        position: "relative",
        display: "inline-block",
        whiteSpace: "nowrap",
        lineHeight: 1,
        color,
        fontFamily,
        fontWeight,
        fontStyle: italic ? "italic" : "normal",
        fontSize: `${fontSizePx}px`,
        letterSpacing: `${letterSpacing}px`,
        textAlign: "center",
        // helps consistent font metrics across HTML/SVG:
        fontVariantLigatures: "none",
        ...style,
      }}
    >
      <style>{`
        @keyframes ${kf} {
          0%   { transform: translateX(calc(var(--base))) skewX(var(--skew)); }
          50%  { transform: translateX(calc(var(--base) + var(--amp))) skewX(var(--skew)); }
          100% { transform: translateX(calc(var(--base))) skewX(var(--skew)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hns-${id} .slice { animation: none !important; }
        }
      `}</style>

      {/* Reserve precise inline width/height using HTML text (invisible) */}
      <span
        className="hns-base"
        style={{
          visibility: "hidden", // keeps layout without painting
          display: "inline-block",
        }}
      >
        {text}
      </span>

      {/* SVG overlay perfectly centers each slice at x=50% */}
      <svg
        className="hns-stage"
        aria-hidden="true"
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <defs>
          {/* One clipPath per slice (percent rects over the bounding box) */}
          {perSlice.map((s) => (
            <clipPath
              id={`${clipBase}-${s.idx}`}
              key={s.idx}
              clipPathUnits="objectBoundingBox"
            >
              <rect
                x="0"
                width="1"
                y={s.topPct / 100}
                height={s.heightPct / 100}
              />
            </clipPath>
          ))}

          {/* Grain filter masked to glyph alpha */}
          {grain && (
            <filter
              id={filterId}
              x="-10%"
              y="-10%"
              width="120%"
              height="120%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency={_freq}
                numOctaves="2"
                seed="2"
                stitchTiles="stitch"
                result="noise"
              />
              <feComponentTransfer in="noise" result="noisy">
                <feFuncR
                  type="linear"
                  slope={_contrast}
                  intercept={(1 - _contrast) / 2}
                />
                <feFuncG
                  type="linear"
                  slope={_contrast}
                  intercept={(1 - _contrast) / 2}
                />
                <feFuncB
                  type="linear"
                  slope={_contrast}
                  intercept={(1 - _contrast) / 2}
                />
              </feComponentTransfer>
              <feComposite
                in="noisy"
                in2="SourceAlpha"
                operator="in"
                result="noisyInGlyph"
              />
              <feColorMatrix
                in="noisyInGlyph"
                type="matrix"
                values={`
                  1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 ${_alpha} 0
                `}
                result="noisyA"
              />
              <feBlend in="SourceGraphic" in2="noisyA" mode="multiply" />
            </filter>
          )}
        </defs>

        {perSlice.map((s) => (
          <g
            key={s.idx}
            className="slice"
            clipPath={`url(#${clipBase}-${s.idx})`}
            style={{
              ["--base"]: `${s.basePx}px`,
              ["--skew"]: `${signedSkew}deg`,
              ["--amp"]: `${s.ampPx}px`,
              transform: `translateX(${s.basePx}px) skewX(${signedSkew}deg)`,
              willChange: "transform",
              animation: jitter
                ? `${kf} ${s.durMs}ms ease-in-out ${s.delayMs}ms infinite alternate`
                : "none",
            }}
          >
            <text
              x="50%"
              y="0"
              dominantBaseline="text-before-edge" // top aligns to bbox
              textAnchor="middle" // <-- true horizontal center
              fill={color}
              style={{
                fontFamily,
                fontWeight,
                fontStyle: italic ? "italic" : "normal",
                fontSize: `${fontSizePx}px`,
                letterSpacing: `${letterSpacing}px`,
                filter: grain ? `url(#${filterId})` : "none",
                paintOrder: "fill",
                shapeRendering: "geometricPrecision",
              }}
            >
              {text}
            </text>
          </g>
        ))}
      </svg>
    </span>
  );
}
