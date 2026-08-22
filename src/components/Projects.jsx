import { motion } from "framer-motion";
import { projects } from "../data";

export default function Projects() {
  return (
    <section className="projects" id="work">
      <div className="projects__head">
        <div className="section-label">Selected work</div>
        <h2 className="projects__title display">
          Case <span className="serif-accent">studies</span>
        </h2>
      </div>
      <div className="projects__list">
        {projects.map((p, i) => (
          <motion.a
            key={p.id}
            href="#contact"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: (i % 2) * 0.1 }}
            className={`project ${i % 2 === 1 ? "project--offset" : ""}`}
          >
            <div className="project__visual">
              <span className="project__id display">{p.id}</span>
              <span className="project__year">{p.year}</span>
            </div>
            <div className="project__info">
              <h3 className="project__name display">{p.title}</h3>
              <p className="project__subtitle serif-accent">{p.subtitle}</p>
              <p className="project__desc">{p.description}</p>
              <div className="project__tags">
                {p.tags.map((t) => (
                  <span key={t} className="project__tag">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
