import { useEffect, useState } from "react";
import LoadingTitleFinal from "./LoadingTitleFinal";
import LoadingSubtitleFinal from "./LoadingSubtitleFinal";
import YellowPainter from "./YellowPainter";

function PreloaderOverlay({ minMs = 8000, maxMs = 10000, onDone = () => {} }) {
  const [visible, setVisible] = useState(true);
  const [minElapsed, setMinElapsed] = useState(false);
  const [readyEvent, setReadyEvent] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), Math.max(0, minMs));
    return () => clearTimeout(t);
  }, [minMs]);

  useEffect(() => {
    const onReady = () => setReadyEvent(true);
    window.addEventListener("loading:title:ready", onReady);
    return () => window.removeEventListener("loading:title:ready", onReady);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setReadyEvent(true);
      setMinElapsed(true);
    }, maxMs);
    return () => clearTimeout(t);
  }, [maxMs]);

  if (!visible) return null;

  return (
    <>
      <style>{}</style>

      <div className="preloader-overlay">
        <div className="painter-layer">
          <YellowPainter className="painter-host" />
        </div>

        <div className="loading-stack">
          <LoadingTitleFinal
            autoResponsive
            desktopPx={240}
            ipadBp={1024}
            mobileBp={600}
            ipadScale={0.44}
            mobileScale={0.34}
            autoHeight
            heightScale={1.4}
            topColor="#727577ff"
            botColor="#555453ff"
            holdMs={1600}
            fillLeadMs={250}
            fillExtendMs={240}
          />
          <LoadingSubtitleFinal desktopPx={40} gapPx={8} delayMs={0} />
        </div>
      </div>
    </>
  );
}

export default PreloaderOverlay;
export { PreloaderOverlay };
