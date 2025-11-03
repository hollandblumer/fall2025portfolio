// HeroNavSliced.jsx
import React, { useMemo } from "react";

export default function HeroNavSliced({
  text = "CONTACT",
  rows = 3,
  fontSizePx = 50,
  color = "#000",
  /** Use direction + skewDegAbs for easy left/right control */
  direction = "left", // 'left' | 'right'
  skewDegAbs = 1.5, // positive number; we apply the sign from `direction`

  /** Per-slice x offsets (px). Positive = nudge right, negative = left */
  offsetsPx = [-0.4, 0.25, -0.2],

  letterSpacing = 0,
  fontFamily = "'Times New Roman', Times, serif",
  italic = true, // <- new: set italics on/off
  fontWeight = 800,

  // motion controls
  jitter = true,
  ampPxRange = [0.2, 1.8],
  durMsRange = [1800, 3600],
  delayMsRange = [-1200, 0],

  className = "",
  style = {},
  title,
}) {
  const sliceSize = 100 / rows;
  const label = title || text;
  const signedSkew = (direction === "right" ? 1 : -1) * Math.abs(skewDegAbs);

  const id = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const kf = `hns-wobble-${id}`;

  const rng = (min, max) => min + Math.random() * (max - min);
  const baseOffsetPx = (i) => offsetsPx[i] ?? offsetsPx[offsetsPx.length - 1];

  const perSlice = useMemo(() => {
    return Array.from({ length: rows }).map((_, i) => ({
      topPct: i * sliceSize,
      botPct: 100 - (i + 1) * sliceSize,
      basePx: baseOffsetPx(i),
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
        fontStyle: italic ? "italic" : "normal", // <- italicized
        fontSize: `${fontSizePx}px`,
        letterSpacing: `${letterSpacing}px`,
        textAlign: "center",
        ...style,
      }}
    >
      <style>{`
        @keyframes ${kf} {
          0%   { transform: translateX(var(--base)) skewX(var(--skew)); }
          50%  { transform: translateX(calc(var(--base) + var(--amp))) skewX(var(--skew)); }
          100% { transform: translateX(var(--base)) skewX(var(--skew)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hns-${id} .hns-slice { animation: none !important; }
        }
      `}</style>

      {/* Invisible base text to reserve intrinsic width/line-height */}
      <span
        className="hns-base"
        style={{ position: "relative", color: "transparent" }}
      >
        {text}
      </span>

      <span
        className="hns-stage"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {perSlice.map((s, i) => (
          <span
            key={i}
            className="hns-slice"
            style={{
              position: "absolute",
              inset: 0,
              color,
              clipPath: `inset(${s.topPct}% 0 ${s.botPct}% 0)`,
              ["--base"]: `${s.basePx}px`,
              ["--skew"]: `${signedSkew}deg`,
              ["--amp"]: `${s.ampPx}px`,
              animation: jitter
                ? `${kf} ${s.durMs}ms ease-in-out ${s.delayMs}ms infinite alternate`
                : "none",
              transform: `translateX(${s.basePx}px) skewX(${signedSkew}deg)`,
              willChange: "transform",
            }}
          >
            {text}
          </span>
        ))}
      </span>
    </span>
  );
}
