// src/components/LoadingSubtitleFinal.jsx
import { useEffect, useMemo, useState } from "react";

/* ------------------------------ ShardedWord ------------------------------ */
function ShardedWord({
  text,
  sizePx = 32,
  rows = 3,
  skewDeg = -4,

  // ORIGINAL: if you pass this, we’ll still use it — now multiplied by offsetScale
  offsetsPx = [-1.5, 1, -0.5],

  italic = true,
  weight = 700,
  letterSpacing = 0,
  shardColor = "#921B00",
  rowColors = null,

  /* NEW: STROKE PROPS */
  strokeColor = "#3a2a21", // dark brown
  strokeWidth = 1.4, // px

  /* DRAMA CONTROLS */
  // Multiplies either your offsetsPx or the auto ones
  offsetScale = 0.2,
  // If true, we ignore offsetsPx and compute larger, size-aware ones
  autoOffsets = true,
  // Max horizontal offset when autoOffsets=true (defaults ~18% of font size)
  offsetMaxPx, // = undefined -> computed
  // How strongly outer slices move vs inner: 1=linear, 1.5+, 2, 3 = more dramatic
  offsetCurve = 0.2,
  // Also offset vertically (fraction of offsetMaxPx); 0 = none
  yOffsetScale = 0.25,

  className = "",
  style = {},
  title,
}) {
  const sliceSizePct = 100 / rows;
  const label = title || text;

  // helper: power curve 0..1 -> 0..1 with more emphasis near 1
  const curve = (t, p) => Math.pow(t, p);

  const computedOffsets = useMemo(() => {
    if (!autoOffsets) {
      // scale the user-supplied offsets
      return new Array(rows).fill(0).map((_, i) => ({
        x: (offsetsPx[i % offsetsPx.length] || 0) * offsetScale,
        y: (offsetsPx[i % offsetsPx.length] || 0) * yOffsetScale * offsetScale,
      }));
    }

    // size-aware dramatic offsets
    const max = offsetMaxPx ?? Math.max(8, sizePx * 0.18); // ~18% of font size
    return new Array(rows).fill(0).map((_, i) => {
      const centerNorm = rows <= 1 ? 1 : i / (rows - 1); // 0..1 from top to bottom
      const magnitude = curve(
        Math.max(centerNorm, 1 - centerNorm),
        offsetCurve
      ); // push outer bands more
      const sign = i % 2 === 0 ? -1 : 1; // alternate directions
      const x = sign * max * magnitude * offsetScale;
      const y = sign * max * yOffsetScale * magnitude * offsetScale * 0.6; // a little less than X
      return { x, y };
    });
  }, [
    autoOffsets,
    offsetsPx,
    offsetScale,
    rows,
    sizePx,
    offsetMaxPx,
    offsetCurve,
    yOffsetScale,
  ]);

  const shardStyles = useMemo(() => {
    return new Array(rows).fill(0).map((_, i) => ({
      "--clip-top": `${i * sliceSizePct}%`,
      "--clip-bottom": `${100 - (i + 1) * sliceSizePct}%`,
      "--tx": `${computedOffsets[i].x}px`,
      "--ty": `${computedOffsets[i].y}px`,
      __rowIndex: i,
    }));
  }, [rows, sliceSizePct, computedOffsets]);

  return (
    <span
      aria-label={label}
      className={`shard-wrap ${className}`}
      style={{
        fontFamily: `"Times New Roman", Times, serif`,
        fontWeight: weight,
        fontStyle: italic ? "italic" : "normal",
        fontSize: `${sizePx}px`,
        lineHeight: 1,
        whiteSpace: "nowrap",
        position: "relative",
        display: "inline-block",
        "--shard-color": shardColor,
        "--skew": `${skewDeg}deg`,
        "--ls": `${letterSpacing}px`,
        ...style,
      }}
    >
      {/* Invisible base preserves layout box */}
      <span
        className="shard-base"
        style={{
          position: "relative",
          color: "transparent",
          letterSpacing: "var(--ls)",
          userSelect: "none",
        }}
      >
        {text}
      </span>

      {/* Painted slices */}
      <span
        className="shard-stage"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {shardStyles.map((vars, i) => {
          const color = rowColors?.[i % rowColors.length] ?? shardColor;
          return (
            <span
              key={i}
              className="shard-slice"
              style={{
                position: "absolute",
                inset: 0,
                color,
                letterSpacing: "var(--ls)",
                clipPath: `inset(var(--clip-top,0%) 0 var(--clip-bottom,0%) 0)`,
                transform: `translateX(var(--tx,0)) translateY(var(--ty,0)) skewX(var(--skew)) translateZ(0)`,
                willChange: "transform",

                /* NEW STROKE */
                WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
                paintOrder: "stroke fill",

                ...vars,
              }}
            >
              {text}
            </span>
          );
        })}
      </span>
    </span>
  );
}

