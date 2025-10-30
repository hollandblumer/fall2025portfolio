// src/pages/ProjectPage.jsx
import { useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import DiamondTitle from "../../components/DiamondTitle.jsx"; // ← from src/pages -> src/components
import projectData from "../../assets/projectData.js"; // ← make sure this path matches your tree

export default function ProjectPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const project = useMemo(
    () => projectData.find((p) => p.slug === slug),
    [slug]
  );

  if (!project)
    return (
      <main className="page not-found">
        <h1>Not found</h1>
        <p>
          This project doesn’t exist. <Link to="/work">Back to Work</Link>
        </p>
      </main>
    );

  const { title, tagLine, hero, palette, sections = [] } = project;

  return (
    <main
      className="project-page page"
      style={{
        background: "#fff",
        color: "#222",
        lineHeight: 1.7,
        fontSize: "1.1rem",
      }}
    >
      <header className="project-hero">
        <button className="back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="hero">
          <img src={hero.image} alt={hero.alt} className="hero-img" />
          <div className="hero-text">
            <DiamondTitle
              text={title}
              maxW={20}
              style={{ height: 160 }}
              fillSolid={palette.ink}
            />
            <p>{tagLine}</p>
          </div>
        </div>
      </header>

      <section className="project-content">
        {sections.map((block, i) => {
          switch (block.type) {
            case "text":
              return (
                <div key={i} className="text-block">
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
                    loop
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
