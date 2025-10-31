// src/pages/LoadingPage.jsx
import React from "react";
import LoadingTitle from "../components/loading/LoadingTitle";
import LoadingSubTitle from "../components/loading/LoadingSubtitle";
import YellowPainter from "../components/loading/YellowPainter";

export default function LoadingPage() {
  return (
    <div className="loading-hero">
      {/* background painter */}
      <YellowPainter className="loading-bg" />

      {/* centered content */}
      <div className="loading-content">
        <LoadingTitle
          textSizePx={250}
          fontFamily="Outfit, Helvetica, Arial, sans-serif"
          onFinish={() => console.log("morph done")}
          gridLoading={{
            sideMargin: 10, // was 50
            targetColWidth: 12,
            rowHeightMul: 0.7,
            subRows: 2,
            stagger: true,
          }}
          gridHolland={{
            sideMargin: 0, // was 50
            targetColWidth: 10,
            rowHeightMul: 0.7,
            subRows: 2,
            stagger: true,
          }}
        />

        <LoadingSubTitle
          className="loading-sub"
          mix={[
            { text: "is a", style: "diamond" },
            { text: "creative developer", style: "plain" },
            { text: "based in", style: "diamond" },
            { text: "Brooklyn, NY", style: "plain" },
          ]}
          baselinePx={60}
          fitToCssFont
          letterSpacing={10}
          tightPadPx={30}
        />
      </div>
    </div>
  );
}
