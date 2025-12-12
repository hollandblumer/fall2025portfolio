import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ElasticMenu from "../components/nav/ElasticMenu";
import SmearEffect from "../components/templates/SmearEffect";
import IkatText from "../components/templates/IkatText";

const FILTERS = ["Smear Effect", "Ikat Text"];

// Utility to normalize filter keys
const toKey = (label) => label.trim().toLowerCase().replace(/\s+/g, "-");

export default function Templates() {
  const [menuOpen, setMenuOpen] = useState(false);
  // Default to the smear-effect tag, or adjust if you want a different default
  const [activeFilter, setActiveFilter] = useState("smear-effect");
  // Detect mobile/tablet (simplest reliable check)
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

  // Pick different HTML + different scale param
  const iframeSrc = isMobileOrTablet
    ? "./SmearTextWork.html?text=TEMPLATES&scale=1.2" // Smaller scale on mobile
    : "./SmearTextWork.html?text=TEMPLATES&scale=3.0"; // Bigger on desktop

  // Helper to determine what content to display
  const renderActiveTemplate = () => {
    switch (activeFilter) {
      case "smear-effect":
        return (
          <SmearEffect
            imageUrl="https://assets.codepen.io/9259849/Screenshot%202025-11-26%20at%202.51.05%E2%80%AFPM.png"
            freqX={0.05}
            freqY={0.1}
            baseWaveAmp={80}
            fineWaveAmp={15}
            initialMeltYRatio={0.75}
            meltDurationMs={20000}
          />
        );
      case "ikat-text":
        // 3. RENDER THE NEW COMPONENT
        return <IkatText />;
      default:
        return <SmearEffect />; // Fallback to SmearEffect
    }
  };

  return (
    <>
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

      {/* Elastic Menu and Desktop Icons */}
      <div className="work-nav">
        <div className="work-menu-wrapper">
          <ElasticMenu
            isOpen={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          />
        </div>
        <div className="work-desktop-social-icons">
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
        <aside className={`slideout-menu ${menuOpen ? "open" : ""}`}>
          <ul>
            <li>
              <Link to="/work" onClick={() => setMenuOpen(false)}>
                Work
              </Link>
            </li>
            <li>
              <Link to="/#about" onClick={() => setMenuOpen(false)}>
                About
              </Link>
            </li>
            <li>
              <Link to="/templates" onClick={() => setMenuOpen(false)}>
                Templates
              </Link>
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
              <a href="/" onClick={() => setMenuOpen(false)}>
                Home
              </a>
            </li>
          </ul>
        </aside>
      </div>
      <main className="templates-page page">
        {/* === NAVIGATION & SOCIAL ICONS === */}

        {/* Mobile Social icons */}

        {/* === HEADER + FILTERS === */}
        <div className="projects-header">
          {/*   <DiamondTitleFinal
            text="TEMPLATES"
            autoResponsive
            desktopPx={100}
            ipadBp={1024}
            mobileBp={700}
            ipadScale={0.7}
            mobileScale={0.6}
            autoHeight
            heightScale={1}
          /> */}

          <iframe
            src={iframeSrc}
            title="Squishy Letters"
            className="template-i-frame"
          ></iframe>

          <div style={{ width: "100%", maxWidth: 1000, margin: "0 auto" }} />

          {/* Filter Menu – now including “IKAT TEXT EFFECT” */}
          <div className="filter-menu">
            {FILTERS.map((label) => {
              const key = toKey(label);
              const isActive = key === activeFilter;
              return (
                <button
                  key={key}
                  className={`filter-button ${isActive ? "active" : ""}`}
                  onClick={() => setActiveFilter(key)}
                >
                  {label.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* === CONTENT: ACTIVE TEMPLATE === */}
        <div className="single-template-container">
          {renderActiveTemplate()}
        </div>
      </main>
    </>
  );
}
