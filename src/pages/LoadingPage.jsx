// src/pages/LoadingPage.jsx
import React from "react";
import LoadingTitle from "../components/loading/LoadingTitle";
import LoadingSubTitle from "../components/loading/LoadingSubtitle";
import YellowPainter from "../components/loading/YellowPainter";
import LoadingSubtitleFinal from "../components/loading/LoadingSubtitleFinal";
import LoadingTitleFinal from "../components/loading/LoadingTitleFinal";

export default function LoadingPage() {
  return (
    <div className="loading-hero">
      <YellowPainter className="loading-bg" />

      <div className="loading-stack">
        <div style={{ width: "100vw", height: "55vh" }}>
          <div style={{ position: "relative", height: Math.round(1.55 * 420) }}>
            <LoadingTitleFinal textPx={170} />
          </div>
        </div>

        <div className="subtitle-overlay">
          <LoadingSubtitleFinal />
        </div>
      </div>
    </div>
  );
}
