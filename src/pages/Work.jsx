import { useEffect } from "react";

export default function Work() {
  useEffect(() => {
    const filterButtons = document.querySelectorAll(".filter-button");
    const projects = document.querySelectorAll(".project");

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        filterButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        const category = button.textContent.trim().toLowerCase();
        projects.forEach((project) => {
          const categories = project.dataset.category.split(" ");
          const match = category === "all" || categories.includes(category);
          project.style.display = match ? "block" : "none";
        });
      });
    });

    // Initial filter (show "featured")
    const defaultCategory = "featured";
    projects.forEach((project) => {
      const categories = project.dataset.category.split(" ");
      const match = categories.includes(defaultCategory);
      project.style.display = match ? "block" : "none";
    });
  }, []);

  return (
    <main className="projects-section page">
      <div className="projects-header">
        <h2>PROJECTS</h2>
        <div className="filter-menu">
          <button className="filter-button active">FEATURED</button>
          <button className="filter-button">ALL</button>
          <button className="filter-button">CREATIVE CODE</button>
          <button className="filter-button">3D</button>
          <button className="filter-button">2D</button>
        </div>
      </div>

      <div className="projects-grid">
        <article className="project" data-category="featured 3d">
          <img
            src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800"
            alt="Project 1"
          />
          <h3>Vevo</h3>
          <p>
            A dynamic new visual language for the world’s leading music video
            network.
          </p>
        </article>

        <article className="project" data-category="featured 2d creative">
          <img
            src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800"
            alt="Project 2"
          />
          <h3>Dichotomies</h3>
          <p>
            Something can be simple and boring, and complex and interesting —
            but what makes something simple and interesting?
          </p>
        </article>

        <article className="project" data-category="featured 2d">
          <img
            src="https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?w=800"
            alt="Project 3"
          />
          <h3>YouTube Music: Recap 2023</h3>
          <p>
            Animated illustrations celebrating a year’s worth of music listening
            and discovery.
          </p>
        </article>

        <article className="project" data-category="creative 3d">
          <img
            src="https://images.unsplash.com/photo-1540397103387-3d1fca6c86b6?w=800"
            alt="Project 4"
          />
          <h3>Shader Playground</h3>
          <p>Creative code experiments with 3D shaders.</p>
        </article>

        <article className="project" data-category="2d">
          <img
            src="https://images.unsplash.com/photo-1581093588401-16a84f1f777b?w=800"
            alt="Project 5"
          />
          <h3>Editorial Layout</h3>
          <p>A featured editorial project using bold 2D graphics.</p>
        </article>

        <article className="project" data-category="creative 3d">
          <img
            src="https://images.unsplash.com/photo-1551292831-023188e78222?w=800"
            alt="Project 6"
          />
          <h3>Code Sculpture</h3>
          <p>Interactive creative code meets 3D modeling.</p>
        </article>
      </div>
    </main>
  );
}
