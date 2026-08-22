import { motion } from "framer-motion";
import { skills } from "../data";

export default function Skills() {
  return (
    <section className="skills" id="skills">
      <div className="section-label">Toolkit</div>
      <div className="skills__grid">
        {skills.map((group, gi) => (
          <motion.div
            key={group.category}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: gi * 0.1 }}
            className="skill-card"
          >
            <span className="skill-card__index">0{gi + 1}</span>
            <h3 className="skill-card__title display">{group.category}</h3>
            <ul className="skill-card__list">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
