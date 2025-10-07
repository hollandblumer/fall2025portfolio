import React, { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

// Build class for NavLink from its isActive flag
const link = (isActive) => `hammer-link ${isActive ? "active" : ""}`;

export default function BronzeHammeredNav() {
  const drawerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const btn = buttonRef.current;
    const drawer = drawerRef.current;
    if (!btn || !drawer) return;

    function openDrawer() {
      drawer.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      document.addEventListener("keydown", onKey);
      document.addEventListener("click", onDocClick);
    }

    function closeDrawer() {
      drawer.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onDocClick);
    }

    function onKey(e) {
      if (e.key === "Escape") {
        closeDrawer();
        btn.focus();
      }
    }

    function onDocClick(e) {
      const within = drawer.contains(e.target) || btn.contains(e.target);
      if (!within) closeDrawer();
    }

    function onToggle() {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      expanded ? closeDrawer() : openDrawer();
    }

    btn.addEventListener("click", onToggle);

    const BREAKPOINT = 980;
    function handleResize() {
      if (window.innerWidth > BREAKPOINT) closeDrawer();
    }
    window.addEventListener("resize", handleResize);

    function onDrawerClick(e) {
      const a = e.target.closest("a");
      if (a) closeDrawer();
    }
    drawer.addEventListener("click", onDrawerClick);

    return () => {
      btn.removeEventListener("click", onToggle);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onDocClick);
      drawer.removeEventListener("click", onDrawerClick);
    };
  }, []);

  return (
    <>
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: "absolute", left: -9999 }}
      >
        <filter
          id="hammeredBronzeGentle"
          x="-15%"
          y="-20%"
          width="130%"
          height="140%"
          colorInterpolationFilters="sRGB"
          filterRes="1200"
        >
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            result="A0"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
          />

          {/* ---- very subtle edge warp noise (animated) ---- */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006"
            numOctaves="2"
            seed="71"
            stitchTiles="stitch"
            result="warpNoise"
          >
            {/* barely-perceptible drift */}
            <animate
              attributeName="baseFrequency"
              values="0.006;0.0068;0.006"
              dur="22s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feGaussianBlur in="warpNoise" stdDeviation="0.6" result="warpSoft" />
          <feDisplacementMap
            in="A0"
            in2="warpSoft"
            scale="2"
            xChannelSelector="R"
            yChannelSelector="G"
            result="A1warp"
          >
            {/* micro “breathing” on the warp strength */}
            <animate
              attributeName="scale"
              values="2;2.3;2"
              dur="28s"
              repeatCount="indefinite"
            />
          </feDisplacementMap>

          <feComposite
            in="A0"
            in2="A1warp"
            operator="arithmetic"
            k1="0"
            k2="0.9"
            k3="0.1"
            k4="0"
            result="A1"
          />

          {/* ---- chip mask (static) ---- */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1"
            numOctaves="20"
            seed="19"
            stitchTiles="stitch"
            result="chipNoise"
          />
          <feComponentTransfer in="chipNoise" result="chipMask">
            <feFuncR type="table" tableValues="0 0 1 1 1" />
            <feFuncG type="table" tableValues="0 0 1 1 1" />
            <feFuncB type="table" tableValues="0 0 1 1 1" />
          </feComponentTransfer>

          <feGaussianBlur in="A1" stdDeviation="0.9" result="A1blur" />
          <feComposite in="A1blur" in2="A1" operator="xor" result="edgeBand" />
          <feComposite
            in="edgeBand"
            in2="chipMask"
            operator="in"
            result="edgeChips"
          />
          <feComposite in="A1" in2="edgeChips" operator="out" result="ALPHA" />

          {/* ---- base fill ---- */}
          <feFlood floodColor="#b57e54" result="fill" />
          <feComposite in="fill" in2="ALPHA" operator="in" result="base" />

          {/* ---- low/high-frequency hammered normals (animated, tiny drift) ---- */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.03"
            numOctaves="2"
            seed="7"
            stitchTiles="stitch"
            result="hmL"
          >
            <animate
              attributeName="baseFrequency"
              values="0.03;0.0315;0.03"
              dur="26s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feGaussianBlur in="hmL" stdDeviation="0.6" result="hmL2" />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.085"
            numOctaves="3"
            seed="33"
            stitchTiles="stitch"
            result="hmF"
          >
            <animate
              attributeName="baseFrequency"
              values="0.085;0.088;0.085"
              dur="34s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feBlend in="hmL2" in2="hmF" mode="multiply" result="heightMap" />
          <feComposite
            in="heightMap"
            in2="ALPHA"
            operator="in"
            result="height"
          />

          {/* ---- lighting ---- */}
          <feDiffuseLighting
            in="height"
            surfaceScale="9"
            kernelUnitLength="1"
            lightingColor="#fff"
            result="diff"
          >
            <feDistantLight azimuth="225" elevation="54" />
          </feDiffuseLighting>
          <feSpecularLighting
            in="height"
            surfaceScale="11"
            specularConstant="0.55"
            specularExponent="24"
            lightingColor="#fff"
            result="spec"
          >
            <feDistantLight azimuth="225" elevation="54" />
          </feSpecularLighting>

          {/* tone + composite exactly as before */}
          <feColorMatrix in="diff" type="saturate" values="0" result="diffL" />
          <feColorMatrix in="spec" type="saturate" values="0" result="specL" />
          <feComponentTransfer in="diffL" result="diffWarm">
            <feFuncR type="linear" slope="0.9" />
            <feFuncG type="linear" slope="0.85" />
            <feFuncB type="linear" slope="0.74" />
          </feComponentTransfer>
          <feComponentTransfer in="specL" result="specWarm">
            <feFuncR type="linear" slope="0.96" />
            <feFuncG type="linear" slope="0.91" />
            <feFuncB type="linear" slope="0.80" />
          </feComponentTransfer>

          <feBlend in="base" in2="diffWarm" mode="multiply" result="shade1" />
          <feBlend in="shade1" in2="specWarm" mode="screen" result="shade2" />

          {/* inner shadow
          <feGaussianBlur in="ALPHA" stdDeviation="1.4" result="ish-blur" />
          <feOffset in="ish-blur" dx="0.4" dy="0.8" result="ish-off" />
          <feComposite
            in="ish-off"
            in2="ALPHA"
            operator="out"
            result="ish-band"
          />
          <feFlood floodColor="var(--bronze-deep)" result="ish-color" />
          <feComposite
            in="ish-color"
            in2="ish-band"
            operator="in"
            result="ish"
          />

          <feBlend in="shade2" in2="ish" mode="multiply" result="final" />
          <feComposite in="final" in2="ALPHA" operator="in" /> */}
          <feComposite in="shade2" in2="ALPHA" operator="in" />
        </filter>
      </svg>

      {/* NAV BAR */}
      <nav className="site-topbar" aria-label="Primary">
        {/* Hamburger (only shows under breakpoint) */}
        <button
          className="hamburger"
          id="hamburger"
          aria-controls="left-drawer"
          aria-expanded="false"
          ref={buttonRef}
        >
          <span className="visually-hidden">Open menu</span>
          <svg
            className="hammer-label"
            aria-hidden="true"
            viewBox="0 0 60 40"
            width="40"
            height="40"
          >
            <g filter="url(#hammeredBronzeGentle)">
              <rect
                x="5"
                y="6"
                width="50"
                height="5"
                rx="2.5"
                fill="var(--bronze-base)"
              />
              <rect
                x="5"
                y="18"
                width="50"
                height="5"
                rx="2.5"
                fill="var(--bronze-base)"
              />
              <rect
                x="5"
                y="30"
                width="50"
                height="5"
                rx="2.5"
                fill="var(--bronze-base)"
              />
            </g>
          </svg>
        </button>

        {/* Desktop left links */}
        <div className="nav-left" id="nav-left-desktop">
          <NavLink to="/#about" className={({ isActive }) => link(isActive)}>
            <span className="visually-hidden">ABOUT</span>
            <svg
              className="hammer-label"
              aria-hidden="true"
              viewBox="0 0 120 28"
            >
              <text x="0" y="22" fontFamily="Inter" fontSize="22">
                ABOUT
              </text>
            </svg>
          </NavLink>
          <NavLink to="/resume" className={({ isActive }) => link(isActive)}>
            <span className="visually-hidden">RESUME</span>
            <svg
              className="hammer-label"
              aria-hidden="true"
              viewBox="0 0 140 28"
            >
              <text x="0" y="22" fontFamily="Inter" fontSize="22">
                RESUME
              </text>
            </svg>
          </NavLink>
          <NavLink to="/work" className={({ isActive }) => link(isActive)}>
            <span className="visually-hidden">WORK</span>
            <svg
              className="hammer-label"
              aria-hidden="true"
              viewBox="0 0 110 28"
            >
              <text x="0" y="22" fontFamily="Inter" fontSize="22">
                WORK
              </text>
            </svg>
          </NavLink>
          <NavLink to="/templates" className={({ isActive }) => link(isActive)}>
            <span className="visually-hidden">TEMPLATES</span>
            <svg
              className="hammer-label"
              aria-hidden="true"
              viewBox="0 0 220 28"
            >
              <text
                x="0"
                y="22"
                fontFamily="Inter"
                fontSize="22"
                letterSpacing="2"
              >
                TEMPLATES
              </text>
            </svg>
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => link(isActive)}>
            <span className="visually-hidden">CONTACT</span>
            <svg
              className="hammer-label"
              aria-hidden="true"
              viewBox="0 0 150 28"
            >
              <text x="0" y="22" fontFamily="Inter" fontSize="22">
                CONTACT
              </text>
            </svg>
          </NavLink>
        </div>

        <div className="spacer" aria-hidden="true" />

        {/* Right links (stack vertically on small screens) */}
        <div className="nav-right">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener"
            className="hammer-link"
          >
            <span className="visually-hidden">GitHub</span>
            <svg
              className="hammer-label"
              aria-hidden="true"
              viewBox="0 0 110 28"
            >
              <text x="0" y="22" fontFamily="Inter" fontSize="20">
                GitHub
              </text>
            </svg>
          </a>
          <a
            href="https://codepen.io"
            target="_blank"
            rel="noopener"
            className="hammer-link"
          >
            <span className="visually-hidden">CodePen</span>
            <svg
              className="hammer-label"
              aria-hidden="true"
              viewBox="0 0 130 28"
            >
              <text x="0" y="22" fontFamily="Inter" fontSize="20">
                CodePen
              </text>
            </svg>
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener"
            className="hammer-link"
          >
            <span className="visually-hidden">LinkedIn</span>
            <svg
              className="hammer-label"
              aria-hidden="true"
              viewBox="0 0 150 28"
            >
              <text x="0" y="22" fontFamily="Inter" fontSize="20">
                LinkedIn
              </text>
            </svg>
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener"
            className="hammer-link"
          >
            <span className="visually-hidden">Instagram</span>
            <svg
              className="hammer-label"
              aria-hidden="true"
              viewBox="0 0 170 28"
            >
              <text x="0" y="22" fontFamily="Inter" fontSize="20">
                Instagram
              </text>
            </svg>
          </a>
        </div>
      </nav>

      {/* Mobile drawer (mirrors left links) */}
      <div
        className="drawer"
        id="left-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hamburger"
        ref={drawerRef}
      >
        <div className="drawer-inner">
          <div className="drawer-links">
            <NavLink to="/#about" className={({ isActive }) => link(isActive)}>
              <span className="visually-hidden">ABOUT</span>
              <svg
                className="hammer-label"
                aria-hidden="true"
                viewBox="0 0 120 32"
              >
                <text x="0" y="26" fontFamily="Inter" fontSize="26">
                  ABOUT
                </text>
              </svg>
            </NavLink>
            <NavLink to="/resume" className={({ isActive }) => link(isActive)}>
              <span className="visually-hidden">RESUME</span>
              <svg
                className="hammer-label"
                aria-hidden="true"
                viewBox="0 0 150 32"
              >
                <text x="0" y="26" fontFamily="Inter" fontSize="26">
                  RESUME
                </text>
              </svg>
            </NavLink>
            <NavLink to="/work" className={({ isActive }) => link(isActive)}>
              <span className="visually-hidden">WORK</span>
              <svg
                className="hammer-label"
                aria-hidden="true"
                viewBox="0 0 120 32"
              >
                <text x="0" y="26" fontFamily="Inter" fontSize="26">
                  WORK
                </text>
              </svg>
            </NavLink>
            <NavLink
              to="/templates"
              className={({ isActive }) => link(isActive)}
            >
              <span className="visually-hidden">TEMPLATES</span>
              <svg
                className="hammer-label"
                aria-hidden="true"
                viewBox="0 0 250 32"
              >
                <text
                  x="0"
                  y="26"
                  fontFamily="Inter"
                  fontSize="26"
                  letterSpacing="2"
                >
                  TEMPLATES
                </text>
              </svg>
            </NavLink>
            <NavLink to="/contact" className={({ isActive }) => link(isActive)}>
              <span className="visually-hidden">CONTACT</span>
              <svg
                className="hammer-label"
                aria-hidden="true"
                viewBox="0 0 170 32"
              >
                <text x="0" y="26" fontFamily="Inter" fontSize="26">
                  CONTACT
                </text>
              </svg>
            </NavLink>
          </div>
        </div>
      </div>
    </>
  );
}