/* --------------------------- LoadingSubtitleFinal --------------------------- */
export default function LoadingSubtitleFinal({
  // layout / rhythm
  desktopPx = 22,
  gapPx = 6,
  lineHeight = 1.35,

  // timing behavior
  waitForTitleReady = false,
  delayMs = 0,
  fallbackShowAfterMs = 2000,

  // colors / fonts
  textColor = "#342B29",
  shardColor = "#dedede",

  // text
  leftTextA = "is a",
  shardTextA = "creative technologist",
  leftTextB = "based in",
  shardTextB = "brooklyn ny",

  // per-shard color arrays (fill colors per row)
  rowColorsA = ["#FFB400", "#FFB400", "#FFB400"],
  rowColorsB = ["#FFB400", "#FFB400", "#FFB400"],

  // NEW: pass-through stroke defaults (dark brown)
  strokeColor = "#ed6a1eff",
  strokeWidth = 1.25,

  // pass-through drama controls
  offsetScale = 0.3,
  autoOffsets = true,
  offsetMaxPx,
  offsetCurve = 1.2,
  yOffsetScale = 0.3,
  className = "",
  style = {},
}) {
  const base = desktopPx;
  const [show, setShow] = useState(!waitForTitleReady);

  useEffect(() => {
    if (!waitForTitleReady) {
      const t = setTimeout(() => setShow(true), Math.max(0, delayMs));
      return () => clearTimeout(t);
    }
    let fired = false;
    let delayTimer = null;
    const onReady = () => {
      if (fired) return;
      fired = true;
      delayTimer = setTimeout(() => setShow(true), Math.max(0, delayMs));
    };
    const fallback = setTimeout(() => {
      if (!fired) onReady();
    }, fallbackShowAfterMs);
    window.addEventListener("loading:title:ready", onReady);
    return () => {
      window.removeEventListener("loading:title:ready", onReady);
      clearTimeout(fallback);
      if (delayTimer) clearTimeout(delayTimer);
    };
  }, [waitForTitleReady, delayMs, fallbackShowAfterMs]);

  const soft = {
    fontFamily: "'Manrope', system-ui, sans-serif",
    fontWeight: 400,
    fontSize: `${base * 0.84}px`,
    lineHeight,
    letterSpacing: "0.3px",
    whiteSpace: "nowrap",
    color: textColor,
  };

  return (
    <div
      className={className}
      style={{
        opacity: show ? 1 : 0,
        transition: "opacity 0.9s ease",
        background: "transparent",
        display: "inline-flex",
        alignItems: "baseline",
        gap: `${gapPx}px`,
        flexWrap: "nowrap",
        margin: 0,
        padding: 0,
        width: "max-content",
        ...style,
      }}
    >
      <span style={soft}>{leftTextA}</span>

      <ShardedWord
        text={shardTextA}
        sizePx={base}
        rows={3}
        skewDeg={-4}
        /* DRAMA */
        autoOffsets={autoOffsets}
        offsetScale={offsetScale}
        offsetMaxPx={offsetMaxPx}
        offsetCurve={offsetCurve}
        yOffsetScale={yOffsetScale}
        /* COLORS */
        shardColor={shardColor}
        rowColors={rowColorsA}
        /* STROKE */
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        italic
        weight={700}
        letterSpacing={0}
      />

      <span style={soft}>{leftTextB}</span>

      <ShardedWord
        text={shardTextB}
        sizePx={base}
        rows={3}
        skewDeg={-4}
        /* DRAMA */
        autoOffsets={autoOffsets}
        offsetScale={offsetScale}
        offsetMaxPx={offsetMaxPx}
        offsetCurve={offsetCurve}
        yOffsetScale={yOffsetScale}
        /* COLORS */
        shardColor={shardColor}
        rowColors={rowColorsB}
        /* STROKE */
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        italic
        weight={700}
        letterSpacing={0}
      />
    </div>
  );
}
