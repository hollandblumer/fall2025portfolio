import React from "react";
import { NavLink } from "react-router-dom";
import NavText3 from "./nav/NavText3";

const link = (isActive) => `hammer-link ${isActive ? "active" : ""}`;

export default function Nav({}) {
  return (
    // Nav.jsx (snippet)
    <nav className="nav">
      <NavLink to="/#about" className={({ isActive }) => link(isActive)}>
        <div
          className="nav-item"
          style={{
            display: "inline-block",
            minWidth: "10ch",
            fontSize: "30px", // <-- real CSS font size
          }}
        >
          <NavText3
            text="ABOUT"
            letterSpacing={10}
            baselinePx={60}
            fitToCssFont
            tightPadPx={30}
          />
        </div>
      </NavLink>

      <NavLink to="/work" className={({ isActive }) => link(isActive)}>
        <div
          className="nav-item"
          style={{
            display: "inline-block",
            minWidth: "10ch",
            fontSize: "30px", // <-- real CSS font size
          }}
        >
          <NavText3
            text="WORK"
            letterSpacing={10}
            baselinePx={60}
            fitToCssFont
            tightPadPx={30}
          />
        </div>
      </NavLink>

      <NavLink to="/#about" className={({ isActive }) => link(isActive)}>
        <div
          className="nav-item"
          style={{
            display: "inline-block",
            minWidth: "10ch",
            fontSize: "30px", // <-- real CSS font size
          }}
        >
          <NavText3
            text="CONTACT"
            letterSpacing={10}
            baselinePx={60}
            fitToCssFont
            tightPadPx={30}
          />
        </div>
      </NavLink>

      <NavLink to="/#about" className={({ isActive }) => link(isActive)}>
        <div
          className="nav-item"
          style={{
            display: "inline-block",
            minWidth: "10ch",
            fontSize: "30px", // <-- real CSS font size
          }}
        >
          <NavText3
            text="SOCIAL"
            letterSpacing={10}
            baselinePx={60}
            fitToCssFont
            tightPadPx={30}
          />
        </div>
      </NavLink>
    </nav>
  );
}
