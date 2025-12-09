// src/pages/Work.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import DiamondTitleFinal from "../components/DiamondTitleFinal";
import ElasticMenu from "../components/nav/ElasticMenu";
import VideoCloth from "../components/VideoCloth";
import FilmGrainLayer from "../components/textures/FilmGrainLayer";

export const projects = [
  {
    id: 1,
    slug: "checkerboard3d",
    categories: ["featured", "creative"],
    title: "Checkerboard in Motion and 3D",
    description: "Thrilled to see it featured by CodePen ",
    type: "video",
    videoSrc:
      "https://assets.codepen.io/9259849/5cc44ca4-52f5-4d90-98a1-0d993bc4b837.mp4",
  },
  {
    id: 2,
    slug: "katherinegroverfinejewelry",
    categories: ["featured", "client work"],
    title: "Animation for Katherine Grover Fine Jewelry",
    description:
      "Canvas Particle Animation using jewels from Katherine Grover Fine Jewelry",
    type: "video",
    videoSrc:
      "https://hollandblumer.github.io/portfolio_videos/Subheading%20(12).mp4",
  },
  {
    id: 3,
    slug: "ccnycposter",
    categories: ["featured", "creative"],
    title: "Creative Coding NYC Poster",
    description:
      "Exploring how timing and motion can make shapes appear through perception",
    type: "video",
    videoSrc: "https://hollandblumer.github.io/portfolio_videos/cc.mp4",
  },
  {
    id: 4,
    slug: "cherylfudge",
    categories: ["featured", "client work"],
    title: "Cherylfudge.com",
    description:
      "A website design that compliments Cheryl Fudge's modern, dynamic art with a nod to Nantucket.",
    type: "video",
    videoSrc: "https://hollandblumer.github.io/portfolio_videos/cfudge.mp4",
  },
  {
    id: 5,
    slug: "americanseasons",
    categories: ["featured", "client work"],
    title: "Buzz-Worthy Animation for American Seasons",
    description: "In light of them opening for the season on Nantucket",
    type: "video",
    videoSrc: "https://hollandblumer.github.io/portfolio_videos/seasons.mp4",
  },
  {
    id: 6,
    slug: "meredithnorvell",
    categories: ["featured", "client work"],
    title: "Website for Meredith Norvell",
    description:
      "Designed and built with interactive book elements that steal the show",
    type: "video",
    videoSrc:
      "https://hollandblumer.github.io/portfolio_videos/meredithnorvell.mp4",
  },
  {
    id: 7,
    slug: "aj",
    categories: ["featured", "client work"],
    title: "Website for AJ",
    description: "Short film exploring movement and tension in oil and light",
    type: "video",
    videoSrc: "https://hollandblumer.github.io/portfolio_videos/aj.mp4",
  },
  {
    id: 8,
    slug: "madewithlove",
    categories: ["featured", "client work"],
    title: "Made With Love",
    description:
      "When it comes together like this, it’s Valentine’s Day post-worthy",
    type: "video",
    videoSrc:
      "https://cdn.dribbble.com/userupload/40906361/file/original-391a3ed9ce0b7e144eca01fb724be566.mp4",
  },
];

export default function Work() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("featured");

  const visibleProjects = projects.filter((project) =>
    activeFilter === "all" ? true : project.categories.includes(activeFilter)
  );

  return (
    <>
      <FilmGrainLayer />
      <main className="projects-section page">
        {/* Social icons */}
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

        <div className="work-nav">
          <div className="work-menu-wrapper">
            <ElasticMenu
              isOpen={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
            />
          </div>{" "}
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
                <a href="/work" onClick={() => setMenuOpen(false)}>
                  Work
                </a>
              </li>
              <li>
                <a href="#about" onClick={() => setMenuOpen(false)}>
                  About
                </a>
              </li>
              <li>
                <a
                  href="mailto:hollandblumer6@icloud.com?subject=Hello&body=Hi%20Holland!"
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

        {/* Header + filters */}
        <div className="projects-header">
          <DiamondTitleFinal
            text="WORK"
            autoResponsive
            desktopPx={100}
            ipadBp={1024}
            mobileBp={700}
            ipadScale={0.7}
            mobileScale={0.6}
            autoHeight
            heightScale={1}
          />

          <div style={{ width: "100%", maxWidth: 1000, margin: "0 auto" }} />

          <div className="filter-menu">
            {["featured", "client work", "creative"].map((cat) => (
              <button
                key={cat}
                className={`filter-button ${
                  activeFilter === cat ? "active" : ""
                }`}
                onClick={() => setActiveFilter(cat)}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* GRID of VideoCloth components */}
        <div className="projects-grid">
          {visibleProjects.map((project) =>
            project.type === "video" ? (
              <Link
                key={project.id}
                to={`/work/${project.slug}`}
                className="project-card-link"
              >
                <VideoCloth videoSrc={project.videoSrc} title={project.title}>
                  <p className="project-desc">{project.description}</p>
                </VideoCloth>
              </Link>
            ) : null
          )}
        </div>
      </main>
    </>
  );
}
