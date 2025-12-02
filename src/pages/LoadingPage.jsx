// src/pages/LoadingPage.jsx
import React from "react";
import LoadingTitleFinal from "../components/loading/LoadingTitleFinal";
import LoadingSubtitleFinal from "../components/loading/LoadingSubtitleFinal";

export default function LoadingPage() {
  return (
    <div
      className="loading-hero"
      style={{
        width: "100vw",
        height: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#9e8e27ff",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        className="loading-stack"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          position: "relative",
          zIndex: 1,
        }}
      >
        <LoadingTitleFinal
          autoResponsive
          desktopPx={240}
          ipadBp={1024}
          mobileBp={600}
          ipadScale={0.45}
          mobileScale={0.33}
          autoHeight
          heightScale={1.35}
        />

        {/* Force-visible subtitle */}
        <div
          className="subtitle-overlay"
          style={{
            position: "relative",
            zIndex: 2,
            // If your subtitle reads currentColor, this sets it:
            color: "#ff7a00",
            // and if it uses a CSS var, we provide both:
            ["--shard-color"]: "#ff7a00",
          }}
        >
          <LoadingSubtitleFinal
            desktopPx={40}
            gapPx={8}
            delayMs={0} // show immediately for debug
          />
        </div>
      </div>

      {/* Debug layer: comment out later */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          outline: "1px dashed #bbb",
        }}
      />
    </div>
  );
}
