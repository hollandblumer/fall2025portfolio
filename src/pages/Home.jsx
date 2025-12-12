// src/pages/Home.jsx
import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import ElasticMenu from "../components/nav/ElasticMenu.jsx";
import About from "../components/about/About.jsx";
import OverlapBlobs from "./OverlapBlobs.jsx"; // (left as-is since you imported it)
import MorphText from "../components/text/MorphText.jsx";
import FilmGrainLayer from "../components/textures/FilmGrainLayer.jsx";
import LoadingBlobs from "../components/loading/LoadingBlobs.jsx";

export default function Home() {
  const { hash } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // 1. State to track if the screen is mobile or tablet (<= 1024px)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  // NEW: loader state (hide when iframe loads)
  const [isLoading, setIsLoading] = useState(true);
  const loadStartRef = useRef(Date.now());

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
      setIsMobileOrTablet(window.innerWidth <= 1024);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Determine the iframe source based on screen size (for the main content)
  const iframeSrc = isMobileOrTablet
    ? "./SquishyYellowMobileHolland.html"
    : "./SquishyYellow.html";

  // NEW: if the iframe src changes (resize breakpoint), show loader again until it loads
  useEffect(() => {
    loadStartRef.current = Date.now();
    setIsLoading(true);
  }, [iframeSrc]);

  // Optional: prevent scrolling while loading
  useEffect(() => {
    document.body.style.overflow = isLoading ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLoading]);

  return (
    <>
      {/* NEW: overlay loader */}
      <LoadingBlobs show={isLoading} />

      <FilmGrainLayer />
      <main className="home-container">
        <section className="left-column">
          <div className="menu-wrapper">
            <ElasticMenu
              isOpen={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
            />
          </div>

          <Link to="/templates" className="templates-out-now-desktop">
            Templates Out Now{" "}
            <svg
              className="diagonal-arrow"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#A5A5A5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17L17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </Link>

          {/* MOBILE-ONLY LINK */}
          <Link to="/templates" className="templates-out-now-mobile">
            Templates Out Now{" "}
            <svg
              className="diagonal-arrow"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17L17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </Link>

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
              texts={["CREATIVE", "COMPUTER", "SOFTWARE", "WEBSITE"]}
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
            key={iframeSrc}
            src={iframeSrc}
            title="Squishy Letters"
            className="squishy-frame"
            onLoad={() => {
              const elapsed = Date.now() - loadStartRef.current;
              const MIN_DURATION = 3000; // 2 seconds

              const remaining = Math.max(MIN_DURATION - elapsed, 0);

              setTimeout(() => {
                setIsLoading(false);
              }, remaining);
            }}
            onError={() => setIsLoading(false)}
          />
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
                href="mailto:hollandblumer6@icloud.com?subject=Website%20Inquiry&body=Hi%20Holland!"
                onClick={() => setMenuOpen(false)}
              >
                Contact
              </a>
            </li>
            <li>
              <a href="/templates" onClick={() => setMenuOpen(false)}>
                Templates
              </a>
            </li>
          </ul>
        </aside>
      </main>

      <About />
    </>
  );
}
