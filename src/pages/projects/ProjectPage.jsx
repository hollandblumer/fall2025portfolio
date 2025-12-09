// src/pages/ProjectPage.jsx
import { useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import DiamondTitle from "../../components/DiamondTitle.jsx";
import ElasticMenu from "../../components/nav/ElasticMenu.jsx"; // 👈 bring in the menu/X
import projectData from "../../assets/projectData.js";

// Helper function (carried over from previous response)
const getLinkLabel = (href) => {
  try {
    const url = new URL(href);
    const host = url.hostname.replace("www.", "");
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("codepen.io")) return "CodePen";
    // Fallback to the hostname
    return host;
  } catch (e) {
    return "Link";
  }
};

export default function ProjectPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const project = useMemo(() => {
    if (Array.isArray(projectData)) {
      // if you exported: const projectData = [ {...}, ... ]
      return projectData.find((p) => p.slug === slug);
    }
    if (projectData && typeof projectData === "object") {
      // if you exported: const projectData = { meredithnorvell: {...}, ... }
      return projectData[slug];
    }
    return null;
  }, [slug]);

  if (!project) {
    return (
      <main className="page not-found">
        <h1>Not found</h1>
        <p>
          This project doesn’t exist. <Link to="/work">Back to Work</Link>
        </p>
      </main>
    );
  }

  const { title, tagLine, hero, palette = {}, sections = [] } = project;
  const bg = palette.bg || "#fff";
  const ink = palette.ink || "#222";

  return (
    <main
      className="project-page page"
      style={{
        background: bg,
        color: ink,
        lineHeight: 1.7,
        // REMOVED: fontSize: "1.1rem", as it's now handled by CSS
      }}
    >
      <header className="project-hero">
        {/* 🔥 ElasticMenu used as an X / close button */}
        <div className="project-close-wrapper">
          <ElasticMenu
            isOpen={true} // force the X state
            onClick={() => navigate(-1)} // go back when clicked
          />
        </div>

        <div className="hero">
          <div className="hero-text">
            <h1>{title}</h1>
            {tagLine && <p>{tagLine}</p>}
          </div>
          {hero?.image && (
            <img
              src={hero.image}
              alt={hero.alt || title}
              className="hero-img"
            />
          )}
        </div>
      </header>

      <section className="project-content">
        {sections.map((block, i) => {
          switch (block.type) {
            case "text":
              return (
                <div key={i} className="text-block">
                  {/* Assuming content is a string with optional markdown */}
                  <p>{block.content}</p>
                </div>
              );
            case "image":
              return (
                <figure key={i} className="image-block">
                  <img src={block.src} alt={block.alt || ""} />
                  {block.caption && <figcaption>{block.caption}</figcaption>}
                </figure>
              );
            case "video":
              return (
                <figure key={i} className="video-block">
                  <video
                    src={block.src}
                    playsInline
                    autoPlay
                    loop={block.loop ?? true}
                    muted
                    controls
                  />
                  {block.caption && <figcaption>{block.caption}</figcaption>}
                </figure>
              );
            case "imageGrid":
              return (
                <div key={i} className="image-grid">
                  <h3>Idea Board</h3>
                  <div className="grid">
                    {block.images.map((img, j) => (
                      <img key={j} src={img.src} alt={img.alt || ""} />
                    ))}
                  </div>
                  {block.caption && (
                    <p className="caption">
                      <em>{block.caption}</em>
                    </p>
                  )}
                </div>
              );
            case "link":
              const label = getLinkLabel(block.href);
              const nextBlockIsLink = sections[i + 1]?.type === "link";

              return (
                <span
                  key={i}
                  className="link-inline-wrapper"
                  style={{ display: "inline" }}
                >
                  <a
                    href={block.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View on ${label}`}
                  >
                    {label}
                  </a>
                  {/* Use a separator if the next block is also a link. */}
                  {nextBlockIsLink ? ", " : ". "}
                </span>
              );

            default:
              return null;
          }
        })}
      </section>

      <footer className="project-footer">
        <Link to="/work" className="cta">
          ← Back to all projects
        </Link>
      </footer>
    </main>
  );
}
