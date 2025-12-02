// AboutText.jsx
import React, { useEffect, useRef } from "react";

export default function AboutText({ className, style }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Fixed internal resolution for stability
    const W = 512;
    const H = 256;
    canvas.width = W;
    canvas.height = H;

    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    // Float textures
    const floatExt = gl.getExtension("OES_texture_float");
    const colorExt =
      gl.getExtension("WEBGL_color_buffer_float") ||
      gl.getExtension("EXT_color_buffer_float");
    if (!floatExt || !colorExt) {
      console.error("Float render targets not supported");
      return;
    }

    gl.viewport(0, 0, W, H);

    // ---------- SHADERS ----------

    const VERT_SRC = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const TIMESTEP_SRC = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_size;

      const float A0 = -0.01;
      const float A1 = 2.0;
      const float EPSILON = 0.1;
      const float DELTA = 7.0;

      const float TIMESTEP = 0.03;
      const float SCALE = 1.0;

      void main() {
        vec2 p = gl_FragCoord.xy;
        vec2 n = p + vec2(0.0,  1.0);
        vec2 e = p + vec2(1.0,  0.0);
        vec2 s = p + vec2(0.0, -1.0);
        vec2 w = p + vec2(-1.0, 0.0);

        vec2 val = texture2D(u_image, p / u_size).xy;
        vec2 laplacian =
              texture2D(u_image, n / u_size).xy
            + texture2D(u_image, s / u_size).xy
            + texture2D(u_image, e / u_size).xy
            + texture2D(u_image, w / u_size).xy
            - 4.0 * val;

        vec2 delta = vec2(
          val.x - val.x*val.x*val.x - val.y + laplacian.x * SCALE,
          EPSILON * (val.x - A1 * val.y - A0) + DELTA * laplacian.y * SCALE
        );

        gl_FragColor = vec4(val + delta * TIMESTEP, 0.0, 0.0);
      }
    `;

    // RENDER: red text, pale yellow background, no white
    const RENDER_SRC = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_size;

      // ABOUT mask lives in the .y channel
      const vec3 FG_COLOR = vec3(0.796, 0.169, 0.122);    // #CB2B1F
      const vec3 BG_COLOR = vec3(0.9686, 0.9137, 0.6627); // #F7E9A9

      void main() {
        float c = texture2D(u_image, gl_FragCoord.xy / u_size).y;

        // map c into 0..1 softly – tuned for "barely morph"
        float v = smoothstep(0.25, 0.55, c);

        vec3 color = mix(BG_COLOR, FG_COLOR, v);
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const COPY_SRC = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_size;
      void main() {
        vec2 uv = gl_FragCoord.xy / u_size;
        gl_FragColor = texture2D(u_image, uv);
      }
    `;

    // ---------- helpers ----------

    function createShader(type, src) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    function createProgram(vsSrc, fsSrc) {
      const vs = createShader(gl.VERTEX_SHADER, vsSrc);
      const fs = createShader(gl.FRAGMENT_SHADER, fsSrc);
      if (!vs || !fs) return null;
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog);
        return null;
      }
      return prog;
    }

    function loadVertexData(prog) {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );
      const loc = gl.getAttribLocation(prog, "a_position");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }

    function newTexture(initial_state) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        W,
        H,
        0,
        gl.RGBA,
        gl.FLOAT,
        initial_state
      );
      return t;
    }

    function newFramebuffer(texture) {
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      );
      return fb;
    }

    // ---------- seed ABOUT text ----------

    function getInitialState() {
      const a = new Float32Array(4 * W * H);

      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const ctx = off.getContext("2d");

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const SEED_TEXT = "ABOUT";
      const SEED_FONT_SIZE = Math.floor(H * 0.6);
      ctx.font = `bold ${SEED_FONT_SIZE}px sans-serif`;
      ctx.fillText(SEED_TEXT, W * 0.5, H * 0.5);

      const img = ctx.getImageData(0, 0, W, H).data;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = W * y + x;
          const srcY = H - 1 - y;
          const idx = 4 * (W * srcY + x);

          const r = img[idx];
          const g = img[idx + 1];
          const b = img[idx + 2];
          const aChan = img[idx + 3];

          const brightness = (r + g + b) / (3 * 255);
          const isText = brightness > 0.3 && aChan > 0;

          a[4 * i + 0] = isText ? 0.99 : -0.7;
          a[4 * i + 1] = -0.3;
        }
      }

      return a;
    }

    // ---------- programs ----------

    const timestepProg = createProgram(VERT_SRC, TIMESTEP_SRC);
    const renderProg = createProgram(VERT_SRC, RENDER_SRC);
    const copyProg = createProgram(VERT_SRC, COPY_SRC);
    if (!timestepProg || !renderProg || !copyProg) return;

    gl.useProgram(renderProg);
    loadVertexData(renderProg);
    gl.uniform2f(gl.getUniformLocation(renderProg, "u_size"), W, H);

    gl.useProgram(timestepProg);
    loadVertexData(timestepProg);
    gl.uniform2f(gl.getUniformLocation(timestepProg, "u_size"), W, H);

    gl.useProgram(copyProg);
    loadVertexData(copyProg);
    gl.uniform2f(gl.getUniformLocation(copyProg, "u_size"), W, H);

    // ---------- simulation setup ----------

    const initial_state = getInitialState();
    let t1 = newTexture(initial_state);
    let t2 = newTexture(null);
    let fb1 = newFramebuffer(t1);
    let fb2 = newFramebuffer(t2);

    let currentTex = t1,
      currentFb = fb1;
    let otherTex = t2,
      otherFb = fb2;

    const SNAP_COUNT = 20; // fewer snapshots
    const GROW_DURATION = 1.5; // faster grow phase
    const ITERATIONS_PER_FRAME = 60; // less heavy than 200

    const snapTextures = [];
    const snapFbos = [];
    for (let i = 0; i < SNAP_COUNT; i++) {
      snapTextures[i] = newTexture(null);
      snapFbos[i] = newFramebuffer(snapTextures[i]);
    }

    // snapshot 0 = seed
    gl.useProgram(copyProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, snapFbos[0]);
    gl.bindTexture(gl.TEXTURE_2D, t1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    let snapshotIndex = 1;
    const snapshotInterval = GROW_DURATION / SNAP_COUNT;
    let nextSnapshotTime = snapshotInterval;

    const startTime = performance.now();

    function step(nowMs) {
      const elapsedSec = (nowMs - startTime) / 1000.0;

      if (elapsedSec < GROW_DURATION) {
        // Grow & capture
        gl.useProgram(timestepProg);

        for (let i = 0; i < ITERATIONS_PER_FRAME; i++) {
          gl.bindTexture(gl.TEXTURE_2D, currentTex);
          gl.bindFramebuffer(gl.FRAMEBUFFER, otherFb);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

          let ttmp = currentTex;
          currentTex = otherTex;
          otherTex = ttmp;
          let ftmp = currentFb;
          currentFb = otherFb;
          otherFb = ftmp;
        }

        if (elapsedSec >= nextSnapshotTime && snapshotIndex < SNAP_COUNT) {
          gl.useProgram(copyProg);
          gl.bindFramebuffer(gl.FRAMEBUFFER, snapFbos[snapshotIndex]);
          gl.bindTexture(gl.TEXTURE_2D, currentTex);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          snapshotIndex++;
          nextSnapshotTime += snapshotInterval;
        }

        gl.useProgram(renderProg);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, currentTex);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else {
        // Barely morph: loop over a small range of early snapshots
        const usableSnapshots = Math.max(3, Math.min(snapshotIndex, 8));
        const iMin = 0;
        const iMax = usableSnapshots - 1;

        const t = (elapsedSec - GROW_DURATION) * 0.7; // speed
        const phase = Math.sin(t) * 0.5 + 0.5; // 0..1
        const idxFloat = iMin + phase * (iMax - iMin);
        let idx = Math.round(idxFloat);
        idx = Math.max(iMin, Math.min(idx, iMax));

        gl.useProgram(renderProg);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, snapTextures[idx]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    function frame(now) {
      step(now);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      className={className}
      style={{
        width: "100%",
        minHeight: "140px",
        background: "#C5C5C5", // page background
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
