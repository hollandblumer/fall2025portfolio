import { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

// --- Example data (swap with your real templates) ---
const TEMPLATES = [
  {
    id: "vevo",
    title: "Vevo",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
    blurb: "A dynamic visual language for a music video network.",
    categories: ["featured", "3d"],
  },
  {
    id: "dichotomies",
    title: "Dichotomies",
    image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800",
    blurb:
      "Simple vs. complex—pushing into the 'simple & interesting' quadrant.",
    categories: ["featured", "2d", "creative"],
  },
  {
    id: "ytm-recap-2023",
    title: "YouTube Music: Recap 2023",
    image: "https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?w=800",
    blurb: "Animated illustrations celebrating a year of listening.",
    categories: ["featured", "2d"],
  },
  {
    id: "shader-playground",
    title: "Shader Playground",
    image: "https://images.unsplash.com/photo-1540397103387-3d1fca6c86b6?w=800",
    blurb: "Creative-code experiments with 3D shaders.",
    categories: ["creative", "3d"],
  },
  {
    id: "editorial-layout",
    title: "Editorial Layout",
    image: "https://images.unsplash.com/photo-1581093588401-16a84f1f777b?w=800",
    blurb: "A featured editorial project using bold 2D graphics.",
    categories: ["2d"],
  },
  {
    id: "code-sculpture",
    title: "Code Sculpture",
    image: "https://images.unsplash.com/photo-1551292831-023188e78222?w=800",
    blurb: "Interactive creative code meets 3D modeling.",
    categories: ["creative", "3d"],
  },
];

// Button set you asked for (labels can be anything; we normalize internally)
const FILTERS = ["featured", "all", "creative code", "3d", "2d"];

// Normalize string → slug (e.g., "Creative Code" => "creative")
const toKey = (label) => {
  const s = label.trim().toLowerCase();
  return s === "creative code" ? "creative" : s;
};

export default function Templates() {
  const location = useLocation();
  const navigate = useNavigate();

  // Read initial filter from ?cat= (e.g., /templates?cat=3d) or default to "featured"
  const params = new URLSearchParams(location.search);
  const initialFilter = toKey(params.get("cat") || "featured");

  const [active, setActive] = useState(initialFilter);

  // Keep URL in sync when the active filter changes
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (active === "featured") {
      q.delete("cat"); // keep default clean
    } else {
      q.set("cat", active);
    }
    navigate({ search: q.toString() }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const visibleTemplates = useMemo(() => {
    if (active === "all") return TEMPLATES;
    return TEMPLATES.filter((t) => t.categories.map(toKey).includes(active));
  }, [active]);

  return (
    <main className="projects-section page">
      <header className="projects-header">
        <h2>Templates</h2>
        <nav className="filter-menu" aria-label="Template categories">
          {FILTERS.map((label) => {
            const key = toKey(label);
            const isActive = key === active;
            return (
              <button
                key={key}
                className={`filter-button ${isActive ? "active" : ""}`}
                aria-pressed={isActive}
                onClick={() => setActive(key)}
              >
                {label.toUpperCase()}
              </button>
            );
          })}
        </nav>
      </header>

      <section className="projects-grid" aria-live="polite">
        {visibleTemplates.map((t) => (
          <article key={t.id} className="project">
            <div className="thumb">
              <img src={t.image} alt={t.title} loading="lazy" />
            </div>
            <div className="meta">
              <h3>{t.title}</h3>
              <p>{t.blurb}</p>
              {/* Customize actions for your flow */}
              <div className="actions">
                <Link className="btn" to={`/templates/${t.id}`}>
                  Preview
                </Link>
                <Link className="btn secondary" to={`/customize/${t.id}`}>
                  Customize
                </Link>
              </div>
            </div>
          </article>
        ))}

        {visibleTemplates.length === 0 && (
          <p className="empty">No templates match this filter (yet!).</p>
        )}
      </section>
    </main>
  );
}
