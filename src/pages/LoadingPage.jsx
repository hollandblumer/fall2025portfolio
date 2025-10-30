// src/pages/LoadingPage.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ShardsLoader from "../components/loading/ShardsLoader";
import LoadingWords from "../components/loading/LoadingWords";
import LoadingTitle from "../components/loading/LoadingTitle";
import LoadingSubTitle from "../components/loading/LoadingSubtitle";
import ThreeCanvas from "../components/ThreeCanvas";
export default function LoadingPage() {
  const navigate = useNavigate();

  return (
    <div className="loading-container">
      <LoadingTitle
        background="#F3A916"
        fontFamily="Outfit, Helvetica, Arial, sans-serif"
        onFinish={() => console.log("morph done")}
      />
    </div>
  );
}
