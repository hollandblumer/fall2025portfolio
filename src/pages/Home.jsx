import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ElasticMenu from "../components/nav/ElasticMenu.jsx";
import About from "../components/about/About.jsx";
import OverlapBlobs from "./OverlapBlobs.jsx"; // Assuming this is needed
import MorphText from "../components/text/MorphText.jsx";
import FilmGrainLayer from "../components/textures/FilmGrainLayer.jsx";

export default function Home() {
  const { hash } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // 1. State to track if the screen is mobile or tablet (<= 1024px)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  // Handle scroll to #about (no preloader gate now)
  useEffect(() => {
    if (hash === "#about") {
      requestAnimationFrame(() => {
        document
          .getElementById("about")
          ?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [hash]);

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
    ? "./SquishyYellowMobileHolland.html" // Source for mobile/tablet
    : "./SquishyYellow.html"; // Source for desktop

  return (
    <>
      <FilmGrainLayer />
      <main className="home-container">
        <section className="left-column">
          <div className="menu-wrapper">
            <ElasticMenu
              isOpen={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
            />
          </div>

          {/* Blur-melt filter (SVG remains the same) */}
          <svg width="0" height="0">
            <filter id="blur-melt">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur">
                <animate
                  attributeName="stdDeviation"
                  values="2; 2; 2; 2"
                  keyTimes="0; 0.3; 0.7; 1"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </feGaussianBlur>
              <feComponentTransfer>
                <feFuncA type="linear" slope="30" intercept="-12" />
              </feComponentTransfer>
            </filter>
          </svg>

          <div
            id="full-paragraph-container"
            className="full-paragraph intro-text mobile-text-offset"
          >
            <MorphText
              texts={["CREATIVE", "COMPUTER", "SOFTWARE", "INTERACTIVE"]}
              className="morph-word"
            />{" "}
            <MorphText
              texts={["TECHNOLOGIST", "SCIENTIST", "ENGINEER", "DESIGNER"]}
              className="morph-word"
            />
            <div className="location-line">based in Brooklyn </div>
          </div>

          {/* DESKTOP-ONLY SOCIAL ICONS */}
          <div className="desktop-social-icons">
            <a
              href="https://instagram.com/hollandblumer"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a
              href="https://linkedin.com/in/hollandblumer"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fa-brands fa-linkedin"></i>
            </a>
          </div>

          {/* MOBILE-ONLY SOCIAL ICONS */}
          <div className="mobile-social-icons">
            <a
              href="https://instagram.com/hollandblumer"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a
              href="https://linkedin.com/in/hollandblumer"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fa-brands fa-linkedin"></i>
            </a>
          </div>
        </section>

        <section className="right-column">
          <iframe
            src={iframeSrc}
            title="Squishy Letters"
            className="squishy-frame"
          ></iframe>
        </section>

        {menuOpen && (
          <div
            className="slideout-backdrop"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <aside className={`slideout-menu ${menuOpen ? "open" : ""}`}>
          <ul>
            <li>
              <a href="/work" onClick={() => setMenuOpen(false)}>
                Work
              </a>
            </li>
            <li>
              <a href="#about" onClick={() => setMenuOpen(false)}>
                About
              </a>{" "}
            </li>
            <li>
              <a
                href="mailto:hollandblumer6@icloud.com?subject=Hello&body=Hi%20Holland!"
                onClick={() => setMenuOpen(false)}
              >
                Contact
              </a>
            </li>
          </ul>
        </aside>
      </main>

      <About />
    </>
  );
}
