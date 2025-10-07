import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import CanvasParticles from "../components/CanvasParticles.jsx";
import Role3D from "../components/Role3D.jsx";
import CanvasText from "../components/CanvasText.jsx";

export default function Home() {
  const { hash } = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  // Simulate fake loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000); // 2s fake load
    return () => clearTimeout(timer);
  }, []);

  // Smooth-scroll for #about
  useEffect(() => {
    if (hash === "#about") {
      document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [hash]);

  return (
    <main className="home">
      {isLoading && <Preloader />}
      {!isLoading && (
        <>
          <CanvasParticles />

          <Role3D />
        </>
      )}
    </main>
  );
}

/* --- Internal Preloader Component --- */
function Preloader() {
  return (
    <div className="preloader">
      <div className="spinner" />
      <p className="loading-text">Loading fragments...</p>
    </div>
  );
}
