import React, { useEffect, useRef } from "react";

export default function MenuIcon({ className, style }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");

    let dpr = window.devicePixelRatio || 1;
    let width = 0;
    let height = 0;
    let animationFrameId;

    function resize() {
      const rect = container.getBoundingClientRect();
      width = rect.width || 0;
      height = rect.height || 0;

      if (width === 0 || height === 0) return;

      dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener("resize", resize);
    resize();

    /* ===== CONFIG (scales with container) ===== */

    // Wave & spacing ratios (derived from your original numbers)
    const WAVE_COUNT = 4;
    const SMOOTH_BLEND = 0.45;
    const SEGMENTS = 120;

    const SPEEDS = [0.18, 0.18];
    const PHASES = [0.0, Math.PI];

    // Colors (flipped as in your snippet)
    const FILL_COLOR = "#cb2b1f"; // red
    const OUTLINE_COLOR = "#b49543"; // yellow

    // Proportional factors to keep icon looking consistent at different sizes
    const BASE_RADIUS_FACTOR = 0.08697542944118286; // so both strips fit nicely in height
    const WAVE_AMP_FACTOR = 0.314; // ~waveAmp/baseRadius
    const LINE_GAP_FACTOR = 4.57; // ~lineGap/baseRadius
    const OUTLINE_WIDTH_FACTOR = 3.6 / 7; // from original 3.6 vs baseRadius ~7

    /* ===== Helper functions ===== */

    function scallopWave(u, t, speed, phase, waveAmp, flip = false) {
      const theta = u * WAVE_COUNT * 2 * Math.PI + t * speed + phase;
      const s = Math.sin(theta);
      const c = Math.cos(theta);

      // blended sin/cos for smoother, more scallop-y bumps
      let w = (s * (1 - SMOOTH_BLEND) + c * SMOOTH_BLEND) * waveAmp;
      return flip ? -w : w; // flip direction for bottom strip
    }

    function drawLine(yBase, t, speed, phase, flipWave, cfg) {
      const { startX, effectiveWidth, baseRadius, waveAmp, outlineWidth } = cfg;

      const endX = startX + effectiveWidth;
      const length = endX - startX;

      const centers = [];
      for (let i = 0; i < SEGMENTS; i++) {
        const u = i / (SEGMENTS - 1);
        const x = startX + u * length;
        const offsetY = scallopWave(u, t, speed, phase, waveAmp, flipWave);

        centers.push({ x, cy: yBase + offsetY, r: baseRadius });
      }

      const first = centers[0];
      const last = centers[centers.length - 1];

      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(first.x, first.cy - first.r);

      // top edge
      for (let i = 1; i < centers.length; i++) {
        const c = centers[i];
        ctx.lineTo(c.x, c.cy - c.r);
      }

      // right cap
      ctx.arc(last.x, last.cy, last.r, -Math.PI / 2, Math.PI / 2);

      // bottom edge (right → left)
      for (let i = centers.length - 1; i >= 0; i--) {
        const c = centers[i];
        ctx.lineTo(c.x, c.cy + c.r);
      }

      // left cap
      ctx.arc(first.x, first.cy, first.r, Math.PI / 2, -Math.PI / 2);

      ctx.closePath();

      ctx.fillStyle = FILL_COLOR;
      ctx.strokeStyle = OUTLINE_COLOR;
      ctx.lineWidth = outlineWidth;

      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    function render(time) {
      const t = time * 0.001;

      ctx.clearRect(0, 0, width, height);
      if (width <= 0 || height <= 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Compute size-dependent config so icon looks good at e.g. 32–48px
      const minDim = Math.min(width, height);

      const baseRadius = height * BASE_RADIUS_FACTOR;
      const waveAmp = baseRadius * WAVE_AMP_FACTOR;
      const lineGap = baseRadius * LINE_GAP_FACTOR;
      const outlineWidth = baseRadius * OUTLINE_WIDTH_FACTOR;

      const effectiveWidth = width * 0.7; // bars span ~70% of width
      const startX = (width - effectiveWidth) / 2;
      const centerY = height / 2;

      const cfg = {
        startX,
        effectiveWidth,
        baseRadius,
        waveAmp,
        outlineWidth,
      };

      const y1 = centerY - lineGap / 2;
      const y2 = centerY + lineGap / 2;

      // top wave: normal
      drawLine(y1, t, SPEEDS[0], PHASES[0], false, cfg);

      // bottom wave: flipped
      drawLine(y2, t, SPEEDS[1], PHASES[1], true, cfg);

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
