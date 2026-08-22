import { motion } from "framer-motion";
import { profile } from "../data";

export default function Contact() {
  return (
    <footer className="contact" id="contact">
      <motion.h2
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="contact__title display"
      >
        Let&apos;s build
        <br />
        <span className="serif-accent">something</span> smart
      </motion.h2>
      <motion.a
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="contact__btn"
        href={`mailto:${profile.email}`}
      >
        {profile.email}
      </motion.a>
      <div className="contact__bottom">
        <span>©2025 {profile.name}</span>
        <div className="contact__socials">
          <a href={profile.socials.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={profile.socials.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href={profile.socials.x} target="_blank" rel="noreferrer">
            X
          </a>
        </div>
        <span>{profile.domain}</span>
      </div>
    </footer>
  );
}
