import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DiamondTitleFinal from "../DiamondTitleFinal";
import NavText3 from "../nav/NavText3";
import ReactGA from "react-ga4";

const DEFAULT_TEXT = "IKAT\nTEXT";
const DEFAULT_TEXT_PX = 100;
const DEFAULT_MAIN_COLOR = "#00204A";
const DEFAULT_LOOK = "animated"; // "animated" or "dense"
const DEFAULT_LETTER_SPACING = 12;
const DEFAULT_LINE_SPACING = 7;

const L1_BREATH_PERIOD_MS = 1200;
const L2_FADE_EDGE = 0.15;

export default function IkatText() {
  // ----- GA helper -----
  const ga = (name, params = {}) => {
    ReactGA.event(name, { category: "ikat_text", ...params });
  };

  const [inputText, setInputText] = useState(DEFAULT_TEXT);
  const [textPx, setTextPx] = useState(DEFAULT_TEXT_PX);
  const [look, setLook] = useState(DEFAULT_LOOK);
  const [mainColorHex, setMainColorHex] = useState(DEFAULT_MAIN_COLOR);
  const [letterSpacingPx, setLetterSpacingPx] = useState(
    DEFAULT_LETTER_SPACING
  );
  const [lineSpacingPx, setLineSpacingPx] = useState(DEFAULT_LINE_SPACING);

  // Look 1 controls
  const [breathe, setBreathe] = useState(true);
  const [breathPeriodMs, setBreathPeriodMs] = useState(L1_BREATH_PERIOD_MS);

  // Look 2 controls
  const [fadeEdge, setFadeEdge] = useState(L2_FADE_EDGE);

  // Step 3 dropdowns
  const [textSettingsOpen, setTextSettingsOpen] = useState(true);
  const [lookSettingsOpen, setLookSettingsOpen] = useState(true);

  // Capture / record controls (below preview)
  const [recordDurationSec, setRecordDurationSec] = useState(7);
  const [isRecording, setIsRecording] = useState(false);

  const displayRef = useRef(null);

  const lines = useMemo(() => {
    return inputText.replace(/\r\n/g, "\n").split("\n");
  }, [inputText]);

  const handleReset = () => {
    ga("ikat_reset_all");

    setInputText(DEFAULT_TEXT);
    setTextPx(DEFAULT_TEXT_PX);
    setLook(DEFAULT_LOOK);
    setMainColorHex(DEFAULT_MAIN_COLOR);
    setLetterSpacingPx(DEFAULT_LETTER_SPACING);
    setLineSpacingPx(DEFAULT_LINE_SPACING);
    setBreathe(true);
    setBreathPeriodMs(L1_BREATH_PERIOD_MS);
    setFadeEdge(L2_FADE_EDGE);
    setRecordDurationSec(7);
  };

  // ---------- CAPTURE / RECORD (unchanged) ----------
  const getDisplayCanvases = () => {
    if (!displayRef.current) return [];
    return Array.from(displayRef.current.querySelectorAll("canvas"));
  };

  const buildCompositeCanvas = (gapPx = lineSpacingPx) => {
    const canvases = getDisplayCanvases().filter(Boolean);
    if (canvases.length === 0) return null;

    const sizes = canvases.map((c) => ({
      w: c.width || Math.max(1, Math.floor(c.getBoundingClientRect().width)),
      h: c.height || Math.max(1, Math.floor(c.getBoundingClientRect().height)),
    }));

    const maxW = Math.max(...sizes.map((s) => s.w));
    const totalH =
      sizes.reduce((sum, s) => sum + s.h, 0) +
      Math.max(0, canvases.length - 1) * Math.max(0, gapPx);

    const out = document.createElement("canvas");
    out.width = Math.max(1, maxW);
    out.height = Math.max(1, totalH);

    const ctx = out.getContext("2d");
    if (!ctx) return null;

    let y = 0;
    canvases.forEach((c, i) => {
      const { w, h } = sizes[i];
      const x = Math.floor((maxW - w) / 2);
      ctx.drawImage(c, 0, 0, w, h, x, y, w, h);
      y += h + (i === canvases.length - 1 ? 0 : Math.max(0, gapPx));
    });

    return out;
  };

  const capturePNG = () => {
    ga("ikat_capture_image");

    const canvases = getDisplayCanvases();
    if (canvases.length === 0) {
      alert("No canvas found to capture.");
      return;
    }
    try {
      const composite = buildCompositeCanvas(lineSpacingPx);
      if (!composite) return;
      const url = composite.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "ikat-text.png";
      a.click();
    } catch {
      alert("Capture failed (often cross-origin asset tainting).");
    }
  };

  const recordBothCanvases = async () => {
    ga("ikat_record_start", { duration: recordDurationSec });

    const canvases = getDisplayCanvases();
    if (canvases.length === 0) {
      alert("No canvas found to record.");
      return;
    }

    const durationMs = Math.max(0, Math.min(20, recordDurationSec)) * 1000;
    if (durationMs === 0) {
      alert("Set a duration above 0s to record.");
      return;
    }

    const composite = buildCompositeCanvas(lineSpacingPx);
    if (!composite) return;

    const ctx = composite.getContext("2d");
    if (!ctx || !composite.captureStream) return;

    let rafId = null;
    let stopped = false;

    const drawFrame = () => {
      if (stopped) return;

      const live = getDisplayCanvases().filter(Boolean);
      if (live.length === 0) {
        rafId = requestAnimationFrame(drawFrame);
        return;
      }

      const gapPx = Math.max(0, lineSpacingPx);

      const sizes = live.map((c) => ({
        w: c.width || Math.max(1, Math.floor(c.getBoundingClientRect().width)),
        h:
          c.height || Math.max(1, Math.floor(c.getBoundingClientRect().height)),
      }));

      const maxW = Math.max(...sizes.map((s) => s.w));
      const totalH =
        sizes.reduce((sum, s) => sum + s.h, 0) +
        Math.max(0, live.length - 1) * gapPx;

      if (composite.width !== maxW || composite.height !== totalH) {
        composite.width = Math.max(1, maxW);
        composite.height = Math.max(1, totalH);
      } else {
        ctx.clearRect(0, 0, composite.width, composite.height);
      }

      let y = 0;
      live.forEach((c, i) => {
        const { w, h } = sizes[i];
        const x = Math.floor((maxW - w) / 2);
        ctx.drawImage(c, 0, 0, w, h, x, y, w, h);
        y += h + (i === live.length - 1 ? 0 : gapPx);
      });

      rafId = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    const stream = composite.captureStream(60);
    const chunks = [];
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    } catch {
      recorder = new MediaRecorder(stream);
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      ga("ikat_record_complete", { duration: recordDurationSec });

      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ikat-text.webm";
      a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
    };

    setIsRecording(true);
    recorder.start();
    setTimeout(() => recorder.stop(), durationMs);
  };

  // ---------- NEW: AUTO-TIGHTEN LINE GAP ----------
  const lineWrapRefs = useRef([]);
  const [autoOverlapPx, setAutoOverlapPx] = useState(0);

  useLayoutEffect(() => {
    if (lineSpacingPx > 20) {
      setAutoOverlapPx(0);
      return;
    }

    const nodes = lineWrapRefs.current.filter(Boolean);
    if (nodes.length < 2) {
      setAutoOverlapPx(0);
      return;
    }

    const heights = nodes.map((n) => n.getBoundingClientRect().height);
    const avgH = heights.reduce((a, b) => a + b, 0) / heights.length;

    const expected = textPx * 1.0;
    const extra = Math.max(0, avgH - expected);

    const strength = lineSpacingPx === 0 ? 0.9 : 0.6;
    const overlap = Math.round(extra * strength);

    setAutoOverlapPx(Math.max(0, Math.min(overlap, Math.round(textPx * 0.8))));
  }, [
    lines.length,
    look,
    textPx,
    lineSpacingPx,
    breathe,
    breathPeriodMs,
    fadeEdge,
  ]);

  const navTextStyle = { fontSize: `${textPx}px` };

  const renderLine = (line, idx) => {
    const key = `${idx}-${line}`;

    if (look === "animated") {
      return (
        <DiamondTitleFinal
          key={key}
          text={line || " "}
          autoResponsive={false}
          textPx={textPx}
          autoHeight
          heightScale={0.2}
          topColor={mainColorHex}
          botColor={mainColorHex}
          breathe={breathe}
          breathPeriodMs={breathPeriodMs}
        />
      );
    }

    return (
      <NavText3
        key={key}
        text={line || " "}
        letterSpacing={letterSpacingPx}
        baselinePx={60}
        tightPadPx={30}
        fitToCssFont
        topColor={mainColorHex}
        botColor={mainColorHex}
        fadeEdge={fadeEdge}
        style={navTextStyle}
      />
    );
  };

  return (
    <section className="ikat-text-effect-wrapper">
      <div className="ikat-controls">
        {/* STEP 1: SELECT LOOK */}
        <div className="ikat-step ikat-step-1">
          <h1 className="ikat-step-title">
            Step 1: Select which look you want
          </h1>

          <div className="ikat-row ikat-look-row">
            {/* LOOK 1 */}
            <button
              type="button"
              className={
                "ikat-look-option" +
                (look === "animated" ? " ikat-look-option--active" : "")
              }
              onClick={() => {
                ga("ikat_select_look", { look: "animated" });
                setLook("animated");
              }}
            >
              <div className="ikat-look-preview">
                <DiamondTitleFinal
                  text="LOOK 1"
                  autoResponsive={false}
                  textPx={120}
                  autoHeight
                  heightScale={1}
                  topColor="#F7EAAC"
                  botColor="#F7EAAC"
                  breathe={true}
                  breathPeriodMs={L1_BREATH_PERIOD_MS}
                />
              </div>
            </button>

            {/* LOOK 2 */}
            <button
              type="button"
              className={
                "ikat-look-option" +
                (look === "dense" ? " ikat-look-option--active" : "")
              }
              onClick={() => {
                ga("ikat_select_look", { look: "dense" });
                setLook("dense");
              }}
            >
              <div className="ikat-look-preview" style={{ fontSize: "60px" }}>
                <NavText3
                  text="LOOK 2"
                  letterSpacing={10}
                  baselinePx={60}
                  tightPadPx={30}
                  fitToCssFont
                  topColor="#F7EAAC"
                  botColor="#F7EAAC"
                />
              </div>
            </button>
          </div>
        </div>

        {/* STEP 2: TEXT */}
        <div className="ikat-step ikat-step-2">
          <h1 className="ikat-step-title">Step 2: Add your text </h1>
          <div className="ikat-row">
            <label className="ikat-control ikat-control-wide">
              <span className="ikat-label">Text (Enter adds a new line)</span>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* STEP 3: SETTINGS */}
        <div className="ikat-step ikat-step-3">
          <h1 className="ikat-step-title">Step 3: Edit letter settings</h1>

          <button
            type="button"
            className="ikat-step-title ikat-step-title--dropdown"
            onClick={() => setTextSettingsOpen((o) => !o)}
          >
            <span
              className={
                "ikat-step-caret" +
                (textSettingsOpen ? " ikat-step-caret--open" : "")
              }
            >
              ▾
            </span>
            <span className="ikat-dropdown-title">
              Text size + letter spacing
            </span>
          </button>

          {textSettingsOpen && (
            <div className="ikat-row ikat-dropdown-body">
              <label className="ikat-control">
                <div className="ikat-label-row">
                  <span className="ikat-label">Text size (px)</span>
                  <span className="ikat-value">{textPx}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={textPx}
                  onChange={(e) => setTextPx(parseInt(e.target.value, 10))}
                />
              </label>

              <label className="ikat-control">
                <div className="ikat-label-row">
                  <span className="ikat-label">Letter spacing (px)</span>
                  <span className="ikat-value">{letterSpacingPx}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={letterSpacingPx}
                  onChange={(e) =>
                    setLetterSpacingPx(parseInt(e.target.value, 10))
                  }
                />
              </label>

              <label className="ikat-control">
                <div className="ikat-label-row">
                  <span className="ikat-label">Line spacing (px)</span>
                  <span className="ikat-value">{lineSpacingPx}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  value={lineSpacingPx}
                  onChange={(e) =>
                    setLineSpacingPx(parseInt(e.target.value, 10))
                  }
                />
                {autoOverlapPx > 0 && (
                  <span className="ikat-helper">
                    Auto-tightening: overlapping {autoOverlapPx}px to remove
                    canvas padding.
                  </span>
                )}
              </label>
            </div>
          )}

          <button
            type="button"
            className="ikat-step-title ikat-step-title--dropdown"
            onClick={() => setLookSettingsOpen((o) => !o)}
          >
            <span
              className={
                "ikat-step-caret" +
                (lookSettingsOpen ? " ikat-step-caret--open" : "")
              }
            >
              ▾
            </span>
            <span className="ikat-dropdown-title">
              {look === "animated"
                ? "Look 1 motion settings"
                : "Look 2 density settings"}
            </span>
          </button>

          {lookSettingsOpen && (
            <div className="ikat-dropdown-body">
              {look === "animated" ? (
                <div className="ikat-row">
                  <label className="ikat-control ikat-control-inline">
                    <span className="ikat-label">Breathing</span>
                    <input
                      type="checkbox"
                      checked={breathe}
                      onChange={(e) => setBreathe(e.target.checked)}
                    />
                  </label>

                  <label className="ikat-control">
                    <div className="ikat-label-row">
                      <span className="ikat-label">Breath period (ms)</span>
                      <span className="ikat-value">{breathPeriodMs}</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="4000"
                      step="50"
                      value={breathPeriodMs}
                      onChange={(e) =>
                        setBreathPeriodMs(parseInt(e.target.value, 10))
                      }
                    />
                  </label>
                </div>
              ) : (
                <div className="ikat-row">
                  <label className="ikat-control">
                    <div className="ikat-label-row">
                      <span className="ikat-label">Edge fade factor</span>
                      <span className="ikat-value">{fadeEdge.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.05"
                      value={fadeEdge}
                      onChange={(e) => setFadeEdge(parseFloat(e.target.value))}
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* STEP 4: COLOR */}
        <div className="ikat-step ikat-step-4 ikat-step--highlight">
          <h1 className="ikat-step-title">Step 4: Pick a color</h1>
          <div className="ikat-row">
            <label className="ikat-control">
              <span className="ikat-label">Main color</span>
              <input
                type="color"
                value={mainColorHex}
                onChange={(e) => {
                  const next = e.target.value;
                  ga("ikat_color_change", { color: next });
                  setMainColorHex(next);
                }}
              />
            </label>
          </div>
        </div>

        <div className="ikat-row ikat-reset-row">
          <button
            className="ikat-reset-button"
            type="button"
            onClick={handleReset}
          >
            Reset all settings
          </button>
        </div>
      </div>

      {/* MAIN DISPLAY */}
      <div className="ikat-display-area" ref={displayRef}>
        <div className="ikat-multiline">
          {lines.map((line, idx) => {
            const isLast = idx === lines.length - 1;

            const gap = isLast ? 0 : Math.max(0, lineSpacingPx - autoOverlapPx);

            return (
              <div
                className="ikat-line"
                key={idx}
                ref={(el) => (lineWrapRefs.current[idx] = el)}
                style={{ marginBottom: gap }}
              >
                {renderLine(line, idx)}
              </div>
            );
          })}
        </div>

        {/* Controls BELOW the preview */}
        <div className="ikat-preview-tools">
          <div className="ikat-row">
            <button
              type="button"
              className="ikat-action-button"
              onClick={capturePNG}
            >
              Capture image
            </button>

            <button
              type="button"
              className="ikat-action-button"
              onClick={recordBothCanvases}
              disabled={isRecording}
            >
              {isRecording ? "Recording..." : "Record"}
            </button>

            <label className="ikat-control">
              <div className="ikat-label-row">
                <span className="ikat-label">Record duration (s)</span>
                <span className="ikat-value">{recordDurationSec}</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={recordDurationSec}
                onChange={(e) =>
                  setRecordDurationSec(parseInt(e.target.value, 10))
                }
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
