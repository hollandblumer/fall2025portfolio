import React from "react";
import { NavLink } from "react-router-dom";
import WorkNavSliced from "./nav/HeroNavSliced";

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
          }}
        >
          <WorkNavSliced text="about" letterSpacing={0} tightPadPx={30} />
        </div>
      </NavLink>

      <NavLink to="/work" className={({ isActive }) => link(isActive)}>
        <div
          className="nav-item"
          style={{
            display: "inline-block",
          }}
        >
          <WorkNavSliced text="work" letterSpacing={0} baselinePx={60} />
        </div>
      </NavLink>

      <NavLink to="/#about" className={({ isActive }) => link(isActive)}>
        <div
          className="nav-item"
          style={{
            display: "inline-block",
          }}
        >
          <WorkNavSliced text="contact" letterSpacing={0} baselinePx={60} />
        </div>
      </NavLink>

      <NavLink to="/#about" className={({ isActive }) => link(isActive)}>
        <div
          className="nav-item"
          style={{
            display: "inline-block",
          }}
        >
          <WorkNavSliced text="social" letterSpacing={0} baselinePx={60} />
        </div>
      </NavLink>
    </nav>
  );
}
