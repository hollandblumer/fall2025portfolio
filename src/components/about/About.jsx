import AboutText from "./AboutText";
import AboutVoronoi from "./AboutVoronoi";

export default function About() {
  return (
    <section id="about" className="about-section">
      <AboutVoronoi />
      <div className="about-blurb">
        <p>
          Holland Blumer works at the intersection of design and technology,
          using code to make things move, calculate, and come alive. With two
          engineering degrees, she focuses her work on creating custom projects
          for clients, blending design with thoughtful technical
          problem-solving.
        </p>
      </div>
    </section>
  );
}
