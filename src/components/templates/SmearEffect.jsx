import { useEffect, useRef, useState } from "react";
import ReactGA from "react-ga4";

const DEFAULT_SMEAR_SCALE = 1;
const DEFAULT_IMAGE_SCALE = 0.6;
const DEFAULT_BASE_WAVE_AMP = 55;
const DEFAULT_FINE_WAVE_AMP = 10;
const DEFAULT_FREQ_X = 0.04;
const DEFAULT_FREQ_Y = 0.17;
const DEFAULT_DIRECTION = "up";
const DEFAULT_START_PERCENT = 60;
const DEFAULT_END_PERCENT = 0;
const DEFAULT_DELAY_MS = 1000;
const DEFAULT_DURATION_MS = 15000;

// NEW: recording duration (seconds) default
const DEFAULT_RECORD_SECONDS = 7;

// Simple placeholder / temp image
const FALLBACK_IMAGE =
  "https://via.placeholder.com/800x1000.png?text=Try+uploading+your+own+photo";

// Helper for linear interpolation (used in drawFrame)
function lerp(a, b, t) {
  return a + (b - a) * t;
}

export default function SmearEffect({ imageUrl }) {
  // ---- GA helper (safe + consistent) ----
  const ga = (name, params = {}) => {
    // react-ga4 supports GA4 event names + params
    ReactGA.event(name, { category: "smear_effect", ...params });
  };

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const animRef = useRef(null);
  const startTimeRef = useRef(null);
  const originalPixelsRef = useRef(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [smearScale, setSmearScale] = useState(DEFAULT_SMEAR_SCALE);
  const [imageScale, setImageScale] = useState(DEFAULT_IMAGE_SCALE);
  const [baseWaveAmp, setBaseWaveAmp] = useState(DEFAULT_BASE_WAVE_AMP);
  const [fineWaveAmp, setFineWaveAmp] = useState(DEFAULT_FINE_WAVE_AMP);
  const [freqX, setFreqX] = useState(DEFAULT_FREQ_X);
  const [freqY, setFreqY] = useState(DEFAULT_FREQ_Y);
  const [direction, setDirection] = useState(DEFAULT_DIRECTION);
  const [startPercent, setStartPercent] = useState(DEFAULT_START_PERCENT);
  const [endPercent, setEndPercent] = useState(DEFAULT_END_PERCENT);
  const [duration, setDuration] = useState(DEFAULT_DURATION_MS);

  const [userImageUrl, setUserImageUrl] = useState(null);
  const objectUrlRef = useRef(null);

  const [activeInfo, setActiveInfo] = useState(null);

  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimeoutRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  // NEW: record duration dropdown state (seconds)
  const [recordSeconds, setRecordSeconds] = useState(DEFAULT_RECORD_SECONDS);

  const currentImage = userImageUrl || imageUrl || FALLBACK_IMAGE;

  useEffect(() => {
    if (!currentImage) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentImage;

    img.onload = () => {
      imgRef.current = img;
      setLoaded(true);
      setError("");
      initCanvasAndPixels(img);
      startAnimation();
    };

    img.onerror = () => {
      setError("Could not load image");
      setLoaded(false);
    };

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [
    currentImage,
    smearScale,
    baseWaveAmp,
    fineWaveAmp,
    freqX,
    freqY,
    direction,
    startPercent,
    endPercent,
    duration,
  ]);

  function initCanvasAndPixels(img) {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");

    const baseW = img.width || 800;
    const baseH = img.height || 1169;

    const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;

    const maxW = Math.min(800, viewportW - 40);
    const maxH = viewportH - 200;

    const fitScale = Math.min(maxW / baseW, maxH / baseH);

    const w = Math.round(baseW * fitScale);
    const h = Math.round(baseH * fitScale);

    canvas.width = w;
    canvas.height = h;
    canvasSizeRef.current = { width: w, height: h };

    setCanvasDimensions({ width: w, height: h });

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    originalPixelsRef.current = new Uint8ClampedArray(imageData.data);
  }

  function startAnimation() {
    const canvas = canvasRef.current;
    const originalPixels = originalPixelsRef.current;
    if (!canvas || !originalPixels) return;

    const { width: w, height: h } = canvasSizeRef.current;
    const ctx = canvas.getContext("2d");

    startTimeRef.current = performance.now();

    function drawFrame(now) {
      const startTime = startTimeRef.current ?? now;
      const elapsedMs = now - startTime;

      const DELAY_MS = DEFAULT_DELAY_MS;
      const DURATION_MS = duration;

      const growthElapsed = Math.max(0, elapsedMs - DELAY_MS);
      const growthFactor = Math.min(growthElapsed / DURATION_MS, 1);

      const initialY = h * (startPercent / 100);
      const targetY = h * (endPercent / 100);
      const MELT_START = Math.floor(lerp(initialY, targetY, growthFactor));

      const t = (elapsedMs / 1000) * 1.2;

      const imageData = ctx.createImageData(w, h);
      const pixels = imageData.data;
      pixels.set(originalPixels);

      if (direction === "up") {
        const MELT_END = h - 1;
        const meltHeight = MELT_END - MELT_START + 1;

        if (meltHeight > 0) {
          for (let y = MELT_START; y <= MELT_END; y++) {
            const dy = y - MELT_START;
            const v = dy / meltHeight;

            for (let x = 0; x < w; x++) {
              const sidewaysWave =
                Math.sin(y * freqY + t) * baseWaveAmp * smearScale * v;
              const ripple =
                Math.sin(x * freqX + y * 0.1 + t * 0.6) *
                fineWaveAmp *
                smearScale *
                v;

              let srcX = Math.floor(x + sidewaysWave + ripple);
              srcX = Math.max(0, Math.min(srcX, w - 1));

              const dstIdx = 4 * (y * w + x);
              const srcIdx = 4 * (y * w + srcX);

              pixels[dstIdx] = originalPixels[srcIdx];
              pixels[dstIdx + 1] = originalPixels[srcIdx + 1];
              pixels[dstIdx + 2] = originalPixels[srcIdx + 2];
              pixels[dstIdx + 3] = 255;
            }
          }
        }
      } else {
        const MELT_END = 0;
        const meltHeight = MELT_START - MELT_END + 1;

        if (meltHeight > 0) {
          for (let y = MELT_END; y <= MELT_START; y++) {
            const dy = MELT_START - y;
            const v = dy / meltHeight;

            for (let x = 0; x < w; x++) {
              const sidewaysWave =
                Math.sin(y * freqY + t) * baseWaveAmp * smearScale * v;
              const ripple =
                Math.sin(x * freqX + y * 0.1 + t * 0.6) *
                fineWaveAmp *
                smearScale *
                v;

              let srcX = Math.floor(x + sidewaysWave + ripple);
              srcX = Math.max(0, Math.min(srcX, w - 1));

              const dstIdx = 4 * (y * w + x);
              const srcIdx = 4 * (y * w + srcX);

              pixels[dstIdx] = originalPixels[srcIdx];
              pixels[dstIdx + 1] = originalPixels[srcIdx + 1];
              pixels[dstIdx + 2] = originalPixels[srcIdx + 2];
              pixels[dstIdx + 3] = 255;
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      animRef.current = requestAnimationFrame(drawFrame);
    }

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(drawFrame);
  }

  // Reset now ALSO restarts animation
  function handleReset() {
    ga("smear_reset_all");

    setSmearScale(DEFAULT_SMEAR_SCALE);
    setImageScale(DEFAULT_IMAGE_SCALE);
    setBaseWaveAmp(DEFAULT_BASE_WAVE_AMP);
    setFineWaveAmp(DEFAULT_FINE_WAVE_AMP);
    setFreqX(DEFAULT_FREQ_X);
    setFreqY(DEFAULT_FREQ_Y);
    setDirection(DEFAULT_DIRECTION);
    setStartPercent(DEFAULT_START_PERCENT);
    setEndPercent(DEFAULT_END_PERCENT);
    setDuration(DEFAULT_DURATION_MS);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setUserImageUrl(null);
    setActiveInfo(null);

    // Restart animation immediately
    cancelAnimationFrame(animRef.current);
    startAnimation();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    ga("smear_choose_file", {
      file_type: file.type || "unknown",
      file_size_kb: Math.round((file.size || 0) / 1024),
    });

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setUserImageUrl(url);
  }

  function toggleInfo(key) {
    setActiveInfo((prev) => (prev === key ? null : key));
  }

  function handleCaptureFrame() {
    ga("smear_capture_image");

    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "smear-frame.png";
    link.click();
  }

  function startRecording(durationMs) {
    if (isRecording) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current);
      recordTimeoutRef.current = null;
    }

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });

    recordedChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      ga("smear_record_complete", {
        duration_s: Math.round(durationMs / 1000),
      });

      setIsRecording(false);
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "smear-clip.webm";
      a.click();
      URL.revokeObjectURL(url);
    };

    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);

    recordTimeoutRef.current = setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
    }, durationMs);
  }

  // ONLY recording option: record from start w/ dropdown duration
  function handleRecordFromStart() {
    ga("smear_record_start", { duration_s: recordSeconds });

    cancelAnimationFrame(animRef.current);
    startAnimation();

    // small delay so the first frame after restart has a chance to draw
    const ms = Math.round(recordSeconds * 1000);
    requestAnimationFrame(() => startRecording(ms));
  }

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const unscaledHeight = canvasDimensions.height;
  const gapCompensationMargin = unscaledHeight * (1 - imageScale);

  // NEW: duration options 3–15 (default 7)
  const recordOptions = Array.from({ length: 13 }, (_, i) => i + 3); // 3..15

  return (
    <section className="smear-wrapper">
      {/* STEP 1 */}
      <div className="smear-step smear-step-1">
        <h2 className="smear-step-title">
          Step 1: Choose an image and set the size
        </h2>

        <div className="smear-row">
          <label className="smear-control smear-control-inline">
            <div className="smear-label-row">
              <span className="smear-info-wrap">
                <span className="smear-label">Upload image</span>
                <button
                  type="button"
                  className="smear-info-icon"
                  onClick={() => toggleInfo("upload")}
                >
                  i
                </button>
                {activeInfo === "upload" && (
                  <div className="smear-info-tooltip">
                    Pick your own image instead of the default one.
                  </div>
                )}
              </span>
            </div>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>

          <label className="smear-control">
            <div className="smear-label-row">
              <span className="smear-info-wrap">
                <span className="smear-label">Image scale</span>
                <button
                  type="button"
                  className="smear-info-icon"
                  onClick={() => toggleInfo("imageScale")}
                >
                  i
                </button>
                {activeInfo === "imageScale" && (
                  <div className="smear-info-tooltip">
                    Zoom the whole image in or out.
                  </div>
                )}
              </span>
              <span className="smear-value">{imageScale.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.5"
              step="0.1"
              value={imageScale}
              onChange={(e) => setImageScale(parseFloat(e.target.value))}
            />
          </label>
        </div>
      </div>

      {/* STEP 2 */}
      <div className="smear-step smear-step-2">
        <h2 className="smear-step-title">Step 2: Edit smear settings</h2>

        <details className="smear-group">
          <summary className="smear-group-title">
            Smear style (wiggles & wobble)
          </summary>

          <div className="smear-row smear-row-spaced">
            <label className="smear-control">
              <div className="smear-label-row">
                <span className="smear-info-wrap">
                  <span className="smear-label">Smear scale</span>
                  <button
                    type="button"
                    className="smear-info-icon"
                    onClick={() => toggleInfo("smearScale")}
                  >
                    i
                  </button>
                  {activeInfo === "smearScale" && (
                    <div className="smear-info-tooltip">
                      Overall strength of the smear warp.
                    </div>
                  )}
                </span>
                <span className="smear-value">{smearScale.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={smearScale}
                onChange={(e) => setSmearScale(parseFloat(e.target.value))}
              />
            </label>

            <label className="smear-control">
              <div className="smear-label-row">
                <span className="smear-info-wrap">
                  <span className="smear-label">Base wave</span>
                  <button
                    type="button"
                    className="smear-info-icon"
                    onClick={() => toggleInfo("baseWave")}
                  >
                    i
                  </button>
                  {activeInfo === "baseWave" && (
                    <div className="smear-info-tooltip">
                      Big, slow side-to-side wobble.
                    </div>
                  )}
                </span>
                <span className="smear-value">{baseWaveAmp.toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                step="1"
                value={baseWaveAmp}
                onChange={(e) => setBaseWaveAmp(parseFloat(e.target.value))}
              />
            </label>

            <label className="smear-control">
              <div className="smear-label-row">
                <span className="smear-info-wrap">
                  <span className="smear-label">Fine wave</span>
                  <button
                    type="button"
                    className="smear-info-icon"
                    onClick={() => toggleInfo("fineWave")}
                  >
                    i
                  </button>
                  {activeInfo === "fineWave" && (
                    <div className="smear-info-tooltip">
                      Smaller detailed wiggles inside the smear.
                    </div>
                  )}
                </span>
                <span className="smear-value">{fineWaveAmp.toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={fineWaveAmp}
                onChange={(e) => setFineWaveAmp(parseFloat(e.target.value))}
              />
            </label>

            <label className="smear-control">
              <div className="smear-label-row">
                <span className="smear-info-wrap">
                  <span className="smear-label">freqX</span>
                  <button
                    type="button"
                    className="smear-info-icon"
                    onClick={() => toggleInfo("freqX")}
                  >
                    i
                  </button>
                  {activeInfo === "freqX" && (
                    <div className="smear-info-tooltip">
                      How tight the wiggles are left-to-right.
                    </div>
                  )}
                </span>
                <span className="smear-value">{freqX.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.2"
                step="0.005"
                value={freqX}
                onChange={(e) => setFreqX(parseFloat(e.target.value))}
              />
            </label>

            <label className="smear-control">
              <div className="smear-label-row">
                <span className="smear-info-wrap">
                  <span className="smear-label">freqY</span>
                  <button
                    type="button"
                    className="smear-info-icon"
                    onClick={() => toggleInfo("freqY")}
                  >
                    i
                  </button>
                  {activeInfo === "freqY" && (
                    <div className="smear-info-tooltip">
                      How tight the waves are top-to-bottom.
                    </div>
                  )}
                </span>
                <span className="smear-value">{freqY.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={freqY}
                onChange={(e) => setFreqY(parseFloat(e.target.value))}
              />
            </label>
          </div>
        </details>

        <details className="smear-group">
          <summary className="smear-group-title">
            Smear span & flow direction
          </summary>

          <div className="smear-row">
            <label className="smear-control smear-control-inline">
              <div className="smear-label-row">
                <span className="smear-info-wrap">
                  <span className="smear-label">Direction</span>
                  <button
                    type="button"
                    className="smear-info-icon"
                    onClick={() => toggleInfo("direction")}
                  >
                    i
                  </button>
                  {activeInfo === "direction" && (
                    <div className="smear-info-tooltip">
                      Choose if the smear moves up or down.
                    </div>
                  )}
                </span>
              </div>
              <select
                className="smear-select"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
              >
                <option value="up">Up</option>
                <option value="down">Down</option>
              </select>
            </label>

            <label className="smear-control">
              <div className="smear-label-row">
                <span className="smear-info-wrap">
                  <span className="smear-label">Start %</span>
                  <button
                    type="button"
                    className="smear-info-icon"
                    onClick={() => toggleInfo("startPercent")}
                  >
                    i
                  </button>
                  {activeInfo === "startPercent" && (
                    <div className="smear-info-tooltip">
                      Where the smear band begins (0% top, 100% bottom).
                    </div>
                  )}
                </span>
                <span className="smear-value">{startPercent.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={startPercent}
                onChange={(e) => setStartPercent(parseFloat(e.target.value))}
              />
            </label>

            <label className="smear-control">
              <div className="smear-label-row">
                <span className="smear-info-wrap">
                  <span className="smear-label">End %</span>
                  <button
                    type="button"
                    className="smear-info-icon"
                    onClick={() => toggleInfo("endPercent")}
                  >
                    i
                  </button>
                  {activeInfo === "endPercent" && (
                    <div className="smear-info-tooltip">
                      Where the smear band ends over time.
                    </div>
                  )}
                </span>
                <span className="smear-value">{endPercent.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={endPercent}
                onChange={(e) => setEndPercent(parseFloat(e.target.value))}
              />
            </label>

            <label className="smear-control">
              <div className="smear-label-row">
                <span className="smear-info-wrap">
                  <span className="smear-label">Travel time</span>
                  <button
                    type="button"
                    className="smear-info-icon"
                    onClick={() => toggleInfo("duration")}
                  >
                    i
                  </button>
                  {activeInfo === "duration" && (
                    <div className="smear-info-tooltip">
                      How long the smear takes to move from start to end.
                    </div>
                  )}
                </span>
                <span className="smear-value">
                  {(duration / 1000).toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={duration / 1000}
                onChange={(e) => setDuration(parseFloat(e.target.value) * 1000)}
              />
            </label>
          </div>
        </details>

        {/* Reset only (now also restarts) */}
        <div className="smear-row smear-row-bottom">
          <button
            type="button"
            className="smear-reset-button"
            onClick={handleReset}
          >
            Reset all settings
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="smear-canvas-wrapper">
        <h3 className="smear-preview-title">Preview</h3>
        <div
          className="smear-canvas-inner"
          style={{
            width: `${canvasDimensions.width}px`,
            height: `${canvasDimensions.height}px`,
            transform: `scale(${imageScale})`,
            transformOrigin: "top center",
          }}
        >
          <canvas ref={canvasRef} />
        </div>

        {!loaded && !error && (
          <p className="smear-status">Loading template preview…</p>
        )}
        {error && <p className="smear-status error">{error}</p>}
      </div>

      <h2
        className="smear-step-title"
        style={{ marginTop: `-${gapCompensationMargin}px` }}
      >
        Step 3: Save your work
      </h2>

      <div className="smear-export-controls">
        <button
          type="button"
          className="smear-export-button"
          onClick={handleCaptureFrame}
        >
          Save frame as image
        </button>

        <div className="smear-record-row">
          <button
            type="button"
            className="smear-export-button"
            onClick={handleRecordFromStart}
            disabled={isRecording}
          >
            {isRecording ? `Recording ${recordSeconds}s…` : "Record Video"}
          </button>

          <label className="smear-record-duration">
            <span className="smear-record-label">Duration</span>
            <select
              className="smear-select"
              value={recordSeconds}
              onChange={(e) => setRecordSeconds(parseInt(e.target.value, 10))}
              disabled={isRecording}
            >
              {recordOptions.map((s) => (
                <option key={s} value={s}>
                  {s}s
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
