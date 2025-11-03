import { useEffect, useMemo, useState } from "react";

/* ------------------------------ ShardedWord ------------------------------
   CSS-only “static shard” (row-sliced) text, styled like Times italic bold.
   - Small by default (sizePx=22)
   - rows = 3 (like your sample)
   - subtle left/right offsets + skew
--------------------------------------------------------------------------- */
function ShardedWord({
  text,
  sizePx = 22,
  color = "#000",
  rows = 3,
  skewDeg = -4,
  offsetsPx = [-1.5, 1, -0.5], // left/right tiny nudges
  italic = true,
  weight = 700,
  letterSpacing = 0, // tracking on the shards
  className = "",
  style = {},
  title,
}) {
  const sliceSizePct = 100 / rows;
  const label = title || text;

  // Pre-build shard style objects so React doesn’t reallocate arrays every render
  const shardStyles = useMemo(() => {
    return new Array(rows).fill(0).map((_, i) => ({
      // clip top/bottom for each slice
      "--clip-top": `${i * sliceSizePct}%`,
      "--clip-bottom": `${100 - (i + 1) * sliceSizePct}%`,
      // per-slice translateX (left/right)
      "--tx": `${offsetsPx[i % offsetsPx.length]}px`,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sliceSizePct, offsetsPx.join("|")]);

  return (
    <span
      aria-label={label}
      className={`shard-wrap ${className}`}
      style={{
        // container typography (hidden base holds layout)
        fontFamily: `"Times New Roman", Times, serif`,
        fontWeight: weight,
        fontStyle: italic ? "italic" : "normal",
        fontSize: `${sizePx}px`,
        lineHeight: 1,
        whiteSpace: "nowrap",
        position: "relative",
        display: "inline-block",
        // CSS vars for color/transform shared by shards
        "--shard-color": color,
        "--skew": `${skewDeg}deg`,
        "--ls": `${letterSpacing}px`,
        ...style,
      }}
    >
      {/* Invisible base to establish width/height but not double-render the glyphs */}
      <span
        className="shard-base"
        style={{
          position: "relative",
          color: "transparent",
          letterSpacing: "var(--ls)",
        }}
      >
        {text}
      </span>

      {/* Shard overlay layer */}
      <span
        className="shard-stage"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {shardStyles.map((vars, i) => (
          <span
            key={i}
            className="shard-slice"
            style={{
              position: "absolute",
              inset: 0,
              color: "var(--shard-color)",
              letterSpacing: "var(--ls)",
              // clip each horizontal band
              clipPath: `inset(var(--clip-top,0%) 0 var(--clip-bottom,0%) 0)`,
              transform: `translateX(var(--tx, 0)) skewX(var(--skew))`,
              ...vars,
            }}
          >
            {text}
          </span>
        ))}
      </span>
    </span>
  );
}

/* --------------------------- LoadingSubtitle --------------------------- */
export default function LoadingSubtitle() {
  const [show, setShow] = useState(false);
  const base = 22; // keep it small

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const soft = {
    fontFamily: "'Manrope', sans-serif",
    fontWeight: 500,
    fontSize: `${base}px`,
    lineHeight: 1.35,
    letterSpacing: "0.3px",
  };

  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transition: "opacity 0.9s ease",
        whiteSpace: "nowrap",
        background: "transparent",
        display: "inline-flex",
        alignItems: "baseline",
        gap: "6px",
      }}
    >
      <span style={soft}>is a</span>

      <ShardedWord
        text="creative technologist"
        sizePx={base}
        color="#000"
        rows={3}
        skewDeg={-4}
        offsetsPx={[-1.5, 1, -0.5]}
        italic={true}
        weight={700}
        letterSpacing={0}
      />

      <span style={soft}>based in</span>

      <ShardedWord
        text="brooklyn ny"
        sizePx={base}
        color="#000"
        rows={3}
        skewDeg={-4}
        offsetsPx={[-1.2, 0.8, -0.4]}
        italic={true}
        weight={700}
        letterSpacing={0}
      />
    </div>
  );
}
