import { motion } from "framer-motion";
import { profile, experience } from "../data";

export default function About() {
  return (
    <section className="about" id="about">
      <div className="section-label">About me</div>
      <motion.p
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="about__text display"
      >
        I turn <span className="serif-accent">research</span> into{" "}
        <span className="serif-accent">products</span> — designing, training and
        shipping AI systems that solve real problems at scale.
      </motion.p>
      <div className="about__grid">
        <p className="about__bio">{profile.bio}</p>
        <div className="about__exp">
          <h3 className="about__exp-title">Experience</h3>
          {experience.map((job) => (
            <div key={job.role} className="exp-row">
              <div className="exp-row__head">
                <span className="exp-row__role">{job.role}</span>
                <span className="exp-row__period">{job.period}</span>
              </div>
              <div className="exp-row__company">{job.company}</div>
              <p className="exp-row__summary">{job.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
