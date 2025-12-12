import { useState, useEffect } from "react";

export default function About() {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  // Handle screen size check
  useEffect(() => {
    const checkScreenSize = () => {
      // Set the breakpoint for mobile/tablet (e.g., up to 1024px)
      setIsMobileOrTablet(window.innerWidth <= 1024);
    };

    // Initial check
    checkScreenSize();

    // Listen for window resize events
    window.addEventListener("resize", checkScreenSize);

    // Cleanup the event listener on component unmount
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Determine the iframe source based on screen size (for the main content)
  const iframeSrc = isMobileOrTablet
    ? "./SmearTextWork.html?text=ABOUT&scale=2.7" // Source for mobile/tablet
    : "./SmearTextWork.html?text=ABOUT&scale=3.7"; // Source for desktop

  return (
    <section id="about" className="about-section">
      {/* SVG filter defs (hidden) */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0 .007"
              numOctaves="1"
              seed="1"
              stitchTiles="stitch"
              result="turbulence1"
            >
              <animate
                attributeName="baseFrequency"
                dur="1s"
                values="0 .005; 0 .010; 0 .005"
                repeatCount="indefinite"
              />
            </feTurbulence>

            <feDisplacementMap
              in="SourceGraphic"
              in2="turbulence1"
              scale="10"
              xChannelSelector="R"
              yChannelSelector="A"
              result="displacementMap2"
            />

            <feColorMatrix
              type="saturate"
              values="5"
              in="displacementMap2"
              result="colormatrix4"
            />
          </filter>
        </defs>
      </svg>

      {/* LEAVE ABOUT TITLE AS-IS */}
      <div className="about-title">
        <iframe
          src={iframeSrc}
          title="Squishy Letters"
          className="about-i-frame"
        ></iframe>
      </div>

      <div className="about-blurb">
        <div>
          Holland Blumer is a creative technologist and computer scientist in
          Brooklyn focused on building online experiences that are intentional,
          design-driven, and interactive. She studied Manufacturing & Design
          Engineering at Northwestern University, where she joined the robotics
          team and began taking on design projects for friends. She later earned
          a graduate degree in Computer Engineering at Dartmouth College,
          serving as the full-stack developer on a six-month ChargePoint project
          alongside her studies. She now helps clients communicate clearly and
          stand out online.
        </div>
      </div>
    </section>
  );
}
