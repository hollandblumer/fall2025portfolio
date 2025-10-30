import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Hero from "../components/Hero.jsx";

export default function Home() {
  const { hash } = useLocation();
  const [showPreloader, setShowPreloader] = useState(true);

  // Fake 3s brand preloader
  useEffect(() => {
    const timer = setTimeout(() => setShowPreloader(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Smooth-scroll after Hero is mounted (texture already behind)
  useEffect(() => {
    if (!showPreloader && hash === "#about") {
      requestAnimationFrame(() => {
        document
          .getElementById("about")
          ?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [hash, showPreloader]);

  return (
    <main className="home" style={{ minHeight: "100svh" }}>
      <Hero />
    </main>
  );
}
